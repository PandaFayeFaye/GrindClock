import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addManualEntries, watchEmployers } from "../lib/firestore";
import { WEEKDAYS, combineDateAndTime, type WeekdayKey } from "../lib/schedule";
import { useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./BatchBackfillPage.css";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BatchBackfillPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  useEffect(() => watchEmployers(uid, setEmployers), [uid]);

  const [employerId, setEmployerId] = useState("");
  const employerIdOrFirst = employerId || employers[0]?.id || "";

  const today = toDateInputValue(new Date());
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [activeDays, setActiveDays] = useState<Set<WeekdayKey>>(new Set(["1", "2", "3", "4", "5"]));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [saving, setSaving] = useState(false);

  function toggleDay(key: WeekdayKey) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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

  async function handleSave() {
    if (!employerIdOrFirst || matchingDates.length === 0) return;
    setSaving(true);
    const entries: Omit<TimeEntry, "id">[] = matchingDates.map((date) => {
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
    await addManualEntries(uid, entries);
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
        <button className="save-btn" onClick={handleSave} disabled={saving || !employerIdOrFirst || matchingDates.length === 0}>
          {saving ? t("batchSaving") : t("batchSaveBtn")}
        </button>
      </div>

      <div className="body">
        <div>
          <p className="field-label">{t("employerLabel")}</p>
          <select className="select-field" value={employerIdOrFirst} onChange={(e) => setEmployerId(e.target.value)}>
            {employers.length === 0 && <option value="">{t("noEmployersOption")}</option>}
            {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <p className="field-label">{t("dateRangeLabel")}</p>
          <div className="date-range-row">
            <input className="date-field" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            <span>{t("toLabel")}</span>
            <input className="date-field" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
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

        <div>
          <p className="field-label">{t("batchTimeLabel")}</p>
          <div className="time-range-row">
            <input className="date-field" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span>-</span>
            <input className="date-field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <p className="batch-preview">{t("batchPreviewCount", { n: matchingDates.length })}</p>
      </div>
    </div>
  );
}
