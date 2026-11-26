import type { Metadata, Viewport } from "next";
import { Inter, Onest } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic", "cyrillic-ext"] });
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic", "cyrillic-ext"] });

export const metadata: Metadata = {
  title: { default: `${BRAND} — ҰБТ-ға дайындық / подготовка к ҰБТ`, template: `%s · ${BRAND}` },
  description: "ҰБТ-ға тегін дайындық платформасы / Бесплатная платформа подготовки к ҰБТ",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f0f1f5" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${onest.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background" suppressHydrationWarning>
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
