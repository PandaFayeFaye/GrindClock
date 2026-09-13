import { useState } from "react";
import type { Employer } from "../lib/types";
import { useT } from "../lib/i18n";
import "./RetroClockInModal.css";

export function ScheduleConfirmModal({
  employer,
  scheduled,
  onCancel,
  onConfirm,
}: {
  employer: Employer;
  scheduled: { start: string; end: string };
  onCancel: () => void;
  onConfirm: (start: string, end: string) => void;
}) {
  const t = useT();
  const [start, setStart] = useState(scheduled.start);
  const [end, setEnd] = useState(scheduled.end);

  return (
    <div className="retro-clockin-backdrop" onClick={onCancel}>
      <div className="retro-clockin-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />
        <p className="retro-title">{t("confirmScheduleTitle", { name: employer.name })}</p>
        <p className="retro-sub">{t("scheduleConfirmSub")}</p>
        <div className="retro-fields">
          <div style={{ flex: 1 }}>
            <p className="ws-time-label">{t("actualStartTimeLabel")}</p>
            <input className="retro-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <p className="ws-time-label">{t("actualEndTimeLabel")}</p>
            <input className="retro-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="retro-actions">
          <button className="retro-cancel" onClick={onCancel}>{t("cancel")}</button>
          <button className="retro-confirm" onClick={() => onConfirm(start, end)}>{t("scheduleConfirmBtn")}</button>
        </div>
      </div>
    </div>
  );
}
