import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { SESSION_COOKIE, verifySession, type Role } from "./session";

export type CurrentUser = {
  id: string;
  role: Role;
  fullName: string;
  login: string;
  classId: string | null;
  profilePairId: string | null;
  mustChangePassword: boolean;
};

/** Текущий пользователь из cookie + проверка в БД (активен ли). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const s = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { id: true, role: true, fullName: true, login: true, classId: true, profilePairId: true, mustChangePassword: true, active: true },
  });
  if (!u || !u.active) return null;
  return { id: u.id, role: u.role, fullName: u.fullName, login: u.login, classId: u.classId, profilePairId: u.profilePairId, mustChangePassword: u.mustChangePassword };
});

/** Для server actions / route handlers: бросает AppError. */
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("unauthorized", 401);
  if (roles.length && !roles.includes(u.role)) throw new AppError("forbidden", 403);
  return u;
}

/** Для страниц: редиректит на вход. */
export async function requirePageUser(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (roles.length && !roles.includes(u.role)) redirect("/login?forbidden=1");
  return u;
}
