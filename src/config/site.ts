/** Название сайта — одно на обоих языках, меняется здесь в одном месте. */
export const BRAND = "ENT Preparing";
export const SITE_NAME = {
  kk: BRAND,
  ru: BRAND,
} as const;

export const SITE_SHORT = "ENT";

/** Путь к картинке-логотипу в public/ (например "/logo.png"). null — текстовый логотип. */
export const SITE_LOGO: string | null = null;

/** Подписант сертификата (официальные реквизиты на казахском, как в образце школы). */
export const CERTIFICATE_SIGNER = {
  position: ["И.Қ. Мандоки атындағы № 154 жалпы білім", "беретін мектептің директоры"],
  name: "К.К. АЛМАСБАЕВА",
};

export const LOCALES = ["kk", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "kk";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(v: unknown): v is Locale {
  return v === "kk" || v === "ru";
}
