import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserX } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import { Bar } from "@/components/learn/bar";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { classStats } from "@/server/services/stats";

export default async function ClassStatsPage({ params }: PageProps<"/teacher/class/[classId]">) {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const { classId } = await params;
  const locale = (await getLocale()) as Locale;
  const s = await classStats(actor, classId, locale).catch((e) => {
    if (e instanceof AppError || (e as { code?: string }).code === "P2025") return null;
    throw e;
  });
  if (!s) notFound();
  const t = await getTranslations();
  const tiles = [
    { label: t("teacher.studentsTitle"), value: String(s.rows.length) },
    { label: t("teacher.avgExam"), value: s.avgExam === null ? "—" : `${s.avgExam} / 140` },
    { label: t("teacher.avgCorrect"), value: s.avgCorrect === null ? "—" : `${s.avgCorrect}%` },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={t("teacher.classTitle", { name: s.cls.name })} description={s.cls.teachers.map((x) => x.fullName).join(", ")} />
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map((x) => (
          <li key={x.label} className="rounded-3xl border border-transparent bg-card shadow-soft p-4">
            <div className="text-sm text-muted-foreground">{x.label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{x.value}</div>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("teacher.weakTitle")}>
          {s.weak.length ? (
            <ul className="space-y-3">
              {s.weak.map((w) => (
                <li key={w.id}>
                  <div className="flex justify-between gap-2 text-sm"><span><span className="font-medium">{w.title}</span> · <span className="text-muted-foreground">{w.subject}</span></span><span className="font-semibold tabular-nums">{w.pct}%</span></div>
                  <Bar value={w.pct} label={w.title} className="mt-1" />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
        </Panel>
        <Panel title={t("teacher.inactiveTitle")}>
          {s.inactive.length ? (
            <ul className="space-y-2">
              {s.inactive.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <UserX className="size-4 text-warning" aria-hidden />
                  <span className="font-medium">{r.fullName}</span>
                  <span className="text-muted-foreground">· {r.lastLoginAt ? fmtDate(r.lastLoginAt, locale) : t("admin.never")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("teacher.allActive")}</p>}
        </Panel>
      </div>
      <Panel title={t("teacher.studentsTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{t("admin.fullName")}</th>
                <th className="py-2 pr-3 font-medium">{t("teacher.lastExam")}</th>
                <th className="py-2 pr-3 font-medium">{t("teacher.topicAvg")}</th>
                <th className="py-2 pr-3 font-medium">{t("teacher.correctPct")}</th>
                <th className="py-2 font-medium">{t("admin.lastLogin")}</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2.5 pr-3">
                    <Link href={`/teacher/student/${r.id}`} className="font-medium text-primary hover:underline">{r.fullName}</Link>
                    {!r.active && <Badge variant="destructive" className="ml-2">{t("admin.blocked")}</Badge>}
                    <div className="font-mono text-xs text-muted-foreground">{r.login}</div>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.lastExam ? `${r.lastExam.score} / ${r.lastExam.max}` : "—"}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.topicAvg === null ? "—" : `${r.topicAvg}%`}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.correctPct === null ? "—" : `${r.correctPct}%`}</td>
                  <td className={`py-2.5 ${r.inactive ? "text-warning" : ""}`}>{r.lastLoginAt ? fmtDate(r.lastLoginAt, locale) : t("admin.never")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
