import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Panel } from "@/components/app/page-header";
import { QuestionEditor } from "@/components/app/question-editor";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { topicSelectOptions } from "@/server/services/question-view";

export default async function NewQuestionPage({ searchParams }: PageProps<"/admin/questions/new">) {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const topics = await topicSelectOptions(actor, (await getLocale()) as Locale);
  const sp = await searchParams;
  const topicId = typeof sp.topicId === "string" && topics.some((x) => x.id === sp.topicId) ? sp.topicId : topics[0]?.id;
  return (
    <div>
      <PageHeader title={t("questions.newTitle")} description={t("questions.newHint")} />
      {!topicId ? (
        <EmptyState text={t("questions.noTopics")} />
      ) : (
        <Panel>
          <QuestionEditor
            id={null}
            mode="admin"
            topics={topics}
            initial={{ topicId, textRu: "", textKk: "", options: Array.from({ length: 4 }, () => ({ ru: "", kk: "" })), correct: [], explanationRu: "", explanationKk: "", source: "", needsReviewKk: false }}
          />
        </Panel>
      )}
    </div>
  );
}
