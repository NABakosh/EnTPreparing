// Использование: node scripts/i18n/merge.mjs <patch.json> — patch: { ru: {...}, kk: {...} }, глубокое слияние
import fs from "node:fs";
const patch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function merge(a, b) { for (const [k, v] of Object.entries(b)) { if (v && typeof v === "object" && !Array.isArray(v)) { a[k] = merge(a[k] ?? {}, v); } else a[k] = v; } return a; }
for (const lang of ["ru", "kk"]) {
  const p = `messages/${lang}.json`;
  const cur = JSON.parse(fs.readFileSync(p, "utf8"));
  fs.writeFileSync(p, JSON.stringify(merge(cur, patch[lang]), null, 2) + "\n");
}
// проверка паритета ключей
const flat = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, pre + k + ".") : [pre + k]));
const ru = new Set(flat(JSON.parse(fs.readFileSync("messages/ru.json", "utf8"))));
const kk = new Set(flat(JSON.parse(fs.readFileSync("messages/kk.json", "utf8"))));
const miss = [...ru].filter((k) => !kk.has(k)).map((k) => "kk missing " + k).concat([...kk].filter((k) => !ru.has(k)).map((k) => "ru missing " + k));
console.log(miss.length ? miss.join("\n") : "keys in sync");
