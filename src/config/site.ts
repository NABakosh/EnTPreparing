/** Рабочее название сайта — меняется здесь в одном месте. */
export const SITE_NAME = {
  kk: "ҰБТ Дайындық",
  ru: "Подготовка к ҰБТ",
} as const;

export const SITE_SHORT = "ҰБТ";

export const LOCALES = ["kk", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "kk";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(v: unknown): v is Locale {
  return v === "kk" || v === "ru";
}
