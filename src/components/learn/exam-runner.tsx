"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Cloud, CloudOff, Loader2, Timer } from "lucide-react";
import { finishAttemptAction } from "@/app/actions/learning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { OptionList } from "./option-list";

export type ExamQuestion = { id: string; section: string; type: "SINGLE" | "MULTIPLE"; text: string; options: string[]; isDemo: boolean; kkMissing: boolean };
type Section = { key: string; name: string };

const AUTOSAVE_MS = 5000;

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({
  attemptId,
  questions,
  sections,
  initialAnswers,
  deadline,
  serverNow,
}: {
  attemptId: string;
  questions: ExamQuestion[];
  sections: Section[];
  initialAnswers: Record<string, number[]>;
  deadline: string;
  serverNow: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finishing, startFinish] = useTransition();
  const dirty = useRef<Record<string, number[]>>({});
  const finishedRef = useRef(false);
  // смещение часов клиента относительно сервера
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const deadlineMs = Date.parse(deadline);
  const [left, setLeft] = useState(() => deadlineMs - (Date.parse(serverNow)));
  const flagsKey = `exam-flags-${attemptId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(flagsKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- восстановление из localStorage после монтирования
      if (raw) setFlags(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, [flagsKey]);

  const inflight = useRef<Promise<boolean> | null>(null);
  const flushOnce = useCallback(async (): Promise<boolean> => {
    const patch = dirty.current;
    if (!Object.keys(patch).length) return true;
    dirty.current = {};
    setSaveState("saving");
    try {
      const res = await fetch(`/api/exam/${attemptId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: patch }),
        keepalive: true,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        if (data.error === "time_over" || data.error === "attempt_finished") {
          finishedRef.current = true;
          router.replace(`/student/result/${attemptId}`);
          return false;
        }
        throw new Error(data.error ?? "save");
      }
      setSaveState("saved");
      return true;
    } catch {
      dirty.current = { ...patch, ...dirty.current };
      setSaveState("error");
      return false;
    }
  }, [attemptId, router]);

  /** Сохранения идут строго по одному, чтобы не перезаписать друг друга. */
  const flush = useCallback(async (): Promise<boolean> => {
    while (inflight.current) await inflight.current;
    const p = flushOnce();
    inflight.current = p;
    try {
      return await p;
    } finally {
      inflight.current = null;
    }
  }, [flushOnce]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    startFinish(async () => {
      const saved = await flush();
      if (!saved && !finishedRef.current) {
        // не завершаем, пока ответы не сохранены (кроме истечения времени — сервер сам примет последние сохранённые)
        if (Date.now() + offset < deadlineMs) {
          toast.error(t("exam.saveError"));
          return;
        }
      }
      if (finishedRef.current) return;
      const res = await finishAttemptAction(attemptId);
      if (res.ok) {
        finishedRef.current = true;
        try { localStorage.removeItem(flagsKey); } catch {}
        router.replace(`/student/result/${attemptId}`);
      } else toast.error(t(`errors.${res.error}`));
    });
  }, [attemptId, flagsKey, flush, router, t, offset, deadlineMs]);

  // таймер + автозавершение
  useEffect(() => {
    const id = setInterval(() => {
      const l = deadlineMs - (Date.now() + offset);
      setLeft(l);
      if (l <= 0 && !finishedRef.current) {
        toast.info(t("exam.timeUp"));
        finish();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, offset, finish, t]);

  // автосохранение
  useEffect(() => {
    const id = setInterval(() => void flush(), AUTOSAVE_MS);
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  const q = questions[idx];
  const setAnswer = (sel: number[]) => {
    setAnswers((a) => ({ ...a, [q.id]: sel }));
    dirty.current[q.id] = sel;
    setSaveState("saving");
  };
  const toggleFlag = () => {
    setFlags((f) => {
      const n = new Set(f);
      if (n.has(q.id)) n.delete(q.id);
      else n.add(q.id);
      try { localStorage.setItem(flagsKey, JSON.stringify([...n])); } catch {}
      return n;
    });
  };
  const answeredCount = questions.filter((x) => answers[x.id]?.length).length;
  const sectionName = sections.find((s) => s.key === q.section)?.name ?? "";
  const lowTime = left < 10 * 60_000;

  return (
    <div className="space-y-4">
      {/* Панель: таймер и сохранение */}
      <div className="sticky top-[117px] z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur lg:top-16">
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-lg font-bold tabular-nums", lowTime ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")} role="timer" aria-label={t("exam.timeLeft")}>
            <Timer className="size-5" aria-hidden />
            {fmtLeft(left)}
          </div>
          <span className="text-sm text-muted-foreground">{t("exam.answered", { count: answeredCount, total: questions.length })}</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
            {saveState === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : saveState === "error" ? <CloudOff className="size-4 text-destructive" aria-hidden /> : <Cloud className="size-4" aria-hidden />}
            {saveState === "saving" ? t("exam.saving") : saveState === "error" ? t("exam.saveError") : t("exam.saved")}
          </span>
        </div>
        {/* вкладки разделов */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {sections.map((s) => {
            const first = questions.findIndex((x) => x.section === s.key);
            const inSec = questions.filter((x) => x.section === s.key);
            const done = inSec.filter((x) => answers[x.id]?.length).length;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setIdx(first)}
                aria-current={q.section === s.key ? "true" : undefined}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap", q.section === s.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
              >
                {s.name} · {done}/{inSec.length}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <article className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t("student.question", { n: idx + 1, total: questions.length })}</span>
            <span>· {sectionName}</span>
            <span>· {q.type === "MULTIPLE" ? t("student.multipleHint") : t("student.singleHint")}</span>
            {q.isDemo && <Badge variant="outline">{t("student.demoBadge")}</Badge>}
          </div>
          {q.kkMissing && <p className="text-sm text-warning">{t("common.kkMissing")}</p>}
          <div id={`eq-${q.id}`} className="text-lg font-medium"><Markdown>{q.text}</Markdown></div>
          <OptionList name={`eq-${q.id}`} labelledBy={`eq-${q.id}`} options={q.options} type={q.type} selected={answers[q.id] ?? []} onChange={setAnswer} disabled={finishing} />
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIdx(idx - 1)} disabled={idx === 0}><ArrowLeft aria-hidden />{t("common.prev")}</Button>
            <Button variant="ghost" onClick={toggleFlag} aria-pressed={flags.has(q.id)}>
              {flags.has(q.id) ? <BookmarkCheck className="text-warning" aria-hidden /> : <Bookmark aria-hidden />}
              <span className="hidden sm:inline">{flags.has(q.id) ? t("exam.unflag") : t("exam.flag")}</span>
            </Button>
            {idx < questions.length - 1 ? (
              <Button className="ml-auto" onClick={() => setIdx(idx + 1)}>{t("common.next")}<ArrowRight aria-hidden /></Button>
            ) : (
              <Button className="ml-auto" onClick={() => setConfirmOpen(true)}>{t("exam.finish")}</Button>
            )}
          </div>
        </article>

        <aside className="space-y-3 rounded-2xl border bg-card p-4" aria-label={t("exam.questionsNav")}>
          <h2 className="text-sm font-semibold">{t("exam.questionsNav")}</h2>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto lg:max-h-[60vh]">
            {sections.map((s) => (
              <div key={s.key}>
                <div className="mb-1 text-xs font-medium text-muted-foreground">{s.name}</div>
                <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 lg:grid-cols-6">
                  {questions.map((x, i) =>
                    x.section !== s.key ? null : (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setIdx(i)}
                        aria-label={`${t("student.question", { n: i + 1, total: questions.length })}${flags.has(x.id) ? ` · ${t("exam.flagged")}` : ""}`}
                        aria-current={i === idx ? "step" : undefined}
                        className={cn(
                          "relative h-8 rounded-md border text-xs font-semibold tabular-nums",
                          answers[x.id]?.length ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                          i === idx && "ring-3 ring-ring/50",
                        )}
                      >
                        {i + 1}
                        {flags.has(x.id) && <span aria-hidden className="absolute -top-1 -right-1 size-2.5 rounded-full bg-warning ring-2 ring-card" />}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-primary" aria-hidden />{t("exam.legendAnswered")}</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-warning" aria-hidden />{t("exam.legendFlagged")}</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded-sm border" aria-hidden />{t("exam.legendEmpty")}</span>
          </div>
          <Button variant="destructive" className="w-full" onClick={() => setConfirmOpen(true)} disabled={finishing}>{t("exam.finish")}</Button>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>{t("exam.confirmTitle")}</DialogTitle>
          <DialogDescription>{t("exam.confirmText", { answered: answeredCount, total: questions.length })}</DialogDescription>
          {answeredCount < questions.length && <p className="text-sm font-semibold text-destructive">{t("exam.confirmUnanswered", { count: questions.length - answeredCount })}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t("exam.confirmNo")}</Button>
            <Button onClick={finish} disabled={finishing}>{finishing ? t("common.loading") : t("exam.confirmYes")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
