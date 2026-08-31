import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { questionText, userAnswer, correctAnswer, topic, subjectSlug } =
      await request.json();

    const { explainSolution } = await import("@/lib/ai/test-generator");

    const explanation = await explainSolution({
      questionText,
      userAnswer: userAnswer ?? "",
      correctAnswer,
      topic,
      subjectSlug,
    });

    return NextResponse.json({ explanation });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
