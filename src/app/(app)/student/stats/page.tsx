import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { StatsView } from "@/components/learn/stats-view";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { studentStats } from "@/server/services/stats";

export default async function StudentStatsPage() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const stats = await studentStats(user, user.id, (await getLocale()) as Locale);
  return (
    <div>
      <PageHeader title={t("student.statsTitle")} />
      <StatsView stats={stats} resultHref={(id) => `/student/result/${id}`} />
    </div>
  );
}
