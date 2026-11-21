import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { CurrentUser } from "@/server/auth/current";

function admin(actor: CurrentUser) {
  if (actor.role !== "ADMIN") throw new AppError("forbidden", 403);
}

export async function examSetup(actor: CurrentUser) {
  admin(actor);
  const [pairs, template, subjects] = await Promise.all([
    prisma.profilePair.findMany({ orderBy: { order: "asc" }, include: { subject1: true, subject2: true, _count: { select: { users: true } } } }),
    prisma.examTemplate.findFirst({ orderBy: { slug: "asc" }, include: { sections: { orderBy: { order: "asc" }, include: { subject: true } } } }),
    prisma.subject.findMany({ orderBy: [{ mandatory: "desc" }, { order: "asc" }] }),
  ]);
  return { pairs, template, subjects };
}

export async function addPair(actor: CurrentUser, subject1Id: string, subject2Id: string) {
  admin(actor);
  if (!subject1Id || !subject2Id || subject1Id === subject2Id) throw new AppError("validation");
  const subs = await prisma.subject.findMany({ where: { id: { in: [subject1Id, subject2Id] } } });
  if (subs.length !== 2 || subs.some((s) => s.mandatory)) throw new AppError("pair_bad_subjects");
  const exists = await prisma.profilePair.findFirst({
    where: { OR: [{ subject1Id, subject2Id }, { subject1Id: subject2Id, subject2Id: subject1Id }] },
  });
  if (exists) throw new AppError("pair_exists");
  const max = await prisma.profilePair.aggregate({ _max: { order: true } });
  return prisma.profilePair.create({ data: { subject1Id, subject2Id, order: (max._max.order ?? 0) + 1 } });
}

export async function setPairActive(actor: CurrentUser, id: string, active: boolean) {
  admin(actor);
  await prisma.profilePair.update({ where: { id }, data: { active } });
}

export async function deletePair(actor: CurrentUser, id: string) {
  admin(actor);
  await prisma.profilePair.delete({ where: { id } });
}

const templateSchema = z.object({
  durationMin: z.coerce.number().int().min(10).max(600),
  sections: z.array(z.object({ id: z.string(), singleCount: z.coerce.number().int().min(0).max(200), multipleCount: z.coerce.number().int().min(0).max(200) })),
});

export async function updateTemplate(actor: CurrentUser, templateId: string, input: unknown) {
  admin(actor);
  const p = templateSchema.safeParse(input);
  if (!p.success) throw new AppError("validation");
  await prisma.$transaction([
    prisma.examTemplate.update({ where: { id: templateId }, data: { durationMin: p.data.durationMin } }),
    ...p.data.sections.map((s) =>
      prisma.examSection.updateMany({ where: { id: s.id, templateId }, data: { singleCount: s.singleCount, multipleCount: s.multipleCount } }),
    ),
  ]);
}
