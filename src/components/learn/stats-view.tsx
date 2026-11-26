import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Clock, ListChecks, Trophy } from "lucide-react";
import type { Locale } from "@/config/site";
import { fmtDate, fmtDuration } from "@/lib/format";
import type { StudentStats } from "@/server/services/stats";
import { Bar } from "./bar";
import { PctBars, ScoreLine } from "./charts";

/** Общий вид статистики ученика (ученик, учитель, родитель). linkResults — показывать ссылки на разбор. */
export async function StatsView({ stats, resultHref }: { stats: StudentStats; resultHref?: (id: string) => string }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const last = stats.exams.at(-1);
  const maxExam = Math.max(140, ...stats.exams.map((e) => e.max));
  const tiles = [
    { Icon: Trophy, label: t("student.lastExam"), value: last ? `${last.score} / ${last.max}` : "—" },
    { Icon: Clock, label: t("student.totalTime"), value: fmtDuration(stats.totalTimeSec) },
    { Icon: ListChecks, label: t("student.attemptsCount"), value: String(stats.attemptsCount) },
  ];
  return (
    <div className="space-y-6">
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map(({ Icon, label, value }) => (
          <li key={label} className="rounded-3xl border border-transparent bg-card shadow-soft p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" aria-hidden />{label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
          </li>
        ))}
      </ul>

      <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("student.examDynamics")}</h2>
        {stats.exams.length ? (
          <>
            <ScoreLine data={stats.exams.map((e) => ({ label: fmtDate(e.date, locale).replace(/\s?\d{4}.*$/, ""), score: e.score }))} max={maxExam} valueLabel={t("student.resultTitle")} />
            <table className="sr-only">
              <caption>{t("student.examDynamics")}</caption>
              <tbody>{stats.exams.map((e) => <tr key={e.id}><td>{fmtDate(e.date, locale)}</td><td>{e.score} / {e.max}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="text-muted-foreground">{t("student.noExams")}</p>
        )}
      </section>

      {stats.subjects.length > 0 && (
        <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("student.bySubject")}</h2>
          <PctBars data={stats.subjects.map((s) => ({ name: s.name, pct: s.pct }))} valueLabel={t("student.bySubject")} />
          <table className="sr-only">
            <caption>{t("student.bySubject")}</caption>
            <tbody>{stats.subjects.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.pct}%</td></tr>)}</tbody>
          </table>
        </section>
      )}

      {stats.weak.length > 0 && (
        <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("student.weakTitle")}</h2>
          <ul className="space-y-3">
            {stats.weak.map((w) => (
              <li key={w.id}>
                <div className="flex justify-between gap-2 text-sm"><span><span className="font-medium">{w.title}</span> · <span className="text-muted-foreground">{w.subject}</span></span><span className="font-semibold tabular-nums">{w.pct}%</span></div>
                <Bar value={w.pct} label={w.title} className="mt-1" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.topics.length > 0 && (
        <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("student.byTopic")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3 font-medium">{t("student.topicCol")}</th><th className="py-2 pr-3 font-medium">%</th><th className="py-2 font-medium">{t("student.answersCol")}</th></tr></thead>
              <tbody>
                {stats.topics.map((tp) => (
                  <tr key={tp.id} className="border-t">
                    <td className="py-2 pr-3"><div className="font-medium">{tp.title}</div><div className="text-xs text-muted-foreground">{tp.subject}</div></td>
                    <td className="w-32 py-2 pr-3"><div className="flex items-center gap-2"><Bar value={tp.pct} label={tp.title} /><span className="w-10 text-right tabular-nums">{tp.pct}%</span></div></td>
                    <td className="py-2 tabular-nums">{tp.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.recent.length > 0 && (
        <section className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("student.recentTitle")}</h2>
          <ul className="divide-y">
            {stats.recent.map((r) => {
              const inner = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t(`student.kinds.${r.kind}`)}{r.topic ? `: ${r.topic}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(r.date, locale, true)} · {fmtDuration(r.durationSec)}</div>
                  </div>
                  <div className="text-right font-semibold tabular-nums">{r.score} / {r.max}<div className="text-xs font-normal text-muted-foreground">{r.pct}%</div></div>
                </>
              );
              return (
                <li key={r.id}>
                  {resultHref ? <Link href={resultHref(r.id)} className="flex items-center gap-3 py-3 hover:text-primary">{inner}</Link> : <div className="flex items-center gap-3 py-3">{inner}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
