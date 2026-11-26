import Link from "next/link";
import { Newspaper } from "lucide-react";
import type { News } from "@prisma/client";
import type { Locale } from "@/config/site";
import { pickText } from "@/server/lib/i18n-fields";

export function NewsCard({ news, locale }: { news: News; locale: Locale }) {
  const title = pickText(news, "title", locale);
  const excerpt = pickText(news, "excerpt", locale);
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-card shadow-soft transition-transform hover:-translate-y-1">
      {news.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={news.coverUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : (
        <div aria-hidden className="bg-brand-gradient grid aspect-[16/9] place-items-center text-white/90">
          <Newspaper className="size-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time dateTime={news.publishedAt.toISOString()} className="text-xs font-medium text-muted-foreground">
          {news.publishedAt.toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Almaty" })}
        </time>
        <h3 className="text-lg leading-snug font-bold">
          <Link href={`/news/${news.slug}`} className="after:absolute-none hover:text-primary focus-visible:outline-none focus-visible:underline">
            {title}
          </Link>
        </h3>
        {excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>}
      </div>
    </article>
  );
}
