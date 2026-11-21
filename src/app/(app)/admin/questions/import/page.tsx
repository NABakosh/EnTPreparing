import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requirePageUser } from "@/server/auth/current";
import { QuestionImportForm } from "./import-form";

export default async function QuestionImportPage() {
  await requirePageUser("ADMIN");
  const t = await getTranslations("questions");
  return (
    <div className="space-y-6">
      <PageHeader title={t("importTitle")} description={t("importHint")} />
      <Panel>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("importColumns")}</li>
          <li>{t("importKkColumns")}</li>
          <li>{t("importCorrect")}</li>
          <li>{t("importDraft")}</li>
        </ul>
        <a href="/templates/questions-template.csv" download className={buttonVariants({ variant: "outline" })}><Download aria-hidden />{t("template")}</a>
      </Panel>
      <Panel><QuestionImportForm /></Panel>
    </div>
  );
}
