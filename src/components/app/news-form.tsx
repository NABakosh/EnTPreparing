"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveNewsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { fromAlmatyLocalInput } from "@/lib/datetime-local";
import { RichTextEditor } from "./rich-text-editor";

export type NewsFormValue = {
  titleRu: string; titleKk: string; excerptRu: string; excerptKk: string; bodyRu: string; bodyKk: string;
  coverUrl: string; publishedAt: string; status: "DRAFT" | "PUBLISHED" | "HIDDEN";
};

export function NewsForm({ id, initial }: { id: string | null; initial: NewsFormValue }) {
  const t = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const set = (k: keyof NewsFormValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveNewsAction(id, { ...v, publishedAt: fromAlmatyLocalInput(v.publishedAt) });
          if (res.ok) {
            toast.success(t("common.saved"));
            if (!id) router.replace(`/admin/news/${res.data.id}`);
            router.refresh();
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(["titleRu", "titleKk"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label htmlFor={`n-${k}`}>{t(`admin.${k}`)}</Label>
            <Input id={`n-${k}`} value={v[k]} onChange={set(k)} required={k === "titleRu"} maxLength={200} />
          </div>
        ))}
        {(["excerptRu", "excerptKk"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label htmlFor={`n-${k}`}>{t(`admin.${k}`)}</Label>
            <Textarea id={`n-${k}`} value={v[k]} onChange={set(k)} maxLength={500} rows={3} />
          </div>
        ))}
      </div>
      <RichTextEditor id="n-bodyRu" label={t("admin.bodyRu")} value={initial.bodyRu} onChange={(h) => setV((s) => ({ ...s, bodyRu: h }))} />
      <RichTextEditor id="n-bodyKk" label={t("admin.bodyKk")} value={initial.bodyKk} onChange={(h) => setV((s) => ({ ...s, bodyKk: h }))} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="n-cover">{t("admin.coverUrl")}</Label>
          <Input id="n-cover" type="url" value={v.coverUrl} onChange={set("coverUrl")} placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="n-date">{t("admin.publishedAt")}</Label>
          <Input id="n-date" type="datetime-local" value={v.publishedAt} onChange={set("publishedAt")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="n-status">{t("common.status")}</Label>
          <NativeSelect id="n-status" value={v.status} onChange={set("status")}>
            {(["DRAFT", "PUBLISHED", "HIDDEN"] as const).map((s) => (
              <option key={s} value={s}>{t(`admin.newsStatus.${s}`)}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {v.coverUrl && /^https?:\/\//.test(v.coverUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.coverUrl} alt="" className="aspect-[16/9] w-full max-w-md rounded-xl border object-cover" />
      )}
      <Button type="submit" size="lg" disabled={pending}>{pending ? t("common.loading") : t("common.save")}</Button>
    </form>
  );
}
