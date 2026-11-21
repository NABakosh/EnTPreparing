import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Bar } from "@/components/learn/bar";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { subjectsWithProgress } from "@/server/services/learning";
import { parentChildren, studentStats } from "@/server/services/stats";

export default async function ParentHome() {
  const actor = await requirePageUser("PARENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const children = await parentChildren(actor);
  const cards = await Promise.all(
    children.map(async (c) => ({ child: c, stats: await studentStats(actor, c.id, locale), subjects: await subjectsWithProgress(c.id) })),
  );
  return (
    <div>
      <PageHeader title={t("parent.title")} />
      {cards.length === 0 ? (
        <EmptyState text={t("parent.empty")} />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {cards.map(({ child, stats, subjects }) => {
            const last = stats.exams.at(-1);
            return (
              <li key={child.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{child.fullName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {child.class?.name} · {t("parent.lastLogin", { date: child.lastLoginAt ? fmtDate(child.lastLoginAt, locale) : t("admin.never") })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{t("student.lastExam")}</div>
                    <div className="text-xl font-extrabold tabular-nums">{last ? `${last.score} / ${last.max}` : "—"}</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {subjects.filter((s) => s.inProgram).map((s) => (
                    <li key={s.id}>
                      <div className="flex justify-between text-sm"><span>{pickText(s, "name", locale)}</span><span className="text-muted-foreground">{t("student.topicsDone", { done: s.done, total: s.total })}</span></div>
                      <Bar value={s.total ? (s.done / s.total) * 100 : 0} label={pickText(s, "name", locale)} className="mt-1" />
                    </li>
                  ))}
                </ul>
                <Link href={`/parent/child/${child.id}`} className="mt-4 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  {t("teacher.details")} <ChevronRight className="size-4" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
