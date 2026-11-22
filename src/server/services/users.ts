import { z } from "zod";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { generatePassword, hashPassword } from "@/server/auth/password";
import { loginBaseFromFullName } from "@/server/lib/translit";
import { assertTeacherOfClass, teacherClassIds } from "./access";

export type IssuedCredential = { fullName: string; role: Role; className: string; login: string; password: string };

type Tx = Prisma.TransactionClient;

export async function uniqueLogin(fullName: string, db: Tx | typeof prisma = prisma): Promise<string> {
  const base = loginBaseFromFullName(fullName);
  const taken = new Set(
    (await db.user.findMany({ where: { login: { startsWith: base } }, select: { login: true } })).map((u) => u.login),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

/** Создаёт пользователя с случайным паролем. Пароль возвращается один раз. */
export async function createAccount(
  db: Tx,
  data: { fullName: string; role: Role; classId?: string | null; subject?: string | null },
): Promise<{ id: string; login: string; password: string }> {
  const login = await uniqueLogin(data.fullName, db);
  const password = generatePassword();
  const u = await db.user.create({
    data: {
      login,
      fullName: data.fullName,
      role: data.role,
      classId: data.role === "STUDENT" ? (data.classId ?? null) : null,
      subject: data.subject ?? null,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });
  return { id: u.id, login, password };
}

export function normalizeClassName(raw: string): { name: string; grade: number } | null {
  const name = raw.replace(/\s+/g, "").toUpperCase();
  const m = name.match(/^(\d{1,2})/);
  if (!m) return null;
  const grade = Number(m[1]);
  if (grade < 1 || grade > 12) return null;
  return { name, grade };
}

const fullName = z.string().trim().min(3).max(150);

const createSchema = z.object({
  fullName,
  role: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  classId: z.string().optional().nullable(),
  subject: z.string().trim().max(100).optional().nullable(),
  teacherClassIds: z.array(z.string()).optional(),
  parentFullName: z.string().trim().max(150).optional().nullable(),
  childIds: z.array(z.string()).optional(),
  childLogins: z.string().trim().max(1000).optional().nullable(),
});

/** Ручное создание: админ — любые роли; учитель — ученики (+родитель) и родители учеников своего класса. */
export async function createUserManual(actor: CurrentUser, input: unknown): Promise<IssuedCredential[]> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) throw new AppError("validation");
  const d = parsed.data;
  if (d.role === "PARENT" && d.childLogins) {
    const logins = d.childLogins.split(/[\s,;]+/).map((l) => l.trim().toLowerCase()).filter(Boolean);
    const kids = await prisma.user.findMany({ where: { login: { in: logins }, role: "STUDENT" }, select: { id: true } });
    if (kids.length !== logins.length) throw new AppError("child_not_found");
    d.childIds = [...new Set([...(d.childIds ?? []), ...kids.map((k) => k.id)])];
  }
  if (d.role === "PARENT" && !d.childIds?.length) throw new AppError("child_not_found");

  if (actor.role === "TEACHER") {
    if (d.role !== "STUDENT" && d.role !== "PARENT") throw new AppError("forbidden", 403);
    if (d.role === "STUDENT") {
      if (!d.classId) throw new AppError("validation");
      await assertTeacherOfClass(actor, d.classId);
    }
    if (d.role === "PARENT") {
      if (!d.childIds?.length) throw new AppError("validation");
      const kids = await prisma.user.findMany({ where: { id: { in: d.childIds }, role: "STUDENT" }, select: { classId: true } });
      if (kids.length !== d.childIds.length) throw new AppError("validation");
      for (const k of kids) await assertTeacherOfClass(actor, k.classId ?? "-");
    }
  } else if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);

  return prisma.$transaction(async (tx) => {
    const out: IssuedCredential[] = [];
    const cls = d.classId ? await tx.class.findUnique({ where: { id: d.classId } }) : null;
    if (d.role === "STUDENT" && !cls) throw new AppError("validation");
    const acc = await createAccount(tx, { fullName: d.fullName, role: d.role, classId: cls?.id, subject: d.subject });
    out.push({ fullName: d.fullName, role: d.role, className: cls?.name ?? "", ...acc });

    if (d.role === "TEACHER" && d.teacherClassIds?.length) {
      await tx.user.update({ where: { id: acc.id }, data: { teachingClasses: { connect: d.teacherClassIds.map((id) => ({ id })) } } });
    }
    if (d.role === "STUDENT" && d.parentFullName && d.parentFullName.length >= 3) {
      const p = await createAccount(tx, { fullName: d.parentFullName, role: "PARENT" });
      await tx.parentChild.create({ data: { parentId: p.id, childId: acc.id } });
      out.push({ fullName: d.parentFullName, role: "PARENT", className: cls?.name ?? "", ...p });
    }
    if (d.role === "PARENT" && d.childIds?.length) {
      await tx.parentChild.createMany({ data: d.childIds.map((childId) => ({ parentId: acc.id, childId })), skipDuplicates: true });
    }
    return out;
  });
}

export async function listUsers(actor: CurrentUser, opts: { q?: string; role?: string; classId?: string; page?: number }) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const take = 25;
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.UserWhereInput = {};
  if (opts.q) where.OR = [{ fullName: { contains: opts.q, mode: "insensitive" } }, { login: { contains: opts.q.toLowerCase() } }];
  if (opts.role && ["ADMIN", "TEACHER", "STUDENT", "PARENT"].includes(opts.role)) where.role = opts.role as Role;
  if (opts.classId) where.classId = opts.classId;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      skip: (page - 1) * take,
      take,
      select: {
        id: true, login: true, fullName: true, role: true, active: true, lastLoginAt: true, subject: true,
        class: { select: { name: true } },
        teachingClasses: { select: { name: true } },
        children: { select: { child: { select: { fullName: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

/** Сброс пароля: админ — любой (кроме себя); учитель — ученики и родители своего класса. */
export async function resetPassword(actor: CurrentUser, userId: string): Promise<IssuedCredential> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { class: true, parents: false, children: { include: { child: true } } },
  });
  if (!u) throw new AppError("not_found", 404);
  if (actor.role === "TEACHER") {
    if (u.role === "STUDENT") await assertTeacherOfClass(actor, u.classId ?? "-");
    else if (u.role === "PARENT") {
      const ids = await teacherClassIds(actor);
      const ok = ids === "all" || u.children.some((c) => c.child.classId && ids.includes(c.child.classId));
      if (!ok) throw new AppError("forbidden", 403);
    } else throw new AppError("forbidden", 403);
  } else if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const password = generatePassword();
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), mustChangePassword: true, sessionVersion: { increment: 1 } } });
  return { fullName: u.fullName, role: u.role, className: u.class?.name ?? "", login: u.login, password };
}

export async function setUserActive(actor: CurrentUser, userId: string, active: boolean) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  if (userId === actor.id) throw new AppError("cannot_block_self");
  await prisma.user.update({ where: { id: userId }, data: { active } });
}

/** Ученики класса учителя (для формы создания родителя и статистики). */
export async function studentsOfTeacher(actor: CurrentUser) {
  const ids = await teacherClassIds(actor);
  return prisma.user.findMany({
    where: { role: "STUDENT", ...(ids === "all" ? {} : { classId: { in: ids } }) },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, login: true, active: true, lastLoginAt: true, classId: true, class: { select: { name: true } } },
  });
}
