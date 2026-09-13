import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay } from "../lib/pay";
import { currencySymbol } from "../lib/currency";
import { useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./NetPayComparePage.css";

interface Row {
  employer: Employer;
  nominal: number;
  actual: number;
}

export function NetPayComparePage({ uid }: { uid: string }) {
  const t = useT();
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
        // Idle/waiting time isn't separately clocked (a rider stays "online" the whole
        // shift) -- it stretches how much real time the job actually costs beyond the
        // hours that earned money, so it inflates the denominator, not the numerator.
        const idlePct = Math.min(95, Math.max(0, emp.idleTimePct ?? 0));
        const idleHours = totalHours * (idlePct / (100 - idlePct));
        const netHours = totalHours + totalCommuteHours + idleHours;
        const netPay = totalPay - totalCommuteCost;
        const actual = netHours > 0 ? netPay / netHours : nominal;
        return { employer: emp, nominal, actual };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [employers, entries]);

  const hasAnyEntries = entries.some((e) => !e.workerId && e.status === "confirmed" && e.endTime);

  if (employers.length < 2) {
    return (
      <div className="netpay-page">
        <div className="topbar">
          <button className="back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1>{t("netPayTitle")}</h1>
        </div>
        <div className="empty">
          <p>{t("netPayEmptyHint")}</p>
          <button className="empty-cta" onClick={() => navigate("/employers/new")}>+ {t("addEmployer")}</button>
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
        <h1>{t("netPayTitle")}</h1>
      </div>

      <div className="body">
        <div className="note-card">{t("netPayNote")}</div>

        {!hasAnyEntries && <p className="empty-hint">{t("notEnoughDataYet")}</p>}

        {rows.map((row, i) => (
          <div className={`rank-row${i === 0 ? " top" : ""}`} key={row.employer.id}>
            <div className="rank-num">{i + 1}</div>
            <div className="rank-info">
              <p className="rank-name">{row.employer.name}</p>
              <p className="rank-detail">
                {t("nominalLabel")} <b>{currencySymbol(row.employer.currency)}{row.nominal.toFixed(1)}</b>
                {(row.employer.commuteMinutes || row.employer.commuteCost) && (
                  <> · {t("commuteLabel")} <b>{row.employer.commuteMinutes ?? 0}{t("minutesShort")}/{currencySymbol(row.employer.currency)}{row.employer.commuteCost ?? 0}</b></>
                )}
                {!!row.employer.idleTimePct && (
                  <> · {t("idleLabel")} <b>{row.employer.idleTimePct}%</b></>
                )}
              </p>
            </div>
            <div className="rank-actual">
              <p className="n">{currencySymbol(row.employer.currency)}{row.actual.toFixed(1)}</p>
              <p className="l">{t("actualRateLabel")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
