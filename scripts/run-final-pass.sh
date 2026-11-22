#!/usr/bin/env bash
# Финальный проход после всех генераций: дописать пропущенное (конспекты, вопросы) и закрыть пробелы в казахском.
set -u
cd "$(dirname "$0")/.."
for f in logs/followup.out logs/extra.out; do
  while ! grep -qE "FOLLOWUP DONE|EXTRA DONE" "$f" 2>/dev/null; do sleep 30; done
done
npx tsx scripts/build-curriculum.ts --subject all --theory-only --delay 3000
for s in history-kz math-literacy reading-literacy; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 0; done
for s in math physics informatics biology chemistry geography world-history law english; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 2; done
npx tsx scripts/translate-kk.ts --what all --limit 500
echo "FINAL DONE"
