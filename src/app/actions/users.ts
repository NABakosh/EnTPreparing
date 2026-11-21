"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { AppError } from "@/server/errors";
import { requireUser } from "@/server/auth/current";
import * as classes from "@/server/services/classes";
import { credentialsXlsx, importStudents, importTeachers } from "@/server/services/import-users";
import * as users from "@/server/services/users";

export async function createUserAction(input: unknown) {
  return run(async () => {
    const actor = await requireUser("ADMIN", "TEACHER");
    const created = await users.createUserManual(actor, input);
    revalidatePath("/admin/users");
    revalidatePath("/teacher");
    return { created, fileBase64: await credentialsXlsx(created) };
  });
}

export async function resetPasswordAction(userId: string) {
  return run(async () => {
    const actor = await requireUser("ADMIN", "TEACHER");
    const cred = await users.resetPassword(actor, userId);
    return { created: [cred], fileBase64: await credentialsXlsx([cred]) };
  });
}

export async function setUserActiveAction(userId: string, active: boolean) {
  return run(async () => {
    await users.setUserActive(await requireUser("ADMIN"), userId, active);
    revalidatePath("/admin/users");
  });
}

export async function importUsersAction(formData: FormData) {
  return run(async () => {
    const actor = await requireUser("ADMIN", "TEACHER");
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File) || file.size === 0) throw new AppError("empty_file");
    if (file.size > 5 * 1024 * 1024) throw new AppError("file_too_large");
    const res = kind === "teachers" ? await importTeachers(actor, file) : await importStudents(actor, file);
    revalidatePath("/admin/users");
    return res;
  });
}

export async function saveClassAction(id: string | null, input: unknown) {
  return run(async () => {
    await classes.saveClass(await requireUser("ADMIN"), id, input);
    revalidatePath("/admin/classes");
  });
}

export async function deleteClassAction(id: string) {
  return run(async () => {
    await classes.deleteClass(await requireUser("ADMIN"), id);
    revalidatePath("/admin/classes");
  });
}
