"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n } from "@/i18n/context";
import {
  getAttempts,
  getCertificates,
  getModuleProgress,
  getPassedCount,
} from "@/lib/local-storage/progress";
import { getModulesForSubject, localizeModule, type SubjectSlug } from "@/lib/modules";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();
  const attempts = getAttempts();
  const certificates = getCertificates();
  const subjects: SubjectSlug[] = ["informat", "math"];

  const totalPassed = subjects.reduce((s, slug) => s + getPassedCount(slug), 0);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
      <p className="mt-2 text-muted">{t.dashboard.welcome}, {user?.name}!</p>
      <p className="mt-1 text-xs text-amber-600">{t.dashboard.localStorage}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.dashboard.passedModules} value={`${totalPassed} / 10`} />
        <StatCard label={t.dashboard.attempts} value={String(attempts.length)} />
        <StatCard label={t.dashboard.certificates} value={String(certificates.length)} />
      </div>

      {subjects.map((slug) => {
        const title = slug === "informat" ? t.subjects.informat : t.subjects.math;
        const modules = getModulesForSubject(slug);
        const passed = getPassedCount(slug);

        return (
          <section key={slug} className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <span className="text-sm text-muted">{passed} / 5 {t.ent.passed}</span>
            </div>
            <div className="mt-4 space-y-3">
              {modules.map((mod) => {
                const localized = localizeModule(mod, locale);
                const prog = getModuleProgress(slug, mod.level);
                return (
                  <div key={mod.level} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div>
                      <p className="font-medium">{t.ent.module} {mod.level}: {localized.title}</p>
                      {prog.bestScore !== null && <p className="text-sm text-muted">{t.ent.bestScore}: {prog.bestScore}%</p>}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${prog.isPassed ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
                      {prog.isPassed ? t.dashboard.passed : t.dashboard.notPassed}
                    </span>
                  </div>
                );
              })}
            </div>
            <Link href={`/ent/${slug}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              {t.dashboard.toCourse}
            </Link>
          </section>
        );
      })}

      {certificates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t.dashboard.certsTitle}</h2>
          <div className="mt-4 space-y-3">
            {certificates.map((cert) => (
              <a key={cert.id} href={cert.fileUrl} download className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-md">
                <p className="font-medium">{cert.subjectSlug === "informat" ? t.subjects.informat : t.subjects.math}</p>
                <span className="text-sm text-primary">{t.dashboard.downloadPdf}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <button type="button" onClick={logout} className="mt-10 rounded-lg border border-border px-4 py-2 text-sm">
        {t.nav.logout}
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
