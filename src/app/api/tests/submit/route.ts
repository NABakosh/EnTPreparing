import { NextResponse } from "next/server";
import { verifyTestToken } from "@/lib/test-token";
import { submitTestSchema } from "@/types/test";

const PASS_THRESHOLD = 0.7;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = submitTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { testToken, answers } = parsed.data;
    const payload = await verifyTestToken(testToken);
    const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

    const graded = payload.questions.map((q) => {
      const userAnswer = answerMap.get(q.id) ?? "";
      return {
        questionText: q.questionText,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: userAnswer === q.correctAnswer,
        topic: q.topic,
      };
    });

    const correctCount = graded.filter((g) => g.isCorrect).length;
    const totalQuestions = graded.length;
    const score = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    const isPassed = score >= PASS_THRESHOLD;

    return NextResponse.json({
      score: Math.round(score * 100),
      isPassed,
      totalQuestions,
      correctCount,
      results: graded,
      subjectSlug: payload.subjectSlug,
      moduleLevel: payload.moduleLevel,
      nextModule: isPassed && payload.moduleLevel < 5 ? payload.moduleLevel + 1 : null,
      needsCertificate: isPassed && payload.moduleLevel === 5,
    });
  } catch {
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
