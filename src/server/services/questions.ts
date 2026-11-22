import { z } from "zod";
import type { Prisma, QuestionStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

export const PAGE_SIZE = 25;
const REVIEWABLE: QuestionStatus[] = ["DRAFT", "REVIEW"];
const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "REJECTED"] as const;

function staff(actor: CurrentUser) {
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER") throw new AppError("forbidden", 403);
}

export type QuestionFilters = {
  subjectId?: string;
  topicId?: string;
  status?: string;
  ai?: string; // "1" | "0"
  demo?: string; // "1" | "0"
  q?: string;
  page?: number;
};

export async function listQuestions(actor: CurrentUser, f: QuestionFilters) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const where: Prisma.QuestionWhereInput = {};
  if (f.subjectId) where.subjectId = f.subjectId;
  if (f.topicId) where.topicId = f.topicId;
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) where.status = f.status as QuestionStatus;
  if (f.ai === "1" || f.ai === "0") where.aiGenerated = f.ai === "1";
  if (f.demo === "1" || f.demo === "0") where.isDemo = f.demo === "1";
  if (f.q) where.OR = [{ textRu: { contains: f.q, mode: "insensitive" } }, { textKk: { contains: f.q, mode: "insensitive" } }];
  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { topic: { select: { titleRu: true, titleKk: true } }, subject: { select: { nameRu: true, nameKk: true } } },
    }),
    prisma.question.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Очередь проверки: DRAFT + REVIEW, старые сначала. Учитель и админ. */
export async function reviewQueue(actor: CurrentUser, subjectId?: string, page = 1) {
  staff(actor);
  const where: Prisma.QuestionWhereInput = { status: { in: REVIEWABLE }, ...(subjectId ? { subjectId } : {}) };
  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { topic: { select: { titleRu: true, titleKk: true } }, subject: { select: { nameRu: true, nameKk: true } } },
    }),
    prisma.question.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getQuestion(actor: CurrentUser, id: string) {
  staff(actor);
  const q = await prisma.question.findUnique({ where: { id }, include: { topic: { include: { module: { include: { subject: true } } } } } });
  if (!q) return null;
  if (actor.role === "TEACHER" && !REVIEWABLE.includes(q.status)) throw new AppError("forbidden", 403);
  return q;
}

const optionSchema = z.object({ ru: z.string().trim().max(1000), kk: z.string().trim().max(1000).default("") });

export const questionSchema = z
  .object({
    topicId: z.string().min(1),
    textRu: z.string().trim().min(1).max(10_000),
    textKk: z.string().trim().max(10_000).default(""),
    options: z.array(optionSchema).min(2).max(8),
    correct: z.array(z.number().int().min(0)).min(1),
    explanationRu: z.string().trim().max(10_000).default(""),
    explanationKk: z.string().trim().max(10_000).default(""),
    source: z.string().trim().max(300).nullable().optional(),
    needsReviewKk: z.boolean().default(false),
  })
  .refine((v) => v.options.every((o) => o.ru || o.kk), { message: "empty_option" })
  .refine((v) => v.correct.every((c) => c < v.options.length), { message: "bad_correct" });

function normalize(d: z.infer<typeof questionSchema>) {
  const correct = [...new Set(d.correct)].sort((a, b) => a - b);
  return {
    topicId: d.topicId,
    textRu: d.textRu,
    textKk: d.textKk,
    options: d.options,
    correct,
    type: correct.length > 1 ? ("MULTIPLE" as const) : ("SINGLE" as const),
    explanationRu: d.explanationRu,
    explanationKk: d.explanationKk,
    source: d.source || null,
    needsReviewKk: d.needsReviewKk,
  };
}

async function subjectOfTopic(topicId: string) {
  const t = await prisma.topic.findUnique({ where: { id: topicId }, select: { module: { select: { subjectId: true } } } });
  if (!t) throw new AppError("validation");
  return t.module.subjectId;
}

/** Создание вручную (только админ). Статус выбирает админ, по умолчанию DRAFT. */
export async function createQuestion(actor: CurrentUser, input: unknown, status: QuestionStatus = "DRAFT") {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const p = questionSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  const data = normalize(p.data);
  return prisma.question.create({ data: { ...data, subjectId: await subjectOfTopic(data.topicId), status } });
}

/** Правка: админ — любой вопрос; учитель — только DRAFT/REVIEW. */
export async function updateQuestion(actor: CurrentUser, id: string, input: unknown) {
  staff(actor);
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) throw new AppError("not_found", 404);
  if (actor.role === "TEACHER" && !REVIEWABLE.includes(q.status)) throw new AppError("forbidden", 403);
  const p = questionSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  const data = normalize(p.data);
  return prisma.question.update({ where: { id }, data: { ...data, subjectId: await subjectOfTopic(data.topicId) } });
}

/**
 * Смена статуса. Публикация — единственный путь, которым вопрос (в т. ч. созданный ИИ) попадает к ученикам.
 * Учитель: только из DRAFT/REVIEW в PUBLISHED/REJECTED/REVIEW. Админ: любые переходы.
 */
export async function setQuestionStatus(actor: CurrentUser, id: string, status: QuestionStatus) {
  staff(actor);
  if (!(STATUSES as readonly string[]).includes(status)) throw new AppError("validation");
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) throw new AppError("not_found", 404);
  if (actor.role === "TEACHER" && (!REVIEWABLE.includes(q.status) || status === "DRAFT")) throw new AppError("forbidden", 403);
  if (status === "PUBLISHED") {
    const opts = q.options as unknown[];
    const correct = q.correct as number[];
    if (!q.textRu.trim() || !Array.isArray(opts) || opts.length < 2 || !Array.isArray(correct) || !correct.length) throw new AppError("question_incomplete");
  }
  return prisma.question.update({ where: { id }, data: { status } });
}

/** Массовая смена статуса (проверка пачкой). Каждый вопрос проходит те же проверки, что и по одному. */
export async function setQuestionsStatusBulk(actor: CurrentUser, ids: string[], status: QuestionStatus) {
  staff(actor);
  const uniq = [...new Set(ids)].slice(0, 100);
  let ok = 0;
  let failed = 0;
  for (const id of uniq) {
    try {
      await setQuestionStatus(actor, id, status);
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}

export async function deleteQuestion(actor: CurrentUser, id: string) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  await prisma.question.delete({ where: { id } });
}
