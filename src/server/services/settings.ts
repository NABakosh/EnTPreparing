import { z } from "zod";
import { prisma } from "@/server/db";
import type { CurrentUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";

export const faqItemSchema = z.object({
  qRu: z.string().trim().min(1).max(500),
  qKk: z.string().trim().max(500).default(""),
  aRu: z.string().trim().min(1).max(3000),
  aKk: z.string().trim().max(3000).default(""),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const settingsSchema = z.object({
  ubtDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid_date"),
  moduleThreshold: z.coerce.number().int().min(1).max(100),
  socials: z.object({
    instagram: z.string().trim().max(300).default(""),
    telegram: z.string().trim().max(300).default(""),
    youtube: z.string().trim().max(300).default(""),
    tiktok: z.string().trim().max(300).default(""),
    whatsapp: z.string().trim().max(300).default(""),
  }),
  contacts: z.object({
    email: z.string().trim().max(200).default(""),
    phone: z.string().trim().max(100).default(""),
    addressRu: z.string().trim().max(300).default(""),
    addressKk: z.string().trim().max(300).default(""),
  }),
  faq: z.array(faqItemSchema).max(50),
});
export type SiteSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = {
  ubtDate: "2027-05-20T09:00:00+05:00",
  moduleThreshold: 60,
  socials: { instagram: "", telegram: "", youtube: "", tiktok: "", whatsapp: "" },
  contacts: { email: "", phone: "", addressRu: "", addressKk: "" },
  faq: [],
};

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

export async function getSettings(): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of rows) out[r.key] = r.value;
  const parsed = settingsSchema.safeParse(out);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getModuleThreshold(): Promise<number> {
  const r = await prisma.setting.findUnique({ where: { key: "moduleThreshold" } });
  const n = Number(r?.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.moduleThreshold;
}

export async function updateSettings(actor: CurrentUser, input: unknown): Promise<SiteSettings> {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) throw new AppError("validation");
  const data = parsed.data;
  await prisma.$transaction(
    KEYS.map((key) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: data[key] as object },
        update: { value: data[key] as object },
      }),
    ),
  );
  return data;
}
