import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

/** id классов, доступных учителю (админу — все). */
export async function teacherClassIds(actor: CurrentUser): Promise<string[] | "all"> {
  if (actor.role === "ADMIN") return "all";
  if (actor.role !== "TEACHER") return [];
  const classes = await prisma.class.findMany({ where: { teachers: { some: { id: actor.id } } }, select: { id: true } });
  return classes.map((c) => c.id);
}

/** Может ли actor видеть данные ученика studentId. */
export async function canViewStudent(actor: CurrentUser, studentId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "STUDENT") return actor.id === studentId;
  if (actor.role === "PARENT") {
    return (await prisma.parentChild.count({ where: { parentId: actor.id, childId: studentId } })) > 0;
  }
  if (actor.role === "TEACHER") {
    const s = await prisma.user.findUnique({ where: { id: studentId }, select: { classId: true, role: true } });
    if (!s?.classId || s.role !== "STUDENT") return false;
    const ids = await teacherClassIds(actor);
    return ids === "all" || ids.includes(s.classId);
  }
  return false;
}

export async function assertCanViewStudent(actor: CurrentUser, studentId: string) {
  if (!(await canViewStudent(actor, studentId))) throw new AppError("forbidden", 403);
}

export async function assertTeacherOfClass(actor: CurrentUser, classId: string) {
  const ids = await teacherClassIds(actor);
  if (ids !== "all" && !ids.includes(classId)) throw new AppError("forbidden", 403);
}
