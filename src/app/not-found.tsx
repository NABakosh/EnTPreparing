"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t.common.notFound}</h1>
      <p className="mt-2 text-muted">{t.common.notFoundDesc}</p>
      <Link href="/" className="mt-8 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">
        {t.common.toHome}
      </Link>
    </div>
  );
}
