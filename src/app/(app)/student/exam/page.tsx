import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PlayCircle } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/app/page-header";
import { ExamStart } from "@/components/learn/exam-start";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { fmtDate, fmtDuration } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { activeExam } from "@/server/services/attempts";
import { examOverview } from "@/server/services/exam-info";

export default async function ExamHome() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [info, active] = await Promise.all([examOverview(user.id, locale), activeExam(user.id)]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("exam.title")} description={t("exam.intro")} />
      {!info.template ? (
        <EmptyState text={t("errors.no_exam_template")} />
      ) : (
        <>
          <Panel title={t("exam.structure")}>
            <p className="mb-3 font-semibold">{t("exam.sectionsTotal", { count: info.template.total, minutes: info.template.durationMin, points: info.template.points })}</p>
            <ul className="space-y-1.5 text-sm">
              {info.template.sections.map((s, i) => (
                <li key={i} className="flex justify-between gap-3 border-b pb-1.5 last:border-0">
                  <span>
                    {s.slot === "FIXED"
                      ? t("exam.historyRow", { name: s.name ?? "", count: s.single + s.multiple })
                      : t("exam.profileSlot", { n: s.slot === "PROFILE_1" ? 1 : 2, count: s.single + s.multiple, multi: s.multiple })}
                  </span>
                  <span className="shrink-0 font-medium text-muted-foreground">{t("common.points", { count: s.points })}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            {active ? (
              <Link href={`/student/exam/${active.id}`} className={buttonVariants({ size: "lg" })}><PlayCircle aria-hidden /> {t("exam.continue")}</Link>
            ) : (
              <ExamStart pairs={info.pairs} current={user.profilePairId} />
            )}
          </Panel>
          <Panel title={t("exam.history")}>
            {info.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("exam.noHistory")}</p>
            ) : (
              <ul className="divide-y">
                {info.history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/student/result/${h.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                      <span className="flex-1">
                        <span className="block font-medium">{h.pair}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(h.date, locale, true)} · {fmtDuration(h.durationSec)}</span>
                      </span>
                      <span className="text-lg font-bold tabular-nums">{h.score} / {h.max}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
