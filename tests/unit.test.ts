import { describe, expect, it } from "vitest";
import { scoreAnswer } from "@/config/scoring";
import { generatePassword } from "@/server/auth/password";
import { loginBaseFromFullName, translit } from "@/server/lib/translit";
import { normalizeClassName } from "@/server/services/users";
import { pick } from "@/server/lib/i18n-fields";

describe("scoring", () => {
  it("single", () => {
    expect(scoreAnswer("SINGLE", [2], [2])).toEqual({ points: 1, isCorrect: true });
    expect(scoreAnswer("SINGLE", [2], [1])).toEqual({ points: 0, isCorrect: false });
    expect(scoreAnswer("SINGLE", [2], [])).toEqual({ points: 0, isCorrect: false });
    expect(scoreAnswer("SINGLE", [2], [1, 2])).toEqual({ points: 0, isCorrect: false });
  });
  it("multiple: 2 / 1 / 0", () => {
    expect(scoreAnswer("MULTIPLE", [0, 1], [1, 0])).toEqual({ points: 2, isCorrect: true });
    expect(scoreAnswer("MULTIPLE", [0, 1], [0])).toEqual({ points: 1, isCorrect: false });
    expect(scoreAnswer("MULTIPLE", [0, 1], [0, 1, 2])).toEqual({ points: 1, isCorrect: false });
    expect(scoreAnswer("MULTIPLE", [0, 1], [2, 3])).toEqual({ points: 0, isCorrect: false });
    expect(scoreAnswer("MULTIPLE", [0, 1], [])).toEqual({ points: 0, isCorrect: false });
  });
});

describe("passwords", () => {
  it("8 chars, no look-alikes", () => {
    for (let i = 0; i < 500; i++) {
      const p = generatePassword();
      expect(p).toHaveLength(8);
      expect(p).not.toMatch(/[O0lI1]/);
      expect(p).toMatch(/\d/);
    }
  });
});

describe("logins", () => {
  it("transliterates ru and kk", () => {
    expect(translit("Әбілқайыр")).toBe("abilqayyr");
    expect(loginBaseFromFullName("Иванов Асет Болатович")).toBe("ivanov.a");
    expect(loginBaseFromFullName("Жұмабаев Ұлан")).toBe("zhumabaev.u");
    expect(loginBaseFromFullName("Ким")).toBe("kim");
  });
  it("normalizes class names", () => {
    expect(normalizeClassName("11 а")).toEqual({ name: "11А", grade: 11 });
    expect(normalizeClassName("9Б")).toEqual({ name: "9Б", grade: 9 });
    expect(normalizeClassName("A11")).toBeNull();
    expect(normalizeClassName("15А")).toBeNull();
  });
});

describe("i18n fields", () => {
  it("falls back to ru when kk empty", () => {
    expect(pick({ titleRu: "Тема", titleKk: "" }, "title", "kk")).toEqual({ text: "Тема", fallback: true });
    expect(pick({ titleRu: "Тема", titleKk: "Тақырып" }, "title", "kk")).toEqual({ text: "Тақырып", fallback: false });
  });
});

describe("sheets.col: заголовки с пробелами вокруг дефиса", async () => {
  const { col, isNumberHeader } = await import("@/server/lib/sheets");
  it("«Оқушының аты -  жөні» не путается с колонкой родителя и «№»", () => {
    const headers = ["№", "оқушының аты -  жөні", "сынып", "ата-анасының аты-жөні"];
    const cls = col(headers, ["класс", "сынып"], -1);
    const parent = col(headers, ["родител", "ата ана"], -1, [cls]);
    const name = col(headers, ["фио уч", "оқушы", "ученик", "фио", "аты жөні"], 0, [cls, parent]);
    expect([name, cls, parent]).toEqual([1, 2, 3]);
    expect(isNumberHeader("№")).toBe(true);
    expect(isNumberHeader("фио")).toBe(false);
  });
});
