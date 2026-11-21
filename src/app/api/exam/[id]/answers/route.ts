import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/current";
import { AppError, errorCode } from "@/server/errors";
import { saveExamAnswers } from "@/server/services/attempts";

/** Автосохранение ответов пробного экзамена. Тело: { answers: { [questionId]: number[] } } */
export async function POST(req: Request, ctx: RouteContext<"/api/exam/[id]/answers">) {
  try {
    const actor = await requireUser("STUDENT");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { answers?: Record<string, unknown> } | null;
    if (!body?.answers || typeof body.answers !== "object") throw new AppError("validation");
    return NextResponse.json({ ok: true, ...(await saveExamAnswers(actor, id, body.answers)) });
  } catch (e) {
    const status = e instanceof AppError ? e.status : 500;
    return NextResponse.json({ ok: false, error: errorCode(e) }, { status });
  }
}
