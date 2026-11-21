import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

export async function QuestionBadges({ status, aiGenerated, isDemo, needsReviewKk, type }: { status: string; aiGenerated: boolean; isDemo: boolean; needsReviewKk: boolean; type: string }) {
  const t = await getTranslations("questions");
  const variant = status === "PUBLISHED" ? "default" : status === "REJECTED" ? "destructive" : "secondary";
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge variant={variant}>{t(`status.${status}`)}</Badge>
      <Badge variant="outline">{t(`type.${type}`)}</Badge>
      {aiGenerated && <Badge variant="outline">{t("aiBadge")}</Badge>}
      {isDemo && <Badge variant="outline">{t("demoBadge")}</Badge>}
      {needsReviewKk && <Badge variant="outline">{t("kkReview")}</Badge>}
    </span>
  );
}
