"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { kk } from "./locales/kk";
import { ru } from "./locales/ru";
import type { Dictionary, Locale } from "./types";

const dictionaries = { ru, kk } as const;

const STORAGE_KEY = "ent-locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentMeta(locale: Locale) {
  const meta = dictionaries[locale].meta;
  document.title = meta.title;
  document.documentElement.lang = locale === "kk" ? "kk" : "ru";

  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement("meta");
    descriptionTag.setAttribute("name", "description");
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute("content", meta.description);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const initial = saved === "ru" || saved === "kk" ? saved : "ru";
    setLocaleState(initial);
    applyDocumentMeta(initial);
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyDocumentMeta(next);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyDocumentMeta(locale);
    }
  }, [locale, mounted]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale] as Dictionary,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
) {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(`{${key}}`, String(val)),
    template,
  );
}
