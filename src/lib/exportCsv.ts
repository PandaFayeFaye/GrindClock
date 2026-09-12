import type { Employer, TimeEntry } from "./types";
import { entryHours, entryPay } from "./pay";
import { downloadBlob } from "./shareImage";

/**
 * Exports a CSV (opens fine in Excel/Numbers/Sheets). FEATURE_SPEC calls for
 * an Excel/PDF choice -- a real .xlsx or .pdf needs a charting/writer library
 * this project doesn't otherwise carry, so this stays a plain CSV for now,
 * which covers the same "get my data out" need without the extra dependency.
 */
export function exportEntriesCsv(entries: TimeEntry[], employerById: Map<string, Employer>, filename: string) {
  const header = ["日期", "雇主", "开始时间", "结束时间", "时长(小时)", "收入(元)", "心情", "备注"];
  const rows = entries
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .map((e) => {
      const emp = employerById.get(e.employerId);
      const start = new Date(e.startTime);
      const end = e.endTime ? new Date(e.endTime) : null;
      return [
        start.toLocaleDateString(),
        emp?.name ?? "",
        start.toLocaleTimeString(),
        end ? end.toLocaleTimeString() : "",
        entryHours(e).toFixed(2),
        emp ? entryPay(emp, e).toFixed(2) : "",
        e.mood ?? "",
        (e.note ?? "").replace(/[\r\n,]+/g, " "),
      ];
    });

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  // BOM so Excel on Windows/macOS renders Chinese characters correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

function csvEscape(v: string) {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
