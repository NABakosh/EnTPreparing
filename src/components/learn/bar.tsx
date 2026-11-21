import { cn } from "@/lib/utils";

/** Полоска прогресса с подписью для экранных дикторов. */
export function Bar({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label} className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full", v >= 60 ? "bg-success" : v >= 30 ? "bg-primary" : "bg-warning")} style={{ width: `${v}%` }} />
    </div>
  );
}
