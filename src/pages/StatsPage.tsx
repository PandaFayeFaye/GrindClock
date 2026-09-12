import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryPay } from "../lib/pay";
import { currentStreak, dateKey, leaderboard, moodByDay, payByDay, startOfWeek } from "../lib/stats";
import { useWeeklyGoal } from "../lib/settings";
import type { Employer, Mood, TimeEntry } from "../lib/types";
import "./StatsPage.css";

const MOOD_COLORS: Record<Mood, string> = {
  crash: "#5AC8FA",
  normal: "#FFFFFF",
  great: "#FFD93D",
  heartbeat: "#FF6B6B",
};

type Viz = "trend" | "calendar" | "rank";

export function StatsPage({ uid }: { uid: string }) {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [viz, setViz] = useState<Viz>("trend");
  const [weeklyGoal, setWeeklyGoal] = useWeeklyGoal();
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const personalConfirmed = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime),
    [entries],
  );

  const totalHours = personalConfirmed.reduce((sum, e) => sum + entryHours(e), 0);
  const totalPay = personalConfirmed.reduce((sum, e) => {
    const emp = employerById.get(e.employerId);
    return emp ? sum + entryPay(emp, e) : sum;
  }, 0);

  // ---- Mood strip: last 7 days ----
  const moodMap = useMemo(() => moodByDay(personalConfirmed), [personalConfirmed]);
  const last7Days = useMemo(() => {
    const days: { key: string; label: string; mood?: Mood }[] = [];
    const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d.getTime());
      days.push({ key, label: weekdayLabels[d.getDay()], mood: moodMap.get(key) });
    }
    return days;
  }, [moodMap]);

  // ---- Trend: last 7 days bars ----
  const dailyPay = useMemo(() => payByDay(personalConfirmed, employerById), [personalConfirmed, employerById]);
  const maxDailyPay = Math.max(1, ...last7Days.map((d) => dailyPay.get(d.key) ?? 0));

  // ---- Calendar: current month heatmap ----
  const heatCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const values = Array.from({ length: daysInMonth }, (_, i) => {
      const key = dateKey(new Date(year, month, i + 1).getTime());
      return dailyPay.get(key) ?? 0;
    });
    const max = Math.max(1, ...values);
    return values.map((v) => {
      if (v === 0) return 0;
      const ratio = v / max;
      return ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
    });
  }, [dailyPay]);

  const streak = useMemo(() => currentStreak(personalConfirmed), [personalConfirmed]);

  // ---- Rank: this week's leaderboard + goal ring ----
  const weekStart = startOfWeek();
  const board = useMemo(() => leaderboard(personalConfirmed, employers, weekStart), [personalConfirmed, employers, weekStart]);
  const weekPay = board.reduce((sum, r) => sum + r.pay, 0);
  const goalPct = Math.min(100, Math.round((weekPay / weeklyGoal) * 100));
  const ringCircumference = 2 * Math.PI * 44;
  const ringOffset = ringCircumference * (1 - goalPct / 100);
  const maxBoardPay = Math.max(1, ...board.map((r) => r.pay));

  const heatHex = ["#FBF7EC", "#FFEFA8", "#FFD93D", "#E8B400"];

  return (
    <div className="stats-page">
      <h1>统计</h1>

      <div className="summary-card">
        <div className="stat"><p className="num">{totalHours.toFixed(1)}h</p><p className="lb">累计总工时</p></div>
        <div className="stat"><p className="num">¥{totalPay.toFixed(0)}</p><p className="lb">累计总收入</p></div>
      </div>

      <div className="chart-card">
        <p className="title">本周心情曲线（仅自己可见）</p>
        <div className="mood-strip">
          {last7Days.map((d) => (
            <div className="mood-cell" key={d.key}>
              <div className={`mood-chip${!d.mood ? " empty" : ""}`} style={{ background: d.mood ? MOOD_COLORS[d.mood] : undefined }} />
              <span className="lb">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="viz-tabs">
        <button className={`viz-tab${viz === "trend" ? " active" : ""}`} onClick={() => setViz("trend")}>趋势</button>
        <button className={`viz-tab${viz === "calendar" ? " active" : ""}`} onClick={() => setViz("calendar")}>日历</button>
        <button className={`viz-tab${viz === "rank" ? " active" : ""}`} onClick={() => setViz("rank")}>排行</button>
      </div>

      {viz === "trend" && (
        <div className="chart-card">
          <p className="title">近7天收入趋势</p>
          <div className="bars">
            {last7Days.map((d) => {
              const pay = dailyPay.get(d.key) ?? 0;
              return (
                <div className="bar-col" key={d.key}>
                  <div className="bar-stack" style={{ height: `${Math.max(4, (pay / maxDailyPay) * 100)}px` }} />
                  <span className="bar-day">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viz === "calendar" && (
        <div className="chart-card">
          <span className="streak-chip">
            <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
              <path d="M12 2.5c-1.2 2.3-4.5 3.6-4.5 8a4.5 4.5 0 009 0c0-1.4-.5-2.3-1.1-3 .1 1.2-.5 2-1.3 2.3.6-2.4-1-3.6-2.1-7.3z" fill="#FF6B6B" stroke="#1A1A1A" strokeWidth="1" />
            </svg>
            连续打卡 {streak} 天
          </span>
          <p className="title">本月活跃度日历（颜色越深赚得越多）</p>
          <div className="heatmap">
            {heatCells.map((level, i) => (
              <div className="heat-cell" key={i} style={{ background: heatHex[level] }} />
            ))}
          </div>
          <div className="heat-legend">
            <span>少</span>
            {heatHex.map((hex) => <i key={hex} style={{ background: hex }} />)}
            <span>多</span>
          </div>
        </div>
      )}

      {viz === "rank" && (
        <div className="chart-card">
          <p className="title">本周目标进度</p>
          <div className="ring-wrap">
            <div className="ring-center">
              <svg viewBox="0 0 104 104" width="104" height="104">
                <circle cx="52" cy="52" r="44" fill="none" stroke="#DDD6C2" strokeWidth="10" />
                <circle
                  cx="52" cy="52" r="44" fill="none" stroke="#B084F5" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                  transform="rotate(-90 52 52)"
                />
              </svg>
              <div className="num"><b>{goalPct}%</b><span>本周目标</span></div>
            </div>
            {editingGoal ? (
              <div className="ring-note">
                <input
                  className="goal-input"
                  type="number"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(Number(e.target.value) || 0)}
                  onBlur={() => setEditingGoal(false)}
                  autoFocus
                />
              </div>
            ) : (
              <p className="ring-note" onClick={() => setEditingGoal(true)}>
                目标 <b>¥{weeklyGoal}</b>，已赚 <b>¥{weekPay.toFixed(0)}</b>（点击改目标）
              </p>
            )}
          </div>

          <p className="title" style={{ marginTop: 18 }}>本周雇主排行榜</p>
          {board.length === 0 && <p className="empty-hint">这周还没有工时记录</p>}
          <div className="leaderboard">
            {board.map((row, i) => (
              <div className="lb-row" key={row.employer.id}>
                <div className="lb-rank" style={{ background: i === 0 ? "#FFD93D" : "#fff" }}>{i + 1}</div>
                <div className="lb-bar-track">
                  <div className="lb-bar-fill" style={{ width: `${(row.pay / maxBoardPay) * 100}%`, background: row.employer.color }} />
                  <span className="lb-name">{row.employer.name}</span>
                </div>
                <span className="lb-amount">¥{row.pay.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link className="recap-teaser" to="/recap">
        <span className="t1">查看本月打工战绩</span>
        <span className="t2">点击生成本月总结 →</span>
      </Link>

      <p className="list-title">明细</p>
      <div className="entry-list">
        {personalConfirmed.length === 0 && <p className="empty-hint">打完第一次卡，这里就会出现你的战绩</p>}
        {personalConfirmed
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
                  <p className="d">
                    {new Date(e.startTime).toLocaleDateString()} · {entryHours(e).toFixed(1)}小时
                    {e.clockInLocation && (
                      <svg viewBox="0 0 24 24" fill="none" width="12" height="12" className="loc-ic">
                        <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z" fill="#8AB4A0" />
                        <circle cx="12" cy="9" r="2.4" fill="#fff" />
                      </svg>
                    )}
                  </p>
                </div>
                <span className="pay">¥{entryPay(emp, e).toFixed(1)}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
