import { useState } from "react";
import type { Adjustment, Employer, Mood, TimeEntry } from "../lib/types";
import { entryHours, entryPay } from "../lib/pay";
import { currencySymbol } from "../lib/currency";
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
  onConfirm: (
    mood: Mood | undefined,
    moodNote: string | undefined,
    note: string,
    adjustment: Adjustment[] | undefined,
    isOvertime: boolean,
    isHoliday: boolean,
    orderCount: number | undefined,
  ) => void;
}) {
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [moodNote, setMoodNote] = useState("");
  const [note, setNote] = useState("");
  const [adjType, setAdjType] = useState<"none" | "bonus" | "deduction">("none");
  const [adjAmount, setAdjAmount] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [orderCount, setOrderCount] = useState("");

  const adjustment: Adjustment[] | undefined =
    adjType !== "none" && Number(adjAmount) > 0
      ? [{ type: adjType, amount: Number(adjAmount) }]
      : undefined;

  const recurringAdjustment = employer.defaultAdjustments ?? [];
  const previewAdjustment = [...recurringAdjustment, ...(adjustment ?? [])];

  const showRateFlags = employer.overtimeMultiplier !== undefined || employer.holidayMultiplier !== undefined || employer.payType === "base+overtime";
  const isPerOrder = employer.payType === "per-order";
  const previewEntry: TimeEntry = {
    ...entry,
    endTime: Date.now(),
    adjustment: previewAdjustment,
    isOvertime,
    isHoliday,
    orderCount: isPerOrder ? Number(orderCount) || 0 : entry.orderCount,
  };
  const hours = entryHours(previewEntry);
  const pay = entryPay(employer, previewEntry);

  return (
    <div className="punch-modal-backdrop" onClick={onCancel}>
      <div className="punch-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />

        <div className="punch-modal-summary">
          <p className="emp">{employer.name} · 本次工时</p>
          <p className="dur">{hours.toFixed(1)}小时</p>
          <p className="pay">预估收入 {currencySymbol(employer.currency)}{pay.toFixed(1)}</p>
          {recurringAdjustment.length > 0 && (
            <p className="recurring-adj-note">已自动套用{recurringAdjustment.length}条该雇主的默认补贴/扣款规则</p>
          )}
        </div>

        {isPerOrder && (
          <div>
            <p className="section-label">完成了几单？</p>
            <input
              className="adj-input"
              type="number"
              placeholder="单数"
              value={orderCount}
              onChange={(e) => setOrderCount(e.target.value)}
            />
          </div>
        )}

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
          {mood && (
            <input
              className="adj-input"
              maxLength={20}
              placeholder="想补一句吗？（最多20字，可跳过）"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
            />
          )}
        </div>

        {showRateFlags && (
          <div>
            <p className="section-label">这次算加班/节假日吗？<span className="opt">（影响倍率计算）</span></p>
            <div className="adj-row">
              <button className={`adj-toggle${isOvertime ? " selected" : ""}`} onClick={() => setIsOvertime(!isOvertime)}>加班</button>
              <button className={`adj-toggle${isHoliday ? " selected" : ""}`} onClick={() => setIsHoliday(!isHoliday)}>节假日</button>
            </div>
          </div>
        )}

        <div>
          <p className="section-label">
            本次补贴/扣款<span className="opt">（可选，一次性）</span>
          </p>
          <div className="adj-row">
            <button className={`adj-toggle${adjType === "none" ? " selected" : ""}`} onClick={() => setAdjType("none")}>无</button>
            <button className={`adj-toggle${adjType === "bonus" ? " selected" : ""}`} onClick={() => setAdjType("bonus")}>补贴</button>
            <button className={`adj-toggle${adjType === "deduction" ? " selected" : ""}`} onClick={() => setAdjType("deduction")}>扣款</button>
          </div>
          {adjType !== "none" && (
            <input
              className="adj-input"
              type="number"
              placeholder="金额（元）"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
            />
          )}
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
          onClick={() => onConfirm(
            mood,
            mood ? (moodNote.trim() || undefined) : undefined,
            note,
            adjustment,
            isOvertime,
            isHoliday,
            isPerOrder ? Number(orderCount) || 0 : undefined,
          )}
        >
          确认保存
        </button>
      </div>
    </div>
  );
}
