import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { slugify } from "@/server/lib/translit";

export const NEWS_PAGE_SIZE = 9;

export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3"]),
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}

export async function latestNews(limit = 3) {
  return prisma.news.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function publicNewsPage(page: number) {
  const where = { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const p = Math.max(1, page);
  const [items, total] = await Promise.all([
    prisma.news.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (p - 1) * NEWS_PAGE_SIZE, take: NEWS_PAGE_SIZE }),
    prisma.news.count({ where }),
  ]);
  return { items, page: p, pages: Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE)) };
}

export async function publicNewsBySlug(slug: string) {
  const n = await prisma.news.findUnique({ where: { slug } });
  if (!n || n.status !== "PUBLISHED" || n.publishedAt > new Date()) return null;
  return n;
}

const newsSchema = z.object({
  titleRu: z.string().trim().min(1).max(200),
  titleKk: z.string().trim().max(200).default(""),
  excerptRu: z.string().trim().max(500).default(""),
  excerptKk: z.string().trim().max(500).default(""),
  bodyRu: z.string().max(100_000).default(""),
  bodyKk: z.string().max(100_000).default(""),
  coverUrl: z
    .string()
    .trim()
    .max(1000)
    .refine((s) => s === "" || /^https?:\/\//.test(s) || s.startsWith("/"), "url")
    .default(""),
  publishedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
});

function assertAdmin(actor: CurrentUser) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
}

export async function adminListNews(actor: CurrentUser) {
  assertAdmin(actor);
  return prisma.news.findMany({ orderBy: { publishedAt: "desc" } });
}

export async function adminGetNews(actor: CurrentUser, id: string) {
  assertAdmin(actor);
  return prisma.news.findUnique({ where: { id } });
}

export async function saveNews(actor: CurrentUser, id: string | null, input: unknown) {
  assertAdmin(actor);
  const parsed = newsSchema.safeParse(input);
  if (!parsed.success) throw new AppError("validation");
  const d = parsed.data;
  const data = {
    ...d,
    bodyRu: cleanHtml(d.bodyRu),
    bodyKk: cleanHtml(d.bodyKk),
    coverUrl: d.coverUrl || null,
    publishedAt: new Date(d.publishedAt),
  };
  if (id) return prisma.news.update({ where: { id }, data });
  let slug = slugify(d.titleRu);
  if (await prisma.news.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  return prisma.news.create({ data: { ...data, slug } });
}

export async function setNewsStatus(actor: CurrentUser, id: string, status: "DRAFT" | "PUBLISHED" | "HIDDEN") {
  assertAdmin(actor);
  await prisma.news.update({ where: { id }, data: { status } });
}

export async function deleteNews(actor: CurrentUser, id: string) {
  assertAdmin(actor);
  await prisma.news.delete({ where: { id } });
}
