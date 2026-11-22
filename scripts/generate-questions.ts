/**
 * Генерация черновиков вопросов в формате ҰБТ по фрагментам учебников (RAG).
 *
 *   npm run generate-questions -- --subject history-kz|all [--topic <id>] [--count 5] [--multi 0] [--lang ru|kk|both]
 *                                 [--grade 9] [--only-empty] [--min 0] [--delay 3000] [--dry-run]
 *
 * Для каждой темы ищет фрагменты (FTS по названию темы и конспекту) и просит модель создать вопросы:
 * --count с одним верным ответом и --multi с несколькими верными (для профильных предметов ҰБТ).
 * Если учебников по предмету нет — вопросы по школьной программе, источник «ИИ, без учебника».
 * Всё сохраняется как DRAFT, aiGenerated=true. Публикуются вопросы только после проверки учителем (/teacher/review).
 * --only-empty — только темы без ИИ-вопросов; --min N — только темы, где вопросов (любых) меньше N.
 */
import "dotenv/config";
import { z } from "zod";
import { BOOK_SUBJECTS } from "@/config/book-subjects";
import { chat, parseJsonLoose, withRetry } from "@/server/ai/provider";
import { searchChunks } from "@/server/ai/search";
import { prisma } from "@/server/db";
import { args, logger } from "./lib";

const qSchema = z.object({
  text_ru: z.string().min(5),
  text_kk: z.string().optional().default(""),
  options_ru: z.array(z.string().min(1)).length(4),
  options_kk: z.array(z.string()).optional().default([]),
  correct: z.union([z.number().int().min(0).max(3), z.array(z.number().int().min(0).max(3)).min(1).max(3)]),
  explanation_ru: z.string().optional().default(""),
  explanation_kk: z.string().optional().default(""),
  source: z.string().optional().default(""),
});

const HINTS: Record<string, string> = {
  "reading-literacy": "Это грамотность чтения: КАЖДЫЙ вопрос начинается с собственного короткого текста (80–150 слов) или таблицы в формате «Текст: «…»», затем сам вопрос на понимание (основная мысль, факт, вывод, значение слова, аргумент). Тексты — на темы Казахстана, науки, общества.",
  "math-literacy": "Это математическая грамотность: практические задачи из жизни (цены, скидки, расписание, карты, таблицы, вероятность) с числовыми ответами; все числа в вариантах проверь вычислением.",
  math: "Проверь каждое вычисление. Используй запись формул обычным текстом (x², √, ≤).",
  physics: "Проверь каждое вычисление и единицы измерения СИ.",
  chemistry: "Проверь формулы веществ и уравнения реакций.",
};

async function main() {
  const a = args();
  const log = logger("generate");
  const count = Math.min(Math.max(Number(a.count ?? 5), 0), 20);
  const multi = Math.min(Math.max(Number(a.multi ?? 0), 0), 10);
  const lang = String(a.lang ?? "both");
  const delay = Number(a.delay ?? 3000);
  const subjectWhere = a.subject && a.subject !== "all" ? { slug: String(a.subject) } : undefined;
  if (!subjectWhere && !a.topic && a.subject !== "all") throw new Error("Укажите --subject <slug>|all или --topic <id>");
  let topics = await prisma.topic.findMany({
    where: a.topic
      ? { id: String(a.topic) }
      : { module: { subject: subjectWhere ?? {} }, ...(a["only-empty"] ? { questions: { none: { aiGenerated: true } } } : {}) },
    include: { module: { include: { subject: true } }, _count: { select: { questions: true } } },
    orderBy: [{ module: { subject: { order: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
  });
  if (a.min) topics = topics.filter((t) => t._count.questions < Number(a.min));
  log(`Тем: ${topics.length}, на тему: ${count} одиночных + ${multi} множественных, язык: ${lang}`);
  let created = 0;
  for (const t of topics) {
    const slug = t.module.subject.slug;
    const subjects = BOOK_SUBJECTS[slug] ?? [];
    const maxGrade = a.grade ? Number(a.grade) : null;
    const chunks = subjects.length ? await searchChunks(`${t.titleRu} ${t.summaryRu}`, { subjects, maxGrade, limit: 6 }) : [];
    const ctx = chunks.map((c, i) => `[${i + 1}] ${c.book}${c.page ? `, стр. ${c.page}` : ""}\n${c.text}`).join("\n\n---\n\n");
    const langRule = lang === "kk" ? "Пиши *_kk на казахском, *_ru — перевод на русский." : lang === "both" ? "Заполни и *_ru, и *_kk (казахский, кириллица)." : "Заполни поля *_ru; *_kk оставь пустыми.";
    const basis = chunks.length
      ? `Используй ТОЛЬКО факты из фрагментов учебников ниже (это OCR — исправляй очевидные опечатки). В поле source укажи «учебник, стр.» из фрагмента.\n\nФрагменты:\n${ctx}`
      : t.theoryRu
        ? `Опирайся на конспект темы ниже и школьную программу Казахстана; только общепринятые факты. source: «ИИ, без учебника».\n\nКонспект:\n${t.theoryRu.slice(0, 4000)}`
        : `Опирайся на школьную программу Казахстана; только общепринятые, проверяемые факты. source: «ИИ, без учебника».`;
    const prompt = `Составь тестовые задания в формате ҰБТ по теме «${t.titleRu}» (${t.module.subject.nameRu}):
- ${count} заданий с ОДНИМ верным ответом (correct — число 0–3);
- ${multi} заданий с НЕСКОЛЬКИМИ верными ответами (2–3 верных, correct — массив индексов; в тексте напиши «Выберите все верные ответы»).
У каждого задания ровно 4 варианта, дистракторы правдоподобные, без «все ответы верны». Объяснение 1–2 предложения.
${HINTS[slug] ?? ""}
${langRule}
${basis}

Ответ — JSON {"questions":[{"text_ru":"","text_kk":"","options_ru":["","","",""],"options_kk":["","","",""],"correct":0,"explanation_ru":"","explanation_kk":"","source":""}]}`;
    try {
      const parsed = await withRetry(async () => {
        const raw = await chat(
          [
            { role: "system", content: "Ты составляешь проверенные тестовые задания ҰБТ для школьников Казахстана. Каждый верный ответ перепроверяй. Формулы — обычным текстом (x², √), без LaTeX. Отвечай только JSON." },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.4, maxTokens: 8000, timeoutMs: 150_000 },
        );
        return parseJsonLoose<{ questions?: unknown[] }>(raw);
      });
      const valid = (parsed.questions ?? []).map((x) => qSchema.safeParse(x)).filter((r) => r.success).map((r) => r.data!);
      log(`[${t.module.subject.nameRu} / ${t.titleRu}] получено ${parsed.questions?.length ?? 0}, валидных ${valid.length}${chunks.length ? "" : " (без учебника)"}`);
      if (a["dry-run"]) {
        log(valid);
      } else {
        for (const v of valid) {
          const correct0 = Array.isArray(v.correct) ? [...new Set(v.correct)] : [v.correct];
          // перемешиваем варианты: модели часто ставят верный ответ первым
          const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
          const opts = v.options_ru.map((ru, i) => ({ ru, kk: v.options_kk[i] ?? "" }));
          const options = order.map((i) => opts[i]);
          const correct = correct0.map((c) => order.indexOf(c)).sort((x, y) => x - y);
          await prisma.question.create({
            data: {
              topicId: t.id,
              subjectId: t.module.subjectId,
              textRu: v.text_ru,
              textKk: v.text_kk,
              options,
              correct,
              type: correct.length > 1 ? "MULTIPLE" : "SINGLE",
              explanationRu: v.explanation_ru,
              explanationKk: v.explanation_kk,
              status: "DRAFT",
              aiGenerated: true,
              needsReviewKk: Boolean(v.text_kk),
              source: `AI: ${v.source || (chunks[0]?.book ?? "без учебника")}`.slice(0, 300),
            },
          });
          created++;
        }
      }
    } catch (e) {
      log(`[${t.titleRu}] ОШИБКА: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, delay)); // пауза между темами (лимиты API)
  }
  log(`Готово. Создано черновиков: ${created}. Проверьте их в /teacher/review.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
