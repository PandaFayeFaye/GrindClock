import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay, lumpSumForPeriod } from "../lib/pay";
import { DEFAULT_CURRENCY, formatGroupedPay } from "../lib/currency";
import { currentStreak, dateKey, leaderboard, startOfMonth } from "../lib/stats";
import { downloadBlob, renderRecapShareImage } from "../lib/shareImage";
import { useLang, useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./MonthlyRecapPage.css";

export function MonthlyRecapPage({ uid }: { uid: string }) {
  const t = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const monthStart = startOfMonth();
  const monthEntries = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime && e.startTime >= monthStart),
    [entries, monthStart],
  );

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const totalHours = monthEntries.reduce((s, e) => s + entryHours(e), 0);
  const totalPayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    const add = (cur: string, amount: number) => map.set(cur, (map.get(cur) ?? 0) + amount);
    for (const e of monthEntries) {
      const emp = employerById.get(e.employerId);
      if (emp) add(emp.currency ?? DEFAULT_CURRENCY, entryPay(emp, e));
    }
    for (const emp of employers) add(emp.currency ?? DEFAULT_CURRENCY, lumpSumForPeriod(emp, monthEntries));
    return map;
  }, [monthEntries, employerById, employers]);

  const board = useMemo(() => leaderboard(monthEntries, employers, monthStart, true), [monthEntries, employers, monthStart]);
  const topEmployer = board[0]?.employer.name ?? "—";
  const streak = useMemo(() => currentStreak(entries), [entries]);

  const monthNames = lang === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : null;

  const hardestDay = useMemo(() => {
    const crashEntry = monthEntries.find((e) => e.mood === "crash");
    const heartbeatEntry = monthEntries.find((e) => e.mood === "heartbeat");
    const pick = crashEntry ?? heartbeatEntry;
    if (pick) {
      const label = t(pick.mood === "crash" ? "moodCrashDay" : "moodHeartbeatDay");
      const d = new Date(pick.startTime);
      return monthNames
        ? t("dateLabelFmt", { label, mon: monthNames[d.getMonth()], d: d.getDate() })
        : t("dateLabelFmt", { label, m: d.getMonth() + 1, d: d.getDate() });
    }
    // Fallback: the day with the most hours, per FEATURE_SPEC 3.9's mood-skip fallback.
    const byDay = new Map<string, number>();
    for (const e of monthEntries) {
      const key = dateKey(e.startTime);
      byDay.set(key, (byDay.get(key) ?? 0) + entryHours(e));
    }
    let bestKey = "";
    let bestHours = 0;
    for (const [k, h] of byDay) if (h > bestHours) { bestHours = h; bestKey = k; }
    if (!bestKey) return t("noDataYet");
    const [, m, d] = bestKey.split("-");
    return monthNames
      ? t("longestDayFmt", { mon: monthNames[Number(m) - 1], d: Number(d) })
      : t("longestDayFmt", { m: Number(m), d: Number(d) });
  }, [monthEntries, t, monthNames]);

  const heatCells = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDay = new Map<string, number>();
    for (const e of monthEntries) {
      const key = dateKey(e.startTime);
      const emp = employerById.get(e.employerId);
      if (!emp) continue;
      byDay.set(key, (byDay.get(key) ?? 0) + entryPay(emp, e));
    }
    const values = Array.from({ length: daysInMonth }, (_, i) => {
      const key = dateKey(new Date(now.getFullYear(), now.getMonth(), i + 1).getTime());
      return byDay.get(key) ?? 0;
    });
    const max = Math.max(1, ...values);
    return values.map((v) => (v === 0 ? 0 : v / max > 0.66 ? 3 : v / max > 0.33 ? 2 : 1));
  }, [monthEntries, employerById]);

  const heatHex = ["rgba(255,255,255,.08)", "rgba(255,217,61,.35)", "rgba(255,217,61,.65)", "#FFD93D"];
  const now = new Date();
  const monthLabel = monthNames
    ? `${monthNames[now.getMonth()]} ${now.getFullYear()}`
    : `${now.getFullYear()}年${now.getMonth() + 1}月`;

  async function handleShare() {
    setGenerating(true);
    try {
      const blob = await renderRecapShareImage({
        monthLabel,
        totalHours,
        totalPayText: formatGroupedPay(totalPayByCurrency),
        employerCount: employers.length,
        streak,
        topEmployer,
        hardestDay,
        heatCells,
        lang,
      });
      downloadBlob(blob, `gigtime-recap-${monthLabel}.png`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="recap-page">
      <span className="sticker c1" />
      <span className="sticker c2" />
      <span className="sticker c3" />

      <div className="topbar">
        <button className="close-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="content">
        <div>
          <p className="eyebrow">{t("recapEyebrow", { month: monthLabel })}</p>
          <p className="headline">{t("recapHeadline")}<br />{totalHours.toFixed(0)} {t("recapHeadlineSuffix")}</p>
        </div>

        <div className="grid">
          <div className="stat-tile"><p className="n">{formatGroupedPay(totalPayByCurrency)}</p><p className="l">{t("crossEmployerTotal", { n: employers.length })}</p></div>
          <div className="stat-tile"><p className="n">{t("daysUnit", { n: streak })}</p><p className="l">{t("currentStreakLabel")}</p></div>
          <div className="stat-tile"><p className="n">{topEmployer}</p><p className="l">{t("topEmployerLabel")}</p></div>
          <div className="stat-tile"><p className="n">{hardestDay}</p><p className="l">{t("memorableDayLabel")}</p></div>
        </div>

        <div className="heat-mini">
          <p className="title">{t("monthActivity")}</p>
          <div className="heat-grid">
            {heatCells.map((level, i) => (
              <div className="heat-cell" key={i} style={{ background: heatHex[level] }} />
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="share-btn" onClick={handleShare} disabled={generating}>
            {generating ? t("generatingBtn") : t("generateShareImage")}
          </button>
          <button className="detail-link" onClick={() => navigate("/stats")}>{t("viewFullDetail")}</button>
        </div>
      </div>
    </div>
  );
}
