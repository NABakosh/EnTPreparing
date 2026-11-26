import { cn } from "@/lib/utils";

/** Нативный select: лучше всего работает на телефонах и с экранными дикторами. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-[#f6f7f9] hover:border-input focus-visible:bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
