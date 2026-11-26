import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/server/auth/current";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const user = await requirePageUser();
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("auth.profileTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{user.fullName} · {t(`nav.roles.${user.role}`)}</p>
        <p className="text-sm text-muted-foreground">{t("auth.loginLabel", { login: user.login })}</p>
      </div>
      <section className="rounded-3xl border border-transparent bg-card shadow-soft p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("auth.changeTitle")}</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
