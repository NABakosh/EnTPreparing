import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { normalizeClassName } from "./users";

function admin(actor: CurrentUser) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
}

export async function listClasses(actor: CurrentUser) {
  if (actor.role === "ADMIN") {
    return prisma.class.findMany({
      orderBy: [{ grade: "desc" }, { name: "asc" }],
      include: { teachers: { select: { id: true, fullName: true } }, _count: { select: { students: true } } },
    });
  }
  if (actor.role === "TEACHER") {
    return prisma.class.findMany({
      where: { teachers: { some: { id: actor.id } } },
      orderBy: [{ grade: "desc" }, { name: "asc" }],
      include: { teachers: { select: { id: true, fullName: true } }, _count: { select: { students: true } } },
    });
  }
  throw new AppError("forbidden", 403);
}

export async function listTeachers(actor: CurrentUser) {
  admin(actor);
  return prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });
}

const schema = z.object({ name: z.string().min(1).max(10), teacherIds: z.array(z.string()).default([]) });

export async function saveClass(actor: CurrentUser, id: string | null, input: unknown) {
  admin(actor);
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError("validation");
  const norm = normalizeClassName(parsed.data.name);
  if (!norm) throw new AppError("invalid_class_name");
  const dup = await prisma.class.findUnique({ where: { name: norm.name } });
  if (dup && dup.id !== id) throw new AppError("class_exists");
  const teachers = parsed.data.teacherIds.map((tid) => ({ id: tid }));
  if (id) return prisma.class.update({ where: { id }, data: { ...norm, teachers: { set: teachers } } });
  return prisma.class.create({ data: { ...norm, teachers: { connect: teachers } } });
}

export async function deleteClass(actor: CurrentUser, id: string) {
  admin(actor);
  await prisma.class.delete({ where: { id } });
}
