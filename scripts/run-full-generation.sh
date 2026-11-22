#!/usr/bin/env bash
# Полный прогон: структура и конспекты для всех предметов, затем вопросы-черновики.
set -u
cd "$(dirname "$0")/.."
npx tsx scripts/build-curriculum.ts --subject all --max-topics 24
for s in history-kz math-literacy reading-literacy; do
  npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 0 --lang both
done
for s in math physics informatics biology chemistry; do
  npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 2 --lang both
done
echo "FULL GENERATION DONE"
