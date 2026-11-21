# ҰБТ Дайындық / Подготовка к ҰБТ

Бесплатная двуязычная (kk/ru) платформа подготовки школьников Казахстана к ҰБТ (ЕНТ).
Роли: ADMIN, TEACHER, STUDENT, PARENT. Обучение (предмет → модуль → тема), тесты по темам,
пробный экзамен в формате ҰБТ (120 заданий, 240 минут, 140 баллов), статистика, сертификат PDF
с QR-проверкой, ИИ-ментор, отвечающий только по фрагментам учебников (RAG на PostgreSQL FTS).

Стек: Next.js (App Router, `src/proxy.ts` вместо middleware) + React + TypeScript, Tailwind, shadcn/ui (base-ui),
lucide-react, PostgreSQL + Prisma 6, next-intl (cookie `NEXT_LOCALE`), jose + bcryptjs, recharts, pdf-lib, exceljs.

Структура:
- `src/server/**` — весь бэкенд (сервисы, авторизация, ИИ). Должен переноситься на отдельный Node-сервер.
- `src/server/services/*` — бизнес-логика. Route handlers и server actions в `src/app` — тонкие обёртки.
- `src/config/*` — константы (название сайта, схема баллов).
- `messages/kk.json`, `messages/ru.json` — все строки интерфейса.
- `prisma/` — схема, миграции, seed. `scripts/` — конвейер книг (ingest, generate, translate-kk).

Команды: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run seed`,
`npm run db:migrate`. Локальная БД: `docker compose up -d` (порт 5433).

## Правила
- Интерфейс и контент только на двух языках (kk, ru), строки только через i18n.
- Mobile-first. Только настоящие button/a/label, контраст текста не ниже 4.5:1.
- Права проверяются на сервере в каждом обработчике. Ученик не видит чужие данные, учитель только свой класс, родитель только своих детей.
- Пароли только хэш (bcryptjs). Никаких ИИН. Секреты только в env, не в git, .env.example обязателен.
- Вопросы, созданные ИИ, всегда draft. Ученикам показываются только published.
- ИИ-ментор отвечает только по найденным фрагментам учебников и указывает источник.
- Папки resources/ и .env* в .gitignore. Учебники не коммитить.
- Бизнес-логика в src/server/services, route handlers тонкие.
- Решения по умолчанию записывай в DECISIONS.md, недоделки в KNOWN-ISSUES.md.
- Не добавляй функции, которых нет в ТЗ.
- После каждого этапа: `npm run lint && npm run typecheck && npm run build`, затем commit.

@AGENTS.md
