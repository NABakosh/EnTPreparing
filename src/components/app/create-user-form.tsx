"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CredentialsResult, type Cred } from "./credentials-result";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export function CreateUserForm({
  roles,
  classes,
  students,
}: {
  roles: Role[];
  classes: { id: string; name: string }[];
  /** для учителя: список своих учеников (выбор детей родителя) */
  students?: { id: string; fullName: string; className: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [role, setRole] = useState<Role>(roles[0]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ created: Cred[]; fileBase64: string | null } | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          start(async () => {
            const res = await createUserAction({
              fullName: fd.get("fullName"),
              role,
              classId: fd.get("classId") || null,
              subject: fd.get("subject") || null,
              teacherClassIds: fd.getAll("teacherClassIds"),
              parentFullName: fd.get("parentFullName") || null,
              childIds: fd.getAll("childIds"),
              childLogins: fd.get("childLogins") || null,
            });
            if (res.ok) {
              setResult(res.data);
              form.reset();
              router.refresh();
            } else toast.error(t(`errors.${res.error}`));
          });
        }}
      >
        {roles.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="cu-role">{t("admin.role")}</Label>
            <NativeSelect id="cu-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((r) => (
                <option key={r} value={r}>{t(`nav.roles.${r}`)}</option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="cu-name">{t("admin.fullName")}</Label>
          <Input id="cu-name" name="fullName" required minLength={3} maxLength={150} />
        </div>
        {role === "STUDENT" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cu-class">{t("admin.class")}</Label>
              {classes.length ? (
                <NativeSelect id="cu-class" name="classId" required>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
              ) : (
                <p className="text-sm text-destructive">{t("admin.noClasses")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-parent">{t("admin.parentName")}</Label>
              <Input id="cu-parent" name="parentFullName" maxLength={150} />
            </div>
          </>
        )}
        {role === "TEACHER" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cu-subject">{t("admin.subject")}</Label>
              <Input id="cu-subject" name="subject" maxLength={100} />
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">{t("admin.teacherClasses")}</legend>
              <div className="flex flex-wrap gap-3">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" name="teacherClassIds" value={c.id} className="size-4 accent-primary" /> {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {role === "PARENT" &&
          (students ? (
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">{t("admin.selectChildren")}</legend>
              <div className="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" name="childIds" value={s.id} className="size-4 accent-primary" /> {s.fullName} · {s.className}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cu-children">{t("admin.childLogins")}</Label>
              <Input id="cu-children" name="childLogins" required placeholder="ivanov.a, petrova.m" />
            </div>
          ))}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? t("common.loading") : t("common.create")}</Button>
        </div>
      </form>
      {result && <CredentialsResult creds={result.created} fileBase64={result.fileBase64} />}
    </div>
  );
}
