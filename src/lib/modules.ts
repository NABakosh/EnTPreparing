import type { Locale } from "@/i18n/types";

export type SubjectSlug = "informat" | "math";

export const SUBJECT_SLUGS: Record<SubjectSlug, SubjectSlug> = {
  informat: "informat",
  math: "math",
};

type Localized = Record<Locale, string>;

export interface ModuleDef {
  level: number;
  title: Localized;
  description: Localized;
}

export const INFORMATICS_MODULES: ModuleDef[] = [
  {
    level: 1,
    title: { ru: "Основы алгоритмизации", kk: "Алгоритмдеу негіздері" },
    description: {
      ru: "Переменные, условия, циклы, базовые алгоритмы",
      kk: "Айнымалылар, шарттар, циклдар, базалық алгоритмдер",
    },
  },
  {
    level: 2,
    title: { ru: "Структуры данных", kk: "Деректер құрылымы" },
    description: {
      ru: "Массивы, строки, списки, стеки и очереди",
      kk: "Массивтер, жолдар, тізімдер, стектер мен кезектер",
    },
  },
  {
    level: 3,
    title: { ru: "Алгоритмы и сложность", kk: "Алгоритмдер және күрделілік" },
    description: {
      ru: "Сортировки, поиск, оценка временной сложности",
      kk: "Сұрыптау, іздеу, уақыт күрделілігін бағалау",
    },
  },
  {
    level: 4,
    title: { ru: "Базы данных и SQL", kk: "Дерекқорлар және SQL" },
    description: {
      ru: "Реляционные модели, запросы, нормализация",
      kk: "Реляциялық модельдер, сұраулар, нормализация",
    },
  },
  {
    level: 5,
    title: { ru: "Продвинутая информатика", kk: "Жетілдірілген информатика" },
    description: {
      ru: "Графы, динамическое программирование, ООП",
      kk: "Графтар, динамикалық бағдарламалау, ООП",
    },
  },
];

export const MATHEMATICS_MODULES: ModuleDef[] = [
  {
    level: 1,
    title: { ru: "Арифметика и дроби", kk: "Арифметика және бөлшектер" },
    description: {
      ru: "Действия с числами, проценты, пропорции",
      kk: "Сандармен әрекеттер, пайыздар, пропорциялар",
    },
  },
  {
    level: 2,
    title: { ru: "Алгебраические выражения", kk: "Алгебралық өрнектер" },
    description: {
      ru: "Уравнения, неравенства, системы уравнений",
      kk: "Теңдеулер, теңсіздіктер, теңдеулер жүйелері",
    },
  },
  {
    level: 3,
    title: { ru: "Функции и графики", kk: "Функциялар және графиктер" },
    description: {
      ru: "Линейные и квадратичные функции, область определения",
      kk: "Сызықтық және квадраттық функциялар, анықталу облысы",
    },
  },
  {
    level: 4,
    title: { ru: "Геометрия", kk: "Геометрия" },
    description: {
      ru: "Треугольники, окружности, площади и объёмы",
      kk: "Үшбұрыштар, шеңберлер, аудандар мен көлемдер",
    },
  },
  {
    level: 5,
    title: { ru: "Продвинутая математика", kk: "Жетілдірілген математика" },
    description: {
      ru: "Тригонометрия, прогрессии, комбинаторика",
      kk: "Тригонометрия, прогрессиялар, комбинаторика",
    },
  },
];

const MODULES_MAP: Record<SubjectSlug, ModuleDef[]> = {
  informat: INFORMATICS_MODULES,
  math: MATHEMATICS_MODULES,
};

export function getModulesForSubject(subjectSlug: SubjectSlug) {
  return MODULES_MAP[subjectSlug];
}

export function getModuleByLevel(subjectSlug: SubjectSlug, level: number) {
  return MODULES_MAP[subjectSlug].find((m) => m.level === level) ?? null;
}

export function getSubjectLabel(
  subjectSlug: SubjectSlug,
  locale: Locale,
  t: { subjects: { informat: string; math: string } },
) {
  return subjectSlug === "informat" ? t.subjects.informat : t.subjects.math;
}

export function localizeModule(mod: ModuleDef, locale: Locale) {
  return {
    level: mod.level,
    title: mod.title[locale],
    description: mod.description[locale],
  };
}
