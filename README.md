# ENT Preparing — ҰБТ-ға дайындық / подготовка к ҰБТ

Бесплатная двуязычная (казахский/русский) платформа подготовки школьников к ҰБТ:
теория по темам, тесты в формате ҰБТ с разбором, пробный экзамен (120 заданий, 240 минут, 140 баллов),
статистика, сертификат PDF с QR-проверкой, ИИ-ментор по учебникам. Роли: администратор, учитель, ученик, родитель.

Стек: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn/ui · PostgreSQL + Prisma 6 · next-intl · jose/bcryptjs · recharts · pdf-lib · exceljs.

## Быстрый старт (локально)

Требуется Node.js 22+ и Docker.

```bash
cp .env.example .env          # задайте JWT_SECRET, SEED_ADMIN_PASSWORD, при желании SEED_DEMO_PASSWORD
docker compose up -d          # Postgres на localhost:5433
npm install
npm run db:deploy             # применить миграции
npm run seed                  # демо-данные: предметы, темы, вопросы, пользователи, новости, активность
npm run dev                   # http://localhost:3000
```

Демо-аккаунты после `npm run seed`: `admin` (пароль из `SEED_ADMIN_PASSWORD`), `teacher`, `student1`…`student5`, `parent`
(пароль из `SEED_DEMO_PASSWORD`, иначе случайный — печатается в консоль). Демо-вопросы помечены «ДЕМО».

Проверки: `npm run lint && npm run typecheck && npm run build`, тесты: `npm test` (нужна локальная БД с seed).

> После изменения `messages/*.json` перезапустите `npm run dev` — dev-сервер кэширует файлы переводов.

## Деплой на Vercel

1. Создайте базу Postgres (например, бесплатный Neon). Возьмите две строки подключения: pooled → `DATABASE_URL`, direct → `DIRECT_URL`.
2. Импортируйте репозиторий в Vercel (Framework: Next.js). Скрипт `vercel-build` сам выполнит `prisma generate`, `prisma migrate deploy` и `next build`.
3. В Settings → Environment Variables добавьте все переменные из `.env.example`:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (`openssl rand -base64 48`), `NEXT_PUBLIC_SITE_URL` (адрес сайта — для QR в сертификате),
   `AI_PROVIDER`, `CEREBRAS_API_KEY` (или `OPENAI_API_KEY`), при необходимости `MENTOR_RATE_LIMIT_PER_HOUR`, `AI_TIMEOUT_MS`.
4. Один раз заполните базу с локальной машины: `DATABASE_URL=<direct url> SEED_ADMIN_PASSWORD=... npm run seed`
   (`SEED_ACTIVITY=0` — без демо-активности учеников).
5. Войдите как `admin`, смените пароль, задайте в «Настройках» дату ҰБТ, контакты, соцсети, FAQ.

## Работа с контентом

- **Пользователи**: «Пользователи» (вручную) и «Импорт Excel». Ученики: колонки `ФИО, Класс, ФИО родителя`;
  учителя: `ФИО, Предмет, Класс`. После импорта скачайте файл с логинами и паролями — пароли видны только в этот момент.
- **Предметы/модули/темы**: «Предметы и темы» (теория — markdown на двух языках).
- **Вопросы**: «Вопросы» → создание, импорт из Excel/CSV (шаблон: `/templates/questions-template.csv`).
  Импортированные и ИИ-вопросы попадают в черновики → «Проверка вопросов» → «Опубликовать». Ученики видят только опубликованные.
- **Пробный экзамен**: «Экзамен и профили» — профильные пары и число заданий в разделах.

## Учебники и ИИ-ментор (RAG)

```bash
npm run ingest-books -- --dir /путь/к/books [--replace] [--dry-run]
npm run generate-questions -- --subject history-kz --count 5 [--topic <id>] [--lang ru|kk|both]
npm run translate-kk -- --what all --limit 20
npm run build-curriculum -- --subject all        # недостающие темы ҰБТ + конспекты по учебникам
./scripts/run-full-generation.sh                 # всё сразу: темы, конспекты, вопросы по всем предметам
```

- Сейчас книги загружаются из OCR-текстов: `npm run ingest-books -- --dir ~/Documents/bookcatalog/texts --replace`
  (YAML-заголовок файла: класс, предмет, авторы, год, часть; страницы — маркеры `<!-- стр. N -->`). Английский язык пропускается (`--skip`).
- Другая структура тоже поддерживается: `<класс>_класс/<предмет>/часть_N/NNN.md` (NNN — страница), см. `scripts/ingest-books.ts`.
- Соответствие папок предметов и предметов платформы: `src/config/book-subjects.ts`.
- Поиск — PostgreSQL FTS (`tsvector`, конфигурация `russian`) по таблице `BookChunk`; ментор отвечает только по найденным фрагментам и указывает источник.
- Логи скриптов — в `logs/`.

## Структура

```
src/server/        весь бэкенд (переносится на отдельный Node-сервер)
  services/        бизнес-логика и проверка прав
  auth/            JWT-сессии, пароли, текущий пользователь
  ai/              провайдер (Cerebras/OpenAI), поиск по книгам
src/app/           страницы (App Router), server actions (actions/), route handlers (api/)
src/components/    UI (ui/ — shadcn, app/, learn/, site/)
src/config/        название сайта, схема баллов, соответствие предметов книг
messages/          строки интерфейса kk/ru
prisma/            схема, миграции, seed
scripts/           конвейер книг и i18n-утилита
tests/             vitest (юнит + интеграционные с БД)
```

Решения по умолчанию — `DECISIONS.md`, известные недоработки — `KNOWN-ISSUES.md`.
