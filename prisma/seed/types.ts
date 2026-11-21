export type Opt = { ru: string; kk: string };

export type SeedQuestion = {
  textRu: string;
  textKk: string;
  options: Opt[];
  correct: number[];
  type: "SINGLE" | "MULTIPLE";
  explanationRu: string;
  explanationKk: string;
};

export type SeedTopic = {
  titleRu: string;
  titleKk: string;
  theoryRu: string;
  theoryKk: string;
  summaryRu: string;
  summaryKk: string;
  grade?: number;
  questions: SeedQuestion[];
};

export type SeedModule = { titleRu: string; titleKk: string; topics: SeedTopic[] };

export type SeedSubject = {
  slug: string;
  nameRu: string;
  nameKk: string;
  mandatory: boolean;
  order: number;
  modules: SeedModule[];
};

/** Короткий конструктор вопроса с одним ответом. */
export function q(
  textRu: string,
  textKk: string,
  optsRu: string[],
  optsKk: string[],
  correct: number | number[],
  explanationRu: string,
  explanationKk: string,
): SeedQuestion {
  const c = Array.isArray(correct) ? correct : [correct];
  return {
    textRu,
    textKk,
    options: optsRu.map((ru, i) => ({ ru, kk: optsKk[i] ?? ru })),
    correct: c,
    type: c.length > 1 ? "MULTIPLE" : "SINGLE",
    explanationRu,
    explanationKk,
  };
}

/** Детерминированный ГПСЧ (mulberry32), чтобы seed давал одинаковые вопросы. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof rng>;

export function int(r: Rand, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

/** Перемешивает варианты и пересчитывает индексы верных. */
export function shuffled(r: Rand, options: Opt[], correct: number[]): { options: Opt[]; correct: number[] } {
  const idx = options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { options: idx.map((i) => options[i]), correct: idx.map((orig, pos) => (correct.includes(orig) ? pos : -1)).filter((x) => x >= 0) };
}

/** Числовой вопрос: верный ответ + дистракторы. */
export function numQ(
  r: Rand,
  textRu: string,
  textKk: string,
  answer: number | string,
  distractors: (number | string)[],
  explanationRu: string,
  explanationKk: string,
  unit = "",
): SeedQuestion {
  const seen = new Set<string>([String(answer)]);
  const ds: string[] = [];
  for (const d of distractors) {
    const s = String(d);
    if (!seen.has(s)) {
      seen.add(s);
      ds.push(s);
    }
    if (ds.length === 3) break;
  }
  let k = 1;
  while (ds.length < 3) {
    const s = typeof answer === "number" ? String(answer + k * 7) : `${answer}${k}`;
    if (!seen.has(s)) {
      seen.add(s);
      ds.push(s);
    }
    k++;
  }
  const opts = [String(answer), ...ds].map((v) => ({ ru: `${v}${unit}`, kk: `${v}${unit}` }));
  const sh = shuffled(r, opts, [0]);
  return { textRu, textKk, options: sh.options, correct: sh.correct, type: "SINGLE", explanationRu, explanationKk };
}

export function multiQ(r: Rand, base: SeedQuestion): SeedQuestion {
  const sh = shuffled(r, base.options, base.correct);
  return { ...base, options: sh.options, correct: sh.correct, type: "MULTIPLE" };
}
