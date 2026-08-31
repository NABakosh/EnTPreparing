import { PrismaClient, Subject } from "@prisma/client";

const prisma = new PrismaClient();

const INFORMATICS_MODULES = [
  { level: 1, title: "Основы алгоритмизации", description: "Переменные, условия, циклы, базовые алгоритмы" },
  { level: 2, title: "Структуры данных", description: "Массивы, строки, списки, стеки и очереди" },
  { level: 3, title: "Алгоритмы и сложность", description: "Сортировки, поиск, оценка временной сложности" },
  { level: 4, title: "Базы данных и SQL", description: "Реляционные модели, запросы, нормализация" },
  { level: 5, title: "Продвинутая информатика", description: "Графы, динамическое программирование, ООП" },
];

const MATHEMATICS_MODULES = [
  { level: 1, title: "Арифметика и дроби", description: "Действия с числами, проценты, пропорции" },
  { level: 2, title: "Алгебраические выражения", description: "Уравнения, неравенства, системы уравнений" },
  { level: 3, title: "Функции и графики", description: "Линейные и квадратичные функции, область определения" },
  { level: 4, title: "Геометрия", description: "Треугольники, окружности, площади и объёмы" },
  { level: 5, title: "Продвинутая математика", description: "Тригонометрия, прогрессии, комбинаторика" },
];

async function seedSubject(subject: Subject, modules: typeof INFORMATICS_MODULES) {
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { subject_level: { subject, level: mod.level } },
      update: { title: mod.title, description: mod.description },
      create: { ...mod, subject },
    });
  }
}

async function main() {
  await seedSubject(Subject.INFORMATICS, INFORMATICS_MODULES);
  await seedSubject(Subject.MATHEMATICS, MATHEMATICS_MODULES);
  console.log("✓ Модули информатики и математики созданы");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
