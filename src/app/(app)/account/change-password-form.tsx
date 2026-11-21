"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await changePasswordAction({
            current: String(fd.get("current") ?? ""),
            next: String(fd.get("next") ?? ""),
            confirm: String(fd.get("confirm") ?? ""),
          });
          if (res.ok) {
            form.reset();
            toast.success(t("auth.changed"));
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      {(["current", "next", "confirm"] as const).map((f) => (
        <div key={f} className="space-y-2">
          <Label htmlFor={`pw-${f}`}>{t(f === "current" ? "auth.current" : f === "next" ? "auth.newPassword" : "auth.confirm")}</Label>
          <Input id={`pw-${f}`} name={f} type="password" required minLength={f === "current" ? 1 : 8} autoComplete={f === "current" ? "current-password" : "new-password"} className="h-11" />
        </div>
      ))}
      <Button type="submit" disabled={pending}>{pending ? t("common.loading") : t("common.save")}</Button>
    </form>
  );
}
