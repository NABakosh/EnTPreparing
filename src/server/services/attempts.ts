import type { Prisma, Question } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { maxPointsFor, scoreAnswer } from "@/config/scoring";
import type { Locale } from "@/config/site";
import { pickOption, pickText, type LocalizedOption } from "@/server/lib/i18n-fields";
import { getModuleThreshold } from "./settings";

export type Item = { id: string; section: string };
export type Answers = Record<string, number[]>;

const TOPIC_TEST_SIZE = 10;
const REVIEW_SIZE = 15;
const EXAM_GRACE_MS = 60_000;

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function asNums(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}

function assertStudent(actor: CurrentUser) {
  if (actor.role !== "STUDENT") throw new AppError("forbidden", 403);
}

async function ownAttempt(actor: CurrentUser, attemptId: string) {
  const a = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.userId !== actor.id) throw new AppError("not_found", 404);
  return a;
}

/** Вопрос для показа ученику — без верных ответов. */
export function publicQuestion(q: Question, locale: Locale) {
  const opts = (q.options as LocalizedOption[]) ?? [];
  const textKk = q.textKk?.trim();
  return {
    id: q.id,
    type: q.type,
    text: pickText(q, "text", locale),
    kkMissing: locale === "kk" && !textKk,
    options: opts.map((o) => pickOption(o, locale)),
    isDemo: q.isDemo,
  };
}
export type PublicQuestion = ReturnType<typeof publicQuestion>;

export function revealedQuestion(q: Question, locale: Locale) {
  return { ...publicQuestion(q, locale), correct: asNums(q.correct), explanation: pickText(q, "explanation", locale), source: q.source };
}

// ───────────── Тест по теме ─────────────

export async function startTopicTest(actor: CurrentUser, topicId: string) {
  assertStudent(actor);
  if (!(await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } }))) throw new AppError("not_found", 404);
  const qs = await prisma.question.findMany({ where: { topicId, status: "PUBLISHED" }, select: { id: true } });
  if (!qs.length) throw new AppError("no_questions");
  const items: Item[] = shuffle(qs).slice(0, TOPIC_TEST_SIZE).map((q) => ({ id: q.id, section: "topic" }));
  return prisma.attempt.create({ data: { userId: actor.id, kind: "TOPIC", topicId, items, total: items.length } });
}

/** Повторение ошибок: вопросы, на которые последний ответ ученика был неверным. */
export async function wrongQuestionIds(userId: string, topicId?: string): Promise<string[]> {
  const rows = await prisma.attemptAnswer.findMany({
    where: { userId, ...(topicId ? { topicId } : {}), question: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: { questionId: true, isCorrect: true },
  });
  const seen = new Set<string>();
  const wrong: string[] = [];
  for (const r of rows) {
    if (seen.has(r.questionId)) continue;
    seen.add(r.questionId);
    if (!r.isCorrect) wrong.push(r.questionId);
  }
  return wrong;
}

export async function startReview(actor: CurrentUser, topicId?: string) {
  assertStudent(actor);
  const ids = await wrongQuestionIds(actor.id, topicId);
  if (!ids.length) throw new AppError("no_mistakes");
  const items: Item[] = shuffle(ids).slice(0, REVIEW_SIZE).map((id) => ({ id, section: "review" }));
  return prisma.attempt.create({ data: { userId: actor.id, kind: "REVIEW", topicId: topicId ?? null, items, total: items.length } });
}

/** Данные для прохождения (тест/повторение/экзамен). */
export async function getAttemptForRun(actor: CurrentUser, attemptId: string, locale: Locale) {
  const a = await ownAttempt(actor, attemptId);
  const items = a.items as Item[];
  const qs = await prisma.question.findMany({ where: { id: { in: items.map((i) => i.id) } } });
  const qm = new Map(qs.map((q) => [q.id, q]));
  const answers = (a.answers ?? {}) as Answers;
  const questions = items
    .filter((i) => qm.has(i.id))
    .map((i) => {
      const q = qm.get(i.id)!;
      const answered = a.kind !== "EXAM" && answers[i.id] !== undefined;
      // в тестах по темам уже отвеченные вопросы показываем с разбором
      return { section: i.section, ...(answered ? revealedQuestion(q, locale) : publicQuestion(q, locale)) };
    });
  const topic = a.topicId ? await prisma.topic.findUnique({ where: { id: a.topicId }, select: { titleRu: true, titleKk: true } }) : null;
  return { attempt: a, questions, answers, topicTitle: topic ? pickText(topic, "title", locale) : null };
}

/** Мгновенная проверка одного ответа (тест по теме и повторение ошибок). */
export async function answerInstant(actor: CurrentUser, attemptId: string, questionId: string, selected: number[], locale: Locale) {
  const a = await ownAttempt(actor, attemptId);
  if (a.kind === "EXAM") throw new AppError("forbidden", 403);
  if (a.status !== "IN_PROGRESS") throw new AppError("attempt_finished");
  const items = a.items as Item[];
  if (!items.some((i) => i.id === questionId)) throw new AppError("not_found", 404);
  const answers = { ...((a.answers ?? {}) as Answers) };
  if (answers[questionId] === undefined) {
    answers[questionId] = asNums(selected).slice(0, 10);
    await prisma.attempt.update({ where: { id: a.id }, data: { answers } });
  }
  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const correct = asNums(q.correct);
  const { isCorrect, points } = scoreAnswer(q.type, correct, answers[questionId]);
  return { correct, isCorrect, points, explanation: pickText(q, "explanation", locale), selected: answers[questionId] };
}

// ───────────── Пробный экзамен ─────────────

export async function activeExam(userId: string) {
  return prisma.attempt.findFirst({ where: { userId, kind: "EXAM", status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" } });
}

export async function startExam(actor: CurrentUser, pairId: string) {
  assertStudent(actor);
  // одна активная попытка экзамена на ученика: сериализуем параллельные старты
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"exam:" + actor.id}))`;
    return startExamLocked(actor, pairId);
  }, { timeout: 30_000 });
}

async function startExamLocked(actor: CurrentUser, pairId: string) {
  const existing = await activeExam(actor.id);
  if (existing) {
    if (existing.deadlineAt && existing.deadlineAt.getTime() + EXAM_GRACE_MS < Date.now()) await finishAttempt(actor, existing.id);
    else return existing;
  }
  const template = await prisma.examTemplate.findFirst({ where: { active: true }, include: { sections: { orderBy: { order: "asc" } } } });
  if (!template) throw new AppError("no_exam_template");
  const pair = await prisma.profilePair.findFirst({ where: { id: pairId, active: true } });
  if (!pair) throw new AppError("not_found", 404);
  if (actor.profilePairId !== pair.id) await prisma.user.update({ where: { id: actor.id }, data: { profilePairId: pair.id } });

  const items: Item[] = [];
  for (const s of template.sections) {
    const subjectId = s.slot === "FIXED" ? s.subjectId : s.slot === "PROFILE_1" ? pair.subject1Id : pair.subject2Id;
    if (!subjectId) continue;
    const [singles, multis] = await Promise.all([
      prisma.question.findMany({ where: { subjectId, status: "PUBLISHED", type: "SINGLE" }, select: { id: true } }),
      prisma.question.findMany({ where: { subjectId, status: "PUBLISHED", type: "MULTIPLE" }, select: { id: true } }),
    ]);
    const picked = [...shuffle(singles).slice(0, s.singleCount), ...shuffle(multis).slice(0, s.multipleCount)];
    items.push(...picked.map((q) => ({ id: q.id, section: subjectId })));
  }
  if (!items.length) throw new AppError("no_questions");
  const now = new Date();
  return prisma.attempt.create({
    data: {
      userId: actor.id,
      kind: "EXAM",
      templateId: template.id,
      profilePairId: pair.id,
      items,
      total: items.length,
      startedAt: now,
      deadlineAt: new Date(now.getTime() + template.durationMin * 60_000),
    },
  });
}

/** Автосохранение ответов экзамена. */
export async function saveExamAnswers(actor: CurrentUser, attemptId: string, patch: Record<string, unknown>) {
  const a = await ownAttempt(actor, attemptId);
  if (a.kind !== "EXAM") throw new AppError("forbidden", 403);
  if (a.status !== "IN_PROGRESS") throw new AppError("attempt_finished");
  if (a.deadlineAt && a.deadlineAt.getTime() + EXAM_GRACE_MS < Date.now()) {
    await finishAttempt(actor, a.id);
    throw new AppError("time_over");
  }
  const allowed = new Set((a.items as Item[]).map((i) => i.id));
  const set: Answers = {};
  const removed: string[] = [];
  for (const [qid, sel] of Object.entries(patch)) {
    if (!allowed.has(qid)) continue;
    const nums = asNums(sel).slice(0, 10);
    if (nums.length) set[qid] = nums;
    else removed.push(qid);
  }
  // атомарное слияние в БД: параллельные сохранения не затирают друг друга, после завершения запись невозможна
  const graceSec = EXAM_GRACE_MS / 1000;
  const n = await prisma.$executeRaw`
    UPDATE "Attempt"
    SET answers = (answers || ${JSON.stringify(set)}::jsonb) - ${removed}::text[]
    WHERE id = ${a.id} AND status = 'IN_PROGRESS'
      AND ("deadlineAt" IS NULL OR "deadlineAt" + make_interval(secs => ${graceSec}) > now())`;
  if (n === 0) throw new AppError("attempt_finished");
  return { savedAt: new Date().toISOString() };
}

// ───────────── Завершение и подсчёт ─────────────

export async function finishAttempt(actor: CurrentUser, attemptId: string) {
  await ownAttempt(actor, attemptId);
  // блокируем строку, чтобы автосохранение не изменило ответы между подсчётом и записью
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id = ${attemptId} FOR UPDATE`;
    const a = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    if (a.status === "FINISHED") return a;
    return finishLocked(tx, a);
  });
}

async function finishLocked(tx: Prisma.TransactionClient, a: Awaited<ReturnType<typeof prisma.attempt.findUniqueOrThrow>>) {
  const items = a.items as Item[];
  const answers = (a.answers ?? {}) as Answers;
  const qs = await tx.question.findMany({ where: { id: { in: items.map((i) => i.id) } }, select: { id: true, type: true, correct: true, topicId: true, subjectId: true } });
  const qm = new Map(qs.map((q) => [q.id, q]));

  let score = 0;
  let max = 0;
  let correctCount = 0;
  const sections: Record<string, { score: number; max: number; correct: number; total: number }> = {};
  const rows: Prisma.AttemptAnswerCreateManyInput[] = [];
  for (const it of items) {
    const q = qm.get(it.id);
    if (!q) continue;
    const sel = answers[it.id] ?? [];
    const mp = maxPointsFor(q.type);
    const { points, isCorrect } = scoreAnswer(q.type, asNums(q.correct), sel);
    score += points;
    max += mp;
    if (isCorrect) correctCount++;
    const sk = it.section;
    sections[sk] ??= { score: 0, max: 0, correct: 0, total: 0 };
    sections[sk].score += points;
    sections[sk].max += mp;
    sections[sk].total += 1;
    if (isCorrect) sections[sk].correct += 1;
    // неотвеченные в тестах по темам не считаем «ошибками» для разбора, в экзамене — считаем
    if (sel.length || a.kind === "EXAM") {
      rows.push({ attemptId: a.id, questionId: q.id, userId: a.userId, topicId: q.topicId, subjectId: q.subjectId, selected: sel, isCorrect, points, maxPoints: mp });
    }
  }
  const finishedAt = new Date();
  const end = a.deadlineAt && finishedAt > a.deadlineAt ? a.deadlineAt : finishedAt;
  const durationSec = Math.max(0, Math.round((end.getTime() - a.startedAt.getTime()) / 1000));

  // защита от двойного завершения (строка уже заблокирована FOR UPDATE)
  const res = await tx.attempt.updateMany({
    where: { id: a.id, status: "IN_PROGRESS" },
    data: { status: "FINISHED", score, maxScore: max, correctCount, total: items.length, finishedAt, durationSec, sectionScores: sections },
  });
  if (res.count > 0 && rows.length) await tx.attemptAnswer.createMany({ data: rows });
  const updated = await tx.attempt.findUniqueOrThrow({ where: { id: a.id } });

  if (a.kind === "TOPIC" && a.topicId && updated.status === "FINISHED") {
    const pct = max ? Math.round((score / max) * 100) : 0;
    const threshold = await getModuleThreshold();
    const prev = await tx.topicProgress.findUnique({ where: { userId_topicId: { userId: a.userId, topicId: a.topicId } } });
    const best = Math.max(prev?.bestPercent ?? 0, pct);
    await tx.topicProgress.upsert({
      where: { userId_topicId: { userId: a.userId, topicId: a.topicId } },
      create: { userId: a.userId, topicId: a.topicId, bestPercent: best, lastPercent: pct, completed: best >= threshold },
      update: { bestPercent: best, lastPercent: pct, completed: best >= threshold },
    });
  }
  return updated;
}

/** Результат с разбором. Доступ: владелец; учитель/родитель/админ — через проверку canViewStudent снаружи. */
export async function attemptResult(attemptId: string, locale: Locale) {
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { topic: { include: { module: { include: { subject: true } } } }, profilePair: { include: { subject1: true, subject2: true } } },
  });
  if (!a) return null;
  const items = a.items as Item[];
  const answers = (a.answers ?? {}) as Answers;
  const qs = await prisma.question.findMany({ where: { id: { in: items.map((i) => i.id) } } });
  const qm = new Map(qs.map((q) => [q.id, q]));
  const subjects = await prisma.subject.findMany({ where: { id: { in: [...new Set(items.map((i) => i.section))] } } });
  const sm = new Map(subjects.map((s) => [s.id, pickText(s, "name", locale)]));
  const questions = items
    .filter((i) => qm.has(i.id))
    .map((i) => {
      const q = qm.get(i.id)!;
      const sel = answers[i.id] ?? [];
      const r = scoreAnswer(q.type, asNums(q.correct), sel);
      return { ...revealedQuestion(q, locale), section: i.section, selected: sel, isCorrect: r.isCorrect, points: r.points, maxPoints: maxPointsFor(q.type) };
    });
  const sectionScores = (a.sectionScores ?? {}) as Record<string, { score: number; max: number; correct: number; total: number }>;
  return { attempt: a, questions, sections: Object.entries(sectionScores).map(([k, v]) => ({ key: k, name: sm.get(k) ?? "", ...v })) };
}

// ───────────── Ошибки ─────────────

export async function listMistakes(userId: string, locale: Locale, limit = 50) {
  const ids = (await wrongQuestionIds(userId)).slice(0, limit);
  if (!ids.length) return [];
  const [qs, last] = await Promise.all([
    prisma.question.findMany({ where: { id: { in: ids } }, include: { topic: true, subject: true } }),
    prisma.attemptAnswer.findMany({ where: { userId, questionId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["questionId"], select: { questionId: true, selected: true, createdAt: true } }),
  ]);
  const lm = new Map(last.map((l) => [l.questionId, l]));
  const qm = new Map(qs.map((q) => [q.id, q]));
  return ids
    .filter((id) => qm.has(id))
    .map((id) => {
      const q = qm.get(id)!;
      return {
        ...revealedQuestion(q, locale),
        selected: asNums(lm.get(id)?.selected),
        at: lm.get(id)?.createdAt ?? null,
        topicId: q.topicId,
        topic: pickText(q.topic, "title", locale),
        subject: pickText(q.subject, "name", locale),
      };
    });
}
