import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { deleteQuestionAction, setQuestionStatusAction } from "@/app/actions/content";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader, Panel } from "@/components/app/page-header";
import { QuestionBadges } from "@/components/app/question-badges";
import { QuestionEditor } from "@/components/app/question-editor";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { getQuestion } from "@/server/services/questions";
import { topicSelectOptions } from "@/server/services/question-view";

export default async function AdminQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  const actor = await requirePageUser("ADMIN");
  const { id } = await params;
  const q = await getQuestion(actor, id);
  if (!q) notFound();
  const t = await getTranslations();
  const topics = await topicSelectOptions(actor, (await getLocale()) as Locale);
  const statuses = (["DRAFT", "REVIEW", "PUBLISHED", "REJECTED"] as const).filter((s) => s !== q.status);
  return (
    <div className="space-y-4">
      <Link href="/admin/questions" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden />{t("questions.title")}</Link>
      <PageHeader title={t("questions.editTitle")} />
      <QuestionBadges status={q.status} aiGenerated={q.aiGenerated} isDemo={q.isDemo} needsReviewKk={q.needsReviewKk} type={q.type} />
      <Panel>
        <QuestionEditor
          id={q.id}
          mode="admin"
          topics={topics}
          initial={{
            topicId: q.topicId, textRu: q.textRu, textKk: q.textKk, options: q.options as { ru: string; kk: string }[], correct: q.correct as number[],
            explanationRu: q.explanationRu, explanationKk: q.explanationKk, source: q.source ?? "", needsReviewKk: q.needsReviewKk,
          }}
        />
      </Panel>
      <Panel title={t("questions.changeStatus")}>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <ActionButton key={s} action={setQuestionStatusAction.bind(null, q.id, s)} variant={s === "PUBLISHED" ? "default" : "outline"}>{t(`questions.statusAction.${s}`)}</ActionButton>
          ))}
          <ActionButton action={deleteQuestionAction.bind(null, q.id)} confirm={t("common.confirmDelete")} variant="destructive">{t("common.delete")}</ActionButton>
        </div>
      </Panel>
    </div>
  );
}
