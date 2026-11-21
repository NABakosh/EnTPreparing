import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { issueCertificate, renderCertificatePdf, verifyCertificate, certificateForDownload } from "@/server/services/certificates";
import { programCompletion } from "@/server/services/learning";
import { cleanup, mkUser } from "./helpers";

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("сертификат", () => {
  it("не выдаётся, пока программа не пройдена; выдаётся после; PDF и проверка", async () => {
    const s = await mkUser("STUDENT");
    const other = await mkUser("STUDENT");
    await expect(issueCertificate(s)).rejects.toThrow("cert_not_ready"); // нет профиля
    const pair = await prisma.profilePair.findFirstOrThrow();
    await prisma.user.update({ where: { id: s.id }, data: { profilePairId: pair.id } });
    await expect(issueCertificate(s)).rejects.toThrow("cert_not_ready");
    const comp = await programCompletion(s.id);
    expect(comp.modules.length).toBeGreaterThan(0);
    const topics = await prisma.topic.findMany({ where: { module: { subjectId: { in: [pair.subject1Id, pair.subject2Id] } } } });
    const mand = await prisma.topic.findMany({ where: { module: { subject: { mandatory: true } } } });
    await prisma.topicProgress.createMany({ data: [...topics, ...mand].map((t) => ({ userId: s.id, topicId: t.id, bestPercent: 80, lastPercent: 80, completed: true })) });
    expect((await programCompletion(s.id)).complete).toBe(true);
    const c = await issueCertificate(s);
    expect(c.number).toMatch(/^UBT-\d{4}-[A-Z2-9]{8}$/);
    expect((await issueCertificate(s)).id).toBe(c.id); // повторно не создаётся
    const v = await verifyCertificate(c.number.toLowerCase());
    expect(v?.fullName).toBe(s.fullName);
    await expect(certificateForDownload(other, c.number)).rejects.toThrow("forbidden");
    const pdf = await renderCertificatePdf(v!);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(await verifyCertificate("UBT-0000-NOPE")).toBeNull();
  });
});
