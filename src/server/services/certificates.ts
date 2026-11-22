import fs from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { SITE_NAME } from "@/config/site";
import { canViewStudent } from "./access";
import { programCompletion } from "./learning";

const NUM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newNumber() {
  let s = "";
  for (let i = 0; i < 8; i++) s += NUM_ALPHABET[randomInt(NUM_ALPHABET.length)];
  return `UBT-${new Date().getFullYear()}-${s}`;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

export async function myCertificates(userId: string) {
  return prisma.certificate.findMany({ where: { userId, revoked: false }, orderBy: { issuedAt: "desc" }, include: { profilePair: { include: { subject1: true, subject2: true } } } });
}

/** Выдаёт сертификат, если программа пройдена. Повторно для той же пары не выдаёт — возвращает существующий. */
export async function issueCertificate(actor: CurrentUser) {
  if (actor.role !== "STUDENT") throw new AppError("forbidden", 403);
  const comp = await programCompletion(actor.id);
  if (!comp.complete) throw new AppError("cert_not_ready");
  const existing = await prisma.certificate.findFirst({ where: { userId: actor.id, profilePairId: comp.pairId, revoked: false } });
  if (existing) return existing;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.certificate.create({ data: { number: newNumber(), userId: actor.id, fullName: user.fullName, profilePairId: comp.pairId } });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new AppError("unknown", 500);
}

/** Публичная проверка по номеру. */
export async function verifyCertificate(number: string) {
  const c = await prisma.certificate.findUnique({ where: { number: number.trim().toUpperCase() }, include: { profilePair: { include: { subject1: true, subject2: true } } } });
  if (!c) return null;
  return c;
}

export async function certificateForDownload(actor: CurrentUser, number: string) {
  const c = await verifyCertificate(number);
  if (!c || c.revoked) throw new AppError("not_found", 404);
  if (!(await canViewStudent(actor, c.userId))) throw new AppError("forbidden", 403);
  return c;
}

type CertData = NonNullable<Awaited<ReturnType<typeof verifyCertificate>>>;

/** PDF A4 альбомный, на двух языках, с QR-кодом на страницу проверки. */
export async function renderCertificatePdf(c: CertData): Promise<Uint8Array> {
  const dir = path.join(process.cwd(), "src/server/assets");
  const [regular, bold] = await Promise.all([fs.readFile(path.join(dir, "DejaVuSans.ttf")), fs.readFile(path.join(dir, "DejaVuSans-Bold.ttf"))]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(regular, { subset: true });
  const fontB = await pdf.embedFont(bold, { subset: true });
  pdf.setTitle(`Сертификат ${c.number}`);
  pdf.setAuthor(`${SITE_NAME.kk} / ${SITE_NAME.ru}`);

  const W = 842;
  const H = 595;
  const page = pdf.addPage([W, H]);
  const primary = rgb(0.145, 0.388, 0.922); // #2563eb
  const ink = rgb(0.12, 0.13, 0.2);
  const muted = rgb(0.4, 0.42, 0.5);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: primary, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 60, borderColor: rgb(0.86, 0.91, 0.99), borderWidth: 1 });
  page.drawRectangle({ x: 20, y: H - 90, width: W - 40, height: 70, color: primary });

  const center = (text: string, y: number, size: number, f = font, color = ink) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - w) / 2, y, size, font: f, color });
  };
  center(`${SITE_NAME.kk} · ${SITE_NAME.ru}`, H - 62, 16, fontB, rgb(1, 1, 1));
  center("СЕРТИФИКАТ", H - 150, 40, fontB, primary);
  center("Осы сертификат берілді / Настоящий сертификат выдан", H - 190, 13, font, muted);
  // ФИО — подбираем размер под ширину
  let size = 30;
  while (fontB.widthOfTextAtSize(c.fullName, size) > W - 160 && size > 16) size -= 1;
  center(c.fullName, H - 240, size, fontB, ink);
  page.drawLine({ start: { x: 160, y: H - 252 }, end: { x: W - 160, y: H - 252 }, thickness: 1, color: rgb(0.8, 0.8, 0.9) });
  center("ҰБТ-ға дайындық бағдарламасының барлық модулін сәтті аяқтағаны үшін", H - 285, 13, font, ink);
  center("за успешное прохождение всех модулей программы подготовки к ҰБТ", H - 305, 13, font, ink);
  if (c.profilePair) {
    const kk = `${c.profilePair.subject1.nameKk} — ${c.profilePair.subject2.nameKk}`;
    const ru = `${c.profilePair.subject1.nameRu} — ${c.profilePair.subject2.nameRu}`;
    center(`Бейін / Профиль: ${kk === ru ? kk : `${kk} / ${ru}`}`, H - 335, 11, font, muted);
  }

  const date = c.issuedAt.toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" });
  page.drawText(`№ ${c.number}`, { x: 70, y: 110, size: 14, font: fontB, color: ink });
  page.drawText(`Берілген күні / Дата выдачи: ${date}`, { x: 70, y: 88, size: 12, font, color: ink });
  page.drawText("Тексеру / Проверка:", { x: 70, y: 66, size: 10, font, color: muted });
  const url = `${siteUrl()}/verify/${c.number}`;
  page.drawText(url, { x: 70, y: 52, size: 10, font, color: primary });

  const qr = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 300, errorCorrectionLevel: "M" });
  const qrImg = await pdf.embedPng(qr);
  page.drawImage(qrImg, { x: W - 70 - 110, y: 45, width: 110, height: 110 });

  return pdf.save();
}
