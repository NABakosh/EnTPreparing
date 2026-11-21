"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { run } from "@/lib/action";
import { requireUser } from "@/server/auth/current";
import { SESSION_COOKIE, SESSION_MAX_AGE, homeFor } from "@/server/auth/session";
import * as auth from "@/server/services/auth";

export async function loginAction(input: { login: string; password: string; next?: string }) {
  const res = await run(() => auth.login(input));
  if (!res.ok) return res;
  const store = await cookies();
  store.set(SESSION_COOKIE, res.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  const home = homeFor(res.data.role);
  const next = input.next && input.next.startsWith(home) ? input.next : home;
  return { ok: true as const, data: { redirectTo: next } };
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function changePasswordAction(input: { current: string; next: string; confirm: string }) {
  return run(async () => auth.changePassword(await requireUser(), input));
}

export async function dismissPasswordPromptAction() {
  return run(async () => auth.dismissPasswordPrompt(await requireUser()));
}
