"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await loginAction({ login: String(fd.get("login") ?? ""), password: String(fd.get("password") ?? ""), next });
          if (res.ok) {
            router.replace(res.data.redirectTo);
            router.refresh();
          } else setError(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="login">{t("auth.login")}</Label>
        <Input id="login" name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="h-12 text-base" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="h-12 text-base" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4 accent-primary" />
          {t("auth.showPassword")}
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="btn-glow h-13 w-full" disabled={pending}>
        {pending ? t("common.loading") : t("auth.submit")}
      </Button>
    </form>
  );
}
