import { prisma } from "@/server/db";

export type Chunk = { id: string; grade: number; subject: string; book: string; part: number | null; chapter: string | null; page: number | null; text: string; rank: number };

const STOP = new Set(["что", "как", "это", "для", "или", "при", "его", "она", "они", "так", "где", "когда", "почему", "какой", "какая", "какие", "такое", "деген", "қандай", "қалай", "неге", "нені", "және", "мен", "бұл"]);

/** Строит tsquery: значимые слова через OR (|), чтобы находить фрагменты по части слов. */
export function buildTsQuery(q: string): string | null {
  const words = (q.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w));
  const uniq = [...new Set(words)].slice(0, 12);
  if (!uniq.length) return null;
  // префиксный поиск помогает казахским словоформам (нет стеммера)
  return uniq.map((w) => `${w.replace(/[^\p{L}\p{N}]/gu, "")}:*`).join(" | ");
}

/** Полнотекстовый поиск по BookChunk (tsvector, конфигурация russian) с фильтром по классу и предмету. */
export async function searchChunks(query: string, opts: { maxGrade?: number | null; subjects?: string[]; limit?: number } = {}): Promise<Chunk[]> {
  const tsq = buildTsQuery(query);
  if (!tsq) return [];
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 20);
  const subjects = (opts.subjects ?? []).map((s) => s.toLowerCase());
  const rows = await prisma.$queryRaw<Chunk[]>`
    SELECT id, grade, subject, book, part, chapter, page, text,
           ts_rank_cd(tsv, to_tsquery('russian', ${tsq})) AS rank
    FROM "BookChunk"
    WHERE tsv @@ to_tsquery('russian', ${tsq})
      AND (${opts.maxGrade ?? null}::int IS NULL OR grade <= ${opts.maxGrade ?? null}::int)
      AND (cardinality(${subjects}::text[]) = 0 OR lower(subject) = ANY(${subjects}::text[]))
    ORDER BY rank DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, rank: Number(r.rank) }));
}
