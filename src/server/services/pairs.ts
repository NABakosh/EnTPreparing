import type { Locale } from "@/config/site";
import { pickText } from "@/server/lib/i18n-fields";
import { listProfilePairs } from "./catalog";

export async function pairOptions(locale: Locale) {
  const pairs = await listProfilePairs();
  return pairs.map((p) => ({ id: p.id, name: `${pickText(p.subject1, "name", locale)} — ${pickText(p.subject2, "name", locale)}` }));
}
