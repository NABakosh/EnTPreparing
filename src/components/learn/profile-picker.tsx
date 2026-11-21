"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setProfilePairAction } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function ProfilePicker({ pairs, current }: { pairs: { id: string; name: string }[]; current: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(current ?? pairs[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setProfilePairAction(v);
          if (res.ok) {
            toast.success(t("common.saved"));
            router.refresh();
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="profile-pair">{t("student.profile")}</Label>
        <NativeSelect id="profile-pair" value={v} onChange={(e) => setV(e.target.value)} className="h-11">
          {pairs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending || !v} className="h-11">{t("student.saveProfile")}</Button>
    </form>
  );
}
