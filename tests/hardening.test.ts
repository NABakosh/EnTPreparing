import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as attempts from "@/server/services/attempts";
import { verifySession } from "@/server/auth/session";
import { login } from "@/server/services/auth";
import { hashPassword } from "@/server/auth/password";
import { resetPassword } from "@/server/services/users";
import { importQuestions } from "@/server/services/question-import";
import { cleanup, mkUser } from "./helpers";

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("пробный экзамен: гонки", () => {
  it("параллельные автосохранения не теряют ответы; запись после завершения отклоняется", async () => {
    const s = await mkUser("STUDENT");
    const pair = await prisma.profilePair.findFirstOrThrow();
    const ex = await attempts.startExam(s, pair.id);
    const ids = (ex.items as { id: string }[]).map((i) => i.id);
    await Promise.all(ids.slice(0, 20).map((id) => attempts.saveExamAnswers(s, ex.id, { [id]: [0] })));
    const a = await prisma.attempt.findUniqueOrThrow({ where: { id: ex.id } });
    expect(Object.keys(a.answers as object)).toHaveLength(20);
    await attempts.saveExamAnswers(s, ex.id, { [ids[0]]: [] }); // снятие ответа
    const b = await prisma.attempt.findUniqueOrThrow({ where: { id: ex.id } });
    expect(Object.keys(b.answers as object)).toHaveLength(19);
    const [f1, f2] = await Promise.all([attempts.finishAttempt(s, ex.id), attempts.finishAttempt(s, ex.id)]);
    expect(f1.score).toBe(f2.score);
    expect(await prisma.attemptAnswer.count({ where: { attemptId: ex.id } })).toBe(ids.length);
    await expect(attempts.saveExamAnswers(s, ex.id, { [ids[1]]: [1] })).rejects.toThrow("attempt_finished");
  });

  it("одновременный старт создаёт только одну активную попытку", async () => {
    const s = await mkUser("STUDENT");
    const pair = await prisma.profilePair.findFirstOrThrow();
    const [a, b] = await Promise.all([attempts.startExam(s, pair.id), attempts.startExam(s, pair.id)]);
    expect(a.id).toBe(b.id);
    expect(await prisma.attempt.count({ where: { userId: s.id, kind: "EXAM", status: "IN_PROGRESS" } })).toBe(1);
  });

  it("истёкший экзамен: сохранение после дедлайна запрещено", async () => {
    const s = await mkUser("STUDENT");
    const pair = await prisma.profilePair.findFirstOrThrow();
    const ex = await attempts.startExam(s, pair.id);
    await prisma.attempt.update({ where: { id: ex.id }, data: { deadlineAt: new Date(Date.now() - 5 * 60_000) } });
    const id = (ex.items as { id: string }[])[0].id;
    await expect(attempts.saveExamAnswers(s, ex.id, { [id]: [0] })).rejects.toThrow("time_over");
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: ex.id } })).status).toBe("FINISHED");
  });
});

describe("сессии", () => {
  it("сброс пароля отзывает старый токен", async () => {
    const admin = await mkUser("ADMIN");
    const s = await mkUser("STUDENT");
    await prisma.user.update({ where: { id: s.id }, data: { passwordHash: await hashPassword("Secret123") } });
    const { token } = await login({ login: s.login, password: "Secret123" });
    const payload = await verifySession(token);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
    expect(payload?.v).toBe(before.sessionVersion);
    await resetPassword(admin, s.id);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    await expect(login({ login: "no-such-user-xyz", password: "x" })).rejects.toThrow("invalid_credentials");
  });
});

describe("импорт вопросов", () => {
  it("буква верного ответа сопоставляется с исходной колонкой при пустом варианте", async () => {
    const admin = await mkUser("ADMIN");
    const topic = await prisma.topic.findFirstOrThrow({ include: { module: true } });
    const csv = `Тема;Текст;Вариант A;Вариант B;Вариант C;Вариант D;Верный;Объяснение\n${topic.id};Тест-импорт-пустой-B;один;;три;четыре;C;expl\n`;
    const res = await importQuestions(admin, new File(["﻿" + csv], "q.csv"));
    expect(res.errors).toEqual([]);
    const q = await prisma.question.findFirstOrThrow({ where: { textRu: "Тест-импорт-пустой-B" } });
    const opts = q.options as { ru: string }[];
    expect(opts.map((o) => o.ru)).toEqual(["один", "три", "четыре"]);
    expect(opts[(q.correct as number[])[0]].ru).toBe("три");
    expect(q.status).toBe("DRAFT");
    await prisma.question.delete({ where: { id: q.id } });
  });
});
