"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { saveClassAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClassForm({
  id,
  name = "",
  teacherIds = [],
  teachers,
  onDone,
}: {
  id?: string;
  name?: string;
  teacherIds?: string[];
  teachers: { id: string; fullName: string }[];
  onDone?: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const fid = id ?? "new";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await saveClassAction(id ?? null, { name: fd.get("name"), teacherIds: fd.getAll("teacherIds") });
          if (res.ok) {
            toast.success(t("common.saved"));
            if (!id) form.reset();
            onDone?.();
            router.refresh();
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`cl-${fid}`}>{t("admin.className")}</Label>
        <Input id={`cl-${fid}`} name="name" defaultValue={name} required maxLength={10} className="max-w-xs" />
      </div>
      {teachers.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("admin.teachers")}</legend>
          <div className="flex flex-wrap gap-2">
            {teachers.map((tt) => (
              <label key={tt.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input type="checkbox" name="teacherIds" value={tt.id} defaultChecked={teacherIds.includes(tt.id)} className="size-4 accent-primary" />
                {tt.fullName}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button type="submit" disabled={pending}>{t("common.save")}</Button>
    </form>
  );
}
