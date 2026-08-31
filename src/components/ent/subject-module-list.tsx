"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n } from "@/i18n/context";
import {
  getModulesForSubject,
  localizeModule,
  type SubjectSlug,
} from "@/lib/modules";
import {
  getModuleProgress,
  isModuleUnlocked,
} from "@/lib/local-storage/progress";

export function SubjectModuleList({ subjectSlug }: { subjectSlug: SubjectSlug }) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const modules = getModulesForSubject(subjectSlug);
  const subjectTitle =
    subjectSlug === "informat" ? t.subjects.informat : t.subjects.math;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <Link href="/ent" className="text-sm text-muted hover:text-foreground">
          {t.ent.backToCourses}
        </Link>
      </div>

      <PageHeader title={subjectTitle} description={t.ent.hubDesc} />

      {!user && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Link href="/login" className="font-medium underline">{t.ent.loginLink}</Link>
          {" — "}{t.ent.loginPrompt}
        </div>
      )}

      <div className="space-y-4">
        {modules.map((mod) => {
          const localized = localizeModule(mod, locale);
          const prog = getModuleProgress(subjectSlug, mod.level);
          const isLocked = !isModuleUnlocked(subjectSlug, mod.level);
          const isPassed = prog.isPassed;

          return (
            <div key={mod.level} className={`rounded-2xl border bg-card p-6 ${isLocked ? "opacity-60" : "hover:shadow-md"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isPassed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {isPassed ? "✓" : mod.level}
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.ent.module} {mod.level}: {localized.title}</h3>
                    <p className="mt-1 text-sm text-muted">{localized.description}</p>
                    {prog.bestScore !== null && (
                      <p className="mt-1 text-sm text-muted">{t.ent.bestScore}: {prog.bestScore}%</p>
                    )}
                  </div>
                </div>

                {isLocked ? (
                  <span className="text-sm text-muted">🔒 {t.ent.locked} {mod.level - 1}</span>
                ) : user ? (
                  <Link href={`/ent/${subjectSlug}/${mod.level}/test`} className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    {isPassed ? t.ent.retake : t.ent.startTest}
                  </Link>
                ) : (
                  <Link href="/login" className="shrink-0 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold">
                    {t.nav.login}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
