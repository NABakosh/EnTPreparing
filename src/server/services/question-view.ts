import type { Locale } from "@/config/site";
import type { CurrentUser } from "@/server/auth/current";
import { pickText } from "@/server/lib/i18n-fields";
import { topicOptions } from "./content";

/** Список тем «Предмет · Тема» для редактора вопросов. */
export async function topicSelectOptions(actor: CurrentUser, locale: Locale) {
  const topics = await topicOptions(actor);
  return topics.map((t) => ({ id: t.id, label: `${pickText(t.module.subject, "name", locale)} · ${pickText(t, "title", locale)}`, subjectId: t.module.subject.id }));
}
