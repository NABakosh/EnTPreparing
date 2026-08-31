"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n } from "@/i18n/context";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useI18n();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err === "wrongCredentials" ? t.auth.wrongCredentials : err);
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t.auth.loginTitle}</h1>
          <p className="mt-2 text-sm text-muted">{t.auth.loginDesc}</p>
          <p className="mt-1 text-xs text-amber-600">{t.auth.localNote}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8">
          {searchParams.get("registered") === "true" && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {t.auth.registerSuccess}
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">{t.auth.email}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">{t.auth.password}</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? t.auth.loggingIn : t.auth.loginBtn}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">{t.nav.register}</Link>
        </p>
      </div>
    </div>
  );
}
