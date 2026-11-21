import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Upload } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { QuestionBadges } from "@/components/app/question-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { listSubjects } from "@/server/services/catalog";
import { listQuestions } from "@/server/services/questions";

export default async function AdminQuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { subjectId: str("subjectId"), topicId: str("topicId"), status: str("status"), ai: str("ai"), demo: str("demo"), q: str("q") };
  const page = Number(sp.page) || 1;
  const [{ items, total, pages }, subjects] = await Promise.all([listQuestions(actor, { ...f, page }), listSubjects()]);
  const qs = (p: number) => `/admin/questions?${new URLSearchParams({ ...f, page: String(p) })}`;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("questions.title")}
        description={t("questions.total", { count: total })}
        actions={
          <>
            <Link href="/admin/questions/new" className={buttonVariants()}><Plus aria-hidden />{t("questions.new")}</Link>
            <Link href="/admin/questions/import" className={buttonVariants({ variant: "outline" })}><Upload aria-hidden />{t("questions.import")}</Link>
          </>
        }
      />
      <form role="search" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_130px_130px_auto]">
        {f.topicId && <input type="hidden" name="topicId" value={f.topicId} />}
        <label className="sr-only" htmlFor="qf-q">{t("common.search")}</label>
        <Input id="qf-q" name="q" defaultValue={f.q} placeholder={t("questions.searchPlaceholder")} />
        <label className="sr-only" htmlFor="qf-subject">{t("questions.subject")}</label>
        <NativeSelect id="qf-subject" name="subjectId" defaultValue={f.subjectId}>
          <option value="">{t("questions.subject")}: {t("common.all")}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{pickText(s, "name", locale)}</option>)}
        </NativeSelect>
        <label className="sr-only" htmlFor="qf-status">{t("common.status")}</label>
        <NativeSelect id="qf-status" name="status" defaultValue={f.status}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {(["DRAFT", "REVIEW", "PUBLISHED", "REJECTED"] as const).map((s) => <option key={s} value={s}>{t(`questions.status.${s}`)}</option>)}
        </NativeSelect>
        <label className="sr-only" htmlFor="qf-ai">{t("questions.aiBadge")}</label>
        <NativeSelect id="qf-ai" name="ai" defaultValue={f.ai}>
          <option value="">{t("questions.aiBadge")}: {t("common.all")}</option>
          <option value="1">{t("questions.aiBadge")}: {t("common.yes")}</option>
          <option value="0">{t("questions.aiBadge")}: {t("common.no")}</option>
        </NativeSelect>
        <label className="sr-only" htmlFor="qf-demo">{t("questions.demoBadge")}</label>
        <NativeSelect id="qf-demo" name="demo" defaultValue={f.demo}>
          <option value="">{t("questions.demoBadge")}: {t("common.all")}</option>
          <option value="1">{t("questions.demoBadge")}: {t("common.yes")}</option>
          <option value="0">{t("questions.demoBadge")}: {t("common.no")}</option>
        </NativeSelect>
        <Button type="submit">{t("admin.find")}</Button>
      </form>
      {f.topicId && <p className="text-sm"><Link href="/admin/questions" className="text-primary hover:underline">{t("questions.clearTopic")}</Link></p>}
      {items.length === 0 ? (
        <EmptyState text={t("common.noData")} />
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id}>
              <Link href={`/admin/questions/${q.id}`} className="block space-y-2 rounded-2xl border bg-card p-4 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <QuestionBadges status={q.status} aiGenerated={q.aiGenerated} isDemo={q.isDemo} needsReviewKk={q.needsReviewKk} type={q.type} />
                <p className="line-clamp-2 font-medium whitespace-pre-line">{pickText(q, "text", locale)}</p>
                <p className="text-xs text-muted-foreground">{pickText(q.subject, "name", locale)} · {pickText(q.topic, "title", locale)}{q.source ? ` · ${q.source}` : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label={t("common.page", { page, pages })}>
          {page > 1 ? <Link className={buttonVariants({ variant: "outline" })} href={qs(page - 1)}>{t("common.prev")}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link className={buttonVariants({ variant: "outline" })} href={qs(page + 1)}>{t("common.next")}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
