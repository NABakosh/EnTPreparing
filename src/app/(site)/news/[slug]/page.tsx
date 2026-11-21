import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { pick } from "@/server/lib/i18n-fields";
import { cleanHtml, publicNewsBySlug } from "@/server/services/news";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const n = await publicNewsBySlug(slug);
  const locale = (await getLocale()) as Locale;
  return { title: n ? pick(n, "title", locale).text : undefined };
}

export default async function NewsPage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const n = await publicNewsBySlug(slug);
  if (!n) notFound();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const title = pick(n, "title", locale);
  const body = pick(n, "body", locale);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/news" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> {t("nav.news")}
      </Link>
      <h1 className="mt-4 text-3xl leading-tight font-bold sm:text-4xl">{title.text}</h1>
      <time dateTime={n.publishedAt.toISOString()} className="mt-2 block text-sm text-muted-foreground">{fmtDate(n.publishedAt, locale)}</time>
      {(title.fallback || body.fallback) && <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{t("common.kkMissing")}</p>}
      {n.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.coverUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
      )}
      <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: cleanHtml(body.text) }} />
    </article>
  );
}
