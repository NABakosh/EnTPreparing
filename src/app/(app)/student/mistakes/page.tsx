import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Markdown } from "@/components/learn/markdown";
import { OptionList } from "@/components/learn/option-list";
import { StartReviewButton } from "@/components/learn/start-buttons";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { listMistakes } from "@/server/services/attempts";

export default async function MistakesPage() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const items = await listMistakes(user.id, locale);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("student.mistakesTitle")} description={t("student.mistakesText")} actions={items.length ? <StartReviewButton label={t("student.repeatMistakes")} /> : undefined} />
      {items.length === 0 ? (
        <EmptyState text={t("student.mistakesEmpty")} />
      ) : (
        <ul className="space-y-4">
          {items.map((m) => (
            <li key={m.id} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
              <div className="text-xs font-medium text-muted-foreground">
                {m.subject} · <Link href={`/student/topic/${m.topicId}`} className="text-primary hover:underline">{m.topic}</Link>
              </div>
              <Markdown className="font-medium">{m.text}</Markdown>
              <OptionList name={`m-${m.id}`} options={m.options} type={m.type} selected={m.selected} correct={m.correct} disabled />
              {m.explanation && (
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <span className="font-semibold">{t("student.explanation")}: </span>
                  <Markdown className="text-sm [&_p]:my-1">{m.explanation}</Markdown>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
