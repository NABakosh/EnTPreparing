/**
 * Схема баллов пробного экзамена.
 * ВНИМАНИЕ: сверить с официальной спецификацией Национального центра тестирования (НЦТ).
 */
export const SCORING = {
  /** Балл за верный ответ в задании с одним вариантом */
  singlePoints: 1,
  /** Максимум за задание с несколькими верными ответами */
  multiplePoints: 2,
  /** Балл при ровно одной ошибке в задании с несколькими ответами */
  multiplePartialPoints: 1,
} as const;

export type QType = "SINGLE" | "MULTIPLE";

export function maxPointsFor(type: QType): number {
  return type === "MULTIPLE" ? SCORING.multiplePoints : SCORING.singlePoints;
}

/** Подсчёт баллов за одно задание. selected и correct — индексы вариантов. */
export function scoreAnswer(type: QType, correct: number[], selected: number[]): { points: number; isCorrect: boolean } {
  const c = new Set(correct);
  const s = new Set(selected);
  if (type === "SINGLE") {
    const ok = s.size === 1 && c.has([...s][0]);
    return { points: ok ? SCORING.singlePoints : 0, isCorrect: ok };
  }
  if (s.size === 0) return { points: 0, isCorrect: false };
  let errors = 0;
  for (const x of c) if (!s.has(x)) errors++;
  for (const x of s) if (!c.has(x)) errors++;
  if (errors === 0) return { points: SCORING.multiplePoints, isCorrect: true };
  if (errors === 1) return { points: SCORING.multiplePartialPoints, isCorrect: false };
  return { points: 0, isCorrect: false };
}
