import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { deleteNewsAction, setNewsStatusAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/app/action-button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { adminListNews } from "@/server/services/news";

export default async function AdminNewsPage() {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const items = await adminListNews(actor);
  return (
    <div>
      <PageHeader title={t("admin.newsTitle")} actions={<Link href="/admin/news/new" className={buttonVariants()}><Plus aria-hidden /> {t("admin.newsNew")}</Link>} />
      {items.length === 0 ? (
        <EmptyState text={t("common.noData")} />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="flex flex-col gap-3 rounded-3xl border border-transparent bg-card shadow-soft p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/news/${n.id}`} className="font-semibold hover:text-primary">{pickText(n, "title", locale)}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={n.status === "PUBLISHED" ? "default" : "secondary"}>{t(`admin.newsStatus.${n.status}`)}</Badge>
                  {fmtDate(n.publishedAt, locale, true)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/news/${n.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("common.edit")}</Link>
                {n.status !== "PUBLISHED" ? (
                  <ActionButton action={setNewsStatusAction.bind(null, n.id, "PUBLISHED")}>{t("admin.publish")}</ActionButton>
                ) : (
                  <>
                    <Link href={`/news/${n.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>{t("admin.view")}</Link>
                    <ActionButton action={setNewsStatusAction.bind(null, n.id, "HIDDEN")}>{t("admin.hide")}</ActionButton>
                  </>
                )}
                <ActionButton action={deleteNewsAction.bind(null, n.id)} confirm={t("common.confirmDelete")} variant="destructive">{t("common.delete")}</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
