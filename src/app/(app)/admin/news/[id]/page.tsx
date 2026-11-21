import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NewsForm } from "@/components/app/news-form";
import { PageHeader, Panel } from "@/components/app/page-header";
import { toAlmatyLocalInput } from "@/lib/datetime-local";
import { requirePageUser } from "@/server/auth/current";
import { adminGetNews } from "@/server/services/news";

export default async function EditNewsPage({ params }: PageProps<"/admin/news/[id]">) {
  const actor = await requirePageUser("ADMIN");
  const { id } = await params;
  const n = await adminGetNews(actor, id);
  if (!n) notFound();
  const t = await getTranslations("admin");
  return (
    <div>
      <PageHeader title={t("newsEdit")} />
      <Panel>
        <NewsForm
          id={n.id}
          initial={{
            titleRu: n.titleRu, titleKk: n.titleKk, excerptRu: n.excerptRu, excerptKk: n.excerptKk, bodyRu: n.bodyRu, bodyKk: n.bodyKk,
            coverUrl: n.coverUrl ?? "", publishedAt: toAlmatyLocalInput(n.publishedAt), status: n.status,
          }}
        />
      </Panel>
    </div>
  );
}
