import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/config/site";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { subjectTree } from "@/server/services/learning";

export default async function SubjectPage({ params }: PageProps<"/student/learn/[subjectId]">) {
  const user = await requirePageUser("STUDENT");
  const { subjectId } = await params;
  const tree = await subjectTree(subjectId, user.id);
  if (!tree) notFound();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return (
    <div>
      <Link href="/student/learn" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden />{t("student.learnTitle")}</Link>
      <PageHeader title={pickText(tree, "name", locale)} />
      <div className="space-y-6">
        {tree.modules.map((m, mi) => (
          <section key={m.id} className="rounded-3xl border border-transparent bg-card shadow-soft p-4 sm:p-6" aria-labelledby={`m-${m.id}`}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary">{t("student.module", { n: mi + 1 })}</span>
              {m.completed && <Badge className="bg-success text-white">{t("student.moduleDone")}</Badge>}
            </div>
            <h2 id={`m-${m.id}`} className="mb-4 text-xl font-bold">{pickText(m, "title", locale)}</h2>
            <ol className="space-y-2">
              {m.topics.map((tp) => {
                const p = tp.progress;
                const Icon = p?.completed ? CheckCircle2 : p ? CircleDot : Circle;
                return (
                  <li key={tp.id}>
                    <Link href={`/student/topic/${tp.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                      <Icon className={`size-6 shrink-0 ${p?.completed ? "text-success" : p ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{pickText(tp, "title", locale)}</div>
                        <div className="text-xs text-muted-foreground">
                          {p?.completed ? t("student.topicDone") : p && p.bestPercent > 0 ? t("student.topicTried", { pct: p.bestPercent }) : t("student.topicNew")}
                          {tp.grade ? ` · ${t("student.grade", { grade: tp.grade })}` : ""}
                          {` · ${t("student.questionsCount", { count: tp._count.questions })}`}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
