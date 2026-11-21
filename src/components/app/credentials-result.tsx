"use client";

import { useTranslations } from "next-intl";
import { Download, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Cred = { fullName: string; role: string; className: string; login: string; password: string };

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CredentialsResult({ creds, fileBase64 }: { creds: Cred[]; fileBase64: string | null }) {
  const t = useTranslations();
  if (!creds.length) return null;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return (
    <div className="space-y-3 rounded-2xl border-2 border-warning/40 bg-warning/5 p-4">
      <h3 className="font-semibold">{t("admin.credentialsTitle")}</h3>
      <p className="flex gap-2 text-sm text-foreground">
        <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
        {t("admin.credentialsWarning")}
      </p>
      <div className="flex flex-wrap gap-2">
        {fileBase64 && (
          <Button
            type="button"
            onClick={() => {
              const bin = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
              download(`logins-${stamp}.xlsx`, new Blob([bin], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
            }}
          >
            <Download aria-hidden /> {t("admin.downloadXlsx")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
            const csv = ["ФИО;Роль;Класс;Логин;Пароль", ...creds.map((c) => [c.fullName, t(`nav.roles.${c.role}`), c.className, c.login, c.password].map(esc).join(";"))].join("\r\n");
            download(`logins-${stamp}.csv`, new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
          }}
        >
          <Download aria-hidden /> {t("admin.downloadCsv")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("admin.fullName")}</th>
              <th className="py-2 pr-3 font-medium">{t("admin.role")}</th>
              <th className="py-2 pr-3 font-medium">{t("admin.login")}</th>
              <th className="py-2 font-medium">{t("auth.password")}</th>
            </tr>
          </thead>
          <tbody>
            {creds.map((c) => (
              <tr key={c.login} className="border-t">
                <td className="py-2 pr-3">{c.fullName}</td>
                <td className="py-2 pr-3">{t(`nav.roles.${c.role}`)}</td>
                <td className="py-2 pr-3 font-mono">{c.login}</td>
                <td className="py-2 font-mono font-semibold">{c.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
