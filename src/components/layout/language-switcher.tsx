"use client";

import { localeLabels, type Locale } from "@/i18n/types";
import { useI18n } from "@/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex rounded-lg border border-border p-0.5 text-xs font-medium">
      {(["ru", "kk"] as Locale[]).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          className={`rounded-md px-2.5 py-1 transition ${
            locale === loc
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {loc === "ru" ? "RU" : "KK"}
        </button>
      ))}
    </div>
  );
}
