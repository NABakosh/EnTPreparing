import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

export async function adminOverview(actor: CurrentUser) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const [users, classes, published, review, feedback, attempts] = await Promise.all([
    prisma.user.count(),
    prisma.class.count(),
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.question.count({ where: { status: { in: ["DRAFT", "REVIEW"] } } }),
    prisma.feedback.count({ where: { handled: false } }),
    prisma.attempt.count({ where: { status: "FINISHED" } }),
  ]);
  return { users, classes, published, review, feedback, attempts };
}
