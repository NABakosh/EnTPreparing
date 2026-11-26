import { Camera, MessageCircle, Music2, PlayCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/server/services/settings";

const ICONS = { instagram: Camera, telegram: Send, youtube: PlayCircle, tiktok: Music2, whatsapp: MessageCircle } as const;
const LABELS = { instagram: "Instagram", telegram: "Telegram", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp" } as const;
/** Мягкие цветные круги, как у иконок соцсетей на juz40. */
const TINTS = {
  instagram: "bg-[#ffecf8] text-[#ae4787]",
  telegram: "bg-[#e5f2ff] text-[#0062cc]",
  youtube: "bg-[#fde8eb] text-[#b30303]",
  tiktok: "bg-[#e8ebf3] text-[#1f293e]",
  whatsapp: "bg-[#e9fbed] text-[#1d7a43]",
} as const;

export function SocialLinks({ socials, variant = "pill" }: { socials: SiteSettings["socials"]; variant?: "pill" | "icon" }) {
  const entries = (Object.keys(ICONS) as (keyof typeof ICONS)[]).filter((k) => socials[k]);
  if (!entries.length) return null;
  return (
    <ul className={cn("flex flex-wrap", variant === "icon" ? "gap-3" : "gap-2")}>
      {entries.map((k) => {
        const Icon = ICONS[k];
        return (
          <li key={k}>
            <a
              href={socials[k]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={variant === "icon" ? LABELS[k] : undefined}
              title={LABELS[k]}
              className={cn(
                "inline-flex items-center justify-center gap-2 font-semibold transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                variant === "icon" ? "size-11 rounded-full" : "h-11 rounded-full px-4 text-sm",
                TINTS[k],
              )}
            >
              <Icon className="size-4" aria-hidden />
              {variant === "pill" && LABELS[k]}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
