"use server";

import { revalidatePath } from "next/cache";
import type { QuestionStatus } from "@prisma/client";
import { run } from "@/lib/action";
import { requireUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import * as content from "@/server/services/content";
import * as setup from "@/server/services/exam-setup";
import { importQuestions } from "@/server/services/question-import";
import * as questions from "@/server/services/questions";

// ── Предметы / модули / темы ──
export async function saveSubjectAction(id: string | null, input: unknown) {
  return run(async () => {
    const s = await content.saveSubject(await requireUser("ADMIN"), id, input);
    revalidatePath("/admin/content", "layout");
    return { id: s.id };
  });
}
export async function deleteSubjectAction(id: string) {
  return run(async () => {
    await content.deleteSubject(await requireUser("ADMIN"), id);
    revalidatePath("/admin/content", "layout");
  });
}
export async function saveModuleAction(id: string | null, subjectId: string | null, input: unknown) {
  return run(async () => {
    await content.saveModule(await requireUser("ADMIN"), id, subjectId, input);
    revalidatePath("/admin/content", "layout");
  });
}
export async function deleteModuleAction(id: string) {
  return run(async () => {
    await content.deleteModule(await requireUser("ADMIN"), id);
    revalidatePath("/admin/content", "layout");
  });
}
export async function createTopicAction(moduleId: string, input: unknown) {
  return run(async () => {
    const t = await content.createTopic(await requireUser("ADMIN"), moduleId, input);
    revalidatePath("/admin/content", "layout");
    return { id: t.id };
  });
}
export async function updateTopicAction(id: string, input: unknown) {
  return run(async () => {
    await content.updateTopic(await requireUser("ADMIN"), id, input);
    revalidatePath("/admin/content", "layout");
    revalidatePath("/student", "layout");
  });
}
export async function deleteTopicAction(id: string) {
  return run(async () => {
    await content.deleteTopic(await requireUser("ADMIN"), id);
    revalidatePath("/admin/content", "layout");
  });
}

// ── Вопросы ──
export async function createQuestionAction(input: unknown) {
  return run(async () => {
    const q = await questions.createQuestion(await requireUser("ADMIN"), input);
    revalidatePath("/admin/questions");
    return { id: q.id };
  });
}
export async function updateQuestionAction(id: string, input: unknown, publish = false) {
  return run(async () => {
    const actor = await requireUser("ADMIN", "TEACHER");
    await questions.updateQuestion(actor, id, input);
    if (publish) await questions.setQuestionStatus(actor, id, "PUBLISHED");
    revalidatePath("/admin/questions");
    revalidatePath("/teacher/review");
  });
}
export async function setQuestionStatusAction(id: string, status: QuestionStatus) {
  return run(async () => {
    await questions.setQuestionStatus(await requireUser("ADMIN", "TEACHER"), id, status);
    revalidatePath("/admin/questions");
    revalidatePath("/teacher/review");
  });
}
export async function setQuestionsStatusBulkAction(ids: string[], status: QuestionStatus) {
  return run(async () => {
    const res = await questions.setQuestionsStatusBulk(await requireUser("ADMIN", "TEACHER"), ids, status);
    revalidatePath("/admin/questions");
    revalidatePath("/teacher/review");
    return res;
  });
}
export async function deleteQuestionAction(id: string) {
  return run(async () => {
    await questions.deleteQuestion(await requireUser("ADMIN"), id);
    revalidatePath("/admin/questions");
  });
}
export async function importQuestionsAction(formData: FormData) {
  return run(async () => {
    const actor = await requireUser("ADMIN");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("empty_file");
    if (file.size > 5 * 1024 * 1024) throw new AppError("file_too_large");
    const res = await importQuestions(actor, file);
    revalidatePath("/admin/questions");
    revalidatePath("/teacher/review");
    return res;
  });
}

// ── Экзамен и профили ──
export async function addPairAction(subject1Id: string, subject2Id: string) {
  return run(async () => {
    await setup.addPair(await requireUser("ADMIN"), subject1Id, subject2Id);
    revalidatePath("/admin/exam");
  });
}
export async function setPairActiveAction(id: string, active: boolean) {
  return run(async () => {
    await setup.setPairActive(await requireUser("ADMIN"), id, active);
    revalidatePath("/admin/exam");
  });
}
export async function deletePairAction(id: string) {
  return run(async () => {
    await setup.deletePair(await requireUser("ADMIN"), id);
    revalidatePath("/admin/exam");
  });
}
export async function updateTemplateAction(templateId: string, input: unknown) {
  return run(async () => {
    await setup.updateTemplate(await requireUser("ADMIN"), templateId, input);
    revalidatePath("/admin/exam");
  });
}
