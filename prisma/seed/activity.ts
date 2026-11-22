/** Демо-активность учеников: тесты по темам и пробные экзамены в прошлом, чтобы графики и статистика были «живыми». */
import type { PrismaClient } from "@prisma/client";
import type { CurrentUser } from "@/server/auth/current";
import * as attempts from "@/server/services/attempts";
import { rng } from "./types";

export async function seedActivity(prisma: PrismaClient) {
  const students = await prisma.user.findMany({ where: { role: "STUDENT", login: { in: ["student1", "student2", "student3", "student4", "student5"] } }, orderBy: { login: "asc" } });
  const r = rng(777);
  const skills = [0.85, 0.7, 0.6, 0.5, 0.4];
  for (const [si, s] of students.entries()) {
    if ((await prisma.attempt.count({ where: { userId: s.id } })) > 0) continue;
    const actor: CurrentUser = { id: s.id, role: "STUDENT", fullName: s.fullName, login: s.login, classId: s.classId, profilePairId: s.profilePairId, mustChangePassword: false };
    const skill = skills[si] ?? 0.6;
    const correctOf = async (id: string) => (await prisma.question.findUniqueOrThrow({ where: { id } })).correct as number[];
    const answer = async (id: string, p: number) => {
      const c = await correctOf(id);
      return r() < p ? c : [(c[0] + 1) % 4];
    };
    const backdate = async (attemptId: string, daysAgo: number) => {
      const at = new Date(Date.now() - daysAgo * 86400_000 - Math.floor(r() * 5) * 3600_000);
      const a = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
      const dur = a.kind === "EXAM" ? 9000 + Math.floor(r() * 4000) : 240 + Math.floor(r() * 400);
      await prisma.attempt.update({ where: { id: attemptId }, data: { startedAt: new Date(at.getTime() - dur * 1000), finishedAt: at, durationSec: dur, deadlineAt: a.kind === "EXAM" ? new Date(at.getTime() - dur * 1000 + 240 * 60_000) : null } });
      await prisma.attemptAnswer.updateMany({ where: { attemptId }, data: { createdAt: at } });
    };

    // тесты по темам программы
    const pair = s.profilePairId ? await prisma.profilePair.findUnique({ where: { id: s.profilePairId } }) : null;
    const topics = await prisma.topic.findMany({
      where: { module: { subject: { OR: [{ mandatory: true }, ...(pair ? [{ id: { in: [pair.subject1Id, pair.subject2Id] } }] : [])] } } },
      orderBy: [{ module: { subject: { order: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
    });
    let day = 25;
    for (const t of topics) {
      if (r() > 0.35 + skill * 0.6) continue;
      const a = await attempts.startTopicTest(actor, t.id);
      for (const it of a.items as { id: string }[]) await attempts.answerInstant(actor, a.id, it.id, await answer(it.id, skill + (r() - 0.5) * 0.3), "ru");
      await attempts.finishAttempt(actor, a.id);
      await backdate(a.id, Math.max(1, day));
      day -= 0.7;
    }
    // пробные экзамены с ростом результата
    if (pair) {
      for (const [k, daysAgo] of [21, 12, 4].entries()) {
        const ex = await attempts.startExam(actor, pair.id);
        const patch: Record<string, number[]> = {};
        for (const it of ex.items as { id: string }[]) if (r() < 0.95) patch[it.id] = await answer(it.id, Math.min(0.95, skill - 0.15 + k * 0.08));
        await attempts.saveExamAnswers(actor, ex.id, patch);
        await attempts.finishAttempt(actor, ex.id);
        await backdate(ex.id, daysAgo);
      }
    }
    // разная давность входа: student5 давно не заходил
    await prisma.user.update({ where: { id: s.id }, data: { lastLoginAt: new Date(Date.now() - (si === 4 ? 12 : si) * 86400_000) } });
  }
}
