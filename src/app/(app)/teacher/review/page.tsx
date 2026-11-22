import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, Pencil, X } from "lucide-react";
import { setQuestionStatusAction } from "@/app/actions/content";
import { ActionButton } from "@/components/app/action-button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { QuestionBadges } from "@/components/app/question-badges";
import { Markdown } from "@/components/learn/markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { listSubjects } from "@/server/services/catalog";
import { reviewQueue } from "@/server/services/questions";
import { BULK_FORM, BulkBar } from "./bulk-bar";

const LETTERS = "ABCDEFGH";

export default async function ReviewPage({ searchParams }: PageProps<"/teacher/review">) {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const subjectId = typeof sp.subjectId === "string" ? sp.subjectId : "";
  const page = Number(sp.page) || 1;
  const [{ items, total, pages }, subjects] = await Promise.all([reviewQueue(actor, subjectId || undefined, page), listSubjects()]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("questions.reviewTitle")} description={t("questions.reviewText", { count: total })} />
      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="rv-subject" className="text-sm font-medium">{t("questions.subject")}</label>
        <NativeSelect id="rv-subject" name="subjectId" defaultValue={subjectId} className="sm:max-w-xs">
          <option value="">{t("common.all")}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{pickText(s, "name", locale)}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">{t("admin.find")}</Button>
      </form>
      {items.length === 0 ? (
        <EmptyState text={t("questions.reviewEmpty")} />
      ) : (
        <>
        <BulkBar />
        <ul className="space-y-4">
          {items.map((q) => {
            const opts = q.options as { ru: string; kk: string }[];
            const correct = q.correct as number[];
            return (
              <li key={q.id} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="ids" value={q.id} form={BULK_FORM} className="size-5 accent-primary" />
                    <span className="sr-only">{t("questions.selectOne")}</span>
                  </label>
                  <QuestionBadges status={q.status} aiGenerated={q.aiGenerated} isDemo={q.isDemo} needsReviewKk={q.needsReviewKk} type={q.type} />
                  <span className="text-xs text-muted-foreground">{pickText(q.subject, "name", locale)} · {pickText(q.topic, "title", locale)}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(["ru", "kk"] as const).map((lang) => (
                    <section key={lang} lang={lang} className="space-y-2 rounded-xl bg-muted/50 p-3" aria-label={t(`questions.${lang}`)}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase">{t(`questions.${lang}`)}</div>
                      {(lang === "ru" ? q.textRu : q.textKk) ? <Markdown className="text-sm">{lang === "ru" ? q.textRu : q.textKk}</Markdown> : <p className="text-sm text-warning">{t("questions.missingKk")}</p>}
                      <ol className="space-y-1 text-sm">
                        {opts.map((o, i) => (
                          <li key={i} className={cn("flex gap-2 rounded-lg px-2 py-1", correct.includes(i) && "bg-success/10 font-semibold text-success")}>
                            <span>{LETTERS[i]}.</span><span>{o[lang] || "—"}</span>{correct.includes(i) && <Check className="ml-auto size-4" aria-label={t("questions.correctMark")} />}
                          </li>
                        ))}
                      </ol>
                      {(lang === "ru" ? q.explanationRu : q.explanationKk) && <p className="text-xs"><span className="font-semibold">{t("student.explanation")}: </span>{lang === "ru" ? q.explanationRu : q.explanationKk}</p>}
                    </section>
                  ))}
                </div>
                {q.source && <p className="text-xs text-muted-foreground">{t("questions.source")}: {q.source}</p>}
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={setQuestionStatusAction.bind(null, q.id, "PUBLISHED")} variant="default" successText={t("questions.published")}><Check aria-hidden />{t("questions.publish")}</ActionButton>
                  <Link href={`/teacher/review/${q.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Pencil aria-hidden />{t("questions.edit")}</Link>
                  <ActionButton action={setQuestionStatusAction.bind(null, q.id, "REJECTED")} confirm={t("questions.rejectConfirm")} variant="destructive"><X aria-hidden />{t("questions.reject")}</ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label={t("common.page", { page, pages })}>
          {page > 1 ? <Link className={buttonVariants({ variant: "outline" })} href={`/teacher/review?subjectId=${subjectId}&page=${page - 1}`}>{t("common.prev")}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link className={buttonVariants({ variant: "outline" })} href={`/teacher/review?subjectId=${subjectId}&page=${page + 1}`}>{t("common.next")}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
