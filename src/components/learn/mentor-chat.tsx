"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Bot, Loader2, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

type Source = { n: number; book: string; grade: number; page: number | null; chapter: string | null };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; error?: boolean };

export function MentorChat({ topicId, compact = false, limit }: { topicId?: string; compact?: boolean; limit?: { used: number; limit: number } }) {
  const t = useTranslations();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(limit?.used ?? 0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), [msgs.length, busy]);

  const ask = async () => {
    const question = q.trim();
    if (question.length < 3 || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-4).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/mentor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, topicId, history }) });
      const data = (await res.json().catch(() => ({ ok: false, error: "mentor_failed" }))) as { ok: boolean; answer?: string; sources?: Source[]; error?: string };
      if (data.ok) {
        setMsgs((m) => [...m, { role: "assistant", content: data.answer ?? "", sources: data.sources }]);
        setUsed((u) => u + 1);
      } else setMsgs((m) => [...m, { role: "assistant", content: t(`errors.${data.error ?? "mentor_failed"}`), error: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: t("errors.mentor_failed"), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("space-y-3 overflow-y-auto rounded-xl bg-muted/50 p-3", compact ? "max-h-96" : "min-h-64 max-h-[60vh]")} aria-live="polite">
        {msgs.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t("mentor.empty")}</p>}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
            <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border text-primary")}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : m.error ? "border border-destructive/30 bg-destructive/10 text-destructive" : "border bg-card")}>
              <span className="sr-only">{m.role === "user" ? t("mentor.you") : t("mentor.bot")}: </span>
              {m.role === "assistant" && !m.error ? <Markdown className="text-sm [&_p]:my-1.5">{m.content}</Markdown> : <p className="whitespace-pre-line">{m.content}</p>}
              {m.sources && m.sources.length > 0 && (
                <details className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  <summary className="flex cursor-pointer items-center gap-1 font-medium"><BookOpen className="size-3.5" aria-hidden />{t("mentor.sources")} ({m.sources.length})</summary>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                    {m.sources.map((s) => (
                      <li key={s.n}>{t("mentor.sourceRow", { book: s.book, grade: s.grade, page: s.page ? t("mentor.page", { page: s.page }) : "" })}{s.chapter ? ` · ${s.chapter}` : ""}</li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{t("mentor.thinking")}</p>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor={`mentor-q-${topicId ?? "all"}`} className="sr-only">{t("mentor.label")}</label>
        <Textarea
          id={`mentor-q-${topicId ?? "all"}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("mentor.placeholder")}
          rows={compact ? 2 : 3}
          maxLength={1000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy || q.trim().length < 3}><Send aria-hidden />{t("mentor.send")}</Button>
          {msgs.length > 0 && <Button type="button" variant="ghost" onClick={() => setMsgs([])}><Trash2 aria-hidden />{t("mentor.clear")}</Button>}
          {limit && <span className="ml-auto text-xs text-muted-foreground">{t("mentor.limit", { used, limit: limit.limit })}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{t("mentor.disclaimer")}</p>
      </form>
    </div>
  );
}
