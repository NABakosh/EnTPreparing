"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

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
    <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-muted-foreground">{t("countdownTitle")}</p>
      {passed ? (
        <p className="mt-3 text-lg font-semibold">{t("countdownPassed")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
          {(["days", "hours", "minutes"] as const).map((k) => (
            <div key={k} className="rounded-2xl bg-secondary px-2 py-3 text-center">
              <div className="text-3xl font-extrabold text-secondary-foreground tabular-nums sm:text-4xl">{now === null ? "–" : p[k]}</div>
              <div className="text-xs font-medium text-muted-foreground sm:text-sm">{t(k)}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{t("countdownDate", { date: dateLabel })}</p>
    </div>
  );
}
