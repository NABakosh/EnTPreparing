import { z } from "zod";

export const questionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.string(),
  topic: z.string(),
  explanation: z.string().optional(),
});

export const testSchema = z.object({
  questions: z.array(questionSchema).min(3).max(15),
});

export type TestQuestion = z.infer<typeof questionSchema>;
export type GeneratedTest = z.infer<typeof testSchema>;

export const clientQuestionSchema = questionSchema.omit({
  correctAnswer: true,
  explanation: true,
});

export type ClientQuestion = z.infer<typeof clientQuestionSchema>;

export const submitAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

export const submitTestSchema = z.object({
  testToken: z.string(),
  answers: z.array(submitAnswerSchema),
});
