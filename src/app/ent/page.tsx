"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n/context";

export default function EntHubPage() {
  const { t } = useI18n();

  const courses = [
    { slug: "informat", title: t.subjects.informat, icon: "💻", description: t.subjects.informatDesc },
    { slug: "math", title: t.subjects.math, icon: "📐", description: t.subjects.mathDesc },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t.ent.hubTitle} description={t.ent.hubDesc} />
      <div className="grid gap-6 sm:grid-cols-2">
        {courses.map((c) => (
          <Link key={c.slug} href={`/ent/${c.slug}`} className="group rounded-2xl border border-border bg-card p-8 hover:border-primary hover:shadow-lg">
            <span className="text-4xl">{c.icon}</span>
            <h2 className="mt-4 text-xl font-bold group-hover:text-primary">{c.title}</h2>
            <p className="mt-2 text-muted">{c.description}</p>
            <p className="mt-4 text-sm font-medium text-primary">5 {t.home.modules} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
