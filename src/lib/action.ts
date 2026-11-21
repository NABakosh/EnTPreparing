import { errorCode } from "@/server/errors";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Обёртка для server actions: превращает AppError в код ошибки для i18n. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    // redirect()/notFound() из next/navigation пробрасываем дальше
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_")) throw e;
    return { ok: false, error: errorCode(e) };
  }
}
