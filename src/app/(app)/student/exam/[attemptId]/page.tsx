import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExamRunner } from "@/components/learn/exam-runner";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { pickText } from "@/server/lib/i18n-fields";
import { finishAttempt, getAttemptForRun } from "@/server/services/attempts";

export default async function ExamRunPage({ params }: PageProps<"/student/exam/[attemptId]">) {
  const user = await requirePageUser("STUDENT");
  const { attemptId } = await params;
  const locale = (await getLocale()) as Locale;
  const data = await getAttemptForRun(user, attemptId, locale).catch((e) => {
    if (e instanceof AppError) return null;
    throw e;
  });
  if (!data) notFound();
  const a = data.attempt;
  if (a.kind !== "EXAM") redirect(`/student/test/${attemptId}`);
  if (a.status === "FINISHED") redirect(`/student/result/${attemptId}`);
  const now = new Date();
  if (a.deadlineAt && a.deadlineAt.getTime() + 60_000 < now.getTime()) {
    await finishAttempt(user, attemptId);
    redirect(`/student/result/${attemptId}`);
  }
  const t = await getTranslations("exam");
  const keys = [...new Set(data.questions.map((q) => q.section))];
  const subjects = await prisma.subject.findMany({ where: { id: { in: keys } } });
  const sections = keys.map((k) => {
    const s = subjects.find((x) => x.id === k);
    return { key: k, name: s ? pickText(s, "name", locale) : "" };
  });
  return (
    <div>
      <h1 className="sr-only">{t("title")}</h1>
      <ExamRunner
        attemptId={attemptId}
        questions={data.questions.map((q) => ({ id: q.id, section: q.section, type: q.type, text: q.text, options: q.options, isDemo: q.isDemo, kkMissing: q.kkMissing }))}
        sections={sections}
        initialAnswers={data.answers}
        deadline={a.deadlineAt!.toISOString()}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
