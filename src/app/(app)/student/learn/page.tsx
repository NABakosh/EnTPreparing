import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { Bar } from "@/components/learn/bar";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { subjectsWithProgress } from "@/server/services/learning";

export default async function LearnPage() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const subjects = await subjectsWithProgress(user.id);
  return (
    <div>
      <PageHeader title={t("student.learnTitle")} description={t("student.learnText")} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => (
          <li key={s.id}>
            <Link href={`/student/learn/${s.id}`} className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <div className="flex flex-wrap gap-2">
                <Badge variant={s.mandatory ? "default" : "secondary"}>{s.mandatory ? t("landing.mandatory") : t("landing.profile")}</Badge>
                {s.inProgram && !s.mandatory && <Badge variant="outline">{t("student.inProgram")}</Badge>}
              </div>
              <h2 className="text-lg font-semibold">{pickText(s, "name", locale)}</h2>
              <div className="mt-auto">
                <div className="mb-1.5 text-sm text-muted-foreground">{t("student.topicsDone", { done: s.done, total: s.total })}</div>
                <Bar value={s.total ? (s.done / s.total) * 100 : 0} label={pickText(s, "name", locale)} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
