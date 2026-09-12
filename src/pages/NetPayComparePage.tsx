import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay } from "../lib/pay";
import type { Employer, TimeEntry } from "../lib/types";
import "./NetPayComparePage.css";

interface Row {
  employer: Employer;
  nominal: number;
  actual: number;
}

export function NetPayComparePage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const rows: Row[] = useMemo(() => {
    const personalConfirmed = entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime);
    return employers
      .map((emp) => {
        const empEntries = personalConfirmed.filter((e) => e.employerId === emp.id);
        const totalHours = empEntries.reduce((s, e) => s + entryHours(e), 0);
        const totalPay = empEntries.reduce((s, e) => s + entryPay(emp, e), 0);
        const nominal = emp.hourlyRate ?? (totalHours > 0 ? totalPay / totalHours : 0);
        const commuteHoursPerShift = (emp.commuteMinutes ?? 0) / 60;
        const shiftsCount = Math.max(1, empEntries.length);
        const totalCommuteHours = commuteHoursPerShift * shiftsCount;
        const totalCommuteCost = (emp.commuteCost ?? 0) * shiftsCount;
        const netHours = totalHours + totalCommuteHours;
        const netPay = totalPay - totalCommuteCost;
        const actual = netHours > 0 ? netPay / netHours : nominal;
        return { employer: emp, nominal, actual };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [employers, entries]);

  if (employers.length < 2) {
    return (
      <div className="netpay-page">
        <div className="topbar">
          <button className="back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1>净收益对比</h1>
        </div>
        <div className="empty">
          <p>至少添加2个雇主才能开始比较，去添加一个？</p>
          <button className="empty-cta" onClick={() => navigate("/employers/new")}>+ 添加雇主</button>
        </div>
      </div>
    );
  }

  return (
    <div className="netpay-page">
      <div className="topbar">
        <button className="back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1>净收益对比</h1>
      </div>

      <div className="body">
        <div className="note-card">
          扣除预估通勤时间和费用后的「实际到手时薪」，帮你看清哪份工作真正更划算——仅供参考，通勤数据来自雇主设置里填的一次性预估，没填就按名义时薪显示
        </div>

        {rows.map((row, i) => (
          <div className={`rank-row${i === 0 ? " top" : ""}`} key={row.employer.id}>
            <div className="rank-num">{i + 1}</div>
            <div className="rank-info">
              <p className="rank-name">{row.employer.name}</p>
              <p className="rank-detail">
                名义 <b>¥{row.nominal.toFixed(1)}</b>
                {(row.employer.commuteMinutes || row.employer.commuteCost) && (
                  <> · 通勤 <b>{row.employer.commuteMinutes ?? 0}分钟/¥{row.employer.commuteCost ?? 0}</b></>
                )}
              </p>
            </div>
            <div className="rank-actual">
              <p className="n">¥{row.actual.toFixed(1)}</p>
              <p className="l">实际时薪</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
