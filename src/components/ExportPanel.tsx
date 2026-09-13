import { useState } from "react";
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
    exportEntriesCsv(entries, employerById, `${filenameBase}.csv`, columns, labels);
    onClose();
  }

  async function handleImage() {
    setGeneratingImage(true);
    try {
      await exportEntriesImage(entries, employerById, `${filenameBase}.png`, columns, labels);
    } finally {
      setGeneratingImage(false);
      onClose();
    }
  }

  return (
    <div className="export-panel-backdrop" onClick={onClose}>
      <div className="export-panel-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />
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
          <button className="export-action-btn" onClick={handleCsv} disabled={columns.length === 0}>
            {t("exportAsCsv")}
          </button>
          <button className="export-action-btn primary" onClick={handleImage} disabled={columns.length === 0 || generatingImage}>
            {generatingImage ? t("exportingImage") : t("exportAsImage")}
          </button>
        </div>
      </div>
    </div>
  );
}
