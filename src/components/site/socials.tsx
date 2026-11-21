import { Camera, MessageCircle, Music2, PlayCircle, Send } from "lucide-react";
import type { SiteSettings } from "@/server/services/settings";

const ICONS = { instagram: Camera, telegram: Send, youtube: PlayCircle, tiktok: Music2, whatsapp: MessageCircle } as const;
const LABELS = { instagram: "Instagram", telegram: "Telegram", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp" } as const;

export function SocialLinks({ socials }: { socials: SiteSettings["socials"] }) {
  const entries = (Object.keys(ICONS) as (keyof typeof ICONS)[]).filter((k) => socials[k]);
  if (!entries.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map((k) => {
        const Icon = ICONS[k];
        return (
          <li key={k}>
            <a
              href={socials[k]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:border-primary hover:text-primary"
            >
              <Icon className="size-4" aria-hidden />
              {LABELS[k]}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
