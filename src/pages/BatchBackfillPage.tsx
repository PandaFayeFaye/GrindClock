import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addManualEntries, deleteTimeEntries, watchEmployers, watchTimeEntries } from "../lib/firestore";
import { WEEKDAYS, combineDateAndTime, type WeekdayKey } from "../lib/schedule";
import { dateKey } from "../lib/stats";
import { useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./BatchBackfillPage.css";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BatchBackfillPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "delete">("create");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const [employerId, setEmployerId] = useState("");
  const employerIdOrFirst = employerId || employers[0]?.id || "";

  const today = toDateInputValue(new Date());
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [activeDays, setActiveDays] = useState<Set<WeekdayKey>>(new Set(["1", "2", "3", "4", "5"]));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleDay(key: WeekdayKey) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setConfirmDelete(false);
  }

  const matchingDateKeys = useMemo(() => {
    const start = new Date(rangeStart + "T00:00:00");
    const end = new Date(rangeEnd + "T00:00:00");
    if (start > end) return new Set<string>();
    const keys = new Set<string>();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (activeDays.has(String(d.getDay()) as WeekdayKey)) keys.add(dateKey(d.getTime()));
    }
    return keys;
  }, [rangeStart, rangeEnd, activeDays]);

  const matchingDates = useMemo(() => {
    const start = new Date(rangeStart + "T00:00:00");
    const end = new Date(rangeEnd + "T00:00:00");
    if (start > end) return [];
    const dates: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (activeDays.has(String(d.getDay()) as WeekdayKey)) dates.push(new Date(d));
    }
    return dates;
  }, [rangeStart, rangeEnd, activeDays]);

  const matchingEntries = useMemo(
    () => entries.filter((e) => !e.workerId && e.employerId === employerIdOrFirst && matchingDateKeys.has(dateKey(e.startTime))),
    [entries, employerIdOrFirst, matchingDateKeys],
  );

  async function handleCreate() {
    if (!employerIdOrFirst || matchingDates.length === 0) return;
    setSaving(true);
    const newEntries: Omit<TimeEntry, "id">[] = matchingDates.map((date) => {
      const start = combineDateAndTime(date, startTime);
      let end = combineDateAndTime(date, endTime);
      if (end <= start) end += 24 * 3_600_000;
      return {
        employerId: employerIdOrFirst,
        startTime: start,
        endTime: end,
        status: "confirmed",
        source: "manual",
      };
    });
    await addManualEntries(uid, newEntries);
    setSaving(false);
    navigate(-1);
  }

  async function handleDelete() {
    if (matchingEntries.length === 0) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    await deleteTimeEntries(uid, matchingEntries.map((e) => e.id));
    setSaving(false);
    navigate(-1);
  }

  return (
    <div className="batch-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1>{t("batchBackfillTitle")}</h1>
        {mode === "create" ? (
          <button className="save-btn" onClick={handleCreate} disabled={saving || !employerIdOrFirst || matchingDates.length === 0}>
            {saving ? t("batchSaving") : t("batchSaveBtn")}
          </button>
        ) : (
          <button className="save-btn danger" onClick={handleDelete} disabled={saving || matchingEntries.length === 0}>
            {saving ? t("batchDeleting") : confirmDelete ? t("batchDeleteConfirmBtn", { n: matchingEntries.length }) : t("batchDeleteBtn")}
          </button>
        )}
      </div>

      <div className="body">
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab${mode === "create" ? " active" : ""}`}
            onClick={() => { setMode("create"); setConfirmDelete(false); }}
          >
            {t("batchModeCreate")}
          </button>
          <button
            type="button"
            className={`mode-tab${mode === "delete" ? " active" : ""}`}
            onClick={() => { setMode("delete"); setConfirmDelete(false); }}
          >
            {t("batchModeDelete")}
          </button>
        </div>

        <div>
          <p className="field-label">{t("employerLabel")}</p>
          <select className="select-field" value={employerIdOrFirst} onChange={(e) => { setEmployerId(e.target.value); setConfirmDelete(false); }}>
            {employers.length === 0 && <option value="">{t("noEmployersOption")}</option>}
            {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <p className="field-label">{t("dateRangeLabel")}</p>
          <div className="date-range-row">
            <input className="date-field" type="date" value={rangeStart} onChange={(e) => { setRangeStart(e.target.value); setConfirmDelete(false); }} />
            <span>{t("toLabel")}</span>
            <input className="date-field" type="date" value={rangeEnd} onChange={(e) => { setRangeEnd(e.target.value); setConfirmDelete(false); }} />
          </div>
        </div>

        <div>
          <p className="field-label">{t("workdaysLabel")}</p>
          <div className="weekday-chip-row">
            {WEEKDAYS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`weekday-chip${activeDays.has(d.key) ? " selected" : ""}`}
                onClick={() => toggleDay(d.key)}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {mode === "create" && (
          <>
            <div>
              <p className="field-label">{t("batchTimeLabel")}</p>
              <div className="time-range-row">
                <input className="date-field" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <span>-</span>
                <input className="date-field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <p className="batch-preview">{t("batchPreviewCount", { n: matchingDates.length })}</p>
          </>
        )}

        {mode === "delete" && (
          <p className="batch-preview danger">{t("batchDeletePreviewCount", { n: matchingEntries.length })}</p>
        )}
      </div>
    </div>
  );
}
