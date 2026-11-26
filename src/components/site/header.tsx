import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogIn, LayoutDashboard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current";
import { homeFor } from "@/server/auth/session";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  const links = [
    { href: "/#features", label: t("nav.advantages") },
    { href: "/#subjects", label: t("nav.subjects") },
    { href: "/#faq", label: t("nav.faq") },
    { href: "/news", label: t("nav.news") },
  ];
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-background via-background/85 to-transparent px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-full bg-card/95 pr-2 pl-4 shadow-soft backdrop-blur sm:pr-3 sm:pl-6">
        <Logo />
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label={t("common.menu")}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LocaleSwitcher />
          {user ? (
            <Link href={homeFor(user.role)} className={cn(buttonVariants(), "btn-glow rounded-full px-5")}>
              <LayoutDashboard aria-hidden />
              <span className="hidden sm:inline">{t("nav.dashboard")}</span>
            </Link>
          ) : (
            <Link href="/login" className={cn(buttonVariants(), "btn-glow rounded-full px-5")}>
              <LogIn aria-hidden />
              <span>{t("common.login")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
