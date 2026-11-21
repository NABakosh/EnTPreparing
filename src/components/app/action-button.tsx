"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action";

/** Кнопка, вызывающая server action (с подтверждением и тостом). */
export function ActionButton({
  action,
  confirm,
  children,
  variant = "outline",
  size = "sm",
  successText,
  onDone,
  className,
}: {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "default" | "xs";
  successText?: string;
  onDone?: (data: unknown) => void;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await action();
          if (res.ok) {
            if (successText) toast.success(successText);
            onDone?.(res.data);
            router.refresh();
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      {children}
    </Button>
  );
}
