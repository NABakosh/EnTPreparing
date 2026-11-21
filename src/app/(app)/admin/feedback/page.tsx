import { getLocale, getTranslations } from "next-intl/server";
import { deleteFeedbackAction, setFeedbackHandledAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/app/action-button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { listFeedback } from "@/server/services/feedback";

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const page = Number((await searchParams).page) || 1;
  const { items } = await listFeedback(actor, page);
  return (
    <div>
      <PageHeader title={t("admin.feedbackTitle")} />
      {items.length === 0 ? (
        <EmptyState text={t("common.noData")} />
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className={`rounded-2xl border bg-card p-4 ${f.handled ? "opacity-75" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{f.name}</span>
                <span className="text-sm text-muted-foreground">{f.contact}</span>
                {f.handled && <Badge variant="secondary">{t("admin.handled")}</Badge>}
                <time className="ml-auto text-xs text-muted-foreground">{fmtDate(f.createdAt, locale, true)}</time>
              </div>
              <p className="mt-2 text-sm whitespace-pre-line">{f.message}</p>
              <div className="mt-3 flex gap-2">
                <ActionButton action={setFeedbackHandledAction.bind(null, f.id, !f.handled)}>{f.handled ? t("admin.markNew") : t("admin.markHandled")}</ActionButton>
                <ActionButton action={deleteFeedbackAction.bind(null, f.id)} confirm={t("common.confirmDelete")} variant="ghost">{t("common.delete")}</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
