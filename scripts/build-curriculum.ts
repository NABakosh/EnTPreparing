/**
 * Достраивает программу подготовки к ҰБТ: недостающие модули/темы по спецификации + конспекты из учебников (RAG).
 *
 *   npm run build-curriculum -- --subject history-kz|all [--max-topics 24] [--theory-only] [--dry-run] [--delay 2000]
 *
 * 1. Модель предлагает структуру предмета по спецификации ҰБТ (модули → темы), уже существующие темы не дублируются.
 * 2. Для новых тем и тем без теории пишется конспект (ru + kk) по найденным фрагментам учебников.
 *    Если учебников по предмету нет — конспект пишется по знаниям модели и помечается «ИИ, без учебника».
 * Новые темы помечаются aiGenerated=true и needsReviewKk=true. Вопросы — отдельно: npm run generate-questions.
 */
import "dotenv/config";
import { z } from "zod";
import { BOOK_SUBJECTS } from "@/config/book-subjects";
import { chat, parseJsonLoose, withRetry } from "@/server/ai/provider";
import { searchChunks } from "@/server/ai/search";
import { prisma } from "@/server/db";
import { args, logger } from "./lib";

/** Предметы, которые должны быть на платформе (создаются, если их нет). */
export const EXTRA_SUBJECTS = [
  { slug: "biology", nameRu: "Биология", nameKk: "Биология", order: 13 },
  { slug: "chemistry", nameRu: "Химия", nameKk: "Химия", order: 14 },
];
export const EXTRA_PAIRS: [string, string][] = [["biology", "chemistry"]];

const structSchema = z.object({
  modules: z
    .array(
      z.object({
        titleRu: z.string().min(2),
        titleKk: z.string().default(""),
        topics: z.array(z.object({ titleRu: z.string().min(2), titleKk: z.string().default(""), grade: z.coerce.number().int().min(5).max(11).optional() })).min(1),
      }),
    )
    .min(1),
});

const theorySchema = z.object({
  theory_ru: z.string().min(200),
  theory_kk: z.string().default(""),
  summary_ru: z.string().min(10),
  summary_kk: z.string().default(""),
});

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function similar(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return x === y || (x.length > 6 && y.includes(x)) || (y.length > 6 && x.includes(y));
}

const SUBJECT_HINT: Record<string, string> = {
  "math-literacy": "Математическая грамотность в ҰБТ — практические задачи: проценты, пропорции, единицы измерения, чтение таблиц и диаграмм, вероятность, логика, геометрия в быту.",
  "reading-literacy": "Грамотность чтения в ҰБТ — понимание текста: основная мысль, факты, вывод, значение слов, аргументация, нелинейные тексты (таблицы, графики), сравнение текстов.",
};

async function ensureSubjects(log: (...a: unknown[]) => void) {
  for (const s of EXTRA_SUBJECTS) {
    const ex = await prisma.subject.findUnique({ where: { slug: s.slug } });
    if (!ex) {
      await prisma.subject.create({ data: { ...s, mandatory: false } });
      log(`Создан предмет ${s.nameRu}`);
    }
  }
  for (const [a, b] of EXTRA_PAIRS) {
    const [s1, s2] = await Promise.all([prisma.subject.findUniqueOrThrow({ where: { slug: a } }), prisma.subject.findUniqueOrThrow({ where: { slug: b } })]);
    await prisma.profilePair.upsert({ where: { subject1Id_subject2Id: { subject1Id: s1.id, subject2Id: s2.id } }, create: { subject1Id: s1.id, subject2Id: s2.id, order: 10 }, update: {} });
  }
}

async function buildStructure(subjectId: string, maxTopics: number, a: Record<string, string | boolean>, log: (...x: unknown[]) => void) {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId }, include: { modules: { include: { topics: true }, orderBy: { order: "asc" } } } });
  const existing = subject.modules.flatMap((m) => m.topics.map((t) => t.titleRu));
  const prompt = `Составь программу подготовки к ҰБТ (Казахстан, спецификация НЦТ) по предмету «${subject.nameRu}».
${SUBJECT_HINT[subject.slug] ?? ""}
Нужно 4–6 модулей, всего не более ${maxTopics} тем, покрывающих ВСЕ темы спецификации ҰБТ по предмету. Темы конкретные (одна тема — один урок/параграф).
Уже есть темы (не повторяй их, но можешь включить их модули): ${existing.join("; ") || "нет"}.
Названия на русском и казахском, в терминологии казахстанских школьных учебников (например «соударения», а не «коллизии»). grade — класс, где тема изучается (5–11).
Ответ JSON: {"modules":[{"titleRu":"","titleKk":"","topics":[{"titleRu":"","titleKk":"","grade":9}]}]}`;
  const raw = await withRetry(() => chat([{ role: "system", content: "Ты методист, эксперт по ҰБТ и школьной программе Казахстана. Отвечай только JSON." }, { role: "user", content: prompt }], { json: true, temperature: 0.3, maxTokens: 5000, timeoutMs: 120_000 }));
  const parsed = structSchema.safeParse(parseJsonLoose(raw));
  if (!parsed.success) throw new Error("структура: неверный JSON");
  let created = 0;
  let order = subject.modules.length;
  for (const m of parsed.data.modules) {
    const newTopics = m.topics.filter((t) => !existing.some((e) => similar(e, t.titleRu)));
    if (!newTopics.length) continue;
    let mod = subject.modules.find((x) => similar(x.titleRu, m.titleRu));
    if (a["dry-run"]) {
      log(`  [dry] ${m.titleRu}: ${newTopics.map((t) => t.titleRu).join("; ")}`);
      continue;
    }
    if (!mod) mod = { ...(await prisma.module.create({ data: { subjectId, titleRu: m.titleRu, titleKk: m.titleKk, order: order++ } })), topics: [] };
    let tOrder = await prisma.topic.count({ where: { moduleId: mod.id } });
    for (const t of newTopics) {
      await prisma.topic.create({ data: { moduleId: mod.id, titleRu: t.titleRu, titleKk: t.titleKk, grade: t.grade ?? null, order: tOrder++, aiGenerated: true, needsReviewKk: true } });
      existing.push(t.titleRu);
      created++;
    }
  }
  log(`  ${subject.nameRu}: новых тем ${created}`);
}

async function writeTheory(topicId: string, log: (...x: unknown[]) => void) {
  const t = await prisma.topic.findUniqueOrThrow({ where: { id: topicId }, include: { module: { include: { subject: true } } } });
  const subjects = BOOK_SUBJECTS[t.module.subject.slug] ?? [];
  const chunks = subjects.length ? await searchChunks(`${t.titleRu} ${t.module.titleRu}`, { subjects, limit: 6 }) : [];
  const ctx = chunks.map((c, i) => `[${i + 1}] ${c.book}${c.page ? `, стр. ${c.page}` : ""}\n${c.text}`).join("\n\n---\n\n");
  const base = chunks.length
    ? `Используй ТОЛЬКО факты из фрагментов учебников ниже (текст после OCR, исправляй очевидные опечатки распознавания). Не добавляй фактов, которых нет во фрагментах.\n\nФрагменты:\n${ctx}`
    : `Учебников по теме нет — опирайся на школьную программу Казахстана, пиши только общепринятые, проверяемые факты.`;
  const prompt = `Напиши конспект темы «${t.titleRu}» (${t.module.subject.nameRu}, модуль «${t.module.titleRu}») для подготовки к ҰБТ.
Формат: markdown, 250–450 слов, заголовки ##, списки, ключевые даты/формулы/термины выделяй **жирным**, в конце — 1–2 типичные ловушки ҰБТ.
summary — 1–2 предложения. Дай версии на русском (*_ru) и казахском (*_kk, кириллица).
${base}
Ответ JSON: {"theory_ru":"","theory_kk":"","summary_ru":"","summary_kk":""}`;
  const raw = await withRetry(() => chat([{ role: "system", content: "Ты опытный учитель, готовишь школьников Казахстана к ҰБТ. Отвечай только JSON." }, { role: "user", content: prompt }], { json: true, temperature: 0.3, maxTokens: 6000, timeoutMs: 150_000 }));
  const parsed = theorySchema.safeParse(parseJsonLoose(raw));
  if (!parsed.success) throw new Error("конспект: неверный JSON");
  const pages = [...new Set(chunks.filter((c) => c.page).map((c) => `${c.book}, стр. ${c.page}`))].slice(0, 4).join("; ");
  await prisma.topic.update({
    where: { id: t.id },
    data: {
      theoryRu: parsed.data.theory_ru,
      theoryKk: parsed.data.theory_kk,
      summaryRu: parsed.data.summary_ru,
      summaryKk: parsed.data.summary_kk,
      sourceBook: chunks.length ? "ИИ-конспект по учебникам" : "ИИ-конспект, без учебника",
      sourcePages: pages || null,
      needsReviewKk: true,
    },
  });
  log(`    конспект: ${t.titleRu} (${chunks.length ? `${chunks.length} фрагм.` : "без учебника"})`);
}

async function main() {
  const a = args();
  const log = logger("curriculum");
  const delay = Number(a.delay ?? 2000);
  if (!a["dry-run"]) await ensureSubjects(log);
  const subjects = await prisma.subject.findMany({ where: a.subject && a.subject !== "all" ? { slug: String(a.subject) } : {}, orderBy: { order: "asc" } });
  for (const s of subjects) {
    log(`== ${s.nameRu}`);
    if (!a["theory-only"]) {
      try {
        await buildStructure(s.id, Number(a["max-topics"] ?? 24), a, log);
      } catch (e) {
        log(`  ОШИБКА структуры: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
    if (a["dry-run"]) continue;
    const topics = await prisma.topic.findMany({ where: { module: { subjectId: s.id }, theoryRu: "" }, orderBy: [{ module: { order: "asc" } }, { order: "asc" }] });
    for (const t of topics) {
      try {
        await writeTheory(t.id, log);
      } catch (e) {
        log(`    ОШИБКА конспекта ${t.titleRu}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  log("Готово. Дальше: npm run generate-questions -- --subject all --only-empty");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
