/** Транслитерация кириллицы (рус + каз) в латиницу для логинов. */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "q", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

export function translit(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

/** «Иванов Асет Болатович» → «ivanov.a» */
export function loginBaseFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const last = translit(parts[0] ?? "") || "user";
  const first = translit(parts[1] ?? "");
  return first ? `${last}.${first[0]}` : last;
}

export function slugify(s: string): string {
  return translit(s.replace(/\s+/g, "-")).slice(0, 60) || "item";
}
