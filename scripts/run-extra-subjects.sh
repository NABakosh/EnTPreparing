#!/usr/bin/env bash
# Новые предметы ҰБТ: география, всемирная история, основы права, иностранный язык.
set -u
cd "$(dirname "$0")/.."
for s in geography world-history law english; do
  npx tsx scripts/build-curriculum.ts --subject "$s" --max-topics 22 --delay 2500
done
for s in geography world-history law english; do
  npx tsx scripts/generate-questions.ts --subject "$s" --only-empty --count 6 --multi 2 --delay 3000
done
echo "EXTRA DONE"
