"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CredentialsResult, type Cred } from "./credentials-result";

export function CredsDialog({ data, onClose }: { data: { created: Cred[]; fileBase64: string | null } | null; onClose: () => void }) {
  const t = useTranslations("admin");
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{t("credentialsTitle")}</DialogTitle>
        {data && <CredentialsResult creds={data.created} fileBase64={data.fileBase64} />}
      </DialogContent>
    </Dialog>
  );
}
