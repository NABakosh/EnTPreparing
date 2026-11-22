/**
 * Казахские черновики из русских текстов: теория/резюме тем и вопросы с пустыми *Kk.
 *
 *   npm run translate-kk -- [--what topics|questions|all] [--limit 20] [--dry-run]
 *
 * Всё переведённое помечается needsReviewKk=true — до проверки носителем.
 */
import "dotenv/config";
import { chat, parseJsonLoose, withRetry } from "@/server/ai/provider";
import { prisma } from "@/server/db";
import { args, logger } from "./lib";

const SYSTEM = "Ты профессиональный переводчик учебных материалов с русского на казахский язык (кириллица). Сохраняй markdown, формулы, числа и термины школьной программы Казахстана. Отвечай только JSON.";

async function translate(fields: Record<string, string>): Promise<Record<string, string>> {
  const raw = await withRetry(() =>
    chat([{ role: "system", content: SYSTEM }, { role: "user", content: `Переведи значения JSON на казахский, ключи не меняй:\n${JSON.stringify(fields)}` }], { json: true, temperature: 0.1, maxTokens: 6000, timeoutMs: 120_000 }),
  );
  return parseJsonLoose<Record<string, string>>(raw);
}

async function main() {
  const a = args();
  const log = logger("translate-kk");
  const what = String(a.what ?? "all");
  const limit = Number(a.limit ?? 20);
  let done = 0;
  if (what === "topics" || what === "all") {
    const topics = await prisma.topic.findMany({ where: { OR: [{ theoryKk: "" }, { summaryKk: "" }, { titleKk: "" }], NOT: { theoryRu: "" } }, take: limit });
    for (const t of topics) {
      try {
        const src: Record<string, string> = {};
        if (!t.titleKk) src.title = t.titleRu;
        if (!t.theoryKk) src.theory = t.theoryRu;
        if (!t.summaryKk && t.summaryRu) src.summary = t.summaryRu;
        const tr = await translate(src);
        log(`тема «${t.titleRu}» переведена`);
        if (!a["dry-run"])
          await prisma.topic.update({
            where: { id: t.id },
            data: { titleKk: t.titleKk || tr.title || "", theoryKk: t.theoryKk || tr.theory || "", summaryKk: t.summaryKk || tr.summary || "", needsReviewKk: true },
          });
        done++;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        log(`тема ${t.id}: ОШИБКА ${(e as Error).message}`);
      }
    }
  }
  if (what === "questions" || what === "all") {
    const qs = await prisma.question.findMany({ where: { textKk: "" }, take: limit });
    for (const q of qs) {
      try {
        const opts = q.options as { ru: string; kk: string }[];
        const src: Record<string, string> = { text: q.textRu, explanation: q.explanationRu };
        opts.forEach((o, i) => (src[`o${i}`] = o.ru));
        const tr = await translate(src);
        if (!a["dry-run"])
          await prisma.question.update({
            where: { id: q.id },
            data: {
              textKk: tr.text ?? "",
              explanationKk: q.explanationKk || tr.explanation || "",
              options: opts.map((o, i) => ({ ru: o.ru, kk: o.kk || tr[`o${i}`] || "" })),
              needsReviewKk: true,
            },
          });
        log(`вопрос ${q.id} переведён`);
        done++;
      } catch (e) {
        log(`вопрос ${q.id}: ОШИБКА ${(e as Error).message}`);
      }
    }
  }
  log(`Готово: ${done}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
