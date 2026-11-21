"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTopicAction, saveModuleAction, saveSubjectAction, updateTopicAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";

function useSubmit() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult<unknown>>, after?: (data: unknown) => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(t("common.saved"));
        after?.(res.data);
        router.refresh();
      } else toast.error(t(`errors.${res.error}`));
    });
  return { pending, submit };
}

export type SubjectValue = { slug: string; nameRu: string; nameKk: string; mandatory: boolean; order: number };

export function SubjectForm({ id, initial }: { id: string | null; initial?: SubjectValue }) {
  const t = useTranslations();
  const { pending, submit } = useSubmit();
  const fid = id ?? "new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        submit(
          () => saveSubjectAction(id, { slug: fd.get("slug"), nameRu: fd.get("nameRu"), nameKk: fd.get("nameKk"), mandatory: fd.get("mandatory") === "on", order: fd.get("order") }),
          () => !id && form.reset(),
        );
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`s-nameRu-${fid}`}>{t("content.nameRu")}</Label>
        <Input id={`s-nameRu-${fid}`} name="nameRu" defaultValue={initial?.nameRu} required maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`s-nameKk-${fid}`}>{t("content.nameKk")}</Label>
        <Input id={`s-nameKk-${fid}`} name="nameKk" defaultValue={initial?.nameKk} maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`s-slug-${fid}`}>{t("content.slug")}</Label>
        <Input id={`s-slug-${fid}`} name="slug" defaultValue={initial?.slug} required pattern="[a-z0-9\-]{2,40}" placeholder="biology" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`s-order-${fid}`}>{t("content.order")}</Label>
        <Input id={`s-order-${fid}`} name="order" type="number" min={0} defaultValue={initial?.order ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="mandatory" defaultChecked={initial?.mandatory} className="size-4 accent-primary" />
        {t("content.mandatory")}
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{id ? t("common.save") : t("common.create")}</Button>
      </div>
    </form>
  );
}

export function ModuleForm({ id, subjectId, initial }: { id: string | null; subjectId?: string; initial?: { titleRu: string; titleKk: string; order: number } }) {
  const t = useTranslations();
  const { pending, submit } = useSubmit();
  const fid = id ?? "new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        submit(() => saveModuleAction(id, subjectId ?? null, { titleRu: fd.get("titleRu"), titleKk: fd.get("titleKk"), order: fd.get("order") }), () => !id && form.reset());
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`m-ru-${fid}`}>{t("content.titleRu")}</Label>
        <Input id={`m-ru-${fid}`} name="titleRu" defaultValue={initial?.titleRu} required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`m-kk-${fid}`}>{t("content.titleKk")}</Label>
        <Input id={`m-kk-${fid}`} name="titleKk" defaultValue={initial?.titleKk} maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`m-order-${fid}`}>{t("content.order")}</Label>
        <Input id={`m-order-${fid}`} name="order" type="number" min={0} defaultValue={initial?.order ?? 0} />
      </div>
      <Button type="submit" disabled={pending}>{id ? t("common.save") : t("common.create")}</Button>
    </form>
  );
}

export function NewTopicForm({ moduleId }: { moduleId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { pending, submit } = useSubmit();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        submit(
          () => createTopicAction(moduleId, { titleRu: fd.get("titleRu"), titleKk: fd.get("titleKk"), order: 99 }),
          (d) => router.push(`/admin/content/topic/${(d as { id: string }).id}`),
        );
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`t-ru-${moduleId}`}>{t("content.titleRu")}</Label>
        <Input id={`t-ru-${moduleId}`} name="titleRu" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`t-kk-${moduleId}`}>{t("content.titleKk")}</Label>
        <Input id={`t-kk-${moduleId}`} name="titleKk" maxLength={200} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>{t("content.newTopic")}</Button>
    </form>
  );
}

export type TopicValue = {
  titleRu: string; titleKk: string; theoryRu: string; theoryKk: string; summaryRu: string; summaryKk: string;
  grade: string; sourceBook: string; sourcePages: string; order: number; needsReviewKk: boolean;
};

export function TopicForm({ id, initial }: { id: string; initial: TopicValue }) {
  const t = useTranslations();
  const { pending, submit } = useSubmit();
  const [v, setV] = useState(initial);
  const set = (k: keyof TopicValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const field = (k: keyof TopicValue, label: string, area?: number) => (
    <div className="space-y-1.5">
      <Label htmlFor={`tp-${k}`}>{label}</Label>
      {area ? (
        <Textarea id={`tp-${k}`} rows={area} value={String(v[k])} onChange={set(k)} className="font-mono text-sm" />
      ) : (
        <Input id={`tp-${k}`} value={String(v[k])} onChange={set(k)} required={k === "titleRu"} />
      )}
    </div>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => updateTopicAction(id, { ...v, grade: v.grade ? Number(v.grade) : null }));
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {field("titleRu", t("content.titleRu"))}
        {field("titleKk", t("content.titleKk"))}
        {field("summaryRu", t("content.summaryRu"), 3)}
        {field("summaryKk", t("content.summaryKk"), 3)}
        {field("theoryRu", t("content.theoryRu"), 16)}
        {field("theoryKk", t("content.theoryKk"), 16)}
      </div>
      <p className="text-xs text-muted-foreground">{t("content.markdownHint")}</p>
      <div className="grid gap-4 sm:grid-cols-4">
        {field("grade", t("content.grade"))}
        {field("sourceBook", t("content.sourceBook"))}
        {field("sourcePages", t("content.sourcePages"))}
        <div className="space-y-1.5">
          <Label htmlFor="tp-order">{t("content.order")}</Label>
          <Input id="tp-order" type="number" min={0} value={v.order} onChange={(e) => setV({ ...v, order: Number(e.target.value) })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.needsReviewKk} onChange={(e) => setV({ ...v, needsReviewKk: e.target.checked })} className="size-4 accent-primary" />
        {t("content.needsReviewKk")}
      </label>
      <Button type="submit" size="lg" disabled={pending}>{pending ? t("common.loading") : t("common.save")}</Button>
    </form>
  );
}
