"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createQuestionAction, updateQuestionAction } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type QuestionValue = {
  topicId: string;
  textRu: string;
  textKk: string;
  options: { ru: string; kk: string }[];
  correct: number[];
  explanationRu: string;
  explanationKk: string;
  source: string;
  needsReviewKk: boolean;
};

export type TopicOption = { id: string; label: string };

const LETTERS = "ABCDEFGH";

export function QuestionEditor({
  id,
  initial,
  topics,
  mode,
  afterSave,
}: {
  id: string | null;
  initial: QuestionValue;
  topics: TopicOption[];
  mode: "admin" | "review";
  afterSave?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();

  const save = (publish: boolean) =>
    start(async () => {
      const payload = { ...v, options: v.options };
      const res = id ? await updateQuestionAction(id, payload, publish) : await createQuestionAction(payload);
      if (res.ok) {
        toast.success(t("common.saved"));
        if (!id && res.data && typeof res.data === "object" && "id" in res.data) router.replace(`/admin/questions/${(res.data as { id: string }).id}`);
        else if (afterSave) router.push(afterSave);
        router.refresh();
      } else toast.error(t(`errors.${res.error}`));
    });

  const setOpt = (i: number, k: "ru" | "kk", val: string) => setV({ ...v, options: v.options.map((o, j) => (j === i ? { ...o, [k]: val } : o)) });
  const toggleCorrect = (i: number) => setV({ ...v, correct: v.correct.includes(i) ? v.correct.filter((x) => x !== i) : [...v.correct, i].sort() });
  const removeOpt = (i: number) =>
    setV({ ...v, options: v.options.filter((_, j) => j !== i), correct: v.correct.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.correct.length) return toast.error(t("questions.needCorrect"));
        save(false);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="qe-topic">{t("questions.topic")}</Label>
        <NativeSelect id="qe-topic" value={v.topicId} onChange={(e) => setV({ ...v, topicId: e.target.value })} required>
          {topics.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="qe-textRu">{t("questions.textRu")}</Label>
          <Textarea id="qe-textRu" rows={5} value={v.textRu} onChange={(e) => setV({ ...v, textRu: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qe-textKk">{t("questions.textKk")}</Label>
          <Textarea id="qe-textKk" rows={5} value={v.textKk} onChange={(e) => setV({ ...v, textKk: e.target.value })} />
        </div>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("questions.options")}</legend>
        <p className="text-xs text-muted-foreground">{t("questions.correctHint")}</p>
        {v.options.map((o, i) => (
          <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={v.correct.includes(i)} onChange={() => toggleCorrect(i)} className="size-5 accent-[var(--success)]" aria-label={t("questions.markCorrect", { letter: LETTERS[i] })} />
              {LETTERS[i]}
            </label>
            <Input aria-label={`${LETTERS[i]} · ${t("questions.ru")}`} placeholder={t("questions.ru")} value={o.ru} onChange={(e) => setOpt(i, "ru", e.target.value)} />
            <Input aria-label={`${LETTERS[i]} · ${t("questions.kk")}`} placeholder={t("questions.kk")} value={o.kk} onChange={(e) => setOpt(i, "kk", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" disabled={v.options.length <= 2} onClick={() => removeOpt(i)} aria-label={t("questions.removeOption", { letter: LETTERS[i] })}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={v.options.length >= 8} onClick={() => setV({ ...v, options: [...v.options, { ru: "", kk: "" }] })}>
          <Plus aria-hidden /> {t("questions.addOption")}
        </Button>
        <p className="text-sm text-muted-foreground">{t(v.correct.length > 1 ? "questions.type.MULTIPLE" : "questions.type.SINGLE")}</p>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="qe-exRu">{t("questions.explanationRu")}</Label>
          <Textarea id="qe-exRu" rows={3} value={v.explanationRu} onChange={(e) => setV({ ...v, explanationRu: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qe-exKk">{t("questions.explanationKk")}</Label>
          <Textarea id="qe-exKk" rows={3} value={v.explanationKk} onChange={(e) => setV({ ...v, explanationKk: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="qe-source">{t("questions.source")}</Label>
          <Input id="qe-source" value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.needsReviewKk} onChange={(e) => setV({ ...v, needsReviewKk: e.target.checked })} className="size-4 accent-primary" />
          {t("questions.needsReviewKk")}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending}>{t("common.save")}</Button>
        {id && (
          <Button type="button" size="lg" variant="secondary" disabled={pending || !v.correct.length} onClick={() => save(true)}>
            {t("questions.saveAndPublish")}
          </Button>
        )}
        {mode === "review" && <p className="w-full text-xs text-muted-foreground">{t("questions.reviewNote")}</p>}
      </div>
    </form>
  );
}
