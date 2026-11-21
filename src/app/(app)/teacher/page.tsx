import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/server/auth/current";

export default async function Page() {
  const user = await requirePageUser();
  const t = await getTranslations("nav");
  return <h1 className="text-2xl font-bold">{t("dashboard")} · {user.fullName}</h1>;
}
