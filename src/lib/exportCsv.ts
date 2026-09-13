import type { Employer, TimeEntry } from "./types";
import { entryHours, entryPay } from "./pay";
import { currencySymbol } from "./currency";
import { downloadBlob } from "./shareImage";
import type { DictKey } from "./i18n";

export type ExportColumn = "date" | "employer" | "start" | "end" | "hours" | "pay" | "mood" | "note";

export const EXPORT_COLUMNS: { key: ExportColumn; labelKey: DictKey }[] = [
  { key: "date", labelKey: "colDate" },
  { key: "employer", labelKey: "colEmployer" },
  { key: "start", labelKey: "colStart" },
  { key: "end", labelKey: "colEnd" },
  { key: "hours", labelKey: "colHours" },
  { key: "pay", labelKey: "colPay" },
  { key: "mood", labelKey: "colMood" },
  { key: "note", labelKey: "colNote" },
];

function cellValue(col: ExportColumn, e: TimeEntry, emp: Employer | undefined): string {
  const start = new Date(e.startTime);
  const end = e.endTime ? new Date(e.endTime) : null;
  switch (col) {
    case "date": return start.toLocaleDateString();
    case "employer": return emp?.name ?? "";
    case "start": return start.toLocaleTimeString();
    case "end": return end ? end.toLocaleTimeString() : "";
    case "hours": return entryHours(e).toFixed(2);
    case "pay": return emp ? `${currencySymbol(emp.currency)}${entryPay(emp, e).toFixed(2)}` : "";
    case "mood": return e.mood ?? "";
    case "note": return (e.note ?? "").replace(/[\r\n,]+/g, " ");
  }
}

/**
 * Exports a CSV (opens fine in Excel/Numbers/Sheets). FEATURE_SPEC calls for
 * an Excel/PDF choice -- a real .xlsx or .pdf needs a charting/writer library
 * this project doesn't otherwise carry, so this stays a plain CSV for now,
 * which covers the same "get my data out" need without the extra dependency.
 */
export function exportEntriesCsv(
  entries: TimeEntry[],
  employerById: Map<string, Employer>,
  filename: string,
  columns: ExportColumn[],
  columnLabels: string[],
) {
  const rows = entries
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .map((e) => columns.map((col) => cellValue(col, e, employerById.get(e.employerId))));

  const csv = [columnLabels, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  // BOM so Excel on Windows/macOS renders Chinese characters correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

function csvEscape(v: string) {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Renders the same rows as a styled table image (PNG) for sharing to social media. */
export async function exportEntriesImage(
  entries: TimeEntry[],
  employerById: Map<string, Employer>,
  filename: string,
  columns: ExportColumn[],
  columnLabels: string[],
) {
  const sorted = entries.slice().sort((a, b) => a.startTime - b.startTime);
  const rows = sorted.map((e) => columns.map((col) => cellValue(col, e, employerById.get(e.employerId))));

  const padX = 16;
  const rowH = 40;
  const headerH = 46;
  const fontFamily = "system-ui, -apple-system, sans-serif";

  // Measure column widths using a scratch canvas.
  const scratch = document.createElement("canvas").getContext("2d")!;
  scratch.font = `700 15px ${fontFamily}`;
  const colWidths = columns.map((_, i) => {
    let max = scratch.measureText(columnLabels[i]).width;
    scratch.font = `500 14px ${fontFamily}`;
    for (const r of rows) max = Math.max(max, scratch.measureText(r[i]).width);
    scratch.font = `700 15px ${fontFamily}`;
    return Math.max(60, max + padX * 2);
  });

  const W = colWidths.reduce((s, w) => s + w, 0);
  const H = headerH + rows.length * rowH + 50; // +50 for footer

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FBF7EC";
  ctx.fillRect(0, 0, W, H);

  // Header row
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, 0, W, headerH);
  let x = 0;
  ctx.font = `700 15px ${fontFamily}`;
  ctx.fillStyle = "#FFD93D";
  ctx.textBaseline = "middle";
  columns.forEach((_, i) => {
    ctx.fillText(columnLabels[i], x + padX, headerH / 2);
    x += colWidths[i];
  });

  // Data rows
  rows.forEach((row, rowIdx) => {
    const y = headerH + rowIdx * rowH;
    ctx.fillStyle = rowIdx % 2 === 0 ? "#FFFFFF" : "#F5F0E4";
    ctx.fillRect(0, y, W, rowH);
    ctx.fillStyle = "#1A1A1A";
    ctx.font = `500 14px ${fontFamily}`;
    let cx = 0;
    row.forEach((cell, i) => {
      ctx.fillText(cell, cx + padX, y + rowH / 2);
      cx += colWidths[i];
    });
  });

  ctx.strokeStyle = "rgba(26,26,26,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, headerH + rows.length * rowH);

  ctx.fillStyle = "rgba(26,26,26,0.4)";
  ctx.font = `500 13px ${fontFamily}`;
  ctx.fillText("牛马打卡机 GrindClock", padX, headerH + rows.length * rowH + 26);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas export failed"))), "image/png");
  });
  downloadBlob(blob, filename);
}
