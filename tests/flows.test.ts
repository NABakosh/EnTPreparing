import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import * as attempts from "@/server/services/attempts";
import { canViewStudent } from "@/server/services/access";
import { studentStats, classStats } from "@/server/services/stats";
import { createUserManual, resetPassword } from "@/server/services/users";
import { cleanup, mkUser } from "./helpers";

let classA: string, classB: string;
let student: CurrentUser, other: CurrentUser, teacherA: CurrentUser, teacherB: CurrentUser, parent: CurrentUser, admin: CurrentUser;

beforeAll(async () => {
  await cleanup();
  classA = (await prisma.class.create({ data: { name: "99А", grade: 11 } })).id;
  classB = (await prisma.class.create({ data: { name: "99Б", grade: 11 } })).id;
  student = await mkUser("STUDENT", { classId: classA });
  other = await mkUser("STUDENT", { classId: classB });
  teacherA = await mkUser("TEACHER");
  teacherB = await mkUser("TEACHER");
  parent = await mkUser("PARENT");
  admin = await mkUser("ADMIN");
  await prisma.class.update({ where: { id: classA }, data: { teachers: { connect: { id: teacherA.id } } } });
  await prisma.class.update({ where: { id: classB }, data: { teachers: { connect: { id: teacherB.id } } } });
  await prisma.parentChild.create({ data: { parentId: parent.id, childId: student.id } });
});
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function correctOf(id: string) {
  const q = await prisma.question.findUniqueOrThrow({ where: { id } });
  return q.correct as number[];
}

describe("тест по теме", () => {
  it("проходит целиком: мгновенная проверка, итог, прогресс", async () => {
    const topic = await prisma.topic.findFirstOrThrow({ where: { questions: { some: { status: "PUBLISHED" } } } });
    const a = await attempts.startTopicTest(student, topic.id);
    const items = a.items as { id: string }[];
    expect(items.length).toBeGreaterThan(0);
    for (const [i, it] of items.entries()) {
      const correct = await correctOf(it.id);
      // первый вопрос отвечаем неверно, остальные верно
      const sel = i === 0 ? [(correct[0] + 1) % 4] : correct;
      const r = await attempts.answerInstant(student, a.id, it.id, sel, "ru");
      expect(r.isCorrect).toBe(i !== 0);
      expect(r.correct).toEqual(correct);
    }
    // повторный ответ не меняет сохранённый
    const again = await attempts.answerInstant(student, a.id, items[0].id, await correctOf(items[0].id), "ru");
    expect(again.isCorrect).toBe(false);
    const done = await attempts.finishAttempt(student, a.id);
    expect(done.status).toBe("FINISHED");
    expect(done.correctCount).toBe(items.length - 1);
    const p = await prisma.topicProgress.findUniqueOrThrow({ where: { userId_topicId: { userId: student.id, topicId: topic.id } } });
    expect(p.bestPercent).toBe(Math.round((done.score / done.maxScore) * 100));
    expect(p.completed).toBe(p.bestPercent >= 60);
    // повторное завершение идемпотентно
    const again2 = await attempts.finishAttempt(student, a.id);
    expect(await prisma.attemptAnswer.count({ where: { attemptId: a.id } })).toBe(items.length);
    expect(again2.score).toBe(done.score);
  });

  it("ошибка попадает в разбор и исчезает после верного ответа", async () => {
    const wrong = await attempts.wrongQuestionIds(student.id);
    expect(wrong.length).toBe(1);
    const r = await attempts.startReview(student);
    const qid = (r.items as { id: string }[])[0].id;
    await attempts.answerInstant(student, r.id, qid, await correctOf(qid), "ru");
    await attempts.finishAttempt(student, r.id);
    expect(await attempts.wrongQuestionIds(student.id)).toEqual([]);
    await expect(attempts.startReview(student)).rejects.toThrow("no_mistakes");
  });

  it("чужую попытку нельзя ни читать, ни отвечать", async () => {
    const topic = await prisma.topic.findFirstOrThrow({ where: { questions: { some: { status: "PUBLISHED" } } } });
    const a = await attempts.startTopicTest(student, topic.id);
    await expect(attempts.getAttemptForRun(other, a.id, "ru")).rejects.toBeInstanceOf(AppError);
    await expect(attempts.finishAttempt(other, a.id)).rejects.toBeInstanceOf(AppError);
  });

  it("ученику не отдаются верные ответы до ответа", async () => {
    const topic = await prisma.topic.findFirstOrThrow({ where: { questions: { some: { status: "PUBLISHED" } } } });
    const a = await attempts.startTopicTest(student, topic.id);
    const run = await attempts.getAttemptForRun(student, a.id, "kk");
    for (const q of run.questions) expect("correct" in q).toBe(false);
  });
});

describe("пробный экзамен", () => {
  it("120 заданий по структуре, автосохранение, подсчёт до 140", async () => {
    const pair = await prisma.profilePair.findFirstOrThrow({ include: { subject1: true, subject2: true } });
    const ex = await attempts.startExam(student, pair.id);
    const items = ex.items as { id: string; section: string }[];
    expect(items.length).toBe(120);
    const per = items.reduce<Record<string, number>>((m, i) => ((m[i.section] = (m[i.section] ?? 0) + 1), m), {});
    expect(per[pair.subject1Id]).toBe(40);
    expect(per[pair.subject2Id]).toBe(40);
    expect(ex.deadlineAt!.getTime() - ex.startedAt.getTime()).toBe(240 * 60_000);
    // повторный старт возвращает ту же попытку
    expect((await attempts.startExam(student, pair.id)).id).toBe(ex.id);
    // экзамен без мгновенной проверки
    await expect(attempts.answerInstant(student, ex.id, items[0].id, [0], "ru")).rejects.toBeInstanceOf(AppError);
    const patch: Record<string, number[]> = {};
    for (const it of items) patch[it.id] = await correctOf(it.id);
    patch["чужой-id"] = [1];
    await attempts.saveExamAnswers(student, ex.id, patch);
    const saved = await prisma.attempt.findUniqueOrThrow({ where: { id: ex.id } });
    expect(Object.keys(saved.answers as object)).toHaveLength(120);
    const done = await attempts.finishAttempt(student, ex.id);
    expect(done.maxScore).toBe(140);
    expect(done.score).toBe(140);
    await expect(attempts.saveExamAnswers(student, ex.id, {})).rejects.toThrow("attempt_finished");
    const stats = await studentStats(student, student.id, "ru");
    expect(stats.exams.at(-1)?.score).toBe(140);
  });
});

describe("права доступа", () => {
  it("видимость данных ученика", async () => {
    expect(await canViewStudent(student, student.id)).toBe(true);
    expect(await canViewStudent(other, student.id)).toBe(false);
    expect(await canViewStudent(teacherA, student.id)).toBe(true);
    expect(await canViewStudent(teacherB, student.id)).toBe(false);
    expect(await canViewStudent(parent, student.id)).toBe(true);
    expect(await canViewStudent(parent, other.id)).toBe(false);
    expect(await canViewStudent(admin, other.id)).toBe(true);
    await expect(studentStats(teacherB, student.id, "ru")).rejects.toThrow("forbidden");
    await expect(classStats(teacherB, classA, "ru")).rejects.toThrow("forbidden");
  });

  it("учитель создаёт только учеников/родителей своего класса", async () => {
    await expect(createUserManual(teacherA, { fullName: "Новый Учитель", role: "TEACHER" })).rejects.toThrow("forbidden");
    await expect(createUserManual(teacherA, { fullName: "Чужой Ученик", role: "STUDENT", classId: classB })).rejects.toThrow("forbidden");
    const created = await createUserManual(teacherA, { fullName: "Свой Ученик", role: "STUDENT", classId: classA, parentFullName: "Свой Родитель" });
    expect(created.map((c) => c.role)).toEqual(["STUDENT", "PARENT"]);
    expect(created[0].password).toHaveLength(8);
    const u = await prisma.user.findUniqueOrThrow({ where: { login: created[0].login } });
    expect(u.passwordHash).not.toContain(created[0].password);
    expect(u.mustChangePassword).toBe(true);
    await prisma.user.deleteMany({ where: { login: { in: created.map((c) => c.login) } } });
  });

  it("сброс пароля: учитель — только своих", async () => {
    await expect(resetPassword(teacherA, other.id)).rejects.toThrow("forbidden");
    await expect(resetPassword(teacherA, admin.id)).rejects.toThrow("forbidden");
    const c = await resetPassword(teacherA, student.id);
    expect(c.password).toHaveLength(8);
    await expect(resetPassword(student, student.id)).rejects.toThrow("forbidden");
  });
});
