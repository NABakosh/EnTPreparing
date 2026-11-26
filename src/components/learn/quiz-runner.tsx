"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { answerAction, finishAttemptAction } from "@/app/actions/learning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { OptionList } from "./option-list";

export type RunQuestion = {
  id: string;
  type: "SINGLE" | "MULTIPLE";
  text: string;
  options: string[];
  isDemo: boolean;
  kkMissing: boolean;
  correct?: number[];
  explanation?: string;
};

type Checked = { correct: number[]; isCorrect: boolean; points: number; explanation: string; selected: number[] };

export function QuizRunner({ attemptId, questions, initialAnswers }: { attemptId: string; questions: RunQuestion[]; initialAnswers: Record<string, number[]> }) {
  const t = useTranslations();
  const router = useRouter();
  const [idx, setIdx] = useState(() => Math.max(0, questions.findIndex((q) => !q.correct)));
  const [sel, setSel] = useState<Record<string, number[]>>(initialAnswers);
  const [checked, setChecked] = useState<Record<string, Checked>>(() =>
    Object.fromEntries(
      questions
        .filter((q) => q.correct)
        .map((q) => {
          const s = initialAnswers[q.id] ?? [];
          const ok = s.length === q.correct!.length && s.every((x) => q.correct!.includes(x));
          return [q.id, { correct: q.correct!, isCorrect: ok, points: 0, explanation: q.explanation ?? "", selected: s }];
        }),
    ),
  );
  const [pending, start] = useTransition();
  const q = questions[idx];
  const c = checked[q.id];
  const all = questions.every((x) => checked[x.id]);

  const check = () =>
    start(async () => {
      const res = await answerAction(attemptId, q.id, sel[q.id] ?? []);
      if (res.ok) setChecked((m) => ({ ...m, [q.id]: res.data }));
      else toast.error(t(`errors.${res.error}`));
    });

  const finish = () =>
    start(async () => {
      const res = await finishAttemptAction(attemptId);
      if (res.ok) router.push(`/student/result/${attemptId}`);
      else toast.error(t(`errors.${res.error}`));
    });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav aria-label={t("student.question", { n: idx + 1, total: questions.length })} className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-current={i === idx ? "step" : undefined}
            aria-label={t("student.question", { n: i + 1, total: questions.length })}
            className={cn(
              "grid size-9 place-items-center rounded-lg border text-sm font-semibold",
              i === idx && "ring-3 ring-ring/50",
              checked[x.id]?.isCorrect && "border-success bg-success text-white",
              checked[x.id] && !checked[x.id].isCorrect && "border-destructive bg-destructive text-white",
              !checked[x.id] && "bg-card",
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <article className="space-y-4 rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("student.question", { n: idx + 1, total: questions.length })}</span>
          <span>·</span>
          <span>{q.type === "MULTIPLE" ? t("student.multipleHint") : t("student.singleHint")}</span>
          {q.isDemo && <Badge variant="outline">{t("student.demoBadge")}</Badge>}
        </div>
        {q.kkMissing && <p className="text-sm text-warning">{t("common.kkMissing")}</p>}
        <div id={`q-${q.id}`} className="text-lg font-medium">
          <Markdown>{q.text}</Markdown>
        </div>
        <OptionList
          name={`q-${q.id}`}
          labelledBy={`q-${q.id}`}
          options={q.options}
          type={q.type}
          selected={c ? c.selected : (sel[q.id] ?? [])}
          onChange={(s) => setSel((m) => ({ ...m, [q.id]: s }))}
          correct={c?.correct}
          disabled={!!c || pending}
        />
        {c && (
          <div role="status" className={cn("rounded-xl p-4", c.isCorrect ? "bg-success/10" : "bg-destructive/10")}>
            <p className={cn("flex items-center gap-2 font-semibold", c.isCorrect ? "text-success" : "text-destructive")}>
              {c.isCorrect ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
              {c.isCorrect ? t("student.correct") : c.points > 0 ? t("student.partial") : t("student.wrong")}
            </p>
            {c.explanation && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">{t("student.explanation")}: </span>
                <Markdown className="inline text-sm [&_p]:my-1">{c.explanation}</Markdown>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIdx(idx - 1)} disabled={idx === 0}>
            <ArrowLeft aria-hidden /> {t("common.prev")}
          </Button>
          {!c ? (
            <Button onClick={check} disabled={pending || !(sel[q.id]?.length)} className="ml-auto">
              {t("student.check")}
            </Button>
          ) : idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)} className="ml-auto">
              {t("common.next")} <ArrowRight aria-hidden />
            </Button>
          ) : null}
        </div>
      </article>
      <div className="flex justify-end">
        <Button size="lg" variant={all ? "default" : "outline"} onClick={finish} disabled={pending}>
          {t("student.finish")}
        </Button>
      </div>
    </div>
  );
}
