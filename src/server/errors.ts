/** Ошибка бизнес-логики. code соответствует ключу errors.<code> в messages/*.json */
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

export function errorCode(e: unknown): string {
  if (e instanceof AppError) return e.code;
  console.error(e);
  return "unknown";
}
