import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, ShieldX } from "lucide-react";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { pickText } from "@/server/lib/i18n-fields";
import { verifyCertificate } from "@/server/services/certificates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cert");
  return { title: t("verifyTitle"), robots: { index: false } };
}

export default async function VerifyPage({ params }: PageProps<"/verify/[number]">) {
  const { number } = await params;
  const t = await getTranslations("cert");
  const locale = (await getLocale()) as Locale;
  const c = await verifyCertificate(decodeURIComponent(number));
  const valid = !!c && !c.revoked;
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">{t("verifyTitle")}</h1>
      <div className={`mt-6 rounded-3xl border-2 p-6 ${valid ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
        <p className={`flex items-center gap-2 text-xl font-bold ${valid ? "text-success" : "text-destructive"}`}>
          {valid ? <BadgeCheck className="size-7" aria-hidden /> : <ShieldX className="size-7" aria-hidden />}
          {valid ? t("valid") : t("invalid")}
        </p>
        {c && valid && (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <dt className="text-muted-foreground">{t("number")}</dt><dd className="font-mono font-semibold">{c.number}</dd>
            <dt className="text-muted-foreground">{t("holder")}</dt><dd className="font-semibold">{c.fullName}</dd>
            <dt className="text-muted-foreground">{t("date")}</dt><dd>{fmtDate(c.issuedAt, locale)}</dd>
            {c.profilePair && (<><dt className="text-muted-foreground">{t("program")}</dt><dd>{pickText(c.profilePair.subject1, "name", locale)} — {pickText(c.profilePair.subject2, "name", locale)}</dd></>)}
          </dl>
        )}
      </div>
    </div>
  );
}
