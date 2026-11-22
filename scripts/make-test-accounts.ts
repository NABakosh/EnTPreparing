/**
 * Тестовые аккаунты (идемпотентно): учитель, ученики класса 11А, родитель.
 *   npx tsx scripts/make-test-accounts.ts <accounts.json>
 * accounts.json: [{ "login", "password", "fullName", "role", "children"?: [login] }]
 * Существующему логину обновляется пароль. Пароли хранятся только как хэш.
 */
import "dotenv/config";
import fs from "node:fs";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";

type Acc = { login: string; password: string; fullName: string; role: "TEACHER" | "STUDENT" | "PARENT"; children?: string[] };

async function main() {
  const list = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as Acc[];
  const cls = await prisma.class.findUniqueOrThrow({ where: { name: "11А" } });
  const pair = await prisma.profilePair.findFirst({ where: { subject1: { slug: "math" }, subject2: { slug: "physics" } } });
  for (const a of list) {
    const passwordHash = await hashPassword(a.password);
    const data = { fullName: a.fullName, role: a.role, passwordHash, mustChangePassword: false, active: true, ...(a.role === "STUDENT" ? { classId: cls.id, profilePairId: pair?.id ?? null } : {}) };
    const u = await prisma.user.upsert({ where: { login: a.login }, create: { login: a.login, ...data }, update: { ...data, sessionVersion: { increment: 1 } } });
    if (a.role === "TEACHER") await prisma.class.update({ where: { id: cls.id }, data: { teachers: { connect: { id: u.id } } } });
    for (const c of a.children ?? []) {
      const child = await prisma.user.findUniqueOrThrow({ where: { login: c } });
      await prisma.parentChild.upsert({ where: { parentId_childId: { parentId: u.id, childId: child.id } }, create: { parentId: u.id, childId: child.id }, update: {} });
    }
    console.log(`ok ${a.login}`);
  }
}
main().finally(() => prisma.$disconnect());
