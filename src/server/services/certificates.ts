import fs from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";
import { BRAND, CERTIFICATE_SIGNER } from "@/config/site";
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

/** Разбивает текст на строки по ширине. */
function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * PDF A4 книжный по образцу школы, на двух языках, с QR-кодом на страницу проверки.
 * Подпись и печать намеренно не вшиты: их ставят на распечатанный сертификат (см. DECISIONS.md).
 */
export async function renderCertificatePdf(c: CertData): Promise<Uint8Array> {
  const dir = path.join(process.cwd(), "src/server/assets");
  const [regular, serifBold, background] = await Promise.all(
    ["DejaVuSans.ttf", "LiberationSerif-Bold.ttf", "certificate-bg.pdf"].map((f) => fs.readFile(path.join(dir, f))),
  );
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(regular, { subset: true });
  const serif = await pdf.embedFont(serifBold, { subset: true });
  pdf.setTitle(`Сертификат ${c.number}`);
  pdf.setAuthor(BRAND);

  const W = 595;
  const H = 842;
  const page = pdf.addPage([W, H]);
  const [bg] = await pdf.embedPdf(background);
  page.drawPage(bg, { x: 0, y: 0, width: W, height: H });
  const blue = rgb(0.17, 0.31, 0.53);
  const muted = rgb(0.35, 0.37, 0.45);

  const center = (text: string, y: number, size: number, f: PDFFont, color = blue) =>
    page.drawText(text, { x: (W - f.widthOfTextAtSize(text, size)) / 2, y, size, font: f, color });

  // ФИО — подбираем размер под ширину
  let size = 28;
  while (serif.widthOfTextAtSize(c.fullName, size) > W - 170 && size > 10) size -= 1;
  center(c.fullName, H - 312, size, serif);

  const pair = c.profilePair;
  const lower = (s: string) => s.toLocaleLowerCase("ru-RU");
  const kkCourse = pair ? `${lower(pair.subject1.nameKk)} және ${lower(pair.subject2.nameKk)} пәндері бойынша ` : "";
  const ruCourse = pair ? ` по предметам «${pair.subject1.nameRu}» и «${pair.subject2.nameRu}»` : "";
  const kk =
    `«${BRAND}» платформасында ${kkCourse}ҰБТ-ға дайындық оқу курсын толық аяқтағанын растайды. ` +
    "Курс барысында білім алушы аталған пәндер бойынша білімін жетілдіріп, теориялық және практикалық тапсырмаларды орындау дағдыларын дамытты. " +
    "Сертификат оқу курсын аяқтағанын растайтын құжат ретінде жоғары оқу орындарына ұсыну үшін берілді.";
  const ru =
    `Подтверждает полное прохождение курса подготовки к ҰБТ${ruCourse} на платформе «${BRAND}». ` +
    "Выдан для представления в высшие учебные заведения как подтверждение окончания курса.";
  let y = H - 356;
  for (const line of wrap(kk, serif, 15.5, W - 110)) {
    center(line, y, 15.5, serif);
    y -= 22;
  }
  y -= 4;
  for (const line of wrap(ru, font, 9.5, W - 150)) {
    center(line, y, 9.5, font, muted);
    y -= 14;
  }

  // Место для живой подписи и печати
  const signY = 214;
  page.drawLine({ start: { x: 205, y: signY }, end: { x: 390, y: signY }, thickness: 1, color: blue });
  CERTIFICATE_SIGNER.position.forEach((line, i) => center(line, signY - 18 - i * 14, 10.5, font));
  center(CERTIFICATE_SIGNER.name, signY - 52, 11.5, font);

  const url = `${siteUrl()}/verify/${c.number}`;
  const date = c.issuedAt.toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" });
  center(`№ ${c.number}`, signY - 80, 10.5, font);
  center(`Берілген күні / Дата выдачи: ${date}`, signY - 95, 9, font, muted);
  const qr = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 300, errorCorrectionLevel: "M" });
  page.drawImage(await pdf.embedPng(qr), { x: W - 40 - 88, y: 64, width: 88, height: 88 });
  const label = "Тексеру / Проверка";
  page.drawText(label, { x: W - 84 - font.widthOfTextAtSize(label, 8) / 2, y: 52, size: 8, font, color: muted });

  return pdf.save();
}
