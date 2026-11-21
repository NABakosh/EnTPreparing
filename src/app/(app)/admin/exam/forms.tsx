"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addPairAction, updateTemplateAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function AddPairForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [a, setA] = useState(subjects[0]?.id ?? "");
  const [b, setB] = useState(subjects[1]?.id ?? "");
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addPairAction(a, b);
          if (res.ok) { toast.success(t("common.saved")); router.refresh(); } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      {[["pair-a", a, setA, "content.subject1"], ["pair-b", b, setB, "content.subject2"]].map(([id, val, set, label]) => (
        <div key={id as string} className="space-y-1.5">
          <Label htmlFor={id as string}>{t(label as "content.subject1")}</Label>
          <NativeSelect id={id as string} value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </NativeSelect>
        </div>
      ))}
      <Button type="submit" disabled={pending || a === b}>{t("content.addPair")}</Button>
    </form>
  );
}

export type SectionRow = { id: string; label: string; singleCount: number; multipleCount: number };

export function TemplateForm({ templateId, durationMin, sections }: { templateId: string; durationMin: number; sections: SectionRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState(durationMin);
  const [rows, setRows] = useState(sections);
  const total = rows.reduce((x, r) => x + r.singleCount + r.multipleCount, 0);
  const max = rows.reduce((x, r) => x + r.singleCount + r.multipleCount * 2, 0);
  const upd = (i: number, k: "singleCount" | "multipleCount", v: number) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateTemplateAction(templateId, { durationMin: d, sections: rows.map(({ id, singleCount, multipleCount }) => ({ id, singleCount, multipleCount })) });
          if (res.ok) { toast.success(t("common.saved")); router.refresh(); } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="tpl-dur">{t("content.duration")}</Label>
        <Input id="tpl-dur" type="number" min={10} max={600} value={d} onChange={(e) => setD(Number(e.target.value))} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("content.section")}</th>
              <th className="py-2 pr-3 font-medium">{t("content.singleCount")}</th>
              <th className="py-2 font-medium">{t("content.multipleCount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-3 font-medium">{r.label}</td>
                <td className="py-2 pr-3"><Input type="number" min={0} max={200} value={r.singleCount} onChange={(e) => upd(i, "singleCount", Number(e.target.value))} aria-label={`${r.label} · ${t("content.singleCount")}`} className="w-24" /></td>
                <td className="py-2"><Input type="number" min={0} max={200} value={r.multipleCount} onChange={(e) => upd(i, "multipleCount", Number(e.target.value))} aria-label={`${r.label} · ${t("content.multipleCount")}`} className="w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{t("content.templateTotals", { total, max })}</p>
      <Button type="submit" disabled={pending}>{t("common.save")}</Button>
    </form>
  );
}
