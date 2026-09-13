import { useState } from "react";
import type { Employer } from "../lib/types";
import "./RetroClockInModal.css";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function RetroClockInModal({
  employer,
  onCancel,
  onConfirm,
}: {
  employer: Employer;
  onCancel: () => void;
  onConfirm: (startTime: number) => void;
}) {
  const now = new Date();
  const [date, setDate] = useState(toDateInputValue(now));
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);

  function handleConfirm() {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date + "T00:00:00").getTime() + h * 3_600_000 + m * 60_000;
    onConfirm(Math.min(start, Date.now()));
  }

  return (
    <div className="retro-clockin-backdrop" onClick={onCancel}>
      <div className="retro-clockin-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />
        <p className="retro-title">补打「{employer.name}」的上班卡</p>
        <p className="retro-sub">实际是什么时候开始上班的？打卡会从这个时间点开始计时</p>
        <div className="retro-fields">
          <input className="retro-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={toDateInputValue(now)} />
          <input className="retro-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="retro-actions">
          <button className="retro-cancel" onClick={onCancel}>取消</button>
          <button className="retro-confirm" onClick={handleConfirm}>确认，开始计时</button>
        </div>
      </div>
    </div>
  );
}
