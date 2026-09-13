import { useState } from "react";
import type { Adjustment, Employer, Mood, TimeEntry } from "../lib/types";
import { entryHours, entryPay } from "../lib/pay";
import { currencySymbol } from "../lib/currency";
import { scheduleDurationHours, todaysSchedule } from "../lib/schedule";
import { useT } from "../lib/i18n";
import "./PunchConfirmModal.css";

const MOOD_KEYS = [
  { key: "crash" as Mood, labelKey: "moodCrash" as const },
  { key: "normal" as Mood, labelKey: "moodNormal" as const },
  { key: "great" as Mood, labelKey: "moodGreat" as const },
  { key: "heartbeat" as Mood, labelKey: "moodHeartbeat" as const },
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
    endTime: number,
    overtimeHours: number | undefined,
  ) => void;
}) {
  const t = useT();
  const now = new Date();
  const [endTimeStr, setEndTimeStr] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
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

  // Auto-detect overtime for a fixed-schedule salaried employee: hours worked
  // beyond that day's scheduled duration. Only applies to pay types where the
  // rate is actually derived from hours (monthly needs a fixed schedule to
  // even have an hourly rate at all; comprehensive already has one).
  const schedule = todaysSchedule(employer, new Date(entry.startTime));
  const scheduledHours = schedule ? scheduleDurationHours(schedule) : 0;
  const supportsAutoOvertime = schedule !== null && (employer.payType === "monthly" || employer.payType === "comprehensive");
  const [overtimeHoursStr, setOvertimeHoursStr] = useState("");
  const [overtimeTouched, setOvertimeTouched] = useState(false);

  // Anchor the edited end time to the shift's start date -- if it lands before the
  // start (e.g. shift started at 22:00, "end time" typed as 06:00), it must mean the
  // next day, not a negative-duration shift.
  const computedEndTime = (() => {
    const [h, m] = endTimeStr.split(":").map(Number);
    const startDate = new Date(entry.startTime);
    let candidate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), h, m).getTime();
    if (candidate < entry.startTime) candidate += 24 * 3_600_000;
    return Math.min(candidate, Date.now());
  })();

  const hours = entryHours({ ...entry, endTime: computedEndTime });
  const detectedOvertimeHours = supportsAutoOvertime ? Math.max(0, hours - scheduledHours) : 0;
  const showOvertimeSection = supportsAutoOvertime && detectedOvertimeHours > 0.05;
  const overtimeHours = showOvertimeSection
    ? Number(overtimeTouched ? overtimeHoursStr : detectedOvertimeHours.toFixed(1)) || 0
    : undefined;

  const previewEntry: TimeEntry = {
    ...entry,
    endTime: computedEndTime,
    adjustment: previewAdjustment,
    isOvertime,
    isHoliday,
    orderCount: isPerOrder ? Number(orderCount) || 0 : entry.orderCount,
    overtimeHours,
  };
  const pay = entryPay(employer, previewEntry);

  return (
    <div className="punch-modal-backdrop" onClick={onCancel}>
      <div className="punch-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="punch-modal-handle" />

        <div className="punch-modal-summary">
          <p className="emp">{employer.name} · {t("thisShift")}</p>
          <div className="end-time-row">
            <span>{t("actualEndTimeLabel")}</span>
            <input
              className="end-time-input"
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p className="dur">{t("hoursUnit", { h: hours.toFixed(1) })}</p>
          <p className="pay">{t("estimatedPay")} {currencySymbol(employer.currency)}{pay.toFixed(1)}</p>
          {recurringAdjustment.length > 0 && (
            <p className="recurring-adj-note">{t("recurringAdjApplied", { n: recurringAdjustment.length })}</p>
          )}
        </div>

        {isPerOrder && (
          <div>
            <p className="section-label">{t("howManyOrders")}</p>
            <input
              className="adj-input"
              type="number"
              placeholder={t("orderCountPlaceholder")}
              value={orderCount}
              onChange={(e) => setOrderCount(e.target.value)}
            />
          </div>
        )}

        <div>
          <p className="section-label">
            {t("howAreYouFeeling")}<span className="opt">{t("optionalSkip")}</span>
          </p>
          <div className="mood-tags">
            {MOOD_KEYS.map((m) => (
              <button
                key={m.key}
                className={`mood-tag${mood === m.key ? " selected" : ""}`}
                onClick={() => setMood(mood === m.key ? undefined : m.key)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
          {mood && (
            <input
              className="adj-input"
              maxLength={20}
              placeholder={t("moodNotePlaceholder")}
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
            />
          )}
        </div>

        {showRateFlags && (
          <div>
            <p className="section-label">{t("overtimeHolidayQ")}<span className="opt">{t("affectsRateNote")}</span></p>
            <div className="adj-row">
              <button className={`adj-toggle${isOvertime ? " selected" : ""}`} onClick={() => setIsOvertime(!isOvertime)}>{t("overtime")}</button>
              <button className={`adj-toggle${isHoliday ? " selected" : ""}`} onClick={() => setIsHoliday(!isHoliday)}>{t("holiday")}</button>
            </div>
          </div>
        )}

        {showOvertimeSection && (
          <div className="overtime-detected">
            <p className="section-label">{t("overtimeDetectedTitle")}</p>
            <p className="overtime-detected-note">
              {t("overtimeDetectedNote", { scheduled: scheduledHours.toFixed(1), worked: hours.toFixed(1) })}
            </p>
            <div className="overtime-detected-row">
              <input
                className="adj-input"
                type="number"
                step="0.1"
                value={overtimeTouched ? overtimeHoursStr : detectedOvertimeHours.toFixed(1)}
                onChange={(e) => { setOvertimeTouched(true); setOvertimeHoursStr(e.target.value); }}
              />
              <span className="overtime-detected-unit">{t("overtimeHoursUnit")}</span>
            </div>
            <p className="overtime-detected-mult">
              {t("overtimeMultiplierNote", { mult: (employer.overtimeMultiplier ?? 1.5).toFixed(1) })}
            </p>
          </div>
        )}

        <div>
          <p className="section-label">
            {t("oneTimeAdjustment")}<span className="opt">{t("optionalOnce")}</span>
          </p>
          <div className="adj-row">
            <button className={`adj-toggle${adjType === "none" ? " selected" : ""}`} onClick={() => setAdjType("none")}>{t("none")}</button>
            <button className={`adj-toggle${adjType === "bonus" ? " selected" : ""}`} onClick={() => setAdjType("bonus")}>{t("bonus")}</button>
            <button className={`adj-toggle${adjType === "deduction" ? " selected" : ""}`} onClick={() => setAdjType("deduction")}>{t("deduction")}</button>
          </div>
          {adjType !== "none" && (
            <input
              className="adj-input"
              type="number"
              placeholder={t("amountPlaceholder")}
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
            />
          )}
        </div>

        <div>
          <p className="section-label">
            {t("noteLabel")}<span className="opt">{t("optional")}</span>
          </p>
          <textarea
            className="note-input"
            placeholder={t("notePlaceholder")}
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
            computedEndTime,
            overtimeHours,
          )}
        >
          {t("confirmSave")}
        </button>
      </div>
    </div>
  );
}
