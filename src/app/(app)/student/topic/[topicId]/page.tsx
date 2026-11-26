import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, Bot, Lightbulb } from "lucide-react";
import { MentorChat } from "@/components/learn/mentor-chat";
import { Markdown } from "@/components/learn/markdown";
import { StartReviewButton, StartTestButton } from "@/components/learn/start-buttons";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pick, pickText } from "@/server/lib/i18n-fields";
import { getTopicForStudent, markTheoryRead } from "@/server/services/learning";

export default async function TopicPage({ params }: PageProps<"/student/topic/[topicId]">) {
  const user = await requirePageUser("STUDENT");
  const { topicId } = await params;
  const data = await getTopicForStudent(topicId, user.id);
  if (!data) notFound();
  await markTheoryRead(user, topicId);
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { topic, progress, threshold } = data;
  const theory = pick(topic, "theory", locale);
  const summary = pick(topic, "summary", locale);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/student/learn/${topic.module.subjectId}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {pickText(topic.module.subject, "name", locale)} · {pickText(topic.module, "title", locale)}
      </Link>
      <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{pickText(topic, "title", locale)}</h1>
      {(theory.fallback || summary.fallback || topic.needsReviewKk) && <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{t("common.kkMissing")}</p>}

      {topic.aiGenerated && (
        <p className="flex gap-2 rounded-xl border border-primary/20 bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
          {topic.sourceBook?.includes("без учебника") ? t("student.aiTopicNoBook") : t("student.aiTopic")}
        </p>
      )}
      {summary.text && (
        <aside className="rounded-2xl border border-primary/20 bg-secondary p-4" aria-label={t("student.summary")}>
          <div className="mb-1 flex items-center gap-2 font-semibold text-secondary-foreground"><Lightbulb className="size-5" aria-hidden />{t("student.summary")}</div>
          <p className="text-sm text-secondary-foreground">{summary.text}</p>
        </aside>
      )}

      <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6" aria-label={t("student.theory")}>
        {theory.text ? <Markdown>{theory.text}</Markdown> : <p className="text-muted-foreground">{t("student.noTheory")}</p>}
        {topic.sourcePages && <p className="mt-4 text-xs text-muted-foreground">{t("student.sources")}: {topic.sourcePages}</p>}
      </section>

      <section className="space-y-3 rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          {t("student.threshold", { pct: threshold })}
          {progress && progress.bestPercent > 0 && <> · <span className="font-semibold text-foreground">{t("student.bestResult", { pct: progress.bestPercent })}</span></>}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {topic._count.questions > 0 ? <StartTestButton topicId={topic.id} label={t("student.startTest")} /> : <p className="text-sm">{t("errors.no_questions")}</p>}
          {progress && progress.lastPercent < 100 && progress.bestPercent > 0 && <StartReviewButton topicId={topic.id} label={t("student.repeatMistakes")} />}
        </div>
      </section>

      <details className="group rounded-3xl border border-transparent bg-card shadow-soft">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold sm:p-5"><Bot className="size-5 text-primary" aria-hidden />{t("mentor.widgetTitle")}</summary>
        <div className="border-t p-4 sm:p-5"><MentorChat topicId={topic.id} compact /></div>
      </details>

      <nav className="flex justify-between gap-2">
        {data.prevId ? <Link href={`/student/topic/${data.prevId}`} className={buttonVariants({ variant: "outline" })}><ArrowLeft aria-hidden />{t("student.prevTopic")}</Link> : <span />}
        {data.nextId ? <Link href={`/student/topic/${data.nextId}`} className={buttonVariants({ variant: "outline" })}>{t("student.nextTopic")}<ArrowRight aria-hidden /></Link> : <span />}
      </nav>
    </div>
  );
}
