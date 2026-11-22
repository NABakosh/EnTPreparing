#!/usr/bin/env bash
# Вся генерация одной очередью (без параллельных запросов — иначе Cerebras отвечает 429).
# Каждый шаг делает только то, чего ещё нет, поэтому скрипт можно перезапускать.
set -u
cd "$(dirname "$0")/.."
D=4000
MANDATORY="history-kz math-literacy reading-literacy"
PROFILE="math physics informatics biology chemistry geography world-history law english"
step() { echo "### $(date +%H:%M) $*"; }

step "1. структура новых предметов (существующие темы не дублируются)"
for s in world-history english; do npx tsx scripts/build-curriculum.ts --subject "$s" --max-topics 22 --delay $D; done

for pass in 1 2; do
  step "2.$pass недостающие конспекты"
  npx tsx scripts/build-curriculum.ts --subject all --theory-only --delay $D
  step "3.$pass вопросы для тем без ИИ-вопросов"
  for s in $MANDATORY; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 0 --delay $D; done
  for s in $PROFILE; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 2 --delay $D; done
done

step "4. казахский: закрыть пробелы"
npx tsx scripts/translate-kk.ts --what all --limit 500

step "5. запас вопросов (до 14 на тему)"
for s in $MANDATORY; do npx tsx scripts/generate-questions.ts --subject "$s" --min 14 --count 6 --multi 0 --delay $D; done
for s in $PROFILE; do npx tsx scripts/generate-questions.ts --subject "$s" --min 14 --count 5 --multi 2 --delay $D; done

step "ALL DONE"
