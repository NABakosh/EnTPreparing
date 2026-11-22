import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic", "cyrillic-ext"] });

export const metadata: Metadata = {
  title: { default: `${SITE_NAME.kk} / ${SITE_NAME.ru}`, template: `%s · ${SITE_NAME.kk}` },
  description: "ҰБТ-ға тегін дайындық платформасы / Бесплатная платформа подготовки к ҰБТ",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background" suppressHydrationWarning>
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
