import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { AppNav } from "@/components/app/app-nav";
import { NAV } from "@/components/app/nav-config";
import { PasswordPrompt } from "@/components/app/password-prompt";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/server/auth/current";
import { homeFor } from "@/server/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  const t = await getTranslations();
  const items = NAV[user.role];
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        {t("common.skipToContent")}
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Logo href={homeFor(user.role)} />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-muted-foreground">{t(`nav.roles.${user.role}`)}</div>
            </div>
            <LocaleSwitcher />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label={t("common.logout")} title={t("common.logout")}>
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </div>
        <nav className="lg:hidden" aria-label={t("common.menu")}>
          <AppNav items={items} variant="top" />
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <nav className="hidden w-60 shrink-0 lg:block" aria-label={t("common.menu")}>
          <div className="sticky top-22"><AppNav items={items} variant="side" /></div>
        </nav>
        <main id="main" className="min-w-0 flex-1">
          {user.mustChangePassword && <PasswordPrompt />}
          {children}
        </main>
      </div>
    </div>
  );
}
