import type { SubjectSlug } from "@/lib/modules";

export interface TestResultItem {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string;
}

export interface LocalAttempt {
  id: string;
  subjectSlug: SubjectSlug;
  level: number;
  moduleTitle: string;
  score: number;
  isPassed: boolean;
  completedAt: string;
  results: TestResultItem[];
}

export interface LocalCertificate {
  id: string;
  subjectSlug: SubjectSlug;
  fileUrl: string;
  issueDate: string;
}

const ATTEMPTS_KEY = "ent-attempts";
const CERTS_KEY = "ent-certificates";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAttempts(): LocalAttempt[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: LocalAttempt) {
  if (!isBrowser()) return;
  const attempts = getAttempts();
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([attempt, ...attempts]));
}

export function getModuleProgress(subjectSlug: SubjectSlug, level: number) {
  const attempts = getAttempts().filter(
    (a) => a.subjectSlug === subjectSlug && a.level === level,
  );
  const best = attempts.sort((a, b) => b.score - a.score)[0];
  return {
    bestScore: best?.score ?? null,
    isPassed: best?.isPassed ?? false,
    attemptsCount: attempts.length,
  };
}

export function isModuleUnlocked(subjectSlug: SubjectSlug, level: number) {
  if (level <= 1) return true;
  return getModuleProgress(subjectSlug, level - 1).isPassed;
}

export function getWrongTopicsFromPrevModule(
  subjectSlug: SubjectSlug,
  level: number,
) {
  if (level <= 1) return [];
  const prevAttempts = getAttempts()
    .filter((a) => a.subjectSlug === subjectSlug && a.level === level - 1)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

  const latest = prevAttempts[0];
  if (!latest) return [];

  return latest.results
    .filter((r) => !r.isCorrect)
    .map((r) => ({ topic: r.topic, questionText: r.questionText }));
}

export function getCertificates(): LocalCertificate[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(CERTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCertificate(cert: LocalCertificate) {
  if (!isBrowser()) return;
  const certs = getCertificates();
  if (certs.some((c) => c.subjectSlug === cert.subjectSlug)) return;
  localStorage.setItem(CERTS_KEY, JSON.stringify([cert, ...certs]));
}

export function getPassedCount(subjectSlug: SubjectSlug) {
  const levels = new Set(
    getAttempts()
      .filter((a) => a.subjectSlug === subjectSlug && a.isPassed)
      .map((a) => a.level),
  );
  return levels.size;
}
