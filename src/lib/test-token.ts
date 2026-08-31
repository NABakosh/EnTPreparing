import { SignJWT, jwtVerify } from "jose";
import { GeneratedTest } from "@/types/test";
import type { SubjectSlug } from "@/lib/modules";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-production",
);

export async function createTestToken(
  payload: GeneratedTest & {
    userId: string;
    moduleId: string;
    subjectSlug: SubjectSlug;
    moduleLevel: number;
  },
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);
}

export async function verifyTestToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as GeneratedTest & {
    userId: string;
    moduleId: string;
    subjectSlug: SubjectSlug;
    moduleLevel: number;
  };
}
