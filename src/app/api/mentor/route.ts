import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/config/site";
import { requireUser } from "@/server/auth/current";
import { AppError, errorCode } from "@/server/errors";
import { askMentor } from "@/server/services/mentor";

export const maxDuration = 60;

/** POST { question, topicId?, history? } → { ok, answer, sources } */
export async function POST(req: Request) {
  try {
    const actor = await requireUser("STUDENT", "TEACHER", "ADMIN");
    const body = await req.json().catch(() => null);
    const res = await askMentor(actor, body, (await getLocale()) as Locale);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errorCode(e) }, { status: e instanceof AppError ? e.status : 500 });
  }
}
