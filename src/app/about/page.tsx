"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n/context";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t.about.title} description={t.about.desc} />
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xl font-semibold">{t.about.mission}</h2>
        <p className="mt-4 text-muted">{t.about.missionText}</p>
        <h2 className="mt-8 text-xl font-semibold">{t.about.how}</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted">
          <li>{t.about.step1}</li>
          <li>{t.about.step2}</li>
          <li>{t.about.step3}</li>
          <li>{t.about.step4}</li>
        </ol>
        <h2 className="mt-8 text-xl font-semibold">{t.about.tech}</h2>
        <p className="mt-4 text-muted">{t.about.techText}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold">{t.about.team}</h3>
        <p className="text-sm text-primary">{t.about.teamRole}</p>
        <p className="mt-3 text-sm text-muted">{t.about.teamBio}</p>
      </div>
    </div>
  );
}
