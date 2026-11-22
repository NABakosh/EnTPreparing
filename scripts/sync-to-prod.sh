#!/usr/bin/env bash
# Копирует ВСЕ данные из локальной базы (docker compose) в продакшн-базу.
# ВНИМАНИЕ: данные продакшна заменяются полностью (пользователи, попытки тоже). Использовать до запуска для реальных учеников.
#   PROD_URL="postgresql://…(unpooled)" ./scripts/sync-to-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PROD_URL:?Укажите PROD_URL (прямое подключение к продакшн-базе)}"
DUMP=$(mktemp)
docker compose exec -T db pg_dump -U ubt -d ubt --data-only --no-owner --no-privileges --exclude-table=_prisma_migrations > "$DUMP"
TABLES=$(docker compose exec -T db psql -U ubt -d ubt -tAc "select string_agg(format('%I', tablename), ', ') from pg_tables where schemaname='public' and tablename <> '_prisma_migrations'")
psql "$PROD_URL" -v ON_ERROR_STOP=1 -q -c "TRUNCATE $TABLES CASCADE"
psql "$PROD_URL" -v ON_ERROR_STOP=1 -q -f "$DUMP"
rm -f "$DUMP"
echo "Синхронизировано."
