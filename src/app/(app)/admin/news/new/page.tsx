import { getTranslations } from "next-intl/server";
import { NewsForm } from "@/components/app/news-form";
import { PageHeader, Panel } from "@/components/app/page-header";
import { toAlmatyLocalInput } from "@/lib/datetime-local";
import { requirePageUser } from "@/server/auth/current";

export default async function NewNewsPage() {
  await requirePageUser("ADMIN");
  const t = await getTranslations("admin");
  return (
    <div>
      <PageHeader title={t("newsNew")} />
      <Panel>
        <NewsForm
          id={null}
          initial={{ titleRu: "", titleKk: "", excerptRu: "", excerptKk: "", bodyRu: "", bodyKk: "", coverUrl: "", publishedAt: toAlmatyLocalInput(new Date()), status: "DRAFT" }}
        />
      </Panel>
    </div>
  );
}
