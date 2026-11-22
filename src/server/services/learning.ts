import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { getModuleThreshold } from "./settings";

/** Предметы программы ученика: обязательные + профильная пара. */
export async function programSubjectIds(userId: string): Promise<{ ids: string[]; hasPair: boolean; pairId: string | null }> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { profilePair: { select: { id: true, subject1Id: true, subject2Id: true } } } });
  const mandatory = await prisma.subject.findMany({ where: { mandatory: true }, select: { id: true } });
  const ids = mandatory.map((s) => s.id);
  if (u?.profilePair) ids.push(u.profilePair.subject1Id, u.profilePair.subject2Id);
  return { ids, hasPair: !!u?.profilePair, pairId: u?.profilePair?.id ?? null };
}

export async function setProfilePair(actor: CurrentUser, pairId: string) {
  if (actor.role !== "STUDENT") throw new AppError("forbidden", 403);
  const pair = await prisma.profilePair.findFirst({ where: { id: pairId, active: true } });
  if (!pair) throw new AppError("not_found", 404);
  await prisma.user.update({ where: { id: actor.id }, data: { profilePairId: pair.id } });
}

/** Предметы с прогрессом ученика (тем всего / пройдено). */
export async function subjectsWithProgress(userId: string) {
  const [subjects, progress, program] = await Promise.all([
    prisma.subject.findMany({
      orderBy: [{ mandatory: "desc" }, { order: "asc" }],
      include: { modules: { select: { topics: { select: { id: true } } } } },
    }),
    prisma.topicProgress.findMany({ where: { userId }, select: { topicId: true, completed: true, bestPercent: true } }),
    programSubjectIds(userId),
  ]);
  const pm = new Map(progress.map((p) => [p.topicId, p]));
  return subjects.map((s) => {
    const topicIds = s.modules.flatMap((m) => m.topics.map((t) => t.id));
    const done = topicIds.filter((id) => pm.get(id)?.completed).length;
    const attempted = topicIds.filter((id) => pm.has(id));
    const avg = attempted.length ? Math.round(attempted.reduce((a, id) => a + (pm.get(id)?.bestPercent ?? 0), 0) / attempted.length) : 0;
    return { id: s.id, slug: s.slug, nameRu: s.nameRu, nameKk: s.nameKk, mandatory: s.mandatory, total: topicIds.length, done, avg, inProgram: program.ids.includes(s.id) };
  });
}

export async function subjectTree(subjectId: string, userId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          topics: {
            orderBy: { order: "asc" },
            select: { id: true, titleRu: true, titleKk: true, grade: true, _count: { select: { questions: { where: { status: "PUBLISHED" } } } } },
          },
        },
      },
    },
  });
  if (!subject) return null;
  const topicIds = subject.modules.flatMap((m) => m.topics.map((t) => t.id));
  const progress = await prisma.topicProgress.findMany({ where: { userId, topicId: { in: topicIds } } });
  const pm = new Map(progress.map((p) => [p.topicId, p]));
  return {
    ...subject,
    modules: subject.modules.map((m) => {
      const topics = m.topics.map((t) => ({ ...t, progress: pm.get(t.id) ?? null }));
      return { ...m, topics, completed: topics.length > 0 && topics.every((t) => t.progress?.completed) };
    }),
  };
}

export async function getTopicForStudent(topicId: string, userId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      module: { include: { subject: true } },
      _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
    },
  });
  if (!topic) return null;
  const progress = await prisma.topicProgress.findUnique({ where: { userId_topicId: { userId, topicId } } });
  // соседние темы для навигации
  const siblings = await prisma.topic.findMany({
    where: { module: { subjectId: topic.module.subjectId } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    select: { id: true },
  });
  const idx = siblings.findIndex((s) => s.id === topicId);
  return {
    topic,
    progress,
    threshold: await getModuleThreshold(),
    prevId: idx > 0 ? siblings[idx - 1].id : null,
    nextId: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null,
  };
}

export async function markTheoryRead(actor: CurrentUser, topicId: string) {
  if (actor.role !== "STUDENT") return;
  await prisma.topicProgress.upsert({
    where: { userId_topicId: { userId: actor.id, topicId } },
    create: { userId: actor.id, topicId, theoryRead: true },
    update: { theoryRead: true },
  });
}

/** Модуль завершён = все его темы completed. Программа завершена = все модули предметов программы. */
export async function programCompletion(userId: string) {
  const program = await programSubjectIds(userId);
  const modules = await prisma.module.findMany({
    where: { subjectId: { in: program.ids } },
    // темы без опубликованных вопросов пройти нельзя — их не учитываем в программе
    include: { topics: { where: { questions: { some: { status: "PUBLISHED" } } }, select: { id: true } }, subject: true },
    orderBy: [{ subject: { order: "asc" } }, { order: "asc" }],
  });
  const done = new Set(
    (await prisma.topicProgress.findMany({ where: { userId, completed: true }, select: { topicId: true } })).map((p) => p.topicId),
  );
  const list = modules.map((m) => ({
    id: m.id,
    titleRu: m.titleRu,
    titleKk: m.titleKk,
    subjectRu: m.subject.nameRu,
    subjectKk: m.subject.nameKk,
    total: m.topics.length,
    done: m.topics.filter((t) => done.has(t.id)).length,
  }));
  const counted = list.filter((m) => m.total > 0);
  const complete = program.hasPair && counted.length > 0 && counted.every((m) => m.done === m.total);
  return { modules: list, complete, hasPair: program.hasPair, pairId: program.pairId };
}
