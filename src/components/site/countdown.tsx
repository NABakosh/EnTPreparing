"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

/** Обратный отсчёт до ҰБТ. Рисуется на синей фирменной плашке: крупные цифры в «стеклянных» ячейках. */
export function Countdown({ target, dateLabel }: { target: string; dateLabel: string }) {
  const t = useTranslations("landing");
  const targetMs = Date.parse(target);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const passed = now !== null && targetMs <= now;
  const p = parts(now === null ? 0 : targetMs - now);
  return (
    <div className="text-center text-white">
      <h2 className="text-2xl font-bold sm:text-4xl">{t("countdownTitle")}</h2>
      {passed ? (
        <p className="mt-6 text-lg font-semibold">{t("countdownPassed")}</p>
      ) : (
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 sm:gap-5" aria-live="polite">
          {(["days", "hours", "minutes"] as const).map((k, i) => (
            <div key={k} className="flex items-center gap-2 sm:gap-5">
              {i > 0 && (
                <span aria-hidden className="flex flex-col gap-2">
                  <span className="size-1.5 rounded-full bg-white/80" />
                  <span className="size-1.5 rounded-full bg-white/80" />
                </span>
              )}
              <div className="min-w-24 rounded-3xl border-2 border-white/40 bg-white/10 px-3 py-4 backdrop-blur-sm sm:min-w-36 sm:py-6">
                <div className="font-heading text-4xl font-extrabold tabular-nums sm:text-7xl">
                  {now === null ? "–" : String(p[k]).padStart(2, "0")}
                </div>
                <div className="mt-1 text-sm font-medium text-white/90">{t(k)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm font-medium text-white/90">{t("countdownDate", { date: dateLabel })}</p>
    </div>
  );
}
