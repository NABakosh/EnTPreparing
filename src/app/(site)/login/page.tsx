import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Swirl } from "@/components/site/decor";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div className="relative mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <Swirl className="absolute top-4 -left-40 -z-10 size-96 text-[#2898bd] opacity-10" />
      <Swirl className="absolute -right-40 bottom-0 -z-10 size-96 text-[#3fb58f] opacity-10" />
      <div className="rounded-[2rem] bg-card p-6 shadow-soft sm:p-9">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("noAccount")}</p>
      </div>
    </div>
  );
}
