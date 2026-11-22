#!/usr/bin/env bash
# После основного прогона: повтор неудавшегося + запас вопросов (до 14 на тему).
set -u
cd "$(dirname "$0")/.."
while ! grep -q "FULL GENERATION DONE" logs/full-generation.out 2>/dev/null; do sleep 30; done
# 1) пропущенные конспекты (в т. ч. новые темы истории после curate-history)
# структура истории задаётся вручную: scripts/curate-history.ts
npx tsx scripts/build-curriculum.ts --subject all --theory-only
# 2) вопросы для тем, где их ещё нет (новые темы истории и т. п.)
for s in history-kz math-literacy reading-literacy; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 0; done
for s in math physics informatics biology chemistry; do npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 2; done
# 3) запас: темы, где вопросов меньше 14, получают ещё порцию
for s in history-kz math-literacy reading-literacy; do npx tsx scripts/generate-questions.ts --subject "$s" --min 14 --count 6 --multi 0; done
for s in math physics informatics biology chemistry; do npx tsx scripts/generate-questions.ts --subject "$s" --min 14 --count 5 --multi 2; done
echo "FOLLOWUP DONE"
