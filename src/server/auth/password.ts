import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

/** Алфавит без похожих символов: нет O/0, l/1/I */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  // гарантируем хотя бы одну цифру
  if (!/\d/.test(out)) out = out.slice(0, -1) + "23456789"[randomInt(8)];
  return out;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
