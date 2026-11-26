import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { deleteClassAction } from "@/app/actions/users";
import { ActionButton } from "@/components/app/action-button";
import { EmptyState, PageHeader, Panel } from "@/components/app/page-header";
import { requirePageUser } from "@/server/auth/current";
import { listClasses, listTeachers } from "@/server/services/classes";
import { ClassForm } from "./class-form";

export default async function AdminClassesPage() {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const [classes, teachers] = await Promise.all([listClasses(actor), listTeachers(actor)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.classesTitle")} />
      <Panel title={t("admin.newClass")}><ClassForm teachers={teachers} /></Panel>
      {classes.length === 0 ? (
        <EmptyState text={t("common.noData")} />
      ) : (
        <ul className="space-y-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-3xl border border-transparent bg-card shadow-soft p-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg">
                  <span className="text-lg font-bold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("admin.students")}: {c._count.students} · {t("admin.teachers")}: {c.teachers.map((x) => x.fullName).join(", ") || "—"}
                  </span>
                  <Link href={`/teacher/class/${c.id}`} className="ml-auto text-sm font-medium text-primary hover:underline">{t("nav.stats")}</Link>
                </summary>
                <div className="mt-4 space-y-4 border-t pt-4">
                  <ClassForm id={c.id} name={c.name} teacherIds={c.teachers.map((x) => x.id)} teachers={teachers} />
                  <ActionButton action={deleteClassAction.bind(null, c.id)} confirm={t("common.confirmDelete")} variant="destructive">
                    {t("common.delete")}
                  </ActionButton>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
