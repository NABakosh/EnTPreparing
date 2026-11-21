import { getTranslations } from "next-intl/server";
import { PageHeader, Panel } from "@/components/app/page-header";
import { MentorChat } from "@/components/learn/mentor-chat";
import { requirePageUser } from "@/server/auth/current";
import { mentorUsage } from "@/server/services/mentor";

export default async function MentorPage() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations("mentor");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("intro")} />
      <Panel><MentorChat limit={await mentorUsage(user.id)} /></Panel>
    </div>
  );
}
