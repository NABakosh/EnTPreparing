"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award, BarChart3, BookOpen, Bot, CheckSquare, Home, List, MessageSquare, Newspaper, School, Settings, Timer, Upload, UserPlus, Users, UserCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, book: BookOpen, timer: Timer, x: XCircle, chart: BarChart3, bot: Bot, award: Award, userplus: UserPlus,
  check: CheckSquare, users: Users, upload: Upload, school: School, list: List, news: Newspaper, message: MessageSquare,
  settings: Settings, user: UserCircle,
};

function isActive(pathname: string, href: string, all: NavItem[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // не подсвечивать корневой пункт, если есть более точный
  return !all.some((i) => i.href !== href && i.href.startsWith(href) && (pathname === i.href || pathname.startsWith(i.href + "/")));
}

export function AppNav({ items, variant }: { items: NavItem[]; variant: "side" | "top" }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const all = [...items, { href: "/account", label: "account", icon: "user" }];
  return (
    <ul className={variant === "side" ? "space-y-1" : "flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"}>
      {all.map((i) => {
        const Icon = ICONS[i.icon] ?? Home;
        const active = isActive(pathname, i.href, all);
        return (
          <li key={i.href} className={variant === "top" ? "shrink-0" : undefined}>
            <Link
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                variant === "side" ? "rounded-xl px-3 py-2.5 text-sm" : "h-10 rounded-full border px-4 text-sm whitespace-nowrap",
                active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {t(i.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
