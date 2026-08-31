"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n/context";

export default function HomePage() {
  const { t } = useI18n();

  const features = [
    { title: t.home.feature1Title, description: t.home.feature1Desc, icon: "🎯" },
    { title: t.home.feature2Title, description: t.home.feature2Desc, icon: "🤖" },
    { title: t.home.feature3Title, description: t.home.feature3Desc, icon: "📚" },
    { title: t.home.feature4Title, description: t.home.feature4Desc, icon: "🏆" },
  ];

  const courses = [
    { slug: "informat", title: t.subjects.informat, icon: "💻", description: t.subjects.informatDesc },
    { slug: "math", title: t.subjects.math, icon: "📐", description: t.subjects.mathDesc },
  ];

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-blue-50 to-background px-4 py-20 dark:from-blue-950/30">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            {t.home.title}{" "}
            <span className="text-primary">{t.home.titleHighlight}</span>{" "}
            {t.home.titleSuffix}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">{t.home.subtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              {t.home.startFree}
            </Link>
            <Link href="/ent" className="rounded-xl border border-border px-8 py-3 text-sm font-semibold hover:bg-card">
              {t.home.toCourses}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <PageHeader title={t.home.coursesTitle} description={t.home.coursesDesc} />
        <div className="grid gap-6 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.slug} href={`/ent/${c.slug}`} className="group rounded-2xl border border-border bg-card p-8 hover:border-primary hover:shadow-lg">
              <span className="text-4xl">{c.icon}</span>
              <h3 className="mt-4 text-xl font-bold group-hover:text-primary">{c.title}</h3>
              <p className="mt-2 text-muted">{c.description}</p>
              <p className="mt-4 text-sm font-medium text-primary">5 {t.home.modules} →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <PageHeader title={t.home.featuresTitle} description={t.home.featuresDesc} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-background p-6">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
