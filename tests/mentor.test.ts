import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { buildTsQuery, searchChunks } from "@/server/ai/search";
import { askMentor } from "@/server/services/mentor";
import { chunkText, metaFromPath } from "../scripts/ingest-books";
import { cleanup, mkUser, TAG } from "./helpers";

const BOOK = `${TAG} тестовая книга`;
afterAll(async () => {
  await prisma.bookChunk.deleteMany({ where: { book: BOOK } });
  await cleanup();
  await prisma.$disconnect();
});

describe("конвейер книг", () => {
  it("разбирает путь и режет текст на чанки с перекрытием", () => {
    expect(metaFromPath("10_класс/физика/часть_2/123.md")).toMatchObject({ grade: 10, subject: "физика", part: 2, page: 123 });
    expect(metaFromPath("без_класса/файл.md")).toBeNull();
    const para = "Предложение о законе Ома и силе тока в цепи. ".repeat(12);
    const text = `# Глава 1\n\n${para}\n\n${para}\n\n<!-- page: 7 -->\n\n${para}\n\n${para}`;
    const chunks = chunkText(text, 5);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(1400);
    expect(chunks[0].chapter).toBe("Глава 1");
    expect(chunks.at(-1)!.page).toBe(7);
  });
  it("строит tsquery и находит по FTS с фильтрами", async () => {
    expect(buildTsQuery("что такое закон Ома?")).toBe("закон:* | ома:*");
    expect(buildTsQuery("?? и")).toBeNull();
    await prisma.bookChunk.create({ data: { grade: 8, subject: "физика", book: BOOK, page: 10, text: "Закон Ома: сила тока прямо пропорциональна напряжению и обратно пропорциональна сопротивлению." } });
    expect((await searchChunks("закон Ома", { subjects: ["физика"], maxGrade: 9 })).some((c) => c.book === BOOK)).toBe(true);
    expect((await searchChunks("закон Ома", { subjects: ["физика"], maxGrade: 7 })).some((c) => c.book === BOOK)).toBe(false);
    expect((await searchChunks("закон Ома", { subjects: ["химия"] })).some((c) => c.book === BOOK)).toBe(false);
  });
});

describe("ИИ-ментор", () => {
  it("без найденных фрагментов честно отвечает «не найдено», без вызова модели", async () => {
    const s = await mkUser("STUDENT");
    const r = await askMentor(s, { question: "Зюзюкалка бурдастая квазимодо" }, "kk");
    expect(r.found).toBe(false);
    expect(r.sources).toEqual([]);
    expect(r.answer).toMatch(/оқулықтардан/);
  });
  it("без ключа API — понятная ошибка", async () => {
    const s = await mkUser("STUDENT");
    const old = process.env.CEREBRAS_API_KEY;
    process.env.CEREBRAS_API_KEY = "";
    process.env.AI_PROVIDER = "cerebras";
    const r = await askMentor(s, { question: "Что гласит закон Ома?" }, "ru").catch((e) => e);
    expect(String(r)).toMatch(/mentor_unavailable/);
    process.env.CEREBRAS_API_KEY = old;
  });
  it("лимит запросов в час и запрет для родителя", async () => {
    const s = await mkUser("STUDENT");
    await prisma.mentorLog.createMany({ data: Array.from({ length: 30 }, () => ({ userId: s.id, question: "x" })) });
    await expect(askMentor(s, { question: "Что гласит закон Ома?" }, "ru")).rejects.toThrow("mentor_rate_limited");
    const p = await mkUser("PARENT");
    await expect(askMentor(p, { question: "Что гласит закон Ома?" }, "ru")).rejects.toThrow("forbidden");
    await expect(askMentor(await mkUser("STUDENT"), { question: "a" }, "ru")).rejects.toThrow("mentor_bad_question");
  });
});
