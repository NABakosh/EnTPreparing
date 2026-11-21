import { getTranslations } from "next-intl/server";
import { ImportUsersForm } from "@/components/app/import-users-form";
import { PageHeader, Panel } from "@/components/app/page-header";
import { requirePageUser } from "@/server/auth/current";

export default async function AdminImportPage() {
  await requirePageUser("ADMIN");
  const t = await getTranslations("admin");
  return (
    <div className="space-y-6">
      <PageHeader title={t("importTitle")} />
      <Panel title={t("importStudents")}><ImportUsersForm kind="students" /></Panel>
      <Panel title={t("importTeachers")}><ImportUsersForm kind="teachers" /></Panel>
    </div>
  );
}
