"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { requireUser } from "@/server/auth/current";
import { issueCertificate } from "@/server/services/certificates";

export async function issueCertificateAction() {
  return run(async () => {
    const c = await issueCertificate(await requireUser("STUDENT"));
    revalidatePath("/student/certificate");
    return { number: c.number };
  });
}
