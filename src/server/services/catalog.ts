import { prisma } from "@/server/db";

export async function listSubjects() {
  return prisma.subject.findMany({ orderBy: [{ mandatory: "desc" }, { order: "asc" }] });
}

export async function listProfilePairs(activeOnly = true) {
  return prisma.profilePair.findMany({
    where: activeOnly ? { active: true } : {},
    include: { subject1: true, subject2: true },
    orderBy: { order: "asc" },
  });
}
