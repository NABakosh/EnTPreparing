export type Locale = "ru" | "kk";

export const locales: Locale[] = ["ru", "kk"];

export const localeLabels: Record<Locale, string> = {
  ru: "Русский",
  kk: "Қазақша",
};

export type Dictionary = typeof import("./locales/ru").ru;
