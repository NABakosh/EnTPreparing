"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n } from "@/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function NavbarClient() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/news", label: t.nav.news },
    { href: "/analytics", label: t.nav.analytics },
    { href: "/ent", label: t.nav.courses },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          ENT Preparing
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-foreground">
                {t.nav.dashboard}
              </Link>
              <button type="button" onClick={logout} className="rounded-lg border border-border px-3 py-1.5 text-sm">
                {t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
                {t.nav.login}
              </Link>
              <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {t.nav.register}
              </Link>
            </>
          )}
        </div>

        <button type="button" className="rounded-lg p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-muted">
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <LanguageSwitcher />
              {user ? (
                <div className="flex gap-2">
                  <Link href="/dashboard" className="text-sm">{t.nav.dashboard}</Link>
                  <button type="button" onClick={logout} className="text-sm">{t.nav.logout}</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" className="text-sm">{t.nav.login}</Link>
                  <Link href="/register" className="text-sm text-primary">{t.nav.register}</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
