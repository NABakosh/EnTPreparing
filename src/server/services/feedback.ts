import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(3).max(150),
  message: z.string().trim().min(5).max(3000),
});

export async function submitFeedback(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError("validation");
  await prisma.feedback.create({ data: parsed.data });
}

export async function listFeedback(actor: CurrentUser, page = 1) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const take = 30;
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.feedback.count(),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / take)) };
}

export async function setFeedbackHandled(actor: CurrentUser, id: string, handled: boolean) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  await prisma.feedback.update({ where: { id }, data: { handled } });
}

export async function deleteFeedback(actor: CurrentUser, id: string) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  await prisma.feedback.delete({ where: { id } });
}
