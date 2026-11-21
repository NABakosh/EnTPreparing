import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { getTopicAdmin } from "@/server/services/content";
import { TopicForm } from "../../forms";

export default async function AdminTopicPage({ params }: PageProps<"/admin/content/topic/[topicId]">) {
  const actor = await requirePageUser("ADMIN");
  const { topicId } = await params;
  const tp = await getTopicAdmin(actor, topicId);
  if (!tp) notFound();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return (
    <div className="space-y-4">
      <Link href={`/admin/content/${tp.module.subjectId}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden />{pickText(tp.module.subject, "name", locale)} · {pickText(tp.module, "title", locale)}
      </Link>
      <PageHeader title={t("content.topicEdit")} description={pickText(tp, "title", locale)} />
      <Panel>
        <TopicForm
          id={tp.id}
          initial={{
            titleRu: tp.titleRu, titleKk: tp.titleKk, theoryRu: tp.theoryRu, theoryKk: tp.theoryKk, summaryRu: tp.summaryRu, summaryKk: tp.summaryKk,
            grade: tp.grade ? String(tp.grade) : "", sourceBook: tp.sourceBook ?? "", sourcePages: tp.sourcePages ?? "", order: tp.order, needsReviewKk: tp.needsReviewKk,
          }}
        />
      </Panel>
    </div>
  );
}
