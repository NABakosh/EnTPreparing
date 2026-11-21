"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveSettingsAction } from "@/app/actions/admin";
import { Panel } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromAlmatyLocalInput } from "@/lib/datetime-local";
import type { SiteSettings } from "@/server/services/settings";

export function SettingsForm({ initial, ubtLocal }: { initial: SiteSettings; ubtLocal: string }) {
  const t = useTranslations();
  const [s, setS] = useState(initial);
  const [ubt, setUbt] = useState(ubtLocal);
  const [pending, start] = useTransition();
  const setFaq = (faq: SiteSettings["faq"]) => setS({ ...s, faq });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSettingsAction({ ...s, ubtDate: fromAlmatyLocalInput(ubt) });
          if (res.ok) toast.success(t("common.saved"));
          else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-ubt">{t("admin.ubtDate")}</Label>
            <Input id="s-ubt" type="datetime-local" value={ubt} onChange={(e) => setUbt(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-thr">{t("admin.moduleThreshold")}</Label>
            <Input id="s-thr" type="number" min={1} max={100} value={s.moduleThreshold} onChange={(e) => setS({ ...s, moduleThreshold: Number(e.target.value) })} required />
          </div>
        </div>
      </Panel>
      <Panel title={t("admin.socials")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(s.socials) as (keyof SiteSettings["socials"])[]).map((k) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={`s-${k}`} className="capitalize">{k}</Label>
              <Input id={`s-${k}`} type="url" placeholder="https://" value={s.socials[k]} onChange={(e) => setS({ ...s, socials: { ...s.socials, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={t("admin.contacts")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["email", "phone", "addressRu", "addressKk"] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={`s-${k}`}>{t(`admin.${k}`)}</Label>
              <Input id={`s-${k}`} value={s.contacts[k]} onChange={(e) => setS({ ...s, contacts: { ...s.contacts, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={t("admin.faq")}>
        <ol className="space-y-4">
          {s.faq.map((f, i) => (
            <li key={i} className="space-y-3 rounded-xl border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["qRu", "qKk"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`faq-${i}-${k}`}>{t(`admin.faq${k[0].toUpperCase()}${k.slice(1)}` as "admin.faqQRu")}</Label>
                    <Input id={`faq-${i}-${k}`} value={f[k]} required={k === "qRu"} onChange={(e) => setFaq(s.faq.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  </div>
                ))}
                {(["aRu", "aKk"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`faq-${i}-${k}`}>{t(`admin.faq${k[0].toUpperCase()}${k.slice(1)}` as "admin.faqARu")}</Label>
                    <Textarea id={`faq-${i}-${k}`} rows={3} value={f[k]} required={k === "aRu"} onChange={(e) => setFaq(s.faq.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => { const a = [...s.faq]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setFaq(a); }}>
                  <ArrowUp aria-hidden /> {t("admin.moveUp")}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={i === s.faq.length - 1} onClick={() => { const a = [...s.faq]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setFaq(a); }}>
                  <ArrowDown aria-hidden /> {t("admin.moveDown")}
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => setFaq(s.faq.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden /> {t("admin.faqRemove")}
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setFaq([...s.faq, { qRu: "", qKk: "", aRu: "", aKk: "" }])}>
          <Plus aria-hidden /> {t("admin.faqAdd")}
        </Button>
      </Panel>
      <Button type="submit" size="lg" disabled={pending}>{pending ? t("common.loading") : t("common.save")}</Button>
    </form>
  );
}
