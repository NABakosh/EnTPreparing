import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ResultView } from "@/components/learn/result-view";
import { StartReviewButton, StartTestButton } from "@/components/learn/start-buttons";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { attemptResult } from "@/server/services/attempts";
import { getModuleThreshold } from "@/server/services/settings";

export default async function ResultPage({ params }: PageProps<"/student/result/[attemptId]">) {
  const user = await requirePageUser("STUDENT");
  const { attemptId } = await params;
  const locale = (await getLocale()) as Locale;
  const result = await attemptResult(attemptId, locale);
  if (!result || result.attempt.userId !== user.id) notFound();
  if (result.attempt.status !== "FINISHED") redirect(result.attempt.kind === "EXAM" ? `/student/exam/${attemptId}` : `/student/test/${attemptId}`);
  const t = await getTranslations();
  const a = result.attempt;
  const hasWrong = result.questions.some((q) => !q.isCorrect);
  return (
    <ResultView
      result={result}
      threshold={await getModuleThreshold()}
      actions={
        <>
          {a.kind === "TOPIC" && a.topicId && <StartTestButton topicId={a.topicId} label={t("student.retry")} />}
          {hasWrong && <StartReviewButton topicId={a.kind === "TOPIC" ? (a.topicId ?? undefined) : undefined} label={t("student.repeatMistakes")} />}
          {a.topicId && <Link href={`/student/topic/${a.topicId}`} className={buttonVariants({ variant: "ghost", size: "lg" })}>{t("student.backToTopic")}</Link>}
        </>
      }
    />
  );
}
