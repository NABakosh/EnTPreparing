"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { importQuestionsAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function QuestionImportForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ created: number; errors: { row: number; code: string }[] } | null>(null);
  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await importQuestionsAction(fd);
            if (r.ok) {
              setRes(r.data);
              toast.success(t("questions.importDone", { count: r.data.created }));
              router.refresh();
            } else toast.error(t(`errors.${r.error}`));
          });
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="qi-file">{t("admin.chooseFile")}</Label>
          <Input id="qi-file" name="file" type="file" accept=".xlsx,.csv" required className="h-11 py-2" />
        </div>
        <Button type="submit" size="lg" disabled={pending}><Upload aria-hidden />{pending ? t("common.loading") : t("admin.upload")}</Button>
      </form>
      {res && (
        <div className="space-y-2">
          <p className="font-medium" role="status">{t("questions.importDone", { count: res.created })}</p>
          {res.errors.length > 0 && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">{t("admin.importErrors")}</p>
              <ul className="mt-1 list-disc pl-5">
                {res.errors.map((e) => <li key={e.row}>{t("admin.rowError", { row: e.row, error: t(`errors.${e.code}`) })}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
