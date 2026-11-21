import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Panel } from "@/components/app/page-header";
import { CreateUserForm } from "@/components/app/create-user-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Locale } from "@/config/site";
import { fmtDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/current";
import { listClasses } from "@/server/services/classes";
import { listUsers } from "@/server/services/users";
import { UserActions } from "./user-actions";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requirePageUser("ADMIN");
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const classId = typeof sp.classId === "string" ? sp.classId : "";
  const page = Number(sp.page) || 1;
  const [{ items, pages, total }, classes] = await Promise.all([listUsers(actor, { q, role, classId, page }), listClasses(actor)]);
  const qs = (p: number) => `/admin/users?${new URLSearchParams({ q, role, classId, page: String(p) })}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.usersTitle")} description={`${total}`} actions={<Link href="/admin/import" className={buttonVariants({ variant: "outline" })}>{t("nav.import")}</Link>} />
      <Panel title={t("admin.createUser")}>
        <CreateUserForm roles={["STUDENT", "TEACHER", "PARENT", "ADMIN"]} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
      </Panel>
      <form className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_180px_140px_auto]" role="search">
        <label className="sr-only" htmlFor="u-q">{t("common.search")}</label>
        <Input id="u-q" name="q" defaultValue={q} placeholder={t("admin.searchPlaceholder")} />
        <label className="sr-only" htmlFor="u-role">{t("admin.roleFilter")}</label>
        <NativeSelect id="u-role" name="role" defaultValue={role}>
          <option value="">{t("admin.roleFilter")}: {t("common.all")}</option>
          {(["STUDENT", "TEACHER", "PARENT", "ADMIN"] as const).map((r) => (
            <option key={r} value={r}>{t(`nav.roles.${r}`)}</option>
          ))}
        </NativeSelect>
        <label className="sr-only" htmlFor="u-class">{t("admin.classFilter")}</label>
        <NativeSelect id="u-class" name="classId" defaultValue={classId}>
          <option value="">{t("admin.classFilter")}: {t("common.all")}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <Button type="submit">{t("admin.find")}</Button>
      </form>
      {items.length === 0 ? (
        <EmptyState text={t("common.noData")} />
      ) : (
        <ul className="space-y-3">
          {items.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.fullName}</span>
                  <Badge variant="secondary">{t(`nav.roles.${u.role}`)}</Badge>
                  {!u.active && <Badge variant="destructive">{t("admin.blocked")}</Badge>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono">{u.login}</span>
                  {u.class && <> · {u.class.name}</>}
                  {u.teachingClasses.length > 0 && <> · {u.teachingClasses.map((c) => c.name).join(", ")}</>}
                  {u.subject && <> · {u.subject}</>}
                  {u.children.length > 0 && <> · {t("admin.children")}: {u.children.map((c) => c.child.fullName).join(", ")}</>}
                  {" · "}
                  {t("admin.lastLogin")}: {u.lastLoginAt ? fmtDate(u.lastLoginAt, locale, true) : t("admin.never")}
                </div>
              </div>
              {u.id !== actor.id && <UserActions id={u.id} active={u.active} />}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label={t("common.page", { page, pages })}>
          {page > 1 ? <Link className={buttonVariants({ variant: "outline" })} href={qs(page - 1)}>{t("common.prev")}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link className={buttonVariants({ variant: "outline" })} href={qs(page + 1)}>{t("common.next")}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
