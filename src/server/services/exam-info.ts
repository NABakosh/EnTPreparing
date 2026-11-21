import { prisma } from "@/server/db";
import type { Locale } from "@/config/site";
import { maxPointsFor } from "@/config/scoring";
import { pickText } from "@/server/lib/i18n-fields";

/** Описание шаблона экзамена и наличие вопросов для каждой пары. */
export async function examOverview(userId: string, locale: Locale) {
  const template = await prisma.examTemplate.findFirst({ where: { active: true }, include: { sections: { orderBy: { order: "asc" }, include: { subject: true } } } });
  const pairs = await prisma.profilePair.findMany({ where: { active: true }, include: { subject1: true, subject2: true }, orderBy: { order: "asc" } });
  const counts = await prisma.question.groupBy({ by: ["subjectId", "type"], where: { status: "PUBLISHED" }, _count: { _all: true } });
  const cnt = (subjectId: string, type: "SINGLE" | "MULTIPLE") => counts.find((c) => c.subjectId === subjectId && c.type === type)?._count._all ?? 0;
  const history = await prisma.attempt.findMany({
    where: { userId, kind: "EXAM", status: "FINISHED" },
    orderBy: { finishedAt: "desc" },
    take: 20,
    select: { id: true, score: true, maxScore: true, finishedAt: true, durationSec: true, profilePair: { include: { subject1: true, subject2: true } } },
  });
  const pairName = (p: { subject1: { nameRu: string; nameKk: string }; subject2: { nameRu: string; nameKk: string } }) =>
    `${pickText(p.subject1, "name", locale)} — ${pickText(p.subject2, "name", locale)}`;

  if (!template) return { template: null, pairs: [], history: [] };
  const sections = template.sections.map((s) => ({
    slot: s.slot,
    name: s.subject ? pickText(s.subject, "name", locale) : null,
    subjectId: s.subjectId,
    single: s.singleCount,
    multiple: s.multipleCount,
    points: s.singleCount * maxPointsFor("SINGLE") + s.multipleCount * maxPointsFor("MULTIPLE"),
  }));
  const enough = (subjectId: string, single: number, multiple: number) => cnt(subjectId, "SINGLE") >= single && cnt(subjectId, "MULTIPLE") >= multiple;
  const fixedOk = sections.filter((s) => s.slot === "FIXED").every((s) => enough(s.subjectId!, s.single, s.multiple));
  const p1 = sections.find((s) => s.slot === "PROFILE_1");
  const p2 = sections.find((s) => s.slot === "PROFILE_2");
  return {
    template: {
      durationMin: template.durationMin,
      total: sections.reduce((a, s) => a + s.single + s.multiple, 0),
      points: sections.reduce((a, s) => a + s.points, 0),
      sections,
    },
    pairs: pairs.map((p) => ({
      id: p.id,
      name: pairName(p),
      complete: fixedOk && (!p1 || enough(p.subject1Id, p1.single, p1.multiple)) && (!p2 || enough(p.subject2Id, p2.single, p2.multiple)),
    })),
    history: history.map((h) => ({ id: h.id, score: h.score, max: h.maxScore, date: h.finishedAt!.toISOString(), durationSec: h.durationSec ?? 0, pair: h.profilePair ? pairName(h.profilePair) : "" })),
  };
}
