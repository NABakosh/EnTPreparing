/**
 * Загрузка учебников в BookChunk.
 *
 *   npm run ingest-books -- [--dir resources/books] [--replace] [--dry-run]
 *
 * Ожидаемая структура (гибкий разбор):
 *   <dir>/<класс>_класс/<предмет>/часть_N/NNN.md   (NNN — номер страницы)
 * Класс берётся из сегмента пути вида «10_класс», «10 сынып», «grade10»; предмет — следующий сегмент;
 * часть — «часть_2»/«бөлім_2»/«part2»; страница — число в имени файла или маркер «<!-- page: 12 -->» / «## Стр. 12».
 * Если в начале файла есть YAML-заголовок (класс, предмет, авторы, год, часть — формат OCR из bookcatalog),
 * метаданные берутся из него, а страницы — из маркеров «<!-- стр. N -->».
 * --skip «английский» (по умолчанию) — предметы, которые не загружаются (через запятую).
 * Чанки 800–1200 символов с перекрытием ~150.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/server/db";
import { args, logger } from "./lib";

const MIN = 800;
const MAX = 1200;
const OVERLAP = 150;

type Meta = { grade: number; subject: string; part: number | null; page: number | null; book: string };

/** YAML-заголовок OCR-файла (--- класс: 9 / предмет: … / авторы: … ---). */
export function parseFrontMatter(text: string): { meta: Record<string, string>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Метаданные из заголовка файла имеют приоритет над путём. */
export function metaFromFrontMatter(fm: Record<string, string>, fallback: Meta | null): Meta | null {
  const grade = Number(fm["класс"]) || fallback?.grade;
  const subject = (fm["предмет"] || fallback?.subject || "").toLowerCase().replace(/_/g, " ");
  if (!grade || !subject) return fallback;
  const part = fm["часть"] ? Number(fm["часть"]) || null : (fallback?.part ?? null);
  const author = (fm["авторы"] || "").split(",")[0].trim();
  const year = fm["год"] || "";
  const subjTitle = fm["предмет"] || subject;
  const book = `${subjTitle}${author ? `, ${author}` : ""}, ${grade} класс${part ? `, часть ${part}` : ""}${year ? ` (${year})` : ""}`;
  return { grade, subject, part, page: null, book };
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(md|txt)$/i.test(e.name) ? [p] : [];
  });
}

export function metaFromPath(rel: string): Meta | null {
  const segs = rel.split(path.sep);
  const gi = segs.findIndex((s) => /^(\d{1,2})[\s_-]*(класс|сынып|kl|grade)?$/i.test(s) || /(класс|сынып|grade)/i.test(s));
  const gm = gi >= 0 ? segs[gi].match(/(\d{1,2})/) : null;
  if (!gm) return null;
  const grade = Number(gm[1]);
  const subject = (segs[gi + 1] ?? "unknown").toLowerCase();
  const partSeg = segs.find((s) => /(часть|бөлім|part)[\s_-]*\d+/i.test(s));
  const part = partSeg ? Number(partSeg.match(/(\d+)/)![1]) : null;
  const fileNum = path.basename(rel).match(/(\d{1,4})/);
  const page = fileNum ? Number(fileNum[1]) : null;
  const book = `${subject.replace(/_/g, " ")} ${grade} класс${part ? `, часть ${part}` : ""}`;
  return { grade, subject, part, page, book };
}

/** Режет текст на чанки по абзацам/предложениям, отслеживая заголовки и маркеры страниц. */
export function chunkText(text: string, defaultPage: number | null) {
  const out: { text: string; chapter: string | null; page: number | null }[] = [];
  let chapter: string | null = null;
  let page = defaultPage;
  let buf = "";
  let bufPage = page;
  let bufChapter: string | null = chapter;
  const flush = () => {
    const tx = buf.replace(/\s+\n/g, "\n").trim();
    if (tx.length > 40) out.push({ text: tx, chapter: bufChapter, page: bufPage });
    buf = tx.length > OVERLAP ? tx.slice(-OVERLAP).replace(/^\S*\s/, "") : "";
    bufPage = page;
    bufChapter = chapter;
  };
  const normalized = text
    .replace(/\r/g, "")
    .replace(/(<!--[^>]*-->)/g, "\n\n$1\n\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2") // перенос слова
    .replace(/([^\n])\n(?!\n)(?=[^#\n<])/g, "$1 "); // жёсткий перенос строки внутри абзаца
  const pieces = normalized.split(/\n{2,}/);
  for (const raw of pieces) {
    const p = raw.trim();
    if (!p) continue;
    const pm = p.match(/^<!--\s*(?:page:|стр\.?|бет)\s*(\d+)\s*-->$|^#{0,6}\s*(?:стр\.?|бет|page)\s*(\d+)\s*$/i);
    if (pm) {
      page = Number(pm[1] ?? pm[2]);
      if (!buf) bufPage = page;
      continue;
    }
    const hm = p.match(/^#{1,4}\s+(.+)$/m);
    if (hm && p.split("\n").length === 1) {
      chapter = hm[1].trim().slice(0, 200);
      if (buf.length >= MIN) flush();
      if (!buf) bufChapter = chapter;
      buf += (buf ? "\n\n" : "") + p;
      continue;
    }
    // длинный абзац режем по предложениям
    const sentences = p.length > MAX ? p.split(/(?<=[.!?])\s+/) : [p];
    for (const s of sentences) {
      if (buf.length + s.length > MAX && buf.length >= MIN / 2) flush();
      buf += (buf ? (sentences.length > 1 ? " " : "\n\n") : "") + s;
      if (buf.length >= MAX) flush();
    }
    if (buf.length >= MIN) flush();
  }
  if (buf.trim().length > 40) out.push({ text: buf.trim(), chapter: bufChapter, page: bufPage });
  return out;
}

async function main() {
  const a = args();
  const dir = String(a.dir ?? process.env.BOOKS_DIR ?? "resources/books");
  const log = logger("ingest");
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    log(`Папка ${dir} пуста или не найдена — пропускаю. Укажите --dir <путь к книгам>.`);
    return;
  }
  const files = walk(dir).sort();
  log(`Найдено файлов: ${files.length}`);
  const byBook = new Map<string, { meta: Meta; files: string[] }>();
  let skipped = 0;
  const skip = String(a.skip ?? "английский").toLowerCase().split(",").filter(Boolean);
  for (const f of files) {
    const head = fs.readFileSync(f, "utf8").slice(0, 2000);
    const meta = metaFromFrontMatter(parseFrontMatter(head).meta, metaFromPath(path.relative(dir, f)));
    if (meta && skip.some((x) => meta.subject.includes(x))) continue;
    if (!meta) {
      skipped++;
      continue;
    }
    const e = byBook.get(meta.book) ?? { meta, files: [] };
    e.files.push(f);
    byBook.set(meta.book, e);
  }
  if (skipped) log(`Пропущено файлов без класса в пути: ${skipped}`);
  let total = 0;
  for (const [book, { files: bf }] of byBook) {
    if (a.replace && !a["dry-run"]) await prisma.bookChunk.deleteMany({ where: { book } });
    else if (!a["dry-run"] && (await prisma.bookChunk.count({ where: { book } })) > 0) {
      log(`«${book}» уже загружена — пропуск (используйте --replace)`);
      continue;
    }
    const rows: { grade: number; subject: string; book: string; part: number | null; chapter: string | null; page: number | null; text: string }[] = [];
    for (const f of bf) {
      const raw = fs.readFileSync(f, "utf8").replace(/\r/g, "");
      const { meta: fm, body } = parseFrontMatter(raw);
      const meta = metaFromFrontMatter(fm, metaFromPath(path.relative(dir, f)))!;
      // номер страницы из имени файла берём только если в файле нет маркеров страниц
      const defaultPage = Object.keys(fm).length ? null : meta.page;
      for (const c of chunkText(body, defaultPage)) rows.push({ grade: meta.grade, subject: meta.subject, book, part: meta.part, chapter: c.chapter, page: c.page, text: c.text });
    }
    if (!a["dry-run"]) for (let i = 0; i < rows.length; i += 500) await prisma.bookChunk.createMany({ data: rows.slice(i, i + 500) });
    total += rows.length;
    log(`«${book}»: файлов ${bf.length}, чанков ${rows.length}${a["dry-run"] ? " (dry-run)" : ""}`);
  }
  log(`Готово. Всего чанков: ${total}`);
}

if (process.argv[1]?.includes("ingest-books")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
