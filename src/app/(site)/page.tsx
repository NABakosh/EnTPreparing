import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight, Atom, Award, BarChart3, BookOpen, Bot, Calculator, CheckCircle2, ClipboardCheck, Gift, Globe2, Languages, ListChecks, Phone, Plus, Timer, Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Countdown } from "@/components/site/countdown";
import { DecorTile, Swirl } from "@/components/site/decor";
import { FeedbackForm } from "@/components/site/feedback-form";
import { NewsCard } from "@/components/site/news-card";
import { SocialLinks } from "@/components/site/socials";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pickText } from "@/server/lib/i18n-fields";
import { listSubjects } from "@/server/services/catalog";
import { latestNews } from "@/server/services/news";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

function Section({ id, title, text, children, className }: { id?: string; title: string; text?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("scroll-mt-24", className)}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2 id={id ? `${id}-title` : undefined} className="mx-auto max-w-3xl text-center text-3xl font-bold sm:text-4xl">{title}</h2>
        {text && <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">{text}</p>}
        <div className="mt-10">{children}</div>
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
  const phone = settings.contacts.phone;
  const hasSocials = Object.values(settings.socials).some(Boolean);

  return (
    <>
      {/* Hero: коллаж плиток с плашками-фактами, крупный заголовок по центру, тёмная CTA-плашка */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="mx-auto mt-6 max-w-6xl px-4">
          <div className="relative grid h-56 grid-cols-3 items-end gap-3 sm:h-72 sm:grid-cols-5 sm:gap-4">
            <DecorTile tone="rose" className="hidden h-[75%] sm:block"><Globe2 className="size-14 opacity-90" /></DecorTile>
            <DecorTile tone="mint" className="h-[88%]"><Calculator className="size-14 opacity-90" /></DecorTile>
            <DecorTile tone="teal" className="h-full"><BookOpen className="size-16 opacity-90" /></DecorTile>
            <DecorTile tone="blue" className="h-[88%]"><Atom className="size-14 opacity-90" /></DecorTile>
            <DecorTile tone="ink" className="hidden h-[75%] sm:block"><Award className="size-14 opacity-90" /></DecorTile>
            <span className="absolute bottom-6 left-1 hidden -rotate-3 rounded-2xl bg-white/95 px-4 py-2.5 text-center text-sm font-bold text-foreground shadow-soft sm:block md:left-[14%]">
              {t("features.free.title")}
            </span>
            <span className="absolute top-1/3 right-1 hidden rotate-2 rounded-2xl bg-white/95 px-4 py-2.5 text-center text-sm font-bold text-foreground shadow-soft sm:block md:right-[14%]">
              {t("features.format.title")}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 text-center sm:pt-10 sm:pb-16">
          <p className="inline-flex rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">{t("heroBadge")}</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl leading-[1.1] font-bold sm:text-5xl lg:text-6xl">
            {t("heroTitleBefore")}
            <span className="text-gradient">{t("heroTitleHighlight")}</span>
            {t("heroTitleAfter")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{t("heroText")}</p>

          <div className="mt-10 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="order-2 hidden text-left lg:order-1 lg:block">
              {phone && (
                <>
                  <p className="font-heading font-bold">{t("contacts")}</p>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4">
                    <Phone className="size-4" aria-hidden />
                    {phone}
                  </a>
                </>
              )}
            </div>
            <div className="bg-ink-gradient order-1 mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[2rem] p-3 shadow-soft sm:flex-row sm:p-3.5 lg:order-2">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "btn-glow h-14 w-full rounded-2xl px-8 sm:w-auto")}>
                {t("heroCta")}
                <ArrowRight aria-hidden />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-xl px-3 pb-2 text-sm font-bold text-white hover:text-[#9dd9ee] sm:pb-0">
                {t("heroSecondary")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
            <div className="order-3 flex flex-col items-center gap-3 lg:items-end">
              {hasSocials && (
                <>
                  <p className="font-heading font-bold">{t("socialsTitle")}</p>
                  <SocialLinks socials={settings.socials} variant="icon" />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <Section id="features" title={t("featuresTitle")}>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ k, Icon }, i) => {
            const accent = i === 0;
            return (
              <li
                key={k}
                className={cn(
                  "group relative overflow-hidden rounded-3xl p-6 shadow-soft transition-transform hover:-translate-y-1",
                  accent ? "bg-brand-gradient text-white" : "bg-card",
                )}
              >
                {accent && <Swirl className="absolute -right-16 -bottom-20 size-64 opacity-15" stroke="#ffffff" />}
                <span className={cn("relative grid size-12 place-items-center rounded-2xl", accent ? "bg-white/15 text-white" : "bg-secondary text-secondary-foreground")}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="relative mt-5 text-xl font-bold">{t(`features.${k}.title`)}</h3>
                <p className={cn("relative mt-2 text-sm leading-6", accent ? "text-white/90" : "text-muted-foreground")}>{t(`features.${k}.text`)}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Обратный отсчёт: синяя полоса с петлями */}
      <section aria-label={t("countdownTitle")} className="bg-brand-gradient relative overflow-hidden">
        <Swirl className="absolute -top-24 -left-24 size-[28rem] text-white opacity-10" />
        <Swirl className="absolute -right-28 -bottom-32 size-[32rem] text-white opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <Countdown target={settings.ubtDate} dateLabel={fmtDate(settings.ubtDate, locale)} />
        </div>
      </section>

      {/* Как это работает */}
      <Section id="how" title={t("howTitle")}>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ k, Icon }, i) => (
            <li key={k} className="relative rounded-3xl bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-gradient font-heading text-5xl font-extrabold">0{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Icon className="size-5" aria-hidden /></span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{t(`how.${k}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t(`how.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Предметы */}
      <Section id="subjects" title={t("subjectsTitle")} text={t("subjectsText")} className="bg-card">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfeaf5] bg-[#f2fafd] p-4 pl-5 transition-colors hover:border-brand"
            >
              <span className="font-semibold">{pickText(s, "name", locale)}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                  s.mandatory ? "bg-primary text-primary-foreground" : "border border-[#9dd9ee] bg-card text-secondary-foreground",
                )}
              >
                {s.mandatory ? t("mandatory") : t("profile")}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ИИ-ментор */}
      <section aria-labelledby="mentor-title">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="bg-ink-gradient relative grid gap-8 overflow-hidden rounded-[2.5rem] p-7 text-white sm:p-12 lg:grid-cols-[1.3fr_1fr]">
            <Swirl className="absolute -right-24 -bottom-28 size-[26rem] text-[#2898bd] opacity-30" />
            <div className="relative">
              <span className="btn-glow grid size-14 place-items-center rounded-2xl"><Bot className="size-7" aria-hidden /></span>
              <h2 id="mentor-title" className="mt-5 text-3xl font-bold sm:text-4xl">{t("mentorTitle")}</h2>
              <p className="mt-4 leading-7 text-white/85">{t("mentorText")}</p>
            </div>
            <ul className="relative space-y-3 self-center">
              {(["sources", "lang", "honest"] as const).map((k) => (
                <li key={k} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 font-semibold backdrop-blur-sm">
                  <CheckCircle2 className="size-5 shrink-0 text-[#6cc3e0]" aria-hidden />
                  {t(`mentorPoints.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Новости */}
      {news.length > 0 && (
        <Section id="news" title={t("newsTitle")}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <NewsCard key={n.id} news={n} locale={locale} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/news" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-2xl px-8")}>
              {t("allNews")}
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </Section>
      )}

      {/* FAQ */}
      {settings.faq.length > 0 && (
        <Section id="faq" title={t("faqTitle")} className="bg-card">
          <Accordion className="mx-auto max-w-3xl gap-3">
            {settings.faq.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl bg-[#ecf7fc] px-5 not-last:border-b-0 sm:px-6">
                <AccordionTrigger className="items-center gap-4 py-5 text-base font-semibold text-[#164555] hover:no-underline sm:text-lg **:data-[slot=accordion-trigger-icon]:hidden">
                  {pickText({ qRu: f.qRu, qKk: f.qKk }, "q", locale)}
                  <span aria-hidden className="ml-auto grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-white transition-transform group-aria-expanded/accordion-trigger:rotate-45">
                    <Plus className="size-4" />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-3 text-sm leading-6 whitespace-pre-line text-[#2b3a52]">{pickText({ aRu: f.aRu, aKk: f.aKk }, "a", locale)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      )}

      {/* Обратная связь: белая карточка с формой и синей фирменной панелью */}
      <section id="feedback" aria-labelledby="feedback-title" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="grid overflow-hidden rounded-[2.5rem] bg-card shadow-soft lg:grid-cols-[1.25fr_1fr]">
            <div className="p-6 sm:p-10">
              <h2 id="feedback-title" className="text-3xl font-bold sm:text-4xl">{t("feedbackTitle")}</h2>
              <p className="mt-3 max-w-md text-muted-foreground">{t("feedbackText")}</p>
              <div className="mt-8"><FeedbackForm /></div>
            </div>
            <div className="bg-brand-gradient relative hidden min-h-80 overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-end">
              <Swirl className="absolute -top-16 -right-20 size-[26rem] text-white opacity-20" />
              <Swirl className="absolute -bottom-40 -left-24 size-[22rem] text-[#6cc3e0] opacity-30" />
              <div className="relative space-y-3">
                <div className="flex max-w-xs items-center gap-3 rounded-3xl bg-[#121a2b]/75 p-4 backdrop-blur">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15"><Bot className="size-6" aria-hidden /></span>
                  <span>
                    <span className="block font-heading font-bold">{t("mentorTitle")}</span>
                    <span className="text-sm text-white/85">{t("mentorPoints.sources")}</span>
                  </span>
                </div>
                {hasSocials && (
                  <div className="rounded-3xl bg-[#121a2b]/75 p-5 backdrop-blur">
                    <p className="font-heading text-lg font-bold">{t("socialsTitle")}</p>
                    <div className="mt-3"><SocialLinks socials={settings.socials} variant="icon" /></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
