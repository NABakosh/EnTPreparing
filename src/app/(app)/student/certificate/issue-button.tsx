"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";
import { issueCertificateAction } from "@/app/actions/certificates";
import { Button } from "@/components/ui/button";

export function IssueButton() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await issueCertificateAction();
          if (res.ok) router.refresh();
          else toast.error(t(`errors.${res.error}`));
        })
      }
    >
      <Award aria-hidden /> {pending ? t("common.loading") : t("cert.get")}
    </Button>
  );
}
