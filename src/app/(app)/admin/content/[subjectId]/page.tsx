import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import { deleteModuleAction, deleteSubjectAction, deleteTopicAction } from "@/app/actions/content";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader, Panel } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { adminSubjectTree } from "@/server/services/content";
import { ModuleForm, NewTopicForm, SubjectForm } from "../forms";

export default async function AdminSubjectPage({ params }: PageProps<"/admin/content/[subjectId]">) {
  const actor = await requirePageUser("ADMIN");
  const { subjectId } = await params;
  const s = await adminSubjectTree(actor, subjectId);
  if (!s) notFound();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return (
    <div className="space-y-6">
      <Link href="/admin/content" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden />{t("content.title")}</Link>
      <PageHeader title={pickText(s, "name", locale)} />
      <Panel title={t("content.editSubject")}>
        <SubjectForm id={s.id} initial={{ slug: s.slug, nameRu: s.nameRu, nameKk: s.nameKk, mandatory: s.mandatory, order: s.order }} />
        <div className="mt-4 border-t pt-4">
          <ActionButton action={deleteSubjectAction.bind(null, s.id)} confirm={t("content.confirmDeleteSubject")} variant="destructive">{t("common.delete")}</ActionButton>
        </div>
      </Panel>
      {s.modules.map((m, i) => (
        <Panel key={m.id}>
          <details>
            <summary className="cursor-pointer text-lg font-semibold">{i + 1}. {pickText(m, "title", locale)}</summary>
            <div className="mt-4 space-y-3 border-t pt-4">
              <ModuleForm id={m.id} initial={{ titleRu: m.titleRu, titleKk: m.titleKk, order: m.order }} />
              <ActionButton action={deleteModuleAction.bind(null, m.id)} confirm={t("content.confirmDeleteModule")} variant="destructive">{t("content.deleteModule")}</ActionButton>
            </div>
          </details>
          <ol className="mt-4 space-y-2">
            {m.topics.map((tp) => (
              <li key={tp.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{pickText(tp, "title", locale)}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {t("content.questionsCount", { count: tp._count.questions })}
                    {!tp.theoryKk && tp.theoryRu && <Badge variant="outline">{t("content.noKk")}</Badge>}
                    {tp.needsReviewKk && <Badge variant="outline">{t("content.needsReviewKk")}</Badge>}
                  </div>
                </div>
                <Link href={`/admin/content/topic/${tp.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Pencil aria-hidden />{t("common.edit")}</Link>
                <Link href={`/admin/questions?topicId=${tp.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>{t("nav.questions")}</Link>
                <ActionButton action={deleteTopicAction.bind(null, tp.id)} confirm={t("content.confirmDeleteTopic")} variant="ghost">{t("common.delete")}</ActionButton>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t pt-4"><NewTopicForm moduleId={m.id} /></div>
        </Panel>
      ))}
      <Panel title={t("content.newModule")}><ModuleForm id={null} subjectId={s.id} /></Panel>
    </div>
  );
}
