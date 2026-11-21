import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_NAME, type Locale } from "@/config/site";
import { getSettings } from "@/server/services/settings";
import { Logo } from "./logo";
import { SocialLinks } from "./socials";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const s = await getSettings();
  const address = locale === "kk" ? s.contacts.addressKk || s.contacts.addressRu : s.contacts.addressRu || s.contacts.addressKk;
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{t("landing.footerText")}</p>
        </div>
        <div className="space-y-2 text-sm">
          <h2 className="font-semibold">{t("landing.contacts")}</h2>
          {s.contacts.email && (
            <p>
              <a className="hover:text-primary" href={`mailto:${s.contacts.email}`}>{s.contacts.email}</a>
            </p>
          )}
          {s.contacts.phone && (
            <p>
              <a className="hover:text-primary" href={`tel:${s.contacts.phone.replace(/[^+\d]/g, "")}`}>{s.contacts.phone}</a>
            </p>
          )}
          {address && <p className="text-muted-foreground">{address}</p>}
          <p>
            <Link className="hover:text-primary" href="/news">{t("nav.news")}</Link>
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t("landing.socialsTitle")}</h2>
          <SocialLinks socials={s.socials} />
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        {t("landing.rights", { year: new Date().getFullYear(), name: SITE_NAME[locale] })}
      </div>
    </footer>
  );
}
