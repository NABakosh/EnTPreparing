import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { StatsView } from "@/components/learn/stats-view";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { studentStats } from "@/server/services/stats";

export default async function ParentChildPage({ params }: PageProps<"/parent/child/[childId]">) {
  const actor = await requirePageUser("PARENT");
  const { childId } = await params;
  const stats = await studentStats(actor, childId, (await getLocale()) as Locale).catch((e) => {
    if (e instanceof AppError) return null;
    throw e;
  });
  if (!stats) notFound();
  return (
    <div>
      <PageHeader title={stats.student.fullName} description={stats.student.class?.name} />
      <StatsView stats={stats} />
    </div>
  );
}
