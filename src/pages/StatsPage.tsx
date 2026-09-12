import { useEffect, useMemo, useState } from "react";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay } from "../lib/pay";
import type { Employer, TimeEntry } from "../lib/types";
import "./StatsPage.css";

export function StatsPage({ uid }: { uid: string }) {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const confirmed = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime),
    [entries],
  );

  const totalHours = confirmed.reduce((sum, e) => sum + entryHours(e), 0);
  const totalPay = confirmed.reduce((sum, e) => {
    const emp = employerById.get(e.employerId);
    return emp ? sum + entryPay(emp, e) : sum;
  }, 0);

  return (
    <div className="stats-page">
      <h1>统计</h1>

      <div className="summary-card">
        <div className="stat"><p className="num">{totalHours.toFixed(1)}h</p><p className="lb">累计总工时</p></div>
        <div className="stat"><p className="num">¥{totalPay.toFixed(0)}</p><p className="lb">累计总收入</p></div>
      </div>

      <p className="list-title">明细</p>
      <div className="entry-list">
        {confirmed.length === 0 && <p className="empty-hint">打完第一次卡，这里就会出现你的战绩</p>}
        {confirmed
          .slice()
          .sort((a, b) => b.startTime - a.startTime)
          .map((e) => {
            const emp = employerById.get(e.employerId);
            if (!emp) return null;
            return (
              <div className="entry" key={e.id}>
                <span className="dot" style={{ background: emp.color }} />
                <div className="info">
                  <p className="n">{emp.name}</p>
                  <p className="d">{new Date(e.startTime).toLocaleDateString()} · {entryHours(e).toFixed(1)}小时</p>
                </div>
                <span className="pay">¥{entryPay(emp, e).toFixed(1)}</span>
              </div>
            );
          })}
      </div>

      <p className="todo-note">
        趋势图 / 热力日历 / 排行榜 / 心情曲线这几个可视化模块还在开发中，先上线了最基础的汇总和明细。
      </p>
    </div>
  );
}
