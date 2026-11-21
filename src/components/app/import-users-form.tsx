"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { importUsersAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CredentialsResult, type Cred } from "./credentials-result";

type Result = { created: Cred[]; errors: { row: number; code: string }[]; fileBase64: string | null };

export function ImportUsersForm({ kind }: { kind: "students" | "teachers" }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const id = `imp-${kind}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(kind === "students" ? "admin.importStudentsHint" : "admin.importTeachersHint")}</p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("kind", kind);
          start(async () => {
            const res = await importUsersAction(fd);
            if (res.ok) {
              setResult(res.data);
              toast.success(t("admin.importDone", { count: res.data.created.length }));
              router.refresh();
            } else toast.error(t(`errors.${res.error}`));
          });
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor={id}>{t("admin.chooseFile")}</Label>
          <Input id={id} name="file" type="file" accept=".xlsx,.csv" required className="h-11 py-2" />
        </div>
        <Button type="submit" disabled={pending} size="lg">
          <Upload aria-hidden /> {pending ? t("common.loading") : t("admin.upload")}
        </Button>
      </form>
      {result && (
        <div className="space-y-3">
          <p className="font-medium">{t("admin.importDone", { count: result.created.length })}</p>
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">{t("admin.importErrors")}</p>
              <ul className="mt-1 list-disc pl-5">
                {result.errors.map((e) => (
                  <li key={e.row}>{t("admin.rowError", { row: e.row, error: t(`errors.${e.code}`) })}</li>
                ))}
              </ul>
            </div>
          )}
          <CredentialsResult creds={result.created} fileBase64={result.fileBase64} />
        </div>
      )}
    </div>
  );
}
