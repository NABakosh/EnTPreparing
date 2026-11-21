import { getTranslations } from "next-intl/server";
import { CreateUserForm } from "@/components/app/create-user-form";
import { ImportUsersForm } from "@/components/app/import-users-form";
import { PageHeader, Panel } from "@/components/app/page-header";
import { requirePageUser } from "@/server/auth/current";
import { listClasses } from "@/server/services/classes";
import { studentsOfTeacher } from "@/server/services/users";

export default async function TeacherAccountsPage() {
  const actor = await requirePageUser("TEACHER", "ADMIN");
  const t = await getTranslations();
  const [classes, students] = await Promise.all([listClasses(actor), studentsOfTeacher(actor)]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("teacher.accountsTitle")} description={t("teacher.accountsHint")} />
      <Panel title={t("teacher.manual")}>
        <CreateUserForm
          roles={["STUDENT", "PARENT"]}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
          students={students.map((s) => ({ id: s.id, fullName: s.fullName, className: s.class?.name ?? "" }))}
        />
      </Panel>
      <Panel title={t("admin.importTitle")}>
        <ImportUsersForm kind="students" />
      </Panel>
    </div>
  );
}
