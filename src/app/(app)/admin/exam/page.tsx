import { getLocale, getTranslations } from "next-intl/server";
import { deletePairAction, setPairActiveAction } from "@/app/actions/content";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader, Panel } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { examSetup } from "@/server/services/exam-setup";
import { AddPairForm, TemplateForm } from "./forms";

export default async function AdminExamPage() {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { pairs, template, subjects } = await examSetup(actor);
  const profileSubjects = subjects.filter((s) => !s.mandatory).map((s) => ({ id: s.id, name: pickText(s, "name", locale) }));
  return (
    <div className="space-y-6">
      <PageHeader title={t("content.examTitle")} description={t("content.examHint")} />
      <Panel title={t("content.pairs")}>
        <ul className="mb-5 space-y-2">
          {pairs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              <span className="flex-1 font-medium">{pickText(p.subject1, "name", locale)} — {pickText(p.subject2, "name", locale)}</span>
              <Badge variant={p.active ? "default" : "secondary"}>{p.active ? t("content.active") : t("content.inactive")}</Badge>
              <span className="text-xs text-muted-foreground">{t("content.studentsUsing", { count: p._count.users })}</span>
              <ActionButton action={setPairActiveAction.bind(null, p.id, !p.active)}>{p.active ? t("content.deactivate") : t("content.activate")}</ActionButton>
              <ActionButton action={deletePairAction.bind(null, p.id)} confirm={t("common.confirmDelete")} variant="ghost">{t("common.delete")}</ActionButton>
            </li>
          ))}
        </ul>
        {profileSubjects.length >= 2 ? <AddPairForm subjects={profileSubjects} /> : <p className="text-sm text-muted-foreground">{t("content.needSubjects")}</p>}
      </Panel>
      {template && (
        <Panel title={pickText(template, "name", locale)}>
          <TemplateForm
            templateId={template.id}
            durationMin={template.durationMin}
            sections={template.sections.map((s) => ({
              id: s.id,
              label: s.slot === "FIXED" && s.subject ? pickText(s.subject, "name", locale) : t(`content.slot.${s.slot}`),
              singleCount: s.singleCount,
              multipleCount: s.multipleCount,
            }))}
          />
        </Panel>
      )}
    </div>
  );
}
