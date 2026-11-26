import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { readTable } from "@/server/lib/sheets";

const LETTERS = "ABCDEFGH";
const CYR: Record<string, string> = { А: "A", В: "B", С: "C", Д: "D", Е: "E", Б: "B", Г: "D" };

export type QuestionImportResult = { created: number; errors: { row: number; code: string }[] };

function norm(h: string) {
  return h.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Разбор «A», «A,C», «а; в», «1,3» → индексы. */
export function parseCorrect(raw: string, optionCount: number): number[] | null {
  const parts = raw.split(/[\s,;/]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!parts.length) return null;
  const out = new Set<number>();
  for (const p of parts) {
    let idx: number;
    if (/^\d+$/.test(p)) idx = Number(p) - 1;
    else idx = LETTERS.indexOf(CYR[p] ?? p);
    if (idx < 0 || idx >= optionCount) return null;
    out.add(idx);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Импорт вопросов (только админ). Колонки: Тема, Текст, Вариант A.., Верный, Объяснение;
 * необязательные казахские: «Текст (каз)», «Вариант A (каз)», «Объяснение (каз)».
 * Все импортированные вопросы попадают в DRAFT и проходят проверку.
 */
export async function importQuestions(actor: CurrentUser, file: File): Promise<QuestionImportResult> {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const { headers, rows, lines } = await readTable(file);
  if (!rows.length) throw new AppError("empty_file");
  if (rows.length > 2000) throw new AppError("too_many_rows");
  const h = headers.map(norm);
  const isKk = (s: string) => /\((каз|kk|қаз)\)/.test(s);
  const find = (pred: (s: string) => boolean) => h.findIndex(pred);
  const ci = {
    topic: find((s) => s.startsWith("тема") || s.startsWith("тақырып") || s === "topic"),
    text: find((s) => (s.startsWith("текст") || s.startsWith("вопрос") || s.startsWith("мәтін")) && !isKk(s)),
    textKk: find((s) => (s.startsWith("текст") || s.startsWith("мәтін") || s.startsWith("вопрос")) && isKk(s)),
    correct: find((s) => s.startsWith("верн") || s.startsWith("дұрыс") || s === "correct"),
    expl: find((s) => (s.startsWith("объяснение") || s.startsWith("түсіндірме")) && !isKk(s)),
    explKk: find((s) => (s.startsWith("объяснение") || s.startsWith("түсіндірме")) && isKk(s)),
  };
  if (ci.topic < 0 || ci.text < 0 || ci.correct < 0) throw new AppError("import_bad_header");
  // «Вариант A», «Вариант А» (кириллица), «Нұсқа B (каз)», «Option C»
  const optLetter = (col: string): string | null => {
    const m = col.match(/^(?:вариант|нұсқа|option)\s*([a-hабвсдеґг])(?:\s|\(|$)/);
    if (!m) return null;
    const map: Record<string, string> = { а: "A", б: "B", в: "B", с: "C", д: "D", г: "D", е: "E" };
    return map[m[1]] ?? m[1].toUpperCase();
  };
  const optCols: { ru: number; kk: number }[] = [];
  for (const L of LETTERS) {
    const ru = h.findIndex((s) => optLetter(s) === L && !isKk(s));
    if (ru < 0) break;
    const kk = h.findIndex((s) => optLetter(s) === L && isKk(s));
    optCols.push({ ru, kk });
  }
  if (optCols.length < 2) throw new AppError("import_bad_header");

  const topics = await prisma.topic.findMany({ select: { id: true, titleRu: true, module: { select: { subjectId: true } } } });
  const byId = new Map(topics.map((t) => [t.id, t]));
  const byTitle = new Map(topics.map((t) => [t.titleRu.trim().toLowerCase(), t]));
  const source = `import: ${file.name}`.slice(0, 300);

  let created = 0;
  const errors: { row: number; code: string }[] = [];
  const data = [];
  for (const [i, r] of rows.entries()) {
    const rowNo = lines[i];
    const cell = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    const topicRaw = cell(ci.topic);
    const topic = byId.get(topicRaw) ?? byTitle.get(topicRaw.toLowerCase());
    if (!topic) { errors.push({ row: rowNo, code: "row_topic_not_found" }); continue; }
    const textRu = cell(ci.text);
    if (!textRu) { errors.push({ row: rowNo, code: "row_no_text" }); continue; }
    const allOpts = optCols.map((o) => ({ ru: cell(o.ru), kk: cell(o.kk) }));
    const keep = allOpts.map((o, i) => (o.ru || o.kk ? i : -1)).filter((i) => i >= 0);
    const options = keep.map((i) => allOpts[i]);
    if (options.length < 2) { errors.push({ row: rowNo, code: "row_few_options" }); continue; }
    // буква «Верный» относится к исходным колонкам; пустые варианты убираем после сопоставления
    const rawCorrect = parseCorrect(cell(ci.correct), allOpts.length);
    if (!rawCorrect || rawCorrect.some((i) => !keep.includes(i))) { errors.push({ row: rowNo, code: "row_bad_correct" }); continue; }
    const correct = rawCorrect.map((i) => keep.indexOf(i));
    const textKk = cell(ci.textKk);
    data.push({
      topicId: topic.id,
      subjectId: topic.module.subjectId,
      textRu,
      textKk,
      options,
      correct,
      type: correct.length > 1 ? ("MULTIPLE" as const) : ("SINGLE" as const),
      explanationRu: cell(ci.expl),
      explanationKk: cell(ci.explKk),
      status: "DRAFT" as const,
      source,
      needsReviewKk: !textKk || options.some((o) => !o.kk),
    });
  }
  if (data.length) created = (await prisma.question.createMany({ data })).count;
  return { created, errors };
}
