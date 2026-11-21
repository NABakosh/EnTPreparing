"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { dismissPasswordPromptAction } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";

export function PasswordPrompt() {
  const t = useTranslations("auth");
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;
  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-secondary p-4 sm:flex-row sm:items-center">
      <KeyRound className="size-6 shrink-0 text-secondary-foreground" aria-hidden />
      <p className="flex-1 text-sm font-medium text-secondary-foreground">{t("changePrompt")}</p>
      <div className="flex gap-2">
        <Link href="/account" className={buttonVariants({ size: "sm" })}>{t("changeNow")}</Link>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => { await dismissPasswordPromptAction(); setHidden(true); })}
        >
          {t("later")}
        </Button>
      </div>
    </div>
  );
}
