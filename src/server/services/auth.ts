import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { signSession, type Role } from "@/server/auth/session";
import type { CurrentUser } from "@/server/auth/current";

const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(128),
});

// хэш-заглушка для несуществующих логинов
const DUMMY_HASH = "$2b$10$GqMvp5MSYonUdikVSENd2u9zpjWAGvKd1f0rfhR/0.9EUy8UzUKGi";

// простая защита от перебора (в памяти процесса)
const failures = new Map<string, { count: number; until: number }>();

export async function login(input: unknown): Promise<{ token: string; role: Role; mustChangePassword: boolean }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_credentials", 401);
  const { login, password } = parsed.data;

  const f = failures.get(login);
  if (f && f.until > Date.now()) throw new AppError("too_many_attempts", 429);

  const user = await prisma.user.findUnique({ where: { login } });
  // одинаковое время ответа для существующих и несуществующих логинов
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    const count = (f?.count ?? 0) + 1;
    failures.set(login, { count, until: count >= 5 ? Date.now() + 5 * 60_000 : 0 });
    throw new AppError("invalid_credentials", 401);
  }
  if (!user.active) throw new AppError("account_blocked", 403);
  failures.delete(login);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await signSession({ sub: user.id, role: user.role, v: user.sessionVersion });
  return { token, role: user.role, mustChangePassword: user.mustChangePassword };
}

const changeSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "mismatch" });

export async function changePassword(actor: CurrentUser, input: unknown): Promise<void> {
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.message === "mismatch");
    throw new AppError(mismatch ? "password_mismatch" : "password_too_short");
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) throw new AppError("wrong_current_password");
  await prisma.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
}

export async function dismissPasswordPrompt(actor: CurrentUser): Promise<void> {
  await prisma.user.update({ where: { id: actor.id }, data: { mustChangePassword: false } });
}
