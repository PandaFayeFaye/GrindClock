import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries, watchWorkers } from "../lib/firestore";
import { entryHours, entryPay } from "../lib/pay";
import { DEFAULT_CURRENCY, formatGroupedPay } from "../lib/currency";
import { dateKey, startOfWeek } from "../lib/stats";
import { useT } from "../lib/i18n";
import type { Employer, TimeEntry, Worker } from "../lib/types";
import "./TeamRosterPage.css";

export function TeamRosterPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);

  useEffect(() => {
    const unsubWorkers = watchWorkers(uid, setWorkers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    const unsubEmployers = watchEmployers(uid, setEmployers);
    return () => { unsubWorkers(); unsubEntries(); unsubEmployers(); };
  }, [uid]);

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const teamEntries = useMemo(() => entries.filter((e) => e.workerId && e.status === "confirmed" && e.endTime), [entries]);
  const todayKey = dateKey(Date.now());
  const weekStart = startOfWeek();

  const rows = useMemo(() => workers.map((w) => {
    const own = teamEntries.filter((e) => e.workerId === w.id);
    const todayHours = own.filter((e) => dateKey(e.startTime) === todayKey).reduce((s, e) => s + entryHours(e), 0);
    const weekHours = own.filter((e) => e.startTime >= weekStart).reduce((s, e) => s + entryHours(e), 0);
    return { worker: w, todayHours, weekHours };
  }), [workers, teamEntries, todayKey, weekStart]);

  const teamWeekHours = rows.reduce((s, r) => s + r.weekHours, 0);
  const teamWeekPayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of teamEntries) {
      if (e.startTime < weekStart) continue;
      const emp = employerById.get(e.employerId);
      if (!emp) continue;
      const cur = emp.currency ?? DEFAULT_CURRENCY;
      map.set(cur, (map.get(cur) ?? 0) + entryPay(emp, e));
    }
    return map;
  }, [teamEntries, weekStart, employerById]);

  return (
    <div className="team-page">
      <div className="topbar">
        <div className="topbar-left">
          <button className="back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1>{t("teamTitle")}</h1>
        </div>
        <span className="mode-pill">{t("leadModePill")}</span>
      </div>

      {workers.length > 0 ? (
        <div className="body">
          <div className="divider-note">{t("teamIsolationNote")}</div>

          <div className="team-total">
            <div className="stat"><p className="n">{teamWeekHours.toFixed(1)}h</p><p className="l">{t("teamWeekHoursLabel")}</p></div>
            <div className="stat"><p className="n">{formatGroupedPay(teamWeekPayByCurrency)}</p><p className="l">{t("teamWeekPayLabel")}</p></div>
          </div>

          {rows.map(({ worker, todayHours, weekHours }) => (
            <div className="worker-row" key={worker.id}>
              <div className="worker-avatar">{worker.name.slice(0, 1)}</div>
              <div className="worker-info">
                <p className="worker-name">{worker.name}</p>
                <p className="worker-detail">{t("todayWeekHoursFmt", { today: todayHours.toFixed(1), week: weekHours.toFixed(1) })}</p>
              </div>
              <Link className="worker-btn" to={`/entries/new?workerId=${worker.id}`}>{t("logOneEntry")}</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>{t("teamEmptyHint")}</p>
        </div>
      )}

      <Link className="fab" to="/workers/new">
        <svg viewBox="0 0 24 24" fill="none" width="26" height="26"><path d="M12 5v14M5 12h14" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" /></svg>
      </Link>
    </div>
  );
}
