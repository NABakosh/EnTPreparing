"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted">© {new Date().getFullYear()} ENT Preparing</p>
          <p className="mt-1 text-xs text-muted">{t.common.demoNote}</p>
        </div>
        <div className="flex gap-6">
          <Link href="/about" className="text-sm text-muted hover:text-foreground">{t.nav.about}</Link>
          <Link href="/news" className="text-sm text-muted hover:text-foreground">{t.nav.news}</Link>
          <Link href="/analytics" className="text-sm text-muted hover:text-foreground">{t.nav.analytics}</Link>
        </div>
      </div>
    </footer>
  );
}
