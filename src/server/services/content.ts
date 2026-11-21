import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

function admin(actor: CurrentUser) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
}

const subjectSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/),
  nameRu: z.string().trim().min(1).max(100),
  nameKk: z.string().trim().max(100).default(""),
  mandatory: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

const moduleSchema = z.object({
  titleRu: z.string().trim().min(1).max(200),
  titleKk: z.string().trim().max(200).default(""),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

const topicSchema = z.object({
  titleRu: z.string().trim().min(1).max(200),
  titleKk: z.string().trim().max(200).default(""),
  theoryRu: z.string().max(100_000).default(""),
  theoryKk: z.string().max(100_000).default(""),
  summaryRu: z.string().max(5000).default(""),
  summaryKk: z.string().max(5000).default(""),
  grade: z.coerce.number().int().min(1).max(12).nullable().optional(),
  sourceBook: z.string().trim().max(300).nullable().optional(),
  sourcePages: z.string().trim().max(100).nullable().optional(),
  order: z.coerce.number().int().min(0).max(1000).default(0),
  needsReviewKk: z.boolean().default(false),
});

export async function adminSubjects(actor: CurrentUser) {
  admin(actor);
  return prisma.subject.findMany({
    orderBy: [{ mandatory: "desc" }, { order: "asc" }],
    include: { _count: { select: { modules: true, questions: true } } },
  });
}

export async function saveSubject(actor: CurrentUser, id: string | null, input: unknown) {
  admin(actor);
  const p = subjectSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  const dup = await prisma.subject.findUnique({ where: { slug: p.data.slug } });
  if (dup && dup.id !== id) throw new AppError("slug_exists");
  return id ? prisma.subject.update({ where: { id }, data: p.data }) : prisma.subject.create({ data: p.data });
}

export async function deleteSubject(actor: CurrentUser, id: string) {
  admin(actor);
  await prisma.subject.delete({ where: { id } });
}

export async function adminSubjectTree(actor: CurrentUser, subjectId: string) {
  admin(actor);
  return prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { topics: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } } },
      },
    },
  });
}

export async function saveModule(actor: CurrentUser, id: string | null, subjectId: string | null, input: unknown) {
  admin(actor);
  const p = moduleSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  if (id) return prisma.module.update({ where: { id }, data: p.data });
  if (!subjectId) throw new AppError("validation");
  return prisma.module.create({ data: { ...p.data, subjectId } });
}

export async function deleteModule(actor: CurrentUser, id: string) {
  admin(actor);
  await prisma.module.delete({ where: { id } });
}

export async function createTopic(actor: CurrentUser, moduleId: string, input: unknown) {
  admin(actor);
  const p = topicSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  return prisma.topic.create({ data: { ...p.data, moduleId } });
}

export async function getTopicAdmin(actor: CurrentUser, id: string) {
  admin(actor);
  return prisma.topic.findUnique({ where: { id }, include: { module: { include: { subject: true } } } });
}

export async function updateTopic(actor: CurrentUser, id: string, input: unknown) {
  admin(actor);
  const p = topicSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  return prisma.topic.update({ where: { id }, data: { ...p.data, grade: p.data.grade ?? null, sourceBook: p.data.sourceBook || null, sourcePages: p.data.sourcePages || null } });
}

export async function deleteTopic(actor: CurrentUser, id: string) {
  admin(actor);
  await prisma.topic.delete({ where: { id } });
}

/** Темы для выпадающих списков (админ и учитель). */
export async function topicOptions(actor: CurrentUser) {
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER") throw new AppError("forbidden", 403);
  return prisma.topic.findMany({
    orderBy: [{ module: { subject: { order: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
    select: { id: true, titleRu: true, titleKk: true, module: { select: { subject: { select: { id: true, nameRu: true, nameKk: true } } } } },
  });
}
