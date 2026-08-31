import { NextResponse } from "next/server";
import { generateAdaptiveTest } from "@/lib/ai/test-generator";
import { getModuleByLevel, type SubjectSlug } from "@/lib/modules";
import { createTestToken } from "@/lib/test-token";

export async function POST(request: Request) {
  try {
    const { level, subject: subjectSlug = "informat", weakTopics = [] } =
      await request.json();

    const moduleLevel = Number(level);
    const subject = subjectSlug as SubjectSlug;

    if (!getModuleByLevel(subject, 1)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }

    if (!moduleLevel || moduleLevel < 1 || moduleLevel > 5) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    const module = getModuleByLevel(subject, moduleLevel);
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const test = await generateAdaptiveTest({
      subjectSlug: subject,
      moduleLevel,
      moduleTitle: module.title.ru,
      weakTopics,
      questionCount: 5,
    });

    const testToken = await createTestToken({
      ...test,
      userId: "local",
      moduleId: `${subject}-${moduleLevel}`,
      subjectSlug: subject,
      moduleLevel,
    });

    const clientQuestions = test.questions.map(
      ({ correctAnswer: _c, explanation: _e, ...q }) => q,
    );

    return NextResponse.json({
      testToken,
      module: { title: module.title.ru, level: module.level },
      questions: clientQuestions,
    });
  } catch {
    return NextResponse.json({ error: "Generate failed" }, { status: 500 });
  }
}
