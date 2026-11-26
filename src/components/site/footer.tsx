import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE_NAME, type Locale } from "@/config/site";
import { getSettings } from "@/server/services/settings";
import { Logo } from "./logo";
import { SocialLinks } from "./socials";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const s = await getSettings();
  const address = locale === "kk" ? s.contacts.addressKk || s.contacts.addressRu : s.contacts.addressRu || s.contacts.addressKk;
  const hasSocials = Object.values(s.socials).some(Boolean);
  const hasContacts = Boolean(s.contacts.phone || s.contacts.email || address);
  const links = [
    { href: "/#features", label: t("nav.advantages") },
    { href: "/#subjects", label: t("nav.subjects") },
    { href: "/#faq", label: t("nav.faq") },
    { href: "/news", label: t("nav.news") },
  ];
  return (
    <footer className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-card shadow-soft">
        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">{t("landing.footerText")}</p>
          </div>
          <nav aria-label={t("common.menu")} className="space-y-3 text-sm">
            <h2 className="font-heading font-bold">{t("common.menu")}</h2>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}><Link className="text-muted-foreground hover:text-primary" href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>
          {hasContacts && (
          <div className="space-y-3 text-sm">
            <h2 className="font-heading font-bold">{t("landing.contacts")}</h2>
            <ul className="space-y-2">
              {s.contacts.phone && (
                <li>
                  <a className="inline-flex items-center gap-2 font-semibold text-primary hover:underline" href={`tel:${s.contacts.phone.replace(/[^+\d]/g, "")}`}>
                    <Phone className="size-4" aria-hidden />{s.contacts.phone}
                  </a>
                </li>
              )}
              {s.contacts.email && (
                <li>
                  <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary" href={`mailto:${s.contacts.email}`}>
                    <Mail className="size-4" aria-hidden />{s.contacts.email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{address}</li>
              )}
            </ul>
          </div>
          )}
          {hasSocials && (
            <div className="space-y-3">
              <h2 className="font-heading text-sm font-bold">{t("landing.socialsTitle")}</h2>
              <SocialLinks socials={s.socials} variant="icon" />
            </div>
          )}
        </div>
        <div className="border-t px-6 py-5 text-center text-xs text-muted-foreground sm:px-10">
          {t("landing.rights", { year: new Date().getFullYear(), name: SITE_NAME[locale] })}
        </div>
      </div>
    </footer>
  );
}
