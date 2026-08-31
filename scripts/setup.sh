#!/usr/bin/env bash
set -euo pipefail

echo "→ ENT Preparing — локальная настройка"
echo ""

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env
  echo "✓ Создан .env с AUTH_SECRET"
  echo "  Укажите DATABASE_URL в .env (MongoDB Atlas)"
else
  echo "✓ .env уже существует"
fi

echo ""
echo "→ Установка зависимостей..."
npm install

echo ""
echo "→ Генерация Prisma Client..."
npx prisma generate

if grep -q 'mongodb+srv://<user>' .env 2>/dev/null; then
  echo ""
  echo "⚠ DATABASE_URL не настроен. Шаги:"
  echo "  1. Создайте кластер на https://cloud.mongodb.com"
  echo "  2. Скопируйте connection string в .env"
  echo "  3. Запустите: npm run db:push && npm run db:seed"
else
  echo ""
  echo "→ Применение схемы БД..."
  npm run db:push
  echo "→ Заполнение модулей..."
  npm run db:seed
fi

echo ""
echo "✓ Готово! Запустите: npm run dev"
