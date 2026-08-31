"use client";

import { PageHeader } from "@/components/ui/page-header";
import { newsItems } from "@/lib/data/news";
import { useI18n } from "@/i18n/context";

export default function NewsPage() {
  const { t, locale } = useI18n();
  const items = newsItems[locale];
  const dateLocale = locale === "kk" ? "kk-KZ" : "ru-RU";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t.news.title} description={t.news.desc} />
      <div className="space-y-6">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {item.category}
              </span>
              <time className="text-sm text-muted">
                {new Date(item.date).toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-muted">{item.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
