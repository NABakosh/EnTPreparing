"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-bold text-red-500">!</p>
      <h1 className="mt-4 text-2xl font-bold">Что-то пошло не так</h1>
      <p className="mt-2 max-w-md text-muted">
        {error.message || "Произошла непредвиденная ошибка. Попробуйте ещё раз."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Попробовать снова
      </button>
    </div>
  );
}
