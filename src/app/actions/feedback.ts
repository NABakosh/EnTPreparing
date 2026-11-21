"use server";

import { run } from "@/lib/action";
import { submitFeedback } from "@/server/services/feedback";

export async function submitFeedbackAction(input: { name: string; contact: string; message: string }) {
  return run(() => submitFeedback(input));
}
