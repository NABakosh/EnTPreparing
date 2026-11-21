"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { KeyRound, Lock, LockOpen } from "lucide-react";
import { resetPasswordAction, setUserActiveAction } from "@/app/actions/users";
import { ActionButton } from "@/components/app/action-button";
import { CredsDialog } from "@/components/app/creds-dialog";
import type { Cred } from "@/components/app/credentials-result";

export function UserActions({ id, active, canBlock = true }: { id: string; active: boolean; canBlock?: boolean }) {
  const t = useTranslations("admin");
  const [creds, setCreds] = useState<{ created: Cred[]; fileBase64: string | null } | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton action={() => resetPasswordAction(id)} confirm={t("resetConfirm")} onDone={(d) => setCreds(d as typeof creds)}>
        <KeyRound aria-hidden /> {t("resetPassword")}
      </ActionButton>
      {canBlock && (
        <ActionButton action={() => setUserActiveAction(id, !active)} variant={active ? "destructive" : "secondary"}>
          {active ? <Lock aria-hidden /> : <LockOpen aria-hidden />} {active ? t("block") : t("unblock")}
        </ActionButton>
      )}
      <CredsDialog data={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
