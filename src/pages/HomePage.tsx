import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clockIn, clockOut, watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryPay, mergedHoursToday } from "../lib/pay";
import type { Employer, Mood, TimeEntry } from "../lib/types";
import { Mascot } from "../components/Mascot";
import { PunchConfirmModal } from "../components/PunchConfirmModal";
import "./HomePage.css";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HomePage({ uid }: { uid: string }) {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [confirmingEntry, setConfirmingEntry] = useState<{ entry: TimeEntry; employer: Employer } | null>(null);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  // Personal entries only -- team-logged (workerId set) entries never mix into this view.
  const personalEntries = useMemo(() => entries.filter((e) => !e.workerId), [entries]);

  const activeByEmployer = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const e of personalEntries) if (!e.endTime) map.set(e.employerId, e);
    return map;
  }, [personalEntries]);

  const todaysEntries = useMemo(
    () => personalEntries.filter((e) => e.status === "confirmed" && e.startTime >= startOfToday()),
    [personalEntries],
  );

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);

  const todaysIncome = useMemo(
    () => todaysEntries.reduce((sum, e) => {
      const emp = employerById.get(e.employerId);
      return emp ? sum + entryPay(emp, e) : sum;
    }, 0),
    [todaysEntries, employerById],
  );

  const todaysHours = useMemo(() => mergedHoursToday(personalEntries), [personalEntries]);
  const workingCount = activeByEmployer.size;

  function handlePunch(employer: Employer) {
    const active = activeByEmployer.get(employer.id);
    if (active) {
      setConfirmingEntry({ entry: active, employer });
    } else {
      clockIn(uid, employer.id);
    }
  }

  function handleConfirm(mood: Mood | undefined, moodNote: string | undefined, note: string) {
    if (!confirmingEntry) return;
    clockOut(uid, confirmingEntry.entry.id, { mood, moodNote, note: note || undefined });
    setConfirmingEntry(null);
  }

  return (
    <div className="home-page">
      <div className="banner">
        <Mascot size={44} />
        <div className="banner-text">
          <p className="banner-title">今天也要加油搬砖</p>
        </div>
      </div>

      {employers.length > 0 ? (
        <>
          {workingCount >= 2 && (
            <div className="combo-badge">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <span>双开中！{workingCount}份工作同时计时</span>
            </div>
          )}

          <div className="income-card">
            <p className="income-label">今日已赚</p>
            <p className="income-value">¥{todaysIncome.toFixed(1)}</p>
            <p className="income-note">今日已工作 {todaysHours.toFixed(1)} 小时</p>
          </div>

          <div className="list">
            {employers.map((emp) => {
              const active = activeByEmployer.get(emp.id);
              return (
                <div className={`row${active ? " is-working" : ""}`} key={emp.id}>
                  <span className="dot" style={{ background: emp.color }} />
                  <div className="row-name">
                    <div className="row-title-line">
                      <p className="row-title">{emp.name}</p>
                      <span className="row-rate">
                        {emp.payType === "hourly" || emp.payType === "comprehensive"
                          ? `¥${emp.hourlyRate ?? 0}/h`
                          : emp.payType}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`punch-btn${active ? " working" : ""}`}
                    onClick={() => handlePunch(emp)}
                  >
                    {active ? "下班打卡" : "上班打卡"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty">
          <Mascot size={100} />
          <p>还没有雇主？点击下方开始你的搬砖之旅</p>
          <Link className="empty-cta" to="/employers/new">+ 添加第一个雇主</Link>
        </div>
      )}

      {employers.length > 0 && (
        <Link className="fab" to="/employers/new">
          <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
            <path d="M12 5v14M5 12h14" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </Link>
      )}

      {confirmingEntry && (
        <PunchConfirmModal
          employer={confirmingEntry.employer}
          entry={confirmingEntry.entry}
          onCancel={() => setConfirmingEntry(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
