"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { startReviewAction, startTopicTestAction } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";

export function StartTestButton({ topicId, label, variant = "default" }: { topicId: string; label: string; variant?: "default" | "outline" }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startTopicTestAction(topicId);
          if (res.ok) router.push(`/student/test/${res.data.id}`);
          else toast.error(t(`errors.${res.error}`));
        })
      }
    >
      {pending ? t("common.loading") : label}
    </Button>
  );
}

export function StartReviewButton({ topicId, label }: { topicId?: string; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startReviewAction(topicId);
          if (res.ok) router.push(`/student/test/${res.data.id}`);
          else toast.error(t(`errors.${res.error}`));
        })
      }
    >
      {pending ? t("common.loading") : label}
    </Button>
  );
}
