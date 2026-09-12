import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { watchTimeEntries, watchWorkers } from "../lib/firestore";
import { entryHours } from "../lib/pay";
import { dateKey, startOfWeek } from "../lib/stats";
import type { TimeEntry, Worker } from "../lib/types";
import "./TeamRosterPage.css";

export function TeamRosterPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const unsubWorkers = watchWorkers(uid, setWorkers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubWorkers(); unsubEntries(); };
  }, [uid]);

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
  const teamWeekPay = teamEntries
    .filter((e) => e.startTime >= weekStart)
    .reduce((s, e) => {
      const w = workers.find((w) => w.id === e.workerId);
      return s + entryHours(e) * (w?.defaultHourlyRate ?? 0);
    }, 0);

  return (
    <div className="team-page">
      <div className="topbar">
        <div className="topbar-left">
          <button className="back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1>团队</h1>
        </div>
        <span className="mode-pill">组长模式</span>
      </div>

      {workers.length > 0 ? (
        <div className="body">
          <div className="divider-note">这里记录的工时归属于被代记录人，和你自己的个人打工记录完全分开统计，不会混进你的首页数据</div>

          <div className="team-total">
            <div className="stat"><p className="n">{teamWeekHours.toFixed(1)}h</p><p className="l">团队本周总工时</p></div>
            <div className="stat"><p className="n">¥{teamWeekPay.toFixed(0)}</p><p className="l">团队本周总收入</p></div>
          </div>

          {rows.map(({ worker, todayHours, weekHours }) => (
            <div className="worker-row" key={worker.id}>
              <div className="worker-avatar">{worker.name.slice(0, 1)}</div>
              <div className="worker-info">
                <p className="worker-name">{worker.name}</p>
                <p className="worker-detail">今日 {todayHours.toFixed(1)}h · 本周 {weekHours.toFixed(1)}h</p>
              </div>
              <Link className="worker-btn" to={`/entries/new?workerId=${worker.id}`}>+ 记一笔</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>还没有需要代记录的人？点击右下角添加第一位</p>
        </div>
      )}

      <Link className="fab" to="/workers/new">
        <svg viewBox="0 0 24 24" fill="none" width="26" height="26"><path d="M12 5v14M5 12h14" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" /></svg>
      </Link>
    </div>
  );
}
