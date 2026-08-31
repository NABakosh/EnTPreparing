import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { testSchema, TestQuestion } from "@/types/test";
import type { SubjectSlug } from "@/lib/modules";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INFORMATICS_FALLBACK: Record<number, TestQuestion[]> = {
  1: [
    { id: "f1-1", questionText: "Что выведет программа: x=5; print(x*2)?", options: ["5", "10", "25", "Ошибка"], correctAnswer: "10", topic: "Переменные" },
    { id: "f1-2", questionText: "Какой оператор используется для ветвления?", options: ["for", "if", "while", "def"], correctAnswer: "if", topic: "Условия" },
    { id: "f1-3", questionText: "Сколько раз выполнится цикл: for i in range(3)?", options: ["2", "3", "4", "0"], correctAnswer: "3", topic: "Циклы" },
  ],
  2: [
    { id: "f2-1", questionText: "Какая структура работает по принципу LIFO?", options: ["Очередь", "Стек", "Массив", "Список"], correctAnswer: "Стек", topic: "Структуры данных" },
    { id: "f2-2", questionText: "Индексация первого элемента массива в Python:", options: ["1", "0", "-1", "Зависит от размера"], correctAnswer: "0", topic: "Массивы" },
    { id: "f2-3", questionText: "Сложность доступа к элементу массива по индексу:", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correctAnswer: "O(1)", topic: "Массивы" },
  ],
  3: [
    { id: "f3-1", questionText: "Сложность быстрой сортировки в среднем:", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correctAnswer: "O(n log n)", topic: "Сортировки" },
    { id: "f3-2", questionText: "Какой алгоритм поиска требует отсортированный массив?", options: ["Линейный", "Бинарный", "Полный перебор", "Хеш-поиск"], correctAnswer: "Бинарный", topic: "Поиск" },
    { id: "f3-3", questionText: "Big O для вложенных циклов по n:", options: ["O(n)", "O(n log n)", "O(n²)", "O(1)"], correctAnswer: "O(n²)", topic: "Сложность" },
  ],
  4: [
    { id: "f4-1", questionText: "SQL-команда для выборки данных:", options: ["INSERT", "SELECT", "DELETE", "CREATE"], correctAnswer: "SELECT", topic: "SQL" },
    { id: "f4-2", questionText: "Первичный ключ в таблице:", options: ["Дублируется", "Уникально идентифицирует строку", "Только текстовый", "Необязателен"], correctAnswer: "Уникально идентифицирует строку", topic: "Базы данных" },
    { id: "f4-3", questionText: "JOIN объединяет:", options: ["Файлы", "Таблицы", "Серверы", "Индексы"], correctAnswer: "Таблицы", topic: "SQL" },
  ],
  5: [
    { id: "f5-1", questionText: "Алгоритм Дейкстры решает задачу:", options: ["Сортировки", "Кратчайшего пути", "Умножения матриц", "Хеширования"], correctAnswer: "Кратчайшего пути", topic: "Графы" },
    { id: "f5-2", questionText: "Инкапсуляция в ООП означает:", options: ["Наследование", "Сокрытие реализации", "Множественные интерфейсы", "Рекурсию"], correctAnswer: "Сокрытие реализации", topic: "ООП" },
    { id: "f5-3", questionText: "Динамическое программирование использует:", options: ["Жадный подход", "Мемоизацию подзадач", "Случайный поиск", "Потоки"], correctAnswer: "Мемоизацию подзадач", topic: "ДП" },
  ],
};

const MATHEMATICS_FALLBACK: Record<number, TestQuestion[]> = {
  1: [
    { id: "m1-1", questionText: "Сколько будет 15% от 200?", options: ["15", "30", "25", "35"], correctAnswer: "30", topic: "Проценты" },
    { id: "m1-2", questionText: "Результат: 3/4 + 1/4", options: ["1/2", "1", "4/8", "2/4"], correctAnswer: "1", topic: "Дроби" },
    { id: "m1-3", questionText: "Если 2:3 = x:15, то x =", options: ["6", "10", "12", "8"], correctAnswer: "10", topic: "Пропорции" },
  ],
  2: [
    { id: "m2-1", questionText: "Решите: 2x + 6 = 14", options: ["x=2", "x=4", "x=6", "x=8"], correctAnswer: "x=4", topic: "Уравнения" },
    { id: "m2-2", questionText: "Решите: x² - 9 = 0", options: ["x=±3", "x=3", "x=9", "x=±9"], correctAnswer: "x=±3", topic: "Уравнения" },
    { id: "m2-3", questionText: "Решите неравенство: x - 3 > 0", options: ["x < 3", "x > 3", "x ≤ 3", "x ≥ 3"], correctAnswer: "x > 3", topic: "Неравенства" },
  ],
  3: [
    { id: "m3-1", questionText: "График y = 2x + 1 проходит через точку (0, ?)", options: ["0", "1", "2", "-1"], correctAnswer: "1", topic: "Линейные функции" },
    { id: "m3-2", questionText: "Вершина параболы y = x² находится в:", options: ["(0;0)", "(1;0)", "(0;1)", "(1;1)"], correctAnswer: "(0;0)", topic: "Квадратичные функции" },
    { id: "m3-3", questionText: "Область определения y = 1/x:", options: ["Все числа", "x ≠ 0", "x > 0", "x ≥ 0"], correctAnswer: "x ≠ 0", topic: "Функции" },
  ],
  4: [
    { id: "m4-1", questionText: "Сумма углов треугольника:", options: ["90°", "180°", "270°", "360°"], correctAnswer: "180°", topic: "Геометрия" },
    { id: "m4-2", questionText: "Площадь прямоугольника со сторонами 5 и 8:", options: ["13", "26", "40", "80"], correctAnswer: "40", topic: "Площади" },
    { id: "m4-3", questionText: "Объём куба с ребром 3:", options: ["9", "18", "27", "36"], correctAnswer: "27", topic: "Объёмы" },
  ],
  5: [
    { id: "m5-1", questionText: "sin(90°) =", options: ["0", "1", "-1", "0.5"], correctAnswer: "1", topic: "Тригонометрия" },
    { id: "m5-2", questionText: "Сумма первых 5 членов арифм. прогрессии (a₁=2, d=3):", options: ["30", "40", "50", "35"], correctAnswer: "40", topic: "Прогрессии" },
    { id: "m5-3", questionText: "Сколько способов выбрать 2 из 4?", options: ["4", "6", "8", "12"], correctAnswer: "6", topic: "Комбинаторика" },
  ],
};

const FALLBACK_BY_SUBJECT: Record<SubjectSlug, Record<number, TestQuestion[]>> = {
  informat: INFORMATICS_FALLBACK,
  math: MATHEMATICS_FALLBACK,
};

interface GenerateTestParams {
  subjectSlug: import("@/lib/modules").SubjectSlug;
  moduleLevel: number;
  moduleTitle: string;
  weakTopics: { topic: string; questionText: string }[];
  questionCount?: number;
}

export async function generateAdaptiveTest({
  subjectSlug,
  moduleLevel,
  moduleTitle,
  weakTopics,
  questionCount = 5,
}: GenerateTestParams) {
  const fallbacks = FALLBACK_BY_SUBJECT[subjectSlug];

  if (!process.env.OPENAI_API_KEY) {
    const fallback = fallbacks[moduleLevel] ?? fallbacks[1];
    return { questions: fallback.slice(0, questionCount) };
  }

  const subjectLabel = subjectSlug === "informat" ? "информатике" : "математике";
  const weakTopicsText =
    weakTopics.length > 0
      ? `Обязательно включи 2-3 перефразированных вопроса по этим слабым темам из предыдущего модуля:\n${weakTopics.map((t) => `- Тема: ${t.topic}, ошибка в: "${t.questionText}"`).join("\n")}`
      : "Слабых тем нет — сгенерируй вопросы только по текущему модулю.";

  const difficulty =
    moduleLevel <= 2 ? "базовый" : moduleLevel <= 4 ? "средний" : "продвинутый";

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: testSchema,
    prompt: `Ты — эксперт по подготовке к ЕНТ по предмету «${subjectLabel}».
Сгенерируй ${questionCount} вопросов с 4 вариантами ответа для модуля "${moduleTitle}" (уровень ${moduleLevel}/5).
Сложность: ${difficulty}.

${weakTopicsText}

Требования:
- Каждый вопрос на русском языке
- Уникальный id в формате "q-{level}-{n}"
- topic — краткое название темы
- correctAnswer должен точно совпадать с одним из options
- Вопросы для школьников 11 класса Казахстана`,
  });

  return object;
}

export async function explainSolution(params: {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  topic: string;
  subjectSlug?: SubjectSlug;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return `Правильный ответ: ${params.correctAnswer}.\n\nТема: ${params.topic}.\n\nВаш ответ "${params.userAnswer}" неверен.`;
  }

  const { generateText } = await import("ai");
  const subjectLabel =
    params.subjectSlug === "math" ? "математике" : "информатике";

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Ты — ИИ-репетитор по ${subjectLabel} для подготовки к ЕНТ.
Объясни подробно, почему ответ ученика неверен и как прийти к правильному решению.

Вопрос: ${params.questionText}
Тема: ${params.topic}
Ответ ученика: ${params.userAnswer}
Правильный ответ: ${params.correctAnswer}

Дай пошаговое объяснение на русском языке (3-5 абзацев).`,
  });

  return text;
}
