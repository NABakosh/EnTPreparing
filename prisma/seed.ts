import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { history } from "./seed/history";
import { reading } from "./seed/reading";
import { informatics, math, mathLiteracy, physics } from "./seed/procedural";
import type { SeedSubject } from "./seed/types";
import { seedActivity } from "./seed/activity";

const prisma = new PrismaClient();
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const genPw = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const credentials: { login: string; password: string; role: string; fullName: string }[] = [];

async function upsertUser(login: string, fullName: string, role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT", password: string, extra: { classId?: string; subject?: string } = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const u = await prisma.user.upsert({
    where: { login },
    create: { login, fullName, role, passwordHash, mustChangePassword: false, ...extra },
    update: { fullName, role, passwordHash, active: true, ...extra },
  });
  credentials.push({ login, password, role, fullName });
  return u;
}

async function seedSubject(s: SeedSubject) {
  const subject = await prisma.subject.upsert({
    where: { slug: s.slug },
    create: { slug: s.slug, nameRu: s.nameRu, nameKk: s.nameKk, mandatory: s.mandatory, order: s.order },
    update: { nameRu: s.nameRu, nameKk: s.nameKk, mandatory: s.mandatory, order: s.order },
  });
  const existing = await prisma.module.count({ where: { subjectId: subject.id } });
  if (existing > 0) {
    console.log(`  ${s.slug}: модули уже есть, пропускаю контент`);
    return subject;
  }
  let qCount = 0;
  for (const [mi, m] of s.modules.entries()) {
    const mod = await prisma.module.create({ data: { subjectId: subject.id, titleRu: m.titleRu, titleKk: m.titleKk, order: mi } });
    for (const [ti, t] of m.topics.entries()) {
      const topic = await prisma.topic.create({
        data: {
          moduleId: mod.id,
          titleRu: t.titleRu,
          titleKk: t.titleKk,
          theoryRu: t.theoryRu,
          theoryKk: t.theoryKk,
          summaryRu: t.summaryRu,
          summaryKk: t.summaryKk,
          grade: t.grade ?? null,
          order: ti,
        },
      });
      await prisma.question.createMany({
        data: t.questions.map((qq) => ({
          topicId: topic.id,
          subjectId: subject.id,
          textRu: qq.textRu,
          textKk: qq.textKk,
          options: qq.options,
          correct: qq.correct,
          type: qq.type,
          explanationRu: qq.explanationRu,
          explanationKk: qq.explanationKk,
          status: "PUBLISHED" as const,
          source: "ДЕМО (seed)",
          isDemo: true,
        })),
      });
      qCount += t.questions.length;
    }
  }
  console.log(`  ${s.slug}: ${s.modules.length} модуля, ${qCount} демо-вопросов`);
  return subject;
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 6) throw new Error("Задайте SEED_ADMIN_PASSWORD (мин. 6 символов) в .env");
  const demoPassword = process.env.SEED_DEMO_PASSWORD;

  console.log("Предметы и контент…");
  const subjects: Record<string, string> = {};
  for (const s of [history, mathLiteracy, reading, math, physics, informatics]) {
    subjects[s.slug] = (await seedSubject(s)).id;
  }

  console.log("Профильные пары и шаблон экзамена…");
  const pairs: [string, string][] = [
    ["math", "physics"],
    ["math", "informatics"],
  ];
  for (const [i, [a, b]] of pairs.entries()) {
    await prisma.profilePair.upsert({
      where: { subject1Id_subject2Id: { subject1Id: subjects[a], subject2Id: subjects[b] } },
      create: { subject1Id: subjects[a], subject2Id: subjects[b], order: i },
      update: {},
    });
  }
  const tpl = await prisma.examTemplate.upsert({
    where: { slug: "ubt" },
    create: { slug: "ubt", nameRu: "Пробный ҰБТ", nameKk: "Сынақ ҰБТ", durationMin: 240 },
    update: {},
  });
  if ((await prisma.examSection.count({ where: { templateId: tpl.id } })) === 0) {
    await prisma.examSection.createMany({
      data: [
        { templateId: tpl.id, slot: "FIXED", subjectId: subjects["history-kz"], singleCount: 20, multipleCount: 0, order: 0 },
        { templateId: tpl.id, slot: "FIXED", subjectId: subjects["math-literacy"], singleCount: 10, multipleCount: 0, order: 1 },
        { templateId: tpl.id, slot: "FIXED", subjectId: subjects["reading-literacy"], singleCount: 10, multipleCount: 0, order: 2 },
        { templateId: tpl.id, slot: "PROFILE_1", singleCount: 30, multipleCount: 10, order: 3 },
        { templateId: tpl.id, slot: "PROFILE_2", singleCount: 30, multipleCount: 10, order: 4 },
      ],
    });
  }

  console.log("Пользователи…");
  await upsertUser("admin", "Администратор", "ADMIN", adminPassword);
  const cls = await prisma.class.upsert({ where: { name: "11А" }, create: { name: "11А", grade: 11 }, update: {} });
  const teacher = await upsertUser("teacher", "Сейткали Айгерим Маратовна", "TEACHER", demoPassword ?? genPw(), { subject: "Математика" });
  await prisma.class.update({ where: { id: cls.id }, data: { teachers: { connect: { id: teacher.id } } } });
  const pairMP = await prisma.profilePair.findFirstOrThrow({ where: { subject1Id: subjects.math, subject2Id: subjects.physics } });
  const studentNames = [
    ["student1", "Ахметов Нурлан Ерланович"],
    ["student2", "Иванова Дарья Сергеевна"],
    ["student3", "Касымова Аружан Бахытовна"],
    ["student4", "Ким Артём Олегович"],
    ["student5", "Серикбаев Алихан Талгатович"],
  ];
  const students = [];
  for (const [login, name] of studentNames) {
    const s = await upsertUser(login, name, "STUDENT", demoPassword ?? genPw(), { classId: cls.id });
    await prisma.user.update({ where: { id: s.id }, data: { profilePairId: pairMP.id } });
    students.push(s);
  }
  const parent = await upsertUser("parent", "Ахметова Гульнара Кайратовна", "PARENT", demoPassword ?? genPw());
  for (const child of students.slice(0, 2)) {
    await prisma.parentChild.upsert({
      where: { parentId_childId: { parentId: parent.id, childId: child.id } },
      create: { parentId: parent.id, childId: child.id },
      update: {},
    });
  }

  console.log("Настройки, FAQ, новости…");
  const settings: Record<string, unknown> = {
    ubtDate: "2027-05-20T09:00:00+05:00",
    moduleThreshold: 60,
    socials: { instagram: "", telegram: "", youtube: "", tiktok: "", whatsapp: "" },
    contacts: { email: "", phone: "", addressRu: "", addressKk: "" },
    faq: [
      { qRu: "Платформа действительно бесплатная?", qKk: "Платформа шынымен тегін бе?", aRu: "Да. Все материалы, тесты, пробные экзамены и ИИ-ментор бесплатны для учеников, учителей и родителей.", aKk: "Иә. Барлық материалдар, тесттер, сынақ емтихандар және ЖИ-ментор оқушылар, мұғалімдер мен ата-аналар үшін тегін." },
      { qRu: "Как получить логин и пароль?", qKk: "Логин мен құпиясөзді қалай алуға болады?", aRu: "Аккаунты создают учитель или администратор школы. Обратитесь к классному руководителю — он выдаст логин и временный пароль.", aKk: "Аккаунттарды мұғалім немесе мектеп әкімшісі ашады. Сынып жетекшісіне хабарласыңыз — ол логин мен уақытша құпиясөз береді." },
      { qRu: "Чем пробный экзамен отличается от тестов по темам?", qKk: "Сынақ емтиханның тақырыптық тесттерден айырмашылығы неде?", aRu: "Пробный экзамен повторяет структуру ҰБТ: 120 заданий, 240 минут, максимум 140 баллов. Ответы автоматически сохраняются, а результат появляется в статистике.", aKk: "Сынақ емтихан ҰБТ құрылымын қайталайды: 120 тапсырма, 240 минут, ең көбі 140 балл. Жауаптар автоматты түрде сақталады, ал нәтиже статистикада көрінеді." },
      { qRu: "Откуда ИИ-ментор берёт ответы?", qKk: "ЖИ-ментор жауаптарды қайдан алады?", aRu: "Только из фрагментов школьных учебников, загруженных на платформу. В каждом ответе указан источник: учебник, класс и страница.", aKk: "Тек платформаға жүктелген мектеп оқулықтарының үзінділерінен. Әр жауапта дереккөзі көрсетіледі: оқулық, сынып және бет." },
      { qRu: "Как получить сертификат?", qKk: "Сертификатты қалай алуға болады?", aRu: "Пройдите все темы модулей своей программы с результатом не ниже порога (по умолчанию 60%). Сертификат в PDF можно проверить по QR-коду.", aKk: "Бағдарламаңыздағы модульдердің барлық тақырыбын шекті мәннен төмен емес нәтижемен өтіңіз (әдепкі бойынша 60%). PDF сертификатты QR-код арқылы тексеруге болады." },
      { qRu: "Могут ли родители следить за прогрессом?", qKk: "Ата-аналар прогресті бақылай ала ма?", aRu: "Да, родитель получает отдельный аккаунт и видит прогресс и результаты своих детей.", aKk: "Иә, ата-ана жеке аккаунт алып, балаларының прогресі мен нәтижелерін көреді." },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }

  const now = Date.now();
  const news = [
    {
      slug: "platforma-zapuschena",
      titleRu: "Платформа подготовки к ҰБТ запущена",
      titleKk: "ҰБТ-ға дайындық платформасы іске қосылды",
      excerptRu: "Теория, тесты в формате ҰБТ, пробные экзамены и ИИ-ментор — теперь в одном месте и бесплатно.",
      excerptKk: "Теория, ҰБТ форматындағы тесттер, сынақ емтихандар және ЖИ-ментор — енді бір жерде және тегін.",
      bodyRu: "<p>Мы открыли бесплатную платформу для подготовки к Единому национальному тестированию. Ученики могут изучать теорию по темам, решать тесты с мгновенным разбором и сдавать пробные экзамены в формате ҰБТ.</p><p>Аккаунты выдают учителя и администраторы школ.</p>",
      bodyKk: "<p>Біз Ұлттық бірыңғай тестілеуге дайындалуға арналған тегін платформаны аштық. Оқушылар тақырыптар бойынша теорияны оқып, бірден талданатын тесттер шешіп, ҰБТ форматындағы сынақ емтихандарын тапсыра алады.</p><p>Аккаунттарды мектеп мұғалімдері мен әкімшілері береді.</p>",
      publishedAt: new Date(now - 2 * 86400000),
    },
    {
      slug: "probnyy-ubt-240-minut",
      titleRu: "Пробный ҰБТ: 120 заданий за 240 минут",
      titleKk: "Сынақ ҰБТ: 240 минутта 120 тапсырма",
      excerptRu: "Как устроен пробный экзамен и почему важно проходить его целиком.",
      excerptKk: "Сынақ емтихан қалай құрылған және оны неге толық өту маңызды.",
      bodyRu: "<p>Пробный экзамен включает историю Казахстана (20 заданий), математическую грамотность (10), грамотность чтения (10) и два профильных предмета по 40 заданий.</p><ul><li>Ответы сохраняются автоматически.</li><li>К любому вопросу можно вернуться.</li><li>После завершения — подробный разбор ошибок.</li></ul>",
      bodyKk: "<p>Сынақ емтиханға Қазақстан тарихы (20 тапсырма), математикалық сауаттылық (10), оқу сауаттылығы (10) және әрқайсысы 40 тапсырмадан тұратын екі бейіндік пән кіреді.</p><ul><li>Жауаптар автоматты түрде сақталады.</li><li>Кез келген сұраққа қайта оралуға болады.</li><li>Аяқтағаннан кейін — қателерді толық талдау.</li></ul>",
      publishedAt: new Date(now - 5 * 86400000),
    },
    {
      slug: "ii-mentor-po-uchebnikam",
      titleRu: "ИИ-ментор отвечает по школьным учебникам",
      titleKk: "ЖИ-ментор мектеп оқулықтары бойынша жауап береді",
      excerptRu: "Ментор находит ответ в учебниках и всегда указывает страницу. Если ответа нет — честно скажет об этом.",
      excerptKk: "Ментор жауапты оқулықтардан тауып, әрқашан бетін көрсетеді. Жауап болмаса — мұны адал айтады.",
      bodyRu: "<p>ИИ-ментор помогает разобраться в сложных темах. Он отвечает только по фрагментам учебников и не выдумывает факты.</p><p>Задать вопрос можно на странице любой темы или в разделе «ИИ-ментор».</p>",
      bodyKk: "<p>ЖИ-ментор күрделі тақырыптарды түсінуге көмектеседі. Ол тек оқулық үзінділері бойынша жауап береді және деректерді ойдан шығармайды.</p><p>Сұрақты кез келген тақырып бетінде немесе «ЖИ-ментор» бөлімінде қоюға болады.</p>",
      publishedAt: new Date(now - 9 * 86400000),
    },
  ];
  for (const n of news) {
    await prisma.news.upsert({ where: { slug: n.slug }, create: { ...n, status: "PUBLISHED" }, update: {} });
  }

  if (process.env.SEED_ACTIVITY !== "0") {
    console.log("Демо-активность учеников (тесты и пробные экзамены)…");
    await seedActivity(prisma);
  }

  console.log("\nДемо-аккаунты (сохраните, пароли не хранятся в открытом виде):");
  console.table(credentials.map((c) => ({ login: c.login, password: c.role === "ADMIN" ? "(SEED_ADMIN_PASSWORD)" : c.password, role: c.role, name: c.fullName })));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
