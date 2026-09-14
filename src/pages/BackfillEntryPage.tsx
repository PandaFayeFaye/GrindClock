import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import { addManualEntry, deleteTimeEntry, getTimeEntry, updateTimeEntry, watchEmployers, watchWorkers } from "../lib/firestore";
import { scheduleDurationHours, todaysSchedule } from "../lib/schedule";
import { currencySymbol } from "../lib/currency";
import { useT } from "../lib/i18n";
import { MOOD_KEYS, MoodIcon } from "../lib/moods";
import type { Adjustment, Employer, Mood, TimeEntry, Worker } from "../lib/types";
import "./BackfillEntryPage.css";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BackfillEntryPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetEmployerId = searchParams.get("employerId");
  const workerId = searchParams.get("workerId") ?? undefined;
  const editId = searchParams.get("editId");

  const [employers, setEmployers] = useState<Employer[]>([]);
  useEffect(() => watchEmployers(uid, setEmployers), [uid]);

  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => watchWorkers(uid, setWorkers), [uid]);
  const worker = workers.find((w) => w.id === workerId);

  const [selectedEmployerId, setSelectedEmployerId] = useState(presetEmployerId ?? "");
  // Fall back to the first employer once the list loads, without a setState-in-effect
  // round trip -- this is derived at render time, not synced.
  const employerId = selectedEmployerId || employers[0]?.id || "";
  const setEmployerId = setSelectedEmployerId;

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [mode, setMode] = useState<"duration" | "range">("duration");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [orderCount, setOrderCount] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [note, setNote] = useState("");
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(false);
  const [prefilledDefaults, setPrefilledDefaults] = useState(false);

  useEffect(() => {
    if (!editId) return;
    getTimeEntry(uid, editId).then((snap) => {
      const data = snap.data() as TimeEntry | undefined;
      if (!data) return;
      setSelectedEmployerId(data.employerId);
      const start = new Date(data.startTime);
      const end = new Date(data.endTime ?? data.startTime);
      setDate(toDateInputValue(start));
      setMode("range");
      setStartTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
      setEndTime(`${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`);
      setIsOvertime(!!data.isOvertime);
      if (data.overtimeHours) {
        setOvertimeTouched(true);
        setOvertimeHoursStr(String(data.overtimeHours));
      }
      setIsHoliday(!!data.isHoliday);
      setOrderCount(data.orderCount ? String(data.orderCount) : "");
      setMood(data.mood);
      setNote(data.note ?? "");
      setAdjustments(data.adjustment ?? []);
      setPrefilledDefaults(true); // editing an existing entry -- never overwrite with the employer's current defaults
      setLoadedEdit(true);
    });
    // Only ever re-run if editId itself changes -- this is a one-time load into local form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, uid]);

  const employer = useMemo(() => employers.find((e) => e.id === employerId), [employers, employerId]);
  const isPerOrder = employer?.payType === "per-order";

  const [overtimeHoursStr, setOvertimeHoursStr] = useState("");
  const [overtimeTouched, setOvertimeTouched] = useState(false);

  useEffect(() => {
    if (prefilledDefaults || !employer) return;
    setAdjustments(employer.defaultAdjustments ?? []);
    setPrefilledDefaults(true);
  }, [prefilledDefaults, employer]);

  function computeRange(): { start: number; end: number } | null {
    const dayStart = new Date(date + "T00:00:00");
    if (mode === "duration") {
      const h = Number(hours) || 0;
      const m = Number(minutes) || 0;
      if (h === 0 && m === 0) return null;
      const start = dayStart.getTime() + 9 * 3_600_000; // arbitrary anchor, only duration matters
      return { start, end: start + h * 3_600_000 + m * 60_000 };
    }
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = dayStart.getTime() + sh * 3_600_000 + sm * 60_000;
    let end = dayStart.getTime() + eh * 3_600_000 + em * 60_000;
    if (end <= start) end += 24 * 3_600_000; // overnight shift
    return { start, end };
  }

  // Auto-detect overtime for a fixed-schedule salaried employee, same rule as
  // clocking out live: hours entered beyond that weekday's scheduled duration.
  const previewRange = computeRange();
  const daySchedule = employer ? todaysSchedule(employer, new Date(date + "T00:00:00")) : null;
  const scheduledHoursForDate = daySchedule ? scheduleDurationHours(daySchedule) : 0;
  const supportsAutoOvertime = daySchedule !== null && (employer?.payType === "monthly" || employer?.payType === "comprehensive");
  const enteredHours = previewRange ? (previewRange.end - previewRange.start) / 3_600_000 : 0;
  const detectedOvertimeHours = supportsAutoOvertime ? Math.max(0, enteredHours - scheduledHoursForDate) : 0;
  const showOvertimeSection = supportsAutoOvertime && detectedOvertimeHours > 0.05;
  const overtimeHoursValue = showOvertimeSection
    ? Number(overtimeTouched ? overtimeHoursStr : detectedOvertimeHours.toFixed(1)) || 0
    : undefined;

  async function handleSave() {
    if (!employerId) return;
    const range = computeRange();
    if (!range) return;
    setSaving(true);
    const base = {
      employerId,
      startTime: range.start,
      endTime: range.end,
      status: "confirmed" as const,
      source: "manual" as const,
      isOvertime,
      isHoliday,
      ...(workerId ? { workerId } : {}),
    };
    if (editId) {
      // Editing merges into the existing doc (updateDoc), so a cleared field must be
      // explicitly deleted -- omitting the key here would just leave the old value behind.
      await updateTimeEntry(uid, editId, {
        ...base,
        orderCount: isPerOrder && orderCount ? Number(orderCount) : deleteField(),
        mood: mood ?? deleteField(),
        note: note.trim() ? note.trim() : deleteField(),
        adjustment: adjustments.length > 0 ? adjustments : deleteField(),
        overtimeHours: overtimeHoursValue ?? deleteField(),
      });
    } else {
      await addManualEntry(uid, {
        ...base,
        ...(overtimeHoursValue !== undefined ? { overtimeHours: overtimeHoursValue } : {}),
        ...(isPerOrder && orderCount ? { orderCount: Number(orderCount) } : {}),
        ...(mood ? { mood } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(adjustments.length > 0 ? { adjustment: adjustments } : {}),
      });
    }
    setSaving(false);
    navigate(-1);
  }

  async function handleDelete() {
    if (!editId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await deleteTimeEntry(uid, editId);
    setDeleting(false);
    navigate(-1);
  }

  return (
    <div className="backfill-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1>{editId ? t("editEntryTitle") : worker ? t("logForTitle", { name: worker.name }) : t("backfillTitle")}</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving || !employerId || (!!editId && !loadedEdit)}>
          {t("save")}
        </button>
      </div>

      <div className="body">
        <div>
          <p className="field-label">{t("employerLabel")}</p>
          <select className="select-field" value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
            {employers.length === 0 && <option value="">{t("noEmployersOption")}</option>}
            {employers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="field-label">{t("dateLabel")}</p>
          <input className="date-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <p className="field-label">{t("entryModeLabel")}</p>
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab${mode === "duration" ? " active" : ""}`}
              onClick={() => setMode("duration")}
            >
              {t("modeDuration")}
            </button>
            <button
              type="button"
              className={`mode-tab${mode === "range" ? " active" : ""}`}
              onClick={() => setMode("range")}
            >
              {t("modeRange")}
            </button>
          </div>
        </div>

        {mode === "duration" ? (
          <div>
            <p className="field-label">{t("durationLabel")}</p>
            <div className="time-row">
              <input className="time-input" type="number" placeholder={t("hoursPlaceholder")} value={hours} onChange={(e) => setHours(e.target.value)} />
              <span className="time-sep">{t("hoursSuffix")}</span>
              <input className="time-input" type="number" placeholder={t("minutesPlaceholder")} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <span className="time-sep">{t("minutesSuffix")}</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="field-label">{t("startEndLabel")}</p>
            <div className="time-row">
              <input className="time-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <span className="time-sep">→</span>
              <input className="time-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        <div className="ot-toggle-row" onClick={() => setIsOvertime(!isOvertime)}>
          <span>{t("overtimeRateToggle")}</span>
          <div className={`switch${isOvertime ? " on" : ""}`}><div className="knob" /></div>
        </div>
        <div className="ot-toggle-row" onClick={() => setIsHoliday(!isHoliday)}>
          <span>{t("holidayRateToggle")}</span>
          <div className={`switch${isHoliday ? " on" : ""}`}><div className="knob" /></div>
        </div>

        {showOvertimeSection && (
          <div className="overtime-detected">
            <p className="field-label ot-title">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="var(--accent-coral)" />
              </svg>
              {t("overtimeDetectedTitle")}
            </p>
            <p className="overtime-detected-note">
              {t("overtimeDetectedNote", { scheduled: scheduledHoursForDate.toFixed(1), worked: enteredHours.toFixed(1) })}
            </p>
            <div className="ot-block">
              <p className="ot-block-label">{t("excessHoursLabel")}</p>
              <div className="overtime-detected-row">
                <input
                  className="time-input"
                  type="number"
                  step="0.1"
                  value={overtimeTouched ? overtimeHoursStr : detectedOvertimeHours.toFixed(1)}
                  onChange={(e) => { setOvertimeTouched(true); setOvertimeHoursStr(e.target.value); }}
                />
                <span className="overtime-detected-unit">{t("hoursUnitPlain")}</span>
              </div>
            </div>
            <div className="ot-block">
              <p className="ot-block-label">{t("overtimeRuleLabel")}</p>
              <p className="overtime-detected-mult">
                {employer?.overtimeRateMode === "fixed" && employer.overtimeHourlyRate
                  ? t("overtimeFixedRateNote", { sym: currencySymbol(employer.currency), rate: employer.overtimeHourlyRate })
                  : t("overtimeMultiplierNote", { mult: (employer?.overtimeMultiplier ?? 1.5).toFixed(1) })}
              </p>
            </div>
          </div>
        )}

        {isPerOrder && (
          <div>
            <p className="field-label">{t("orderCountLabel")}</p>
            <input className="time-input" type="number" placeholder={t("orderCountPlaceholder")} value={orderCount} onChange={(e) => setOrderCount(e.target.value)} style={{ width: "100%" }} />
          </div>
        )}

        <div>
          <p className="field-label">
            {t("howAreYouFeeling")}<span className="opt">{t("optionalSkip")}</span>
          </p>
          <div className="mood-tags">
            {MOOD_KEYS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`mood-tag${mood === m.key ? " selected" : ""}`}
                onClick={() => setMood(mood === m.key ? undefined : m.key)}
              >
                <MoodIcon mood={m.key} size={15} />
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t("adjustmentsLabel")} <span className="opt">{t("adjustmentsWithDefaultsSub")}</span></p>
          {adjustments.map((adj, i) => (
            <div className="adj-edit-row" key={i}>
              <select
                className="select-field"
                value={adj.type}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, type: e.target.value as "bonus" | "deduction" } : a))}
              >
                <option value="bonus">{t("bonus")}</option>
                <option value="deduction">{t("deduction")}</option>
              </select>
              <input
                className="time-input"
                type="number"
                placeholder={t("amountLabel")}
                value={adj.amount || ""}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, amount: Number(e.target.value) || 0 } : a))}
              />
              <input
                className="time-input"
                placeholder={t("adjNotePlaceholder")}
                value={adj.note ?? ""}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, note: e.target.value } : a))}
              />
              <button type="button" className="remove-adj-btn" onClick={() => setAdjustments(adjustments.filter((_, j) => j !== i))}>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
          <button type="button" className="add-adj-btn" onClick={() => setAdjustments([...adjustments, { type: "bonus", amount: 0 }])}>
            {t("addOneRule")}
          </button>
        </div>

        <div>
          <p className="field-label">{t("noteLabel")} <span className="opt">{t("optional")}</span></p>
          <textarea className="note-input" placeholder={t("notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {editId && (
          <button className={`delete-entry-btn${confirmDelete ? " confirming" : ""}`} onClick={handleDelete} disabled={deleting}>
            {confirmDelete ? t("confirmDeleteEntry") : t("deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}
