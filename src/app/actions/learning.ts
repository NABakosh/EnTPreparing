"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import type { Locale } from "@/config/site";
import { requireUser } from "@/server/auth/current";
import * as attempts from "@/server/services/attempts";
import * as learning from "@/server/services/learning";

export async function setProfilePairAction(pairId: string) {
  return run(async () => {
    await learning.setProfilePair(await requireUser("STUDENT"), pairId);
    revalidatePath("/student", "layout");
  });
}

export async function startTopicTestAction(topicId: string) {
  return run(async () => ({ id: (await attempts.startTopicTest(await requireUser("STUDENT"), topicId)).id }));
}

export async function startReviewAction(topicId?: string) {
  return run(async () => ({ id: (await attempts.startReview(await requireUser("STUDENT"), topicId)).id }));
}

export async function answerAction(attemptId: string, questionId: string, selected: number[]) {
  return run(async () => attempts.answerInstant(await requireUser("STUDENT"), attemptId, questionId, selected, (await getLocale()) as Locale));
}

export async function finishAttemptAction(attemptId: string) {
  return run(async () => {
    const a = await attempts.finishAttempt(await requireUser("STUDENT"), attemptId);
    revalidatePath("/student", "layout");
    return { id: a.id };
  });
}

export async function startExamAction(pairId: string) {
  return run(async () => ({ id: (await attempts.startExam(await requireUser("STUDENT"), pairId)).id }));
}
