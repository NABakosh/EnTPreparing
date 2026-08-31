"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n } from "@/i18n/context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await register(name, email, password);
    setLoading(false);
    if (err) {
      setError(err === "userExists" ? t.auth.userExists : err);
      return;
    }
    router.push("/login?registered=true");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t.auth.registerTitle}</h1>
          <p className="mt-2 text-sm text-muted">{t.auth.registerDesc}</p>
          <p className="mt-1 text-xs text-amber-600">{t.auth.localNote}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">{t.auth.name}</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">{t.auth.email}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">{t.auth.password}</label>
            <input id="password" type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary" />
            <p className="text-xs text-muted">{t.auth.passwordHint}</p>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? t.auth.registering : t.auth.registerBtn}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">{t.nav.login}</Link>
        </p>
      </div>
    </div>
  );
}
