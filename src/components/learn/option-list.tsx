"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Варианты ответа: radio (один) или checkbox (несколько). После проверки подсвечивает верные/неверные. */
export function OptionList({
  name,
  options,
  type,
  selected,
  onChange,
  correct,
  disabled,
  labelledBy,
}: {
  name: string;
  options: string[];
  type: "SINGLE" | "MULTIPLE";
  selected: number[];
  onChange?: (sel: number[]) => void;
  correct?: number[];
  disabled?: boolean;
  labelledBy?: string;
}) {
  const revealed = !!correct;
  return (
    <div role={type === "SINGLE" ? "radiogroup" : "group"} aria-labelledby={labelledBy} className="space-y-2">
      {options.map((opt, i) => {
        const isSel = selected.includes(i);
        const isCorrect = correct?.includes(i);
        return (
          <label
            key={i}
            className={cn(
              "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 bg-card px-4 py-3 text-base transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              !revealed && isSel && "border-primary bg-secondary",
              !revealed && !isSel && "hover:border-primary/50",
              revealed && isCorrect && "border-success bg-success/10",
              revealed && isSel && !isCorrect && "border-destructive bg-destructive/10",
              disabled && "cursor-default",
            )}
          >
            <input
              type={type === "SINGLE" ? "radio" : "checkbox"}
              name={name}
              className="sr-only"
              checked={isSel}
              disabled={disabled}
              onChange={() => {
                if (!onChange) return;
                if (type === "SINGLE") onChange([i]);
                else onChange(isSel ? selected.filter((x) => x !== i) : [...selected, i].sort());
              }}
            />
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-sm font-bold",
                isSel ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                revealed && isCorrect && "border-success bg-success text-white",
                revealed && isSel && !isCorrect && "border-destructive bg-destructive text-white",
              )}
            >
              {revealed && isCorrect ? <Check className="size-4" /> : revealed && isSel ? <X className="size-4" /> : LETTERS[i]}
            </span>
            <span className="pt-0.5 whitespace-pre-line">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
