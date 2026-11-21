import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { StatsView } from "@/components/learn/stats-view";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { studentStats } from "@/server/services/stats";
import { UserActions } from "@/components/app/user-actions";

export default async function TeacherStudentPage({ params }: PageProps<"/teacher/student/[studentId]">) {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const { studentId } = await params;
  const stats = await studentStats(actor, studentId, (await getLocale()) as Locale).catch((e) => {
    if (e instanceof AppError) return null;
    throw e;
  });
  if (!stats) notFound();
  const t = await getTranslations();
  return (
    <div>
      <PageHeader
        title={t("teacher.studentTitle", { name: stats.student.fullName })}
        description={stats.student.class?.name}
        actions={<UserActions id={studentId} active canBlock={actor.role === "ADMIN"} />}
      />
      <StatsView stats={stats} />
    </div>
  );
}
