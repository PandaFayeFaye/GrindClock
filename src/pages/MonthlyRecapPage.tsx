import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay, lumpSumForPeriod } from "../lib/pay";
import { currentStreak, dateKey, leaderboard, startOfMonth } from "../lib/stats";
import { downloadBlob, renderRecapShareImage } from "../lib/shareImage";
import type { Employer, TimeEntry } from "../lib/types";
import "./MonthlyRecapPage.css";

const MOOD_TEXT: Record<string, string> = {
  crash: "最累的一天",
  heartbeat: "最有感觉的一天",
};

export function MonthlyRecapPage({ uid }: { uid: string }) {
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
  const totalPay = monthEntries.reduce((s, e) => {
    const emp = employerById.get(e.employerId);
    return emp ? s + entryPay(emp, e) : s;
  }, 0) + employers.reduce((s, emp) => s + lumpSumForPeriod(emp, monthEntries), 0);

  const board = useMemo(() => leaderboard(monthEntries, employers, monthStart, true), [monthEntries, employers, monthStart]);
  const topEmployer = board[0]?.employer.name ?? "—";
  const streak = useMemo(() => currentStreak(entries), [entries]);

  const hardestDay = useMemo(() => {
    const crashEntry = monthEntries.find((e) => e.mood === "crash");
    const heartbeatEntry = monthEntries.find((e) => e.mood === "heartbeat");
    const pick = crashEntry ?? heartbeatEntry;
    if (pick) {
      const label = MOOD_TEXT[pick.mood!] ?? "";
      return `${new Date(pick.startTime).getMonth() + 1}月${new Date(pick.startTime).getDate()}日 · ${label}`;
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
    if (!bestKey) return "还没有数据";
    const [, m, d] = bestKey.split("-");
    return `${Number(m)}月${Number(d)}日 · 这天干得最久`;
  }, [monthEntries]);

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
  const monthLabel = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;

  async function handleShare() {
    setGenerating(true);
    try {
      const blob = await renderRecapShareImage({
        monthLabel,
        totalHours,
        totalPay,
        employerCount: employers.length,
        streak,
        topEmployer,
        hardestDay,
        heatCells,
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
          <p className="eyebrow">{monthLabel} · 打工战绩报告</p>
          <p className="headline">这个月，你搬了<br />{totalHours.toFixed(0)}小时的砖</p>
        </div>

        <div className="grid">
          <div className="stat-tile"><p className="n">¥{totalPay.toFixed(0)}</p><p className="l">跨{employers.length}个雇主合计</p></div>
          <div className="stat-tile"><p className="n">{streak}天</p><p className="l">当前打工火苗</p></div>
          <div className="stat-tile"><p className="n">{topEmployer}</p><p className="l">最赚钱雇主</p></div>
          <div className="stat-tile"><p className="n">{hardestDay}</p><p className="l">值得记住的一天</p></div>
        </div>

        <div className="heat-mini">
          <p className="title">本月活跃度</p>
          <div className="heat-grid">
            {heatCells.map((level, i) => (
              <div className="heat-cell" key={i} style={{ background: heatHex[level] }} />
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="share-btn" onClick={handleShare} disabled={generating}>
            {generating ? "生成中..." : "生成分享长图"}
          </button>
          <button className="detail-link" onClick={() => navigate("/stats")}>查看完整明细 →</button>
        </div>
      </div>
    </div>
  );
}
