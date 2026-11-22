"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, CheckSquare, X } from "lucide-react";
import { setQuestionsStatusBulkAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";

export const BULK_FORM = "review-bulk";

/** Панель массовой проверки: чекбоксы вопросов привязаны к форме через атрибут form. */
export function BulkBar() {
  const t = useTranslations("questions");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [count, setCount] = useState(0);
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM}"][name="ids"]`));
  const run = (status: "PUBLISHED" | "REJECTED") => {
    const ids = boxes().filter((b) => b.checked).map((b) => b.value);
    if (!ids.length) return;
    if (status === "REJECTED" && !window.confirm(t("rejectConfirm"))) return;
    start(async () => {
      const res = await setQuestionsStatusBulkAction(ids, status);
      if (res.ok) {
        toast.success(t("bulkDone", { ok: res.data.ok, failed: res.data.failed }));
        setCount(0);
        router.refresh();
      } else toast.error(res.error);
    });
  };
  return (
    <form
      id={BULK_FORM}
      onChange={() => setCount(boxes().filter((b) => b.checked).length)}
      onSubmit={(e) => e.preventDefault()}
      className="sticky top-[117px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur lg:top-20"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const all = boxes();
          const allOn = all.every((b) => b.checked);
          all.forEach((b) => (b.checked = !allOn));
          setCount(allOn ? 0 : all.length);
        }}
      >
        <CheckSquare aria-hidden /> {t("selectAll")}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">{t("selected", { count })}</span>
      <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
        <Button type="button" size="sm" disabled={pending || !count} onClick={() => run("PUBLISHED")}><Check aria-hidden />{t("publishSelected")}</Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending || !count} onClick={() => run("REJECTED")}><X aria-hidden />{t("rejectSelected")}</Button>
      </div>
    </form>
  );
}
