import Link from "next/link";
import { getLocale } from "next-intl/server";
import { SITE_NAME, SITE_SHORT, type Locale } from "@/config/site";

export async function Logo({ href = "/" }: { href?: string }) {
  const locale = (await getLocale()) as Locale;
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg font-bold text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
        {SITE_SHORT}
      </span>
      <span className="text-base leading-tight sm:text-lg">{SITE_NAME[locale]}</span>
    </Link>
  );
}
