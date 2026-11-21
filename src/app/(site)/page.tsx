import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Award, BarChart3, BookOpen, Bot, CheckCircle2, ClipboardCheck, Gift, Languages, ListChecks, MessageSquareText, Timer, Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Countdown } from "@/components/site/countdown";
import { FeedbackForm } from "@/components/site/feedback-form";
import { NewsCard } from "@/components/site/news-card";
import { SocialLinks } from "@/components/site/socials";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { pickText } from "@/server/lib/i18n-fields";
import { listSubjects } from "@/server/services/catalog";
import { latestNews } from "@/server/services/news";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

function Section({ id, title, text, children, muted }: { id?: string; title: string; text?: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={muted ? "bg-card" : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2 id={id ? `${id}-title` : undefined} className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {text && <p className="mt-2 max-w-2xl text-muted-foreground">{text}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = (await getLocale()) as Locale;
  const [settings, news, subjects] = await Promise.all([getSettings(), latestNews(3), listSubjects()]);

  const features = [
    { k: "free", Icon: Gift },
    { k: "format", Icon: Timer },
    { k: "bilingual", Icon: Languages },
    { k: "explain", Icon: ListChecks },
    { k: "stats", Icon: BarChart3 },
    { k: "family", Icon: Users },
  ] as const;
  const steps = [
    { k: "theory", Icon: BookOpen },
    { k: "tests", Icon: ClipboardCheck },
    { k: "exam", Icon: Timer },
    { k: "cert", Icon: Award },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge variant="secondary" className="h-7 rounded-full px-3 text-xs font-semibold">{t("heroBadge")}</Badge>
            <h1 className="mt-4 text-4xl leading-[1.1] font-extrabold sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t("heroText")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>{t("heroCta")}</Link>
              <a href="#how" className={buttonVariants({ size: "lg", variant: "outline" })}>{t("heroSecondary")}</a>
            </div>
          </div>
          <Countdown target={settings.ubtDate} dateLabel={fmtDate(settings.ubtDate, locale)} />
        </div>
      </section>

      {/* Преимущества */}
      <Section id="features" title={t("featuresTitle")} muted>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ k, Icon }) => (
            <li key={k} className="rounded-2xl border bg-background p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="size-5" aria-hidden /></span>
              <h3 className="mt-4 text-lg font-semibold">{t(`features.${k}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`features.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Как это работает */}
      <Section id="how" title={t("howTitle")}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ k, Icon }, i) => (
            <li key={k} className="relative rounded-2xl border bg-card p-5">
              <span className="text-sm font-bold text-primary">0{i + 1}</span>
              <Icon className="mt-3 size-7 text-primary" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">{t(`how.${k}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`how.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Предметы */}
      <Section id="subjects" title={t("subjectsTitle")} text={t("subjectsText")} muted>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-4">
              <span className="font-semibold">{pickText(s, "name", locale)}</span>
              <Badge variant={s.mandatory ? "default" : "secondary"}>{s.mandatory ? t("mandatory") : t("profile")}</Badge>
            </li>
          ))}
        </ul>
      </Section>

      {/* ИИ-ментор */}
      <section aria-labelledby="mentor-title">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="grid gap-8 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <Bot className="size-10" aria-hidden />
              <h2 id="mentor-title" className="mt-4 text-2xl font-bold sm:text-3xl">{t("mentorTitle")}</h2>
              <p className="mt-3 text-primary-foreground/90">{t("mentorText")}</p>
            </div>
            <ul className="space-y-3 self-center">
              {(["sources", "lang", "honest"] as const).map((k) => (
                <li key={k} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 font-medium">
                  <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                  {t(`mentorPoints.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Новости */}
      {news.length > 0 && (
        <Section id="news" title={t("newsTitle")} muted>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <NewsCard key={n.id} news={n} locale={locale} />
            ))}
          </div>
          <Link href="/news" className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6`}>{t("allNews")}</Link>
        </Section>
      )}

      {/* FAQ */}
      {settings.faq.length > 0 && (
        <Section id="faq" title={t("faqTitle")}>
          <Accordion className="max-w-3xl rounded-2xl border bg-card px-5">
            {settings.faq.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="py-4 text-base">{pickText({ qRu: f.qRu, qKk: f.qKk }, "q", locale)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="pb-2 text-sm leading-6 whitespace-pre-line">{pickText({ aRu: f.aRu, aKk: f.aKk }, "a", locale)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      )}

      {/* Обратная связь */}
      <Section id="feedback" title={t("feedbackTitle")} text={t("feedbackText")} muted>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border bg-background p-5 sm:p-6"><FeedbackForm /></div>
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold"><MessageSquareText className="size-5 text-primary" aria-hidden />{t("socialsTitle")}</h3>
            <SocialLinks socials={settings.socials} />
          </div>
        </div>
      </Section>
    </>
  );
}
