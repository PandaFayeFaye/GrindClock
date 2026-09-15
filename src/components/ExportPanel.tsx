import { useMemo, useState } from "react";
import { EXPORT_COLUMNS, exportEntriesCsv, exportEntriesImage, type ExportColumn } from "../lib/exportCsv";
import { useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./ExportPanel.css";

const STORAGE_KEY = "gigtime_export_columns";

function loadColumns(): ExportColumn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return EXPORT_COLUMNS.map((c) => c.key);
}

export function ExportPanel({
  entries,
  employerById,
  filenameBase,
  onClose,
}: {
  entries: TimeEntry[];
  employerById: Map<string, Employer>;
  filenameBase: string;
  onClose: () => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<Set<ExportColumn>>(new Set(loadColumns()));
  const [generatingImage, setGeneratingImage] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const rangedEntries = useMemo(() => {
    if (!rangeStart && !rangeEnd) return entries;
    const startMs = rangeStart ? new Date(`${rangeStart}T00:00:00`).getTime() : -Infinity;
    const endMs = rangeEnd ? new Date(`${rangeEnd}T23:59:59`).getTime() : Infinity;
    return entries.filter((e) => e.startTime >= startMs && e.startTime <= endMs);
  }, [entries, rangeStart, rangeEnd]);

  function toggle(col: ExportColumn) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const activeColumns = EXPORT_COLUMNS.filter((c) => selected.has(c.key));
  const columns = activeColumns.map((c) => c.key);
  const labels = activeColumns.map((c) => t(c.labelKey));

  function handleCsv() {
    if (rangedEntries.length === 0) return;
    exportEntriesCsv(rangedEntries, employerById, `${filenameBase}.csv`, columns, labels);
    onClose();
  }

  async function handleImage() {
    if (rangedEntries.length === 0) return;
    setGeneratingImage(true);
    try {
      await exportEntriesImage(rangedEntries, employerById, `${filenameBase}.png`, columns, labels);
    } finally {
      setGeneratingImage(false);
      onClose();
    }
  }

  return (
    <div className="export-panel-backdrop" onClick={onClose}>
      <div className="export-panel-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />
        <p className="export-panel-title">{t("exportDateRangeLabel")}</p>
        <div className="export-range-row">
          <input
            type="date"
            className="export-range-input"
            value={rangeStart}
            max={rangeEnd || undefined}
            onChange={(e) => setRangeStart(e.target.value)}
            aria-label={t("exportDateRangeUnboundedStart")}
          />
          <span className="export-range-sep">-</span>
          <input
            type="date"
            className="export-range-input"
            value={rangeEnd}
            min={rangeStart || undefined}
            onChange={(e) => setRangeEnd(e.target.value)}
            aria-label={t("exportDateRangeUnboundedEnd")}
          />
          {(rangeStart || rangeEnd) && (
            <button type="button" className="export-range-clear" onClick={() => { setRangeStart(""); setRangeEnd(""); }}>
              {t("exportDateRangeClear")}
            </button>
          )}
        </div>
        <p className="export-range-count">{t("exportDateRangeCount", { n: rangedEntries.length })}</p>

        <p className="export-panel-title">{t("exportPanelTitle")}</p>
        <div className="export-col-grid">
          {EXPORT_COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`export-col-chip${selected.has(c.key) ? " selected" : ""}`}
              onClick={() => toggle(c.key)}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
        <p className="export-panel-hint">{t("exportImageHint")}</p>
        <div className="export-panel-actions">
          <button className="export-action-btn" onClick={handleCsv} disabled={columns.length === 0 || rangedEntries.length === 0}>
            {t("exportAsCsv")}
          </button>
          <button className="export-action-btn primary" onClick={handleImage} disabled={columns.length === 0 || rangedEntries.length === 0 || generatingImage}>
            {generatingImage ? t("exportingImage") : t("exportAsImage")}
          </button>
        </div>
      </div>
    </div>
  );
}
