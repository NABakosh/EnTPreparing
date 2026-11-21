import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Locale } from "@/config/site";
import { fmtDate, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { attemptResult } from "@/server/services/attempts";
import { Bar } from "./bar";
import { Markdown } from "./markdown";
import { OptionList } from "./option-list";

type Result = NonNullable<Awaited<ReturnType<typeof attemptResult>>>;

export async function ResultView({ result, threshold, actions }: { result: Result; threshold: number; actions?: React.ReactNode }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const a = result.attempt;
  const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0;
  const passed = pct >= threshold;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border bg-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">{t(`student.kinds.${a.kind}`)} · {a.finishedAt ? fmtDate(a.finishedAt, locale, true) : ""}</p>
        <p className="mt-2 text-5xl font-extrabold text-primary tabular-nums">{a.score}<span className="text-2xl text-muted-foreground"> / {a.maxScore}</span></p>
        <p className="mt-1 text-lg font-semibold">{pct}%</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("student.correctCount", { correct: a.correctCount, total: a.total })} · {t("student.time", { time: fmtDuration(a.durationSec ?? 0) })}
        </p>
        {a.kind === "TOPIC" && (
          <p role="status" className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold", passed ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            {passed ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
            {passed ? t("student.passed") : t("student.notPassed", { pct: threshold })}
          </p>
        )}
        {actions && <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>}
      </section>

      {result.sections.length > 1 && (
        <section className="rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("student.subjectsCol")}</h2>
          <ul className="space-y-3">
            {result.sections.map((s) => (
              <li key={s.key}>
                <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{s.name}</span><span className="font-semibold tabular-nums">{s.score} / {s.max}</span></div>
                <Bar value={s.max ? (s.score / s.max) * 100 : 0} label={s.name} className="mt-1" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("student.review")}</h2>
        {result.questions.map((q, i) => (
          <details key={q.id} className="group rounded-2xl border bg-card" open={!q.isCorrect && result.questions.length <= 20}>
            <summary className="flex cursor-pointer items-start gap-3 p-4">
              {q.isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label={t("student.correct")} /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-label={t("student.wrong")} />}
              <span className="min-w-0 flex-1">
                <span className="text-sm text-muted-foreground">{i + 1}. </span>
                <span className="line-clamp-2 font-medium group-open:line-clamp-none">{q.text.replace(/[`*#>]/g, "").split("\n").filter(Boolean).at(-1)}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{q.points}/{q.maxPoints}</span>
            </summary>
            <div className="space-y-3 border-t p-4">
              <Markdown>{q.text}</Markdown>
              <OptionList name={`r-${q.id}`} options={q.options} type={q.type} selected={q.selected} correct={q.correct} disabled />
              {!q.selected.length && <p className="text-sm text-muted-foreground">{t("student.noAnswer")}</p>}
              {q.explanation && (
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <span className="font-semibold">{t("student.explanation")}: </span>
                  <Markdown className="text-sm [&_p]:my-1">{q.explanation}</Markdown>
                </div>
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
