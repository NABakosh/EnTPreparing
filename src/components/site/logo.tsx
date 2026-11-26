import Link from "next/link";
import { BRAND, SITE_LOGO, SITE_SHORT } from "@/config/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl font-heading font-extrabold text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {SITE_LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={SITE_LOGO} alt="" width={36} height={36} className="size-9 rounded-xl object-cover" />
      ) : (
        <span aria-hidden className="btn-glow grid size-9 place-items-center rounded-xl text-[11px] font-extrabold tracking-wide text-white">
          {SITE_SHORT}
        </span>
      )}
      <span className="hidden text-base leading-tight tracking-tight whitespace-nowrap min-[400px]:inline sm:text-lg">{BRAND}</span>
    </Link>
  );
}
