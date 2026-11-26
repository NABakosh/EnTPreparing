import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { adminSubjects } from "@/server/services/content";
import { SubjectForm } from "./forms";

export default async function AdminContentPage() {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const subjects = await adminSubjects(actor);
  return (
    <div className="space-y-6">
      <PageHeader title={t("content.title")} description={t("content.subtitle")} />
      <ul className="space-y-3">
        {subjects.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/content/${s.id}`} className="flex items-center gap-3 rounded-3xl border border-transparent bg-card shadow-soft p-4 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{pickText(s, "name", locale)}</span>
                  {s.mandatory && <Badge>{t("content.mandatory")}</Badge>}
                  <span className="font-mono text-xs text-muted-foreground">{s.slug}</span>
                </div>
                <div className="text-sm text-muted-foreground">{t("content.counts", { modules: s._count.modules, questions: s._count.questions })}</div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Panel title={t("content.newSubject")}><SubjectForm id={null} /></Panel>
    </div>
  );
}
