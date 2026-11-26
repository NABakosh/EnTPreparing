import { cn } from "@/lib/utils";

/** Декоративная «лента-петля» в духе фирменных фигур: две переплетённые петли. Чисто визуальная. */
export function Swirl({ className, stroke = "currentColor", width = 46 }: { className?: string; stroke?: string; width?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" fill="none" className={cn("pointer-events-none", className)}>
      <path
        d="M200 200c-60-90-170-80-170 0s110 90 170 0 170-90 170 0-110 90-170 0Z"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        transform="rotate(-35 200 200)"
      />
    </svg>
  );
}

/** Цветная плитка с петлёй и иконкой — замена фотоколлажа в шапке главной. */
export function DecorTile({
  tone,
  className,
  children,
}: {
  tone: "teal" | "blue" | "mint" | "ink" | "rose";
  className?: string;
  children?: React.ReactNode;
}) {
  const tones = {
    teal: "from-[#3aa6cf] to-[#1d7596] text-white",
    blue: "from-[#66c2e6] to-[#2898bd] text-white",
    mint: "from-[#7fdcc0] to-[#3fb58f] text-white",
    ink: "from-[#2a3550] to-[#121a2b] text-white",
    rose: "from-[#f3a5c5] to-[#da62ac] text-white",
  } as const;
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] bg-gradient-to-br shadow-soft", tones[tone], className)}>
      <Swirl className="absolute -right-10 -bottom-12 size-56 opacity-25" stroke="#ffffff" width={40} />
      <div className="relative grid h-full place-items-center">{children}</div>
    </div>
  );
}
