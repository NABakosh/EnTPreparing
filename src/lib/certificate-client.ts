import { jsPDF } from "jspdf";
import type { Locale } from "@/i18n/types";
import { ru } from "@/i18n/locales/ru";
import { kk } from "@/i18n/locales/kk";
import type { SubjectSlug } from "@/lib/modules";

const dicts = { ru, kk };

export function generateCertificatePdf({
  userName,
  subjectSlug,
  locale,
}: {
  userName: string;
  subjectSlug: SubjectSlug;
  locale: Locale;
}): string {
  const t = dicts[locale].certificate;
  const subjectLabel =
    locale === "kk"
      ? subjectSlug === "informat"
        ? "Информатика"
        : "Математика"
      : subjectSlug === "informat"
        ? "Информатика"
        : "Математика";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, "F");
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(2);
  doc.rect(10, 10, 277, 190);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.text(t.title, 148.5, 50, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(148, 163, 184);
  doc.text(t.subtitle, 148.5, 65, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(200, 200, 200);
  doc.text(t.confirms, 148.5, 85, { align: "center" });

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(userName, 148.5, 105, { align: "center" });

  doc.setFontSize(16);
  doc.text(`«${subjectLabel}» ${t.completed}`, 148.5, 125, { align: "center" });
  doc.text(t.platform, 148.5, 135, { align: "center" });

  const date = new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  doc.text(`${t.date}: ${date}`, 148.5, 165, { align: "center" });

  return doc.output("datauristring");
}
