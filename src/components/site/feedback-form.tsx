"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackForm() {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await submitFeedbackAction({
            name: String(fd.get("name") ?? ""),
            contact: String(fd.get("contact") ?? ""),
            message: String(fd.get("message") ?? ""),
          });
          if (res.ok) {
            form.reset();
            setDone(true);
            toast.success(t("landing.feedbackSent"));
          } else toast.error(t(`errors.${res.error}`));
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fb-name">{t("landing.feedbackName")}</Label>
          <Input id="fb-name" name="name" required minLength={2} maxLength={100} autoComplete="name" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-contact">{t("landing.feedbackContact")}</Label>
          <Input id="fb-contact" name="contact" required minLength={3} maxLength={150} className="h-11" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-message">{t("landing.feedbackMessage")}</Label>
        <Textarea id="fb-message" name="message" required minLength={5} maxLength={3000} rows={5} />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("common.loading") : t("landing.feedbackSend")}
      </Button>
      {done && (
        <p role="status" className="text-sm font-medium text-success">
          {t("landing.feedbackSent")}
        </p>
      )}
    </form>
  );
}
