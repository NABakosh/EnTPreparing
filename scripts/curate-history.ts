/**
 * Ручная (экспертная) структура «Истории Казахстана» по спецификации ҰБТ: модули в хронологическом порядке.
 * Существующие темы переносятся/переименовываются, недостающие создаются (aiGenerated, конспект — build-curriculum),
 * лишние темы без вопросов и попыток удаляются.
 *
 *   npx tsx scripts/curate-history.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import { args, logger } from "./lib";

type T = { ru: string; kk: string; grade: number; from?: string[] };
const PLAN: { ru: string; kk: string; topics: T[] }[] = [
  {
    ru: "Древнейший Казахстан",
    kk: "Ежелгі Қазақстан",
    topics: [
      { ru: "Каменный век на территории Казахстана", kk: "Қазақстан аумағындағы тас дәуірі", grade: 8 },
      { ru: "Бронзовый век: андроновская и бегазы-дандыбаевская культуры", kk: "Қола дәуірі: андронов және беғазы-дәндібай мәдениеттері", grade: 8 },
    ],
  },
  {
    ru: "Ранние кочевники",
    kk: "Ерте көшпенділер",
    topics: [
      { ru: "Саки, усуни и хунну", kk: "Сақтар, үйсіндер және ғұндар", grade: 8, from: ["Саки, усуни и хунну"] },
      { ru: "Сакская культура и «звериный стиль»", kk: "Сақ мәдениеті және «аң стилі»", grade: 8, from: ["Скифы и их культура"] },
      { ru: "Кангюи и сарматы", kk: "Қаңлылар мен сарматтар", grade: 8 },
    ],
  },
  {
    ru: "Тюркская эпоха",
    kk: "Түркі дәуірі",
    topics: [
      { ru: "Тюркский каганат", kk: "Түрік қағанаты", grade: 8, from: ["Тюркский каганат"] },
      { ru: "Тюргешский и Карлукский каганаты", kk: "Түргеш және Қарлұқ қағанаттары", grade: 8 },
      { ru: "Огузское государство", kk: "Оғыз мемлекеті", grade: 8 },
      { ru: "Кимакский каганат и Кыпчакское ханство", kk: "Қимақ қағанаты және Қыпшақ хандығы", grade: 8, from: ["Тюркские кочевые союзы"] },
      { ru: "Караханидское государство", kk: "Қарахан мемлекеті", grade: 8, from: ["Карханидское государство"] },
      { ru: "Средневековые города и Великий шёлковый путь", kk: "Ортағасырлық қалалар және Ұлы Жібек жолы", grade: 8, from: ["Развитие торговли в Средней Азии"] },
    ],
  },
  {
    ru: "Монгольский период",
    kk: "Моңғол кезеңі",
    topics: [
      { ru: "Монгольское завоевание и Золотая Орда", kk: "Моңғол шапқыншылығы және Алтын Орда", grade: 8, from: ["Монгольское завоевание и Золотая Орда"] },
      { ru: "Ак Орда, Могулистан, Ногайская Орда и Ханство Абулхаира", kk: "Ақ Орда, Моғолстан, Ноғай Ордасы және Әбілқайыр хандығы", grade: 8 },
    ],
  },
  {
    ru: "Казахское ханство",
    kk: "Қазақ хандығы",
    topics: [
      { ru: "Казахское ханство", kk: "Қазақ хандығы", grade: 8, from: ["Казахское ханство"] },
      { ru: "Укрепление ханства: Касым, Хакназар, Тауке", kk: "Хандықтың нығаюы: Қасым, Хақназар, Тәуке", grade: 8, from: ["Политика Джанибеков и Керей"] },
      { ru: "Три жуза: формирование и управление", kk: "Үш жүз: қалыптасуы және басқарылуы", grade: 8, from: ["Объединение трех жузов"] },
      { ru: "Казахско-джунгарские войны", kk: "Қазақ-жоңғар соғыстары", grade: 8, from: ["Династические конфликты и межжузовые войны"] },
      { ru: "Абылай хан", kk: "Абылай хан", grade: 8 },
      { ru: "Хозяйство и быт казахов", kk: "Қазақтардың шаруашылығы мен тұрмысы", grade: 8, from: ["Экономика кочевого общества"] },
    ],
  },
  {
    ru: "Казахстан в составе Российской империи",
    kk: "Ресей империясы құрамындағы Қазақстан",
    topics: [
      { ru: "Присоединение к России и восстания", kk: "Ресейге қосылу және көтерілістер", grade: 9, from: ["Присоединение к России и восстания"] },
      { ru: "Восстание Кенесары", kk: "Кенесары көтерілісі", grade: 9, from: ["Восстание Кенесары"] },
      { ru: "Реформы 1867–1868 и 1886–1891 годов", kk: "1867–1868 және 1886–1891 жылдардағы реформалар", grade: 9 },
      { ru: "Переселенческая политика и восстание 1916 года", kk: "Қоныс аудару саясаты және 1916 жылғы көтеріліс", grade: 9 },
    ],
  },
  {
    ru: "Казахстан в XX веке",
    kk: "XX ғасырдағы Қазақстан",
    topics: [
      { ru: "Движение Алаш", kk: "Алаш қозғалысы", grade: 9, from: ["Движение Алаш"] },
      { ru: "Революция 1917 года в Казахстане", kk: "Қазақстандағы 1917 жылғы революция", grade: 9, from: ["Революция 1917 года в Казахстане"] },
      { ru: "Коллективизация и голод 1930-х годов (Ашаршылық)", kk: "Ұжымдастыру және 1930 жылдардағы ашаршылық", grade: 9, from: ["Советская власть и коллективизация"] },
      { ru: "Политические репрессии", kk: "Саяси қуғын-сүргін", grade: 9 },
      { ru: "Казахстан в Великой Отечественной войне", kk: "Ұлы Отан соғысындағы Қазақстан", grade: 9 },
      { ru: "Освоение целины и Семипалатинский полигон", kk: "Тың игеру және Семей полигоны", grade: 9 },
      { ru: "Желтоқсан 1986 года", kk: "1986 жылғы Желтоқсан", grade: 9 },
    ],
  },
  {
    ru: "Независимый Казахстан",
    kk: "Тәуелсіз Қазақстан",
    topics: [
      { ru: "Независимый Казахстан", kk: "Тәуелсіз Қазақстан", grade: 11, from: ["Независимый Казахстан"] },
      { ru: "Конституция 1995 года и политическая система", kk: "1995 жылғы Конституция және саяси жүйе", grade: 11, from: ["Конституция 1995 года и политическая система"] },
      { ru: "Экономические реформы 1990-х годов", kk: "1990 жылдардағы экономикалық реформалар", grade: 11, from: ["Экономические реформы 1990‑х годов", "Экономические реформы 1990-х годов"] },
      { ru: "Внешняя политика Казахстана", kk: "Қазақстанның сыртқы саясаты", grade: 11, from: ["Внешняя политика и интеграция в Евразию"] },
      { ru: "Культура и духовное наследие", kk: "Мәдениет және рухани мұра", grade: 11, from: ["Культурное наследие и национальная идентичность"] },
    ],
  },
];

async function main() {
  const a = args();
  const log = logger("curate-history");
  const subject = await prisma.subject.findUniqueOrThrow({ where: { slug: "history-kz" } });
  const topics = await prisma.topic.findMany({
    where: { module: { subjectId: subject.id } },
    include: { _count: { select: { questions: true, attempts: true, progress: true } } },
  });
  const used = new Set<string>();
  const oldModules = await prisma.module.findMany({ where: { subjectId: subject.id } });

  for (const [mi, m] of PLAN.entries()) {
    let mod = oldModules.find((x) => x.titleRu === m.ru);
    if (!a["dry-run"]) {
      mod = mod
        ? await prisma.module.update({ where: { id: mod.id }, data: { titleKk: m.kk, order: mi } })
        : await prisma.module.create({ data: { subjectId: subject.id, titleRu: m.ru, titleKk: m.kk, order: mi } });
    }
    for (const [ti, t] of m.topics.entries()) {
      const existing = topics.find((x) => !used.has(x.id) && (x.titleRu === t.ru || t.from?.includes(x.titleRu)));
      if (existing) used.add(existing.id);
      log(`${m.ru} / ${t.ru}${existing ? (existing.titleRu !== t.ru ? `  ← «${existing.titleRu}»` : "") : "  (новая)"}`);
      if (a["dry-run"]) continue;
      if (existing) {
        const renamed = existing.titleRu !== t.ru;
        await prisma.topic.update({
          where: { id: existing.id },
          // переименованная ИИ-тема получает новый конспект (старый мог быть о другом)
          data: { moduleId: mod!.id, titleRu: t.ru, titleKk: t.kk, grade: existing.grade ?? t.grade, order: ti, ...(renamed && existing.aiGenerated ? { theoryRu: "", theoryKk: "", summaryRu: "", summaryKk: "" } : {}) },
        });
      } else {
        await prisma.topic.create({ data: { moduleId: mod!.id, titleRu: t.ru, titleKk: t.kk, grade: t.grade, order: ti, aiGenerated: true, needsReviewKk: true } });
      }
    }
  }
  // лишние темы: удаляем только если по ним нет вопросов и попыток
  for (const t of topics.filter((x) => !used.has(x.id))) {
    const safe = t._count.questions === 0 && t._count.attempts === 0 && t._count.progress === 0;
    log(`лишняя тема «${t.titleRu}»: ${safe ? "удаляю" : "оставляю (есть вопросы/попытки)"}`);
    if (safe && !a["dry-run"]) await prisma.topic.delete({ where: { id: t.id } });
  }
  if (!a["dry-run"]) {
    const keep = new Set(PLAN.map((m) => m.ru));
    for (const m of await prisma.module.findMany({ where: { subjectId: subject.id }, include: { _count: { select: { topics: true } } } })) {
      if (!keep.has(m.titleRu) && m._count.topics === 0) await prisma.module.delete({ where: { id: m.id } });
    }
  }
  log("Готово. Дальше: build-curriculum --subject history-kz --theory-only, затем generate-questions --subject history-kz --only-empty");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
