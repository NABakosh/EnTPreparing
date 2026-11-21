"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { requireUser } from "@/server/auth/current";
import * as feedback from "@/server/services/feedback";
import * as news from "@/server/services/news";
import * as settings from "@/server/services/settings";

export async function saveNewsAction(id: string | null, input: unknown) {
  return run(async () => {
    const n = await news.saveNews(await requireUser("ADMIN"), id, input);
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/");
    return { id: n.id };
  });
}

export async function setNewsStatusAction(id: string, status: "DRAFT" | "PUBLISHED" | "HIDDEN") {
  return run(async () => {
    await news.setNewsStatus(await requireUser("ADMIN"), id, status);
    revalidatePath("/admin/news");
  });
}

export async function deleteNewsAction(id: string) {
  return run(async () => {
    await news.deleteNews(await requireUser("ADMIN"), id);
    revalidatePath("/admin/news");
  });
}

export async function setFeedbackHandledAction(id: string, handled: boolean) {
  return run(async () => {
    await feedback.setFeedbackHandled(await requireUser("ADMIN"), id, handled);
    revalidatePath("/admin/feedback");
  });
}

export async function deleteFeedbackAction(id: string) {
  return run(async () => {
    await feedback.deleteFeedback(await requireUser("ADMIN"), id);
    revalidatePath("/admin/feedback");
  });
}

export async function saveSettingsAction(input: unknown) {
  return run(async () => {
    await settings.updateSettings(await requireUser("ADMIN"), input);
    revalidatePath("/", "layout");
  });
}
