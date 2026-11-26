import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { buildXlsx, col, isNumberHeader, readTable } from "@/server/lib/sheets";
import { teacherClassIds } from "./access";
import { createAccount, normalizeClassName, type IssuedCredential } from "./users";

export type ImportResult = { created: IssuedCredential[]; errors: { row: number; code: string }[]; fileBase64: string | null };

const MAX_ROWS = 1000;
const ROLE_LABEL = { ADMIN: "Админ", TEACHER: "Учитель / Мұғалім", STUDENT: "Ученик / Оқушы", PARENT: "Родитель / Ата-ана" } as const;

export async function credentialsXlsx(creds: IssuedCredential[]) {
  return buildXlsx(
    "Логины",
    ["ФИО / Аты-жөні", "Роль / Рөлі", "Класс / Сынып", "Логин", "Пароль / Құпиясөз"],
    creds.map((c) => [c.fullName, ROLE_LABEL[c.role], c.className, c.login, c.password]),
  );
}

/** Импорт учеников: ФИО, Класс, ФИО родителя. Админ — любые классы (создаются), учитель — только свои. */
export async function importStudents(actor: CurrentUser, file: File): Promise<ImportResult> {
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER") throw new AppError("forbidden", 403);
  const { headers, rows, lines } = await readTable(file);
  if (!rows.length) throw new AppError("empty_file");
  if (rows.length > MAX_ROWS) throw new AppError("too_many_rows");
  const firstData = (skip: number[]) => Math.max(0, headers.findIndex((h, i) => !skip.includes(i) && !isNumberHeader(h)));
  const cls = col(headers, ["класс", "сынып"], -1);
  const parent = col(headers, ["родител", "ата ана"], -1, [cls]);
  const taken = [cls, parent].filter((i) => i >= 0);
  // «ФИО» ищем вне колонок класса и родителя; иначе — первая колонка, не «№»
  const ci = {
    name: col(headers, ["фио уч", "оқушы", "ученик", "фио", "аты жөні"], firstData(taken), taken),
    cls: cls >= 0 ? cls : 1,
    parent: parent >= 0 ? parent : 2,
  };
  const allowed = await teacherClassIds(actor);
  const created: IssuedCredential[] = [];
  const errors: { row: number; code: string }[] = [];
  const classCache = new Map<string, { id: string; name: string }>();

  for (const [i, r] of rows.entries()) {
    const rowNo = lines[i];
    const name = (r[ci.name] ?? "").replace(/\s+/g, " ").trim();
    const parentName = (r[ci.parent] ?? "").replace(/\s+/g, " ").trim();
    const norm = normalizeClassName(r[ci.cls] ?? "");
    if (name.length < 3) { errors.push({ row: rowNo, code: "row_no_name" }); continue; }
    if (!norm) { errors.push({ row: rowNo, code: "row_bad_class" }); continue; }
    try {
      let cls = classCache.get(norm.name);
      if (!cls) {
        const found = await prisma.class.findUnique({ where: { name: norm.name } });
        if (!found && actor.role !== "ADMIN") { errors.push({ row: rowNo, code: "row_class_forbidden" }); continue; }
        cls = found ?? (await prisma.class.create({ data: norm }));
        classCache.set(norm.name, cls);
      }
      if (allowed !== "all" && !allowed.includes(cls.id)) { errors.push({ row: rowNo, code: "row_class_forbidden" }); continue; }
      const c = cls;
      const res = await prisma.$transaction(async (tx) => {
        const out: IssuedCredential[] = [];
        const s = await createAccount(tx, { fullName: name, role: "STUDENT", classId: c.id });
        out.push({ fullName: name, role: "STUDENT", className: c.name, login: s.login, password: s.password });
        if (parentName.length >= 3) {
          const p = await createAccount(tx, { fullName: parentName, role: "PARENT" });
          await tx.parentChild.create({ data: { parentId: p.id, childId: s.id } });
          out.push({ fullName: parentName, role: "PARENT", className: c.name, login: p.login, password: p.password });
        }
        return out;
      });
      created.push(...res);
    } catch (e) {
      console.error(e);
      errors.push({ row: rowNo, code: "row_failed" });
    }
  }
  return { created, errors, fileBase64: created.length ? await credentialsXlsx(created) : null };
}

/** Импорт учителей (только админ): ФИО, Предмет, Класс (можно несколько через запятую). */
export async function importTeachers(actor: CurrentUser, file: File): Promise<ImportResult> {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const { headers, rows, lines } = await readTable(file);
  if (!rows.length) throw new AppError("empty_file");
  if (rows.length > MAX_ROWS) throw new AppError("too_many_rows");
  const ci = { name: col(headers, ["фио", "аты жөні"], Math.max(0, headers.findIndex((h) => !isNumberHeader(h)))), subject: col(headers, ["предмет", "пән"], 1), cls: col(headers, ["класс", "сынып"], 2) };
  const created: IssuedCredential[] = [];
  const errors: { row: number; code: string }[] = [];
  for (const [i, r] of rows.entries()) {
    const rowNo = lines[i];
    const name = (r[ci.name] ?? "").replace(/\s+/g, " ").trim();
    if (name.length < 3) { errors.push({ row: rowNo, code: "row_no_name" }); continue; }
    const classNames = (r[ci.cls] ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const norms = classNames.map(normalizeClassName);
    if (norms.some((n) => !n)) { errors.push({ row: rowNo, code: "row_bad_class" }); continue; }
    try {
      const res = await prisma.$transaction(async (tx) => {
        const classIds: string[] = [];
        for (const n of norms) {
          const c = await tx.class.upsert({ where: { name: n!.name }, create: n!, update: {} });
          classIds.push(c.id);
        }
        const acc = await createAccount(tx, { fullName: name, role: "TEACHER", subject: r[ci.subject] || null });
        if (classIds.length) await tx.user.update({ where: { id: acc.id }, data: { teachingClasses: { connect: classIds.map((id) => ({ id })) } } });
        return { fullName: name, role: "TEACHER" as const, className: norms.map((n) => n!.name).join(", "), login: acc.login, password: acc.password };
      });
      created.push(res);
    } catch (e) {
      console.error(e);
      errors.push({ row: rowNo, code: "row_failed" });
    }
  }
  return { created, errors, fileBase64: created.length ? await credentialsXlsx(created) : null };
}
