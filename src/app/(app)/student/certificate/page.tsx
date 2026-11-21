import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Award, CheckCircle2, Circle, Download } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import { Bar } from "@/components/learn/bar";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { myCertificates } from "@/server/services/certificates";
import { programCompletion } from "@/server/services/learning";
import { getModuleThreshold } from "@/server/services/settings";
import { IssueButton } from "./issue-button";

export default async function CertificatePage() {
  const user = await requirePageUser("STUDENT");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [comp, certs, threshold] = await Promise.all([programCompletion(user.id), myCertificates(user.id), getModuleThreshold()]);
  const done = comp.modules.filter((m) => m.total > 0 && m.done === m.total).length;
  const current = certs.find((c) => c.profilePairId === comp.pairId);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("cert.title")} description={t("cert.text", { pct: threshold })} />
      {certs.map((c) => (
        <section key={c.id} className="flex flex-col gap-4 rounded-3xl border-2 border-primary/30 bg-secondary p-5 sm:flex-row sm:items-center">
          <Award className="size-12 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-secondary-foreground">{t("cert.issued", { number: c.number, date: fmtDate(c.issuedAt, locale) })}</p>
            {c.profilePair && <p className="text-sm text-secondary-foreground">{pickText(c.profilePair.subject1, "name", locale)} — {pickText(c.profilePair.subject2, "name", locale)}</p>}
            <Link href={`/verify/${c.number}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">{t("cert.verifyLink")}</Link>
          </div>
          <a href={`/api/certificates/${c.number}/pdf`} className={buttonVariants({ size: "lg" })}><Download aria-hidden /> {t("cert.download")}</a>
        </section>
      ))}
      {!comp.hasPair ? (
        <Panel><p>{t("cert.needProfile")}</p><Link href="/student" className={`${buttonVariants({ variant: "outline" })} mt-3`}>{t("nav.dashboard")}</Link></Panel>
      ) : (
        <Panel title={t("cert.progress", { done, total: comp.modules.length })}>
          <Bar value={comp.modules.length ? (done / comp.modules.length) * 100 : 0} label={t("cert.progress", { done, total: comp.modules.length })} className="mb-4" />
          <ul className="space-y-2">
            {comp.modules.map((m) => {
              const ok = m.total > 0 && m.done === m.total;
              return (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  {ok ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                  <span>{t("cert.moduleRow", { subject: pickText({ nameRu: m.subjectRu, nameKk: m.subjectKk }, "name", locale), module: pickText(m, "title", locale), done: m.done, total: m.total })}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5">{comp.complete ? !current && <IssueButton /> : <p className="text-sm text-muted-foreground">{t("cert.notReady")}</p>}</div>
        </Panel>
      )}
    </div>
  );
}
