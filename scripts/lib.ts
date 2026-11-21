import fs from "node:fs";
import path from "node:path";

/** Простой разбор аргументов: --key value | --flag */
export function args(): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const k = a[i].slice(2);
    if (a[i + 1] && !a[i + 1].startsWith("--")) out[k] = a[++i];
    else out[k] = true;
  }
  return out;
}

/** Лог в консоль и в logs/<name>-<дата>.log */
export function logger(name: string) {
  fs.mkdirSync("logs", { recursive: true });
  const file = path.join("logs", `${name}-${new Date().toISOString().slice(0, 10)}.log`);
  return (...parts: unknown[]) => {
    const line = `[${new Date().toISOString()}] ${parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join(" ")}`;
    console.log(line);
    fs.appendFileSync(file, line + "\n");
  };
}
