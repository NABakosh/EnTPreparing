import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import type { CurrentUser } from "@/server/auth/current";
import { saveSubject } from "@/server/services/content";
import { importQuestions, parseCorrect } from "@/server/services/question-import";
import { listQuestions, reviewQueue, setQuestionStatus, updateQuestion } from "@/server/services/questions";
import { cleanup, mkUser, TAG } from "./helpers";

let admin: CurrentUser, teacher: CurrentUser, student: CurrentUser;
let topicId: string, subjectId: string;
const created: string[] = [];

beforeAll(async () => {
  await cleanup();
  admin = await mkUser("ADMIN");
  teacher = await mkUser("TEACHER");
  student = await mkUser("STUDENT");
  const topic = await prisma.topic.findFirstOrThrow({ include: { module: true } });
  topicId = topic.id;
  subjectId = topic.module.subjectId;
});

afterAll(async () => {
  await prisma.question.deleteMany({ where: { OR: [{ id: { in: created } }, { source: { contains: TAG } }] } });
  await cleanup();
  await prisma.$disconnect();
});

async function draft(status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  const q = await prisma.question.create({
    data: { topicId, subjectId, textRu: `Тест ${TAG}`, options: [{ ru: "1", kk: "1" }, { ru: "2", kk: "2" }], correct: [0], status, aiGenerated: true, source: TAG },
  });
  created.push(q.id);
  return q;
}

const valid = (text: string) => ({ topicId, textRu: text, options: [{ ru: "a", kk: "a" }, { ru: "b", kk: "b" }, { ru: "c", kk: "" }], correct: [0, 2] });

describe("банк вопросов и проверка", () => {
  it("учитель не может править опубликованный вопрос и создавать предметы", async () => {
    const q = await draft("PUBLISHED");
    await expect(updateQuestion(teacher, q.id, valid("x"))).rejects.toThrow("forbidden");
    await expect(setQuestionStatus(teacher, q.id, "REJECTED")).rejects.toThrow("forbidden");
    await expect(saveSubject(teacher, null, { slug: "zz-test", nameRu: "X" })).rejects.toThrow("forbidden");
  });

  it("учитель правит и публикует черновик ИИ; тип выводится из числа верных", async () => {
    const q = await draft();
    const queue = await reviewQueue(teacher, subjectId);
    expect(queue.items.some((x) => x.id === q.id)).toBe(true);
    await updateQuestion(teacher, q.id, valid("Исправлено"));
    const after = await prisma.question.findUniqueOrThrow({ where: { id: q.id } });
    expect(after.type).toBe("MULTIPLE");
    expect(after.status).toBe("DRAFT");
    await setQuestionStatus(teacher, q.id, "PUBLISHED");
    expect((await prisma.question.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("PUBLISHED");
  });

  it("неверный индекс правильного ответа отклоняется", async () => {
    const q = await draft();
    await expect(updateQuestion(admin, q.id, { ...valid("x"), correct: [5] })).rejects.toThrow("validation");
  });

  it("ученик не видит банк и очередь", async () => {
    await expect(listQuestions(student, {})).rejects.toThrow("forbidden");
    await expect(reviewQueue(student)).rejects.toThrow("forbidden");
    await expect(listQuestions(teacher, {})).rejects.toThrow("forbidden");
  });
});

describe("импорт вопросов", () => {
  it("parseCorrect", () => {
    expect(parseCorrect("A", 4)).toEqual([0]);
    expect(parseCorrect("a, c", 4)).toEqual([0, 2]);
    expect(parseCorrect("В", 4)).toEqual([1]); // кириллица
    expect(parseCorrect("2;4", 4)).toEqual([1, 3]);
    expect(parseCorrect("E", 4)).toBeNull();
    expect(parseCorrect("", 4)).toBeNull();
  });

  it("CSV с ru+kk попадает в DRAFT", async () => {
    const topic = await prisma.topic.findUniqueOrThrow({ where: { id: topicId } });
    const csv =
      "﻿Тема;Текст;Вариант A;Вариант B;Вариант C;Вариант D;Верный;Объяснение;Текст (каз);Вариант A (каз);Вариант B (каз);Вариант C (каз);Вариант D (каз);Объяснение (каз)\n" +
      `${topic.titleRu};Сколько будет 2+2?;3;4;5;6;B;Потому что 4.;2+2 неше болады?;3;4;5;6;Себебі 4.\n` +
      `${topic.id};"Выберите чётные; все";1;2;3;4;B,D;;;;;;;\n` +
      `Несуществующая тема;Текст;1;2;;;A;;;;;;;\n` +
      `${topic.id};Текст;1;2;;;Z;;;;;;;\n`;
    const res = await importQuestions(admin, new File([csv], `${TAG}.csv`));
    expect(res.created).toBe(2);
    expect(res.errors.map((e) => e.code)).toEqual(["row_topic_not_found", "row_bad_correct"]);
    const qs = await prisma.question.findMany({ where: { source: `import: ${TAG}.csv` }, orderBy: { createdAt: "asc" } });
    expect(qs).toHaveLength(2);
    const first = qs.find((q) => q.textRu.startsWith("Сколько"))!;
    expect(first.status).toBe("DRAFT");
    expect(first.textKk).toBe("2+2 неше болады?");
    expect(first.correct).toEqual([1]);
    expect(first.type).toBe("SINGLE");
    expect((first.options as { kk: string }[])[1].kk).toBe("4");
    expect(first.needsReviewKk).toBe(false);
    const second = qs.find((q) => q.textRu.startsWith("Выберите"))!;
    expect(second.correct).toEqual([1, 3]);
    expect(second.type).toBe("MULTIPLE");
    expect(second.needsReviewKk).toBe(true);
    await expect(importQuestions(teacher, new File([csv], "x.csv"))).rejects.toThrow("forbidden");
  });
});
