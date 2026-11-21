"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { startExamAction } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function ExamStart({ pairs, current }: { pairs: { id: string; name: string; complete: boolean }[]; current: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [pair, setPair] = useState(current && pairs.some((p) => p.id === current) ? current : (pairs[0]?.id ?? ""));
  const [pending, start] = useTransition();
  const sel = pairs.find((p) => p.id === pair);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="exam-pair">{t("exam.choosePair")}</Label>
        <NativeSelect id="exam-pair" value={pair} onChange={(e) => setPair(e.target.value)} className="h-11">
          {pairs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </NativeSelect>
      </div>
      {sel && !sel.complete && (
        <p className="flex gap-2 rounded-xl bg-warning/10 p-3 text-sm text-foreground">
          <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
          {t("exam.notEnough")}
        </p>
      )}
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending || !pair}
        onClick={() => {
          if (!window.confirm(t("exam.confirmStart"))) return;
          start(async () => {
            const res = await startExamAction(pair);
            if (res.ok) router.push(`/student/exam/${res.data.id}`);
            else toast.error(t(`errors.${res.error}`));
          });
        }}
      >
        {pending ? t("common.loading") : t("exam.start")}
      </Button>
    </div>
  );
}
