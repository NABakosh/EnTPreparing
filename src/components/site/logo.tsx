import Link from "next/link";
import { BRAND, SITE_LOGO, SITE_SHORT } from "@/config/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg font-bold text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {SITE_LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={SITE_LOGO} alt="" width={36} height={36} className="size-9 rounded-xl object-cover" />
      ) : (
        <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">
          {SITE_SHORT}
        </span>
      )}
      <span className="text-base leading-tight whitespace-nowrap sm:text-lg">{BRAND}</span>
    </Link>
  );
}
