import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, PlayCircle } from "lucide-react";
import { Panel } from "@/components/app/page-header";
import { Bar } from "@/components/learn/bar";
import { ProfilePicker } from "@/components/learn/profile-picker";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { activeExam } from "@/server/services/attempts";
import { subjectsWithProgress } from "@/server/services/learning";
import { pairOptions } from "@/server/services/pairs";
import { getSettings } from "@/server/services/settings";
import { studentStats } from "@/server/services/stats";

export default async function StudentDashboard() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [subjects, settings, stats, pairs, exam] = await Promise.all([
    subjectsWithProgress(user.id),
    getSettings(),
    studentStats(user, user.id, locale),
    pairOptions(locale),
    activeExam(user.id),
  ]);
  // eslint-disable-next-line react-hooks/purity -- серверный рендер, «сейчас» нужно один раз
  const days = Math.max(0, Math.ceil((Date.parse(settings.ubtDate) - Date.now()) / 86400_000));
  const firstName = user.fullName.split(/\s+/)[1] ?? user.fullName;
  const program = subjects.filter((s) => s.inProgram);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold sm:text-3xl">{t("student.hello", { name: firstName })}</h1>
          <p className="mt-2 text-primary-foreground/90">{t("student.dashboardText")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/student/learn" className={buttonVariants({ variant: "secondary", size: "lg" })}>{t("nav.learn")}</Link>
            {exam ? (
              <Link href={`/student/exam/${exam.id}`} className={buttonVariants({ variant: "secondary", size: "lg" })}><PlayCircle aria-hidden /> {t("student.continueExam")}</Link>
            ) : (
              <Link href="/student/exam" className="inline-flex h-12 items-center rounded-xl border border-white/40 px-6 font-medium hover:bg-white/10">{t("nav.exam")}</Link>
            )}
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarClock className="size-4" aria-hidden />{t("student.toUbt")}</div>
          <div className="mt-2 text-4xl font-extrabold text-primary tabular-nums">{t("student.daysLeft", { count: days })}</div>
          <div className="mt-1 text-sm text-muted-foreground">{fmtDate(settings.ubtDate, locale)}</div>
        </div>
      </div>

      {!user.profilePairId ? (
        <Panel title={t("student.chooseProfile")}>
          <p className="mb-4 text-sm text-muted-foreground">{t("student.chooseProfileText")}</p>
          <ProfilePicker pairs={pairs} current={null} />
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("student.progressTitle")}>
          <ul className="space-y-4">
            {(program.length ? program : subjects).map((s) => (
              <li key={s.id}>
                <Link href={`/student/learn/${s.id}`} className="block rounded-lg hover:text-primary">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{pickText(s, "name", locale)}</span>
                    <span className="text-muted-foreground">{t("student.topicsDone", { done: s.done, total: s.total })}</span>
                  </div>
                  <Bar value={s.total ? (s.done / s.total) * 100 : 0} label={pickText(s, "name", locale)} className="mt-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("student.weakTitle")}>
          {stats.weak.length ? (
            <ul className="space-y-2">
              {stats.weak.map((w) => (
                <li key={w.id}>
                  <Link href={`/student/topic/${w.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:border-primary">
                    <span><span className="font-medium">{w.title}</span><span className="block text-xs text-muted-foreground">{w.subject}</span></span>
                    <Badge variant="secondary">{w.pct}%</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("student.weakEmpty")}</p>
          )}
        </Panel>
      </div>
      {user.profilePairId && (
        <Panel title={t("student.profile")}>
          <ProfilePicker pairs={pairs} current={user.profilePairId} />
        </Panel>
      )}
    </div>
  );
}
