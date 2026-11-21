import type { Locale } from "@/config/site";

/** Выбор поля *Ru/*Kk. Если казахского нет — русский + флаг fallback. */
export function pick<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): { text: string; fallback: boolean } {
  const ru = (obj[`${base}Ru`] as string | undefined) ?? "";
  const kk = (obj[`${base}Kk`] as string | undefined) ?? "";
  if (locale === "kk") {
    if (kk.trim()) return { text: kk, fallback: false };
    return { text: ru, fallback: Boolean(ru) };
  }
  if (ru.trim()) return { text: ru, fallback: false };
  return { text: kk, fallback: Boolean(kk) };
}

export function pickText<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): string {
  return pick(obj, base, locale).text;
}

export type LocalizedOption = { ru: string; kk: string };
export function pickOption(o: LocalizedOption, locale: Locale): string {
  return (locale === "kk" ? o.kk || o.ru : o.ru || o.kk) ?? "";
}
