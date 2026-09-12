import { useState } from "react";
import type { Employer, Mood, TimeEntry } from "../lib/types";
import { entryHours, entryPay } from "../lib/pay";
import "./PunchConfirmModal.css";

const MOODS: { key: Mood; label: string }[] = [
  { key: "crash", label: "崩溃" },
  { key: "normal", label: "普通" },
  { key: "great", label: "爽" },
  { key: "heartbeat", label: "心动" },
];

export function PunchConfirmModal({
  employer,
  entry,
  onCancel,
  onConfirm,
}: {
  employer: Employer;
  entry: TimeEntry;
  onCancel: () => void;
  onConfirm: (mood: Mood | undefined, moodNote: string | undefined, note: string) => void;
}) {
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [note, setNote] = useState("");

  const previewEntry: TimeEntry = { ...entry, endTime: Date.now() };
  const hours = entryHours(previewEntry);
  const pay = entryPay(employer, previewEntry);

  return (
    <div className="punch-modal-backdrop" onClick={onCancel}>
      <div className="punch-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />

        <div className="punch-modal-summary">
          <p className="emp">{employer.name} · 本次工时</p>
          <p className="dur">{hours.toFixed(1)}小时</p>
          <p className="pay">预估收入 ¥{pay.toFixed(1)}</p>
        </div>

        <div>
          <p className="section-label">
            今天感觉怎么样？<span className="opt">（可跳过）</span>
          </p>
          <div className="mood-tags">
            {MOODS.map((m) => (
              <button
                key={m.key}
                className={`mood-tag${mood === m.key ? " selected" : ""}`}
                onClick={() => setMood(mood === m.key ? undefined : m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="section-label">
            备注<span className="opt">（可选）</span>
          </p>
          <textarea
            className="note-input"
            placeholder="今天发生了什么值得记一笔的事吗"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          className="confirm-btn"
          onClick={() => onConfirm(mood, mood ? "" : undefined, note)}
        >
          确认保存
        </button>
      </div>
    </div>
  );
}
