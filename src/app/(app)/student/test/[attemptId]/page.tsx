import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { QuizRunner } from "@/components/learn/quiz-runner";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { getAttemptForRun } from "@/server/services/attempts";

export default async function TestPage({ params }: PageProps<"/student/test/[attemptId]">) {
  const user = await requirePageUser("STUDENT");
  const { attemptId } = await params;
  const locale = (await getLocale()) as Locale;
  const data = await getAttemptForRun(user, attemptId, locale).catch((e) => {
    if (e instanceof AppError) return null;
    throw e;
  });
  if (!data) notFound();
  if (data.attempt.kind === "EXAM") redirect(`/student/exam/${attemptId}`);
  if (data.attempt.status === "FINISHED") redirect(`/student/result/${attemptId}`);
  const t = await getTranslations();
  return (
    <div>
      <PageHeader title={data.attempt.kind === "REVIEW" ? t("student.kinds.REVIEW") : (data.topicTitle ?? t("student.kinds.TOPIC"))} />
      <QuizRunner attemptId={attemptId} questions={data.questions} initialAnswers={data.answers} />
    </div>
  );
}
