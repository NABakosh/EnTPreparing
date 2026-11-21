import { prisma } from "@/server/db";
import type { CurrentUser } from "@/server/auth/current";
import type { Locale } from "@/config/site";
import { pickText } from "@/server/lib/i18n-fields";
import { assertCanViewStudent, assertTeacherOfClass } from "./access";
import { getModuleThreshold } from "./settings";

const MIN_ANSWERS_FOR_WEAK = 3;
const INACTIVE_DAYS = 7;

type Agg = { correct: number; total: number };

async function aggregateBy(field: "subjectId" | "topicId", userIds: string[]) {
  const rows = await prisma.attemptAnswer.groupBy({ by: [field, "isCorrect"], where: { userId: { in: userIds } }, _count: { _all: true } });
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const k = (r as unknown as Record<string, string>)[field];
    const a = m.get(k) ?? { correct: 0, total: 0 };
    a.total += r._count._all;
    if (r.isCorrect) a.correct += r._count._all;
    m.set(k, a);
  }
  return m;
}

async function weakTopics(userIds: string[], locale: Locale, limit = 6) {
  const [byTopic, threshold] = await Promise.all([aggregateBy("topicId", userIds), getModuleThreshold()]);
  const candidates = [...byTopic.entries()]
    .filter(([, a]) => a.total >= MIN_ANSWERS_FOR_WEAK)
    .map(([id, a]) => ({ id, pct: Math.round((a.correct / a.total) * 100), total: a.total }))
    .filter((x) => x.pct < threshold)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit);
  const topics = await prisma.topic.findMany({ where: { id: { in: candidates.map((c) => c.id) } }, include: { module: { include: { subject: true } } } });
  const tm = new Map(topics.map((t) => [t.id, t]));
  return candidates
    .filter((c) => tm.has(c.id))
    .map((c) => {
      const t = tm.get(c.id)!;
      return { ...c, title: pickText(t, "title", locale), subject: pickText(t.module.subject, "name", locale) };
    });
}

/** Полная статистика ученика. Проверка доступа внутри. */
export async function studentStats(actor: CurrentUser, studentId: string, locale: Locale) {
  await assertCanViewStudent(actor, studentId);
  const [student, exams, recent, bySubject, subjects, weak, timeAgg, byTopic] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { id: true, fullName: true, lastLoginAt: true, class: { select: { name: true } } } }),
    prisma.attempt.findMany({ where: { userId: studentId, kind: "EXAM", status: "FINISHED" }, orderBy: { finishedAt: "asc" }, select: { id: true, score: true, maxScore: true, finishedAt: true, durationSec: true } }),
    prisma.attempt.findMany({
      where: { userId: studentId, status: "FINISHED" },
      orderBy: { finishedAt: "desc" },
      take: 10,
      select: { id: true, kind: true, score: true, maxScore: true, finishedAt: true, durationSec: true, topic: { select: { titleRu: true, titleKk: true } } },
    }),
    aggregateBy("subjectId", [studentId]),
    prisma.subject.findMany({ orderBy: [{ mandatory: "desc" }, { order: "asc" }] }),
    weakTopics([studentId], locale),
    prisma.attempt.aggregate({ where: { userId: studentId, status: "FINISHED" }, _sum: { durationSec: true }, _count: { _all: true } }),
    aggregateBy("topicId", [studentId]),
  ]);
  const topicIds = [...byTopic.keys()];
  const topics = await prisma.topic.findMany({ where: { id: { in: topicIds } }, include: { module: { include: { subject: true } } } });
  return {
    student,
    exams: exams.map((e) => ({ id: e.id, date: e.finishedAt!.toISOString(), score: e.score, max: e.maxScore, durationSec: e.durationSec ?? 0 })),
    recent: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      score: r.score,
      max: r.maxScore,
      pct: r.maxScore ? Math.round((r.score / r.maxScore) * 100) : 0,
      date: r.finishedAt!.toISOString(),
      durationSec: r.durationSec ?? 0,
      topic: r.topic ? pickText(r.topic, "title", locale) : null,
    })),
    subjects: subjects
      .filter((s) => bySubject.has(s.id))
      .map((s) => {
        const a = bySubject.get(s.id)!;
        return { id: s.id, name: pickText(s, "name", locale), pct: Math.round((a.correct / a.total) * 100), total: a.total };
      }),
    topics: topics
      .map((t) => {
        const a = byTopic.get(t.id)!;
        return { id: t.id, title: pickText(t, "title", locale), subject: pickText(t.module.subject, "name", locale), pct: Math.round((a.correct / a.total) * 100), total: a.total };
      })
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.pct - b.pct),
    weak,
    totalTimeSec: timeAgg._sum.durationSec ?? 0,
    attemptsCount: timeAgg._count._all,
  };
}
export type StudentStats = Awaited<ReturnType<typeof studentStats>>;

/** Статистика класса для учителя/админа. */
export async function classStats(actor: CurrentUser, classId: string, locale: Locale) {
  await assertTeacherOfClass(actor, classId);
  const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId }, include: { teachers: { select: { fullName: true } } } });
  const students = await prisma.user.findMany({
    where: { classId, role: "STUDENT" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, login: true, active: true, lastLoginAt: true },
  });
  const ids = students.map((s) => s.id);
  const [exams, progress, answersAgg, weak] = await Promise.all([
    prisma.attempt.findMany({ where: { userId: { in: ids }, kind: "EXAM", status: "FINISHED" }, orderBy: { finishedAt: "desc" }, select: { userId: true, score: true, maxScore: true } }),
    prisma.topicProgress.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _avg: { bestPercent: true }, _count: { _all: true } }),
    prisma.attemptAnswer.groupBy({ by: ["userId", "isCorrect"], where: { userId: { in: ids } }, _count: { _all: true } }),
    weakTopics(ids, locale, 8),
  ]);
  const lastExam = new Map<string, { score: number; max: number }>();
  for (const e of exams) if (!lastExam.has(e.userId)) lastExam.set(e.userId, { score: e.score, max: e.maxScore });
  const pm = new Map(progress.map((p) => [p.userId, { avg: Math.round(p._avg.bestPercent ?? 0), topics: p._count._all }]));
  const am = new Map<string, Agg>();
  for (const r of answersAgg) {
    const a = am.get(r.userId) ?? { correct: 0, total: 0 };
    a.total += r._count._all;
    if (r.isCorrect) a.correct += r._count._all;
    am.set(r.userId, a);
  }
  const cutoff = Date.now() - INACTIVE_DAYS * 86400_000;
  const rows = students.map((s) => {
    const a = am.get(s.id);
    return {
      ...s,
      lastExam: lastExam.get(s.id) ?? null,
      topicAvg: pm.get(s.id)?.avg ?? null,
      topicsTried: pm.get(s.id)?.topics ?? 0,
      correctPct: a && a.total ? Math.round((a.correct / a.total) * 100) : null,
      inactive: !s.lastLoginAt || s.lastLoginAt.getTime() < cutoff,
    };
  });
  const withExam = rows.filter((r) => r.lastExam);
  const avgExam = withExam.length ? Math.round(withExam.reduce((x, r) => x + r.lastExam!.score, 0) / withExam.length) : null;
  const withPct = rows.filter((r) => r.correctPct !== null);
  const avgCorrect = withPct.length ? Math.round(withPct.reduce((x, r) => x + r.correctPct!, 0) / withPct.length) : null;
  return { cls, rows, avgExam, avgCorrect, weak, inactive: rows.filter((r) => r.inactive) };
}

/** Дети родителя с краткой сводкой. */
export async function parentChildren(actor: CurrentUser) {
  if (actor.role !== "PARENT") return [];
  const links = await prisma.parentChild.findMany({
    where: { parentId: actor.id },
    include: { child: { select: { id: true, fullName: true, lastLoginAt: true, class: { select: { name: true } } } } },
  });
  return links.map((l) => l.child);
}
