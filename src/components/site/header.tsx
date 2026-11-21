import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogIn, LayoutDashboard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current";
import { homeFor } from "@/server/auth/session";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label={t("common.menu")}>
          <Link href="/news" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            {t("nav.news")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          {user ? (
            <Link href={homeFor(user.role)} className={buttonVariants({ size: "default" })}>
              <LayoutDashboard aria-hidden />
              <span className="hidden sm:inline">{t("nav.dashboard")}</span>
            </Link>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "default" })}>
              <LogIn aria-hidden />
              <span>{t("common.login")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
