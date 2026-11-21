import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { toAlmatyLocalInput } from "@/lib/datetime-local";
import { requirePageUser } from "@/server/auth/current";
import { getSettings } from "@/server/services/settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  await requirePageUser("ADMIN");
  const t = await getTranslations("admin");
  const s = await getSettings();
  return (
    <div>
      <PageHeader title={t("settingsTitle")} />
      <SettingsForm initial={s} ubtLocal={toAlmatyLocalInput(new Date(s.ubtDate))} />
    </div>
  );
}
