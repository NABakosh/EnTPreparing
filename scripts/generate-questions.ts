/**
 * Генерация черновиков вопросов в формате ҰБТ по фрагментам учебников.
 *
 *   npm run generate-questions -- --subject history-kz [--topic <id>] [--count 5] [--lang ru|kk|both] [--grade 9] [--only-empty] [--delay 3000] [--dry-run]
 *
 * Для каждой темы ищет фрагменты (FTS по названию темы), просит модель создать вопросы
 * (4 варианта, 1 верный, объяснение, ссылка на источник) и сохраняет как DRAFT, aiGenerated=true.
 * Публикуются вопросы только после проверки учителем (/teacher/review).
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
  correct: z.number().int().min(0).max(3),
  explanation_ru: z.string().optional().default(""),
  explanation_kk: z.string().optional().default(""),
  source: z.string().optional().default(""),
});

async function main() {
  const a = args();
  const log = logger("generate");
  const count = Math.min(Math.max(Number(a.count ?? 5), 1), 20);
  const lang = String(a.lang ?? "ru");
  const subject = a.subject ? await prisma.subject.findUnique({ where: { slug: String(a.subject) } }) : null;
  if (!subject && !a.topic) throw new Error("Укажите --subject <slug> или --topic <id>");
  const topics = await prisma.topic.findMany({
    where: a.topic ? { id: String(a.topic) } : { module: { subjectId: subject!.id }, ...(a["only-empty"] ? { questions: { none: { aiGenerated: true } } } : {}) },
    include: { module: { include: { subject: true } } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });
  log(`Тем: ${topics.length}, вопросов на тему: ${count}, язык: ${lang}`);
  let created = 0;
  for (const t of topics) {
    const subjects = BOOK_SUBJECTS[t.module.subject.slug] ?? [];
    // учебники 8–11 классов: класс темы не ограничивает поиск, только явный --grade
    const maxGrade = a.grade ? Number(a.grade) : null;
    const chunks = await searchChunks(`${t.titleRu} ${t.summaryRu}`, { subjects, maxGrade, limit: 6 });
    if (!chunks.length) {
      log(`[${t.titleRu}] фрагменты не найдены — пропуск`);
      continue;
    }
    const ctx = chunks.map((c, i) => `[${i + 1}] ${c.book}, ${c.grade} класс${c.page ? `, стр. ${c.page}` : ""}\n${c.text}`).join("\n\n---\n\n");
    const langRule = lang === "kk" ? "Пиши поля *_kk на казахском, *_ru — перевод на русский." : lang === "both" ? "Заполни и *_ru, и *_kk (казахский)." : "Заполни поля *_ru; *_kk оставь пустыми.";
    const prompt = `Составь ${count} тестовых заданий в формате ҰБТ по теме «${t.titleRu}» (${t.module.subject.nameRu}).
Используй ТОЛЬКО факты из фрагментов ниже. У каждого задания ровно 4 варианта и ровно 1 верный; дистракторы правдоподобные. Объяснение 1–2 предложения. В поле source укажи «учебник, класс, стр.» из фрагмента.
${langRule}
Ответ — JSON-объект {"questions":[{"text_ru":"","text_kk":"","options_ru":["","","",""],"options_kk":[],"correct":0,"explanation_ru":"","explanation_kk":"","source":""}]}

Фрагменты:
${ctx}`;
    try {
      const raw = await withRetry(() => chat([{ role: "system", content: "Ты составляешь проверенные тестовые задания для школьников Казахстана. Отвечай только JSON." }, { role: "user", content: prompt }], { json: true, temperature: 0.4, maxTokens: 4000, timeoutMs: 90_000 }));
      const parsed = parseJsonLoose<{ questions?: unknown[] }>(raw);
      const valid = (parsed.questions ?? []).map((x) => qSchema.safeParse(x)).filter((r) => r.success).map((r) => r.data!);
      log(`[${t.titleRu}] получено ${parsed.questions?.length ?? 0}, валидных ${valid.length}`);
      if (a["dry-run"]) {
        log(valid);
        continue;
      }
      for (const v of valid) {
        // перемешиваем варианты: модели часто ставят верный ответ первым
        const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        const opts = v.options_ru.map((ru, i) => ({ ru, kk: v.options_kk[i] ?? "" }));
        v.options_ru = order.map((i) => opts[i].ru);
        v.options_kk = order.map((i) => opts[i].kk);
        v.correct = order.indexOf(v.correct);
        await prisma.question.create({
          data: {
            topicId: t.id,
            subjectId: t.module.subjectId,
            textRu: v.text_ru,
            textKk: v.text_kk,
            options: v.options_ru.map((ru, i) => ({ ru, kk: v.options_kk[i] ?? "" })),
            correct: [v.correct],
            type: "SINGLE",
            explanationRu: v.explanation_ru,
            explanationKk: v.explanation_kk,
            status: "DRAFT",
            aiGenerated: true,
            needsReviewKk: Boolean(v.text_kk),
            source: `AI: ${v.source || chunks[0].book}`.slice(0, 300),
          },
        });
        created++;
      }
    } catch (e) {
      log(`[${t.titleRu}] ОШИБКА: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, Number(a.delay ?? 3000))); // пауза между темами (лимиты API)
  }
  log(`Готово. Создано черновиков: ${created}. Проверьте их в /teacher/review.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
