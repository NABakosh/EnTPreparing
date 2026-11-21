import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import { QuestionEditor } from "@/components/app/question-editor";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { getQuestion } from "@/server/services/questions";
import { topicSelectOptions } from "@/server/services/question-view";

export default async function ReviewEditPage({ params }: PageProps<"/teacher/review/[id]">) {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const { id } = await params;
  const q = await getQuestion(actor, id).catch((e) => {
    if (e instanceof AppError) return null;
    throw e;
  });
  if (!q) notFound();
  const t = await getTranslations();
  const topics = await topicSelectOptions(actor, (await getLocale()) as Locale);
  return (
    <div className="space-y-4">
      <Link href="/teacher/review" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden />{t("questions.reviewTitle")}</Link>
      <PageHeader title={t("questions.editTitle")} />
      <Panel>
        <QuestionEditor
          id={q.id}
          mode="review"
          afterSave="/teacher/review"
          topics={topics}
          initial={{
            topicId: q.topicId, textRu: q.textRu, textKk: q.textKk, options: q.options as { ru: string; kk: string }[], correct: q.correct as number[],
            explanationRu: q.explanationRu, explanationKk: q.explanationKk, source: q.source ?? "", needsReviewKk: q.needsReviewKk,
          }}
        />
      </Panel>
    </div>
  );
}
