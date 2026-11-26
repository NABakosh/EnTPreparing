import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { requirePageUser } from "@/server/auth/current";
import { listClasses } from "@/server/services/classes";

export default async function TeacherHome() {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const t = await getTranslations();
  const classes = await listClasses(actor);
  return (
    <div>
      <PageHeader title={t("teacher.classesTitle")} />
      {classes.length === 0 ? (
        <EmptyState text={t("teacher.noClasses")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teacher/class/${c.id}`} className="flex items-center gap-4 rounded-3xl border border-transparent bg-card shadow-soft p-5 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-xl font-extrabold text-secondary-foreground">{c.name}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{t("teacher.classTitle", { name: c.name })}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-4" aria-hidden />{t("teacher.studentsCount", { count: c._count.students })}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
