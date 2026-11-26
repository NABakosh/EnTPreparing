import ExcelJS from "exceljs";

export type Row = Record<string, string>;

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}

function parseCsv(text: string): string[][] {
  const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

/** Читает первый лист xlsx или CSV в массив строк. Первая строка — заголовки. */
export async function readTable(file: File): Promise<{ headers: string[]; rows: string[][]; lines: number[] }> {
  const buf = Buffer.from(await file.arrayBuffer());
  let matrix: string[][];
  let nums: number[];
  if (file.name.toLowerCase().endsWith(".csv")) {
    matrix = parseCsv(buf.toString("utf8").replace(/^﻿/, ""));
    nums = matrix.map((_, i) => i + 1);
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return { headers: [], rows: [], lines: [] };
    matrix = [];
    nums = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      const vals: string[] = [];
      for (let i = 1; i <= ws.columnCount; i++) vals.push(cellText(r.getCell(i).value).trim());
      matrix.push(vals);
      nums.push(r.number);
    });
  }
  const keep = matrix.map((r, i) => [r, nums[i]] as const).filter(([r]) => r.some((c) => c.trim()));
  const [[headers = []] = [], ...rest] = keep;
  return {
    headers: headers.map((h) => h.trim().toLowerCase()),
    rows: rest.map(([r]) => r.map((c) => c.trim())),
    lines: rest.map(([, n]) => n),
  };
}

/** «Аты -  жөні», «аты-жөні», «Аты жөні» → «аты жөні». */
const normHeader = (s: string) => s.toLowerCase().replace(/[\s\-‐‑–—_]+/g, " ").trim();

/** Находит индекс колонки по списку возможных названий (кроме колонок из skip). */
export function col(headers: string[], names: string[], fallback: number, skip: number[] = []): number {
  const ns = names.map(normHeader);
  const i = headers.findIndex((h, idx) => !skip.includes(idx) && ns.some((n) => normHeader(h).includes(n)));
  return i >= 0 ? i : fallback;
}

/** Колонка с порядковым номером («№», «#», «n», «no»). */
export const isNumberHeader = (h: string) => /^(№|#|n|no|п\/п|№ п\/п)?\.?$/i.test(h.trim());

export async function buildXlsx(sheet: string, columns: string[], rows: (string | number)[][]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet);
  ws.addRow(columns).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 28));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf).toString("base64");
}
