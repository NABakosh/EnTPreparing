"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ClientQuestion } from "@/types/test";
import type { SubjectSlug } from "@/lib/modules";
import { getModuleByLevel, localizeModule } from "@/lib/modules";
import { useAuth } from "@/components/providers/local-auth-provider";
import { useI18n, interpolate } from "@/i18n/context";
import {
  getWrongTopicsFromPrevModule,
  isModuleUnlocked,
  saveAttempt,
  saveCertificate,
} from "@/lib/local-storage/progress";
import { generateCertificatePdf } from "@/lib/certificate-client";

interface TestResult {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string;
}

interface SubmitResponse {
  score: number;
  isPassed: boolean;
  correctCount: number;
  totalQuestions: number;
  results: TestResult[];
  nextModule: number | null;
  needsCertificate: boolean;
  certificateUrl?: string;
}

export function TestRunner({
  level,
  subjectSlug,
}: {
  level: number;
  subjectSlug: SubjectSlug;
}) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [testToken, setTestToken] = useState("");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const mod = getModuleByLevel(subjectSlug, level);

  useEffect(() => {
    if (!mod) return;

    if (!isModuleUnlocked(subjectSlug, level)) {
      setError(t.ent.locked);
      setLoading(false);
      return;
    }

    const localized = localizeModule(mod, locale);
    setModuleTitle(localized.title);

    async function loadTest() {
      try {
        const weakTopics = getWrongTopicsFromPrevModule(subjectSlug, level);
        const res = await fetch("/api/tests/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, subject: subjectSlug, weakTopics }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? t.common.error);
          return;
        }
        setTestToken(data.testToken);
        setQuestions(data.questions);
      } catch {
        setError(t.common.error);
      } finally {
        setLoading(false);
      }
    }

    loadTest();
  }, [level, subjectSlug, locale, mod, t]);

  async function handleSubmit() {
    if (questions.some((q) => !answers[q.id])) {
      setError(t.test.answerAll);
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testToken,
          answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.common.error);
        return;
      }

      let certificateUrl: string | undefined;
      if (data.needsCertificate && user) {
        certificateUrl = generateCertificatePdf({
          userName: user.name,
          subjectSlug,
          locale,
        });
        saveCertificate({
          id: crypto.randomUUID(),
          subjectSlug,
          fileUrl: certificateUrl,
          issueDate: new Date().toISOString(),
        });
      }

      saveAttempt({
        id: crypto.randomUUID(),
        subjectSlug,
        level,
        moduleTitle,
        score: data.score,
        isPassed: data.isPassed,
        completedAt: new Date().toISOString(),
        results: data.results,
      });

      setResult({ ...data, certificateUrl });
    } catch {
      setError(t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExplain(item: TestResult, index: number) {
    const key = String(index);
    setExplaining(key);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: item.questionText,
          userAnswer: item.userAnswer,
          correctAnswer: item.correctAnswer,
          topic: item.topic,
          subjectSlug,
        }),
      });
      const data = await res.json();
      setExplanations((prev) => ({ ...prev, [key]: data.explanation ?? t.common.error }));
    } catch {
      setExplanations((prev) => ({ ...prev, [key]: t.common.error }));
    } finally {
      setExplaining(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-muted">{t.test.generating}</p>
      </div>
    );
  }

  if (error && !result && questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-red-600">{error}</p>
        <Link href={`/ent/${subjectSlug}`} className="mt-4 inline-block text-primary hover:underline">
          {t.test.backToModules}
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className={`rounded-2xl border p-8 text-center ${result.isPassed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <h2 className="text-2xl font-bold">{result.isPassed ? t.test.passed : t.test.failed}</h2>
          <p className="mt-2 text-lg">
            {t.test.result}: {result.score}% ({result.correctCount} {t.test.of} {result.totalQuestions})
          </p>
          <p className="mt-1 text-sm text-muted">{t.test.passNote}</p>
          {result.certificateUrl && (
            <a href={result.certificateUrl} download={`certificate-${subjectSlug}.pdf`}
              className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">
              {t.test.downloadCert}
            </a>
          )}
        </div>

        <h3 className="mt-8 text-lg font-semibold">{t.test.review}</h3>
        <div className="mt-4 space-y-4">
          {result.results.map((item, i) => (
            <div key={i} className={`rounded-xl border p-5 ${item.isCorrect ? "border-green-200" : "border-red-200"}`}>
              <p className="font-medium">{item.questionText}</p>
              <p className="mt-2 text-sm">
                {t.test.yourAnswer}: <span className={item.isCorrect ? "text-green-600" : "text-red-600"}>{item.userAnswer || "—"}</span>
              </p>
              {!item.isCorrect && (
                <>
                  <p className="text-sm text-muted">{t.test.correctAnswer}: {item.correctAnswer}</p>
                  <button type="button" onClick={() => handleExplain(item, i)} disabled={explaining === String(i)}
                    className="mt-3 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
                    {explaining === String(i) ? t.test.explaining : `🤖 ${t.test.explain}`}
                  </button>
                  {explanations[String(i)] && (
                    <div className="mt-3 rounded-lg bg-blue-50 p-4 text-sm">{explanations[String(i)]}</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href={`/ent/${subjectSlug}`} className="rounded-lg border border-border px-5 py-2.5 text-sm">{t.test.backToModules}</Link>
          {result.isPassed && result.nextModule && (
            <Link href={`/ent/${subjectSlug}/${result.nextModule}/test`} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">
              {t.test.nextModule}
            </Link>
          )}
          {!result.isPassed && (
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">
              {t.common.tryAgain}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/ent/${subjectSlug}`} className="text-sm text-muted hover:text-foreground">{t.test.backToModules}</Link>
      <h1 className="mt-4 text-2xl font-bold">{t.ent.module} {level}: {moduleTitle}</h1>
      <p className="mt-1 text-muted">{interpolate(t.test.questionsCount, { n: questions.length })}</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-8 space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-6">
            <p className="font-medium">{i + 1}. {q.questionText}</p>
            <p className="mt-1 text-xs text-muted">{t.test.topic}: {q.topic}</p>
            <div className="mt-4 space-y-2">
              {q.options.map((option) => (
                <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${answers[q.id] === option ? "border-primary bg-blue-50" : "border-border"}`}>
                  <input type="radio" name={q.id} value={option} checked={answers[q.id] === option}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))} className="accent-primary" />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSubmit} disabled={submitting}
        className="mt-8 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? t.test.checking : t.test.finish}
      </button>
    </div>
  );
}

export function TestPageWrapper({ subjectSlug }: { subjectSlug: SubjectSlug }) {
  const params = useParams();
  const level = Number(params.level);
  if (!level || level < 1 || level > 5) return null;
  return (
    <AuthGuard>
      <TestRunner level={level} subjectSlug={subjectSlug} />
    </AuthGuard>
  );
}
