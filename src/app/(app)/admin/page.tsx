import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { requirePageUser } from "@/server/auth/current";
import { adminOverview } from "@/server/services/admin-stats";

export default async function AdminHome() {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations("admin");
  const s = await adminOverview(actor);
  const cards = [
    { label: t("countUsers"), value: s.users, href: "/admin/users" },
    { label: t("countClasses"), value: s.classes, href: "/admin/classes" },
    { label: t("countQuestions"), value: s.published, href: "/admin/questions" },
    { label: t("countDrafts"), value: s.review, href: "/teacher/review" },
    { label: t("countFeedback"), value: s.feedback, href: "/admin/feedback" },
    { label: t("countAttempts"), value: s.attempts, href: "/admin/users" },
  ];
  return (
    <div>
      <PageHeader title={t("overviewTitle")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="block rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <div className="text-sm text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{c.value}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
