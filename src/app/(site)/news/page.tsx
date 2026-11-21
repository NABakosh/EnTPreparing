import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { NewsCard } from "@/components/site/news-card";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { publicNewsPage } from "@/server/services/news";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("news") };
}

export default async function NewsListPage({ searchParams }: PageProps<"/news">) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, pages } = await publicNewsPage(page);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("nav.news")}</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <NewsCard key={n.id} news={n} locale={locale} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-between gap-3" aria-label={t("common.page", { page, pages })}>
          {page > 1 ? (
            <Link href={`/news?page=${page - 1}`} className={buttonVariants({ variant: "outline" })}>{t("common.prev")}</Link>
          ) : <span />}
          <span className="text-sm text-muted-foreground">{t("common.page", { page, pages })}</span>
          {page < pages ? (
            <Link href={`/news?page=${page + 1}`} className={buttonVariants({ variant: "outline" })}>{t("common.next")}</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
