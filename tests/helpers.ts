import { prisma } from "@/server/db";
import type { CurrentUser } from "@/server/auth/current";

export const TAG = `t${Date.now().toString(36)}`;

export async function mkUser(role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT", extra: { classId?: string } = {}): Promise<CurrentUser> {
  const login = `${TAG}_${role.toLowerCase()}_${Math.random().toString(36).slice(2, 7)}`;
  const u = await prisma.user.create({ data: { login, fullName: `Тест ${role}`, role, passwordHash: "x", mustChangePassword: false, classId: extra.classId ?? null } });
  return { id: u.id, role: u.role, fullName: u.fullName, login, classId: u.classId, profilePairId: null, mustChangePassword: false };
}

export async function cleanup() {
  await prisma.user.deleteMany({ where: { login: { startsWith: `${TAG}_` } } });
  await prisma.class.deleteMany({ where: { name: { startsWith: "99" } } });
}
