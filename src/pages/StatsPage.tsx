import { useEffect, useMemo, useState } from "react";
import { deleteField } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { updateTimeEntry, watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours, entryOvertimePay, entryPay, lumpSumAllTime, lumpSumForPeriod } from "../lib/pay";
import { DEFAULT_CURRENCY, currencySymbol, formatGroupedPay } from "../lib/currency";
import { currentStreak, dateKey, hoursByDay, leaderboard, moodDetailByDay, payByDay, startOfMonth, startOfWeek } from "../lib/stats";
import { useWeeklyGoal } from "../lib/settings";
import { ExportPanel } from "../components/ExportPanel";
import { useLang, useT } from "../lib/i18n";
import type { Employer, Mood, TimeEntry } from "../lib/types";
import "./StatsPage.css";

// Higher mood = higher up the chart (smaller y%, since SVG y grows downward).
const MOOD_Y: Record<Mood, number> = { crash: 78, normal: 52, great: 28, heartbeat: 10 };
const MOOD_COLOR: Record<Mood, string> = { crash: "#5AC8FA", normal: "#B9AC9C", great: "#FFD93D", heartbeat: "#FF6B6B" };
const MOOD_KEYS = [
  { key: "crash" as Mood, labelKey: "moodCrash" as const },
  { key: "normal" as Mood, labelKey: "moodNormal" as const },
  { key: "great" as Mood, labelKey: "moodGreat" as const },
  { key: "heartbeat" as Mood, labelKey: "moodHeartbeat" as const },
];

function MoodIcon({ mood, size = 18 }: { mood: Mood; size?: number }) {
  const c = MOOD_COLOR[mood];
  if (mood === "crash") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 15.5c1-1.3 2.2-2 3.5-2s2.5.7 3.5 2" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1.1" fill="#1A1A1A" />
        <circle cx="15" cy="10" r="1.1" fill="#1A1A1A" />
      </svg>
    );
  }
  if (mood === "normal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 14.5h7" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1.1" fill="#1A1A1A" />
        <circle cx="15" cy="10" r="1.1" fill="#1A1A1A" />
      </svg>
    );
  }
  if (mood === "great") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 13c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.7 9.5l.9.9M15.3 9.5l-.9.9" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 6.5a4.3 4.3 0 017.5 3.3C19.5 15.4 12 20 12 20z" fill={c} stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

const WEEKDAY_KEYS = ["weekdaySun", "weekdayMon", "weekdayTue", "weekdayWed", "weekdayThu", "weekdayFri", "weekdaySat"] as const;

type Viz = "trend" | "calendar" | "rank";
type RangeKey = "today" | "week" | "month" | "all";
const RANGES: { key: RangeKey; labelKey: "rangeToday" | "rangeWeek" | "rangeMonth" | "rangeAll" }[] = [
  { key: "today", labelKey: "rangeToday" },
  { key: "week", labelKey: "rangeWeek" },
  { key: "month", labelKey: "rangeMonth" },
  { key: "all", labelKey: "rangeAll" },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function StatsPage({ uid }: { uid: string }) {
  const t = useT();
  const { lang } = useLang();
  const monthLabel = useMemo(() => {
    const now = new Date();
    return lang === "en"
      ? now.toLocaleDateString("en-US", { month: "long" })
      : `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }, [lang]);
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [viz, setViz] = useState<Viz>("trend");
  const [weeklyGoal, setWeeklyGoal] = useWeeklyGoal();
  const [editingGoal, setEditingGoal] = useState(false);
  const [range, setRange] = useState<RangeKey>("month");
  const [filterEmployerIds, setFilterEmployerIds] = useState<Set<string>>(new Set());

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

  function toggleFilterEmployer(id: string) {
    setFilterEmployerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ---- Filtered view: date range + employer filter apply to the summary card and detail list ----
  const rangeStart = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : range === "month" ? startOfMonth() : 0;
  const filteredEntries = useMemo(
    () => personalConfirmed.filter((e) => e.startTime >= rangeStart && (filterEmployerIds.size === 0 || filterEmployerIds.has(e.employerId))),
    [personalConfirmed, rangeStart, filterEmployerIds],
  );

  const visibleEmployers = useMemo(
    () => employers.filter((emp) => filterEmployerIds.size === 0 || filterEmployerIds.has(emp.id)),
    [employers, filterEmployerIds],
  );

  const totalHours = filteredEntries.reduce((sum, e) => sum + entryHours(e), 0);
  const totalOvertimeHours = filteredEntries.reduce((sum, e) => sum + (e.overtimeHours ?? 0), 0);
  const totalOvertimePayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredEntries) {
      const emp = employerById.get(e.employerId);
      if (!emp) continue;
      const otPay = entryOvertimePay(emp, e);
      if (otPay > 0) {
        const cur = emp.currency ?? DEFAULT_CURRENCY;
        map.set(cur, (map.get(cur) ?? 0) + otPay);
      }
    }
    return map;
  }, [filteredEntries, employerById]);
  const totalPayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    const add = (emp: Employer, amount: number) => {
      const cur = emp.currency ?? DEFAULT_CURRENCY;
      map.set(cur, (map.get(cur) ?? 0) + amount);
    };
    for (const e of filteredEntries) {
      const emp = employerById.get(e.employerId);
      if (emp) add(emp, entryPay(emp, e));
    }
    // Lump-sum salary: all-time view sums one payout per distinct month worked;
    // a month-bounded view adds it once if any shift fell in that exact month.
    // A week/today view is too short a window for a monthly lump sum to fairly apply.
    if (range === "all") {
      for (const emp of visibleEmployers) add(emp, lumpSumAllTime(emp, personalConfirmed));
    } else if (range === "month") {
      for (const emp of visibleEmployers) add(emp, lumpSumForPeriod(emp, filteredEntries));
    }
    return map;
  }, [filteredEntries, employerById, range, visibleEmployers, personalConfirmed]);

  // ---- Mood curve: last 7 days ----
  const moodDetailMap = useMemo(() => moodDetailByDay(personalConfirmed), [personalConfirmed]);
  const entriesByDayMap = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of personalConfirmed) {
      const key = dateKey(e.startTime);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [personalConfirmed]);
  const last7Days = useMemo(() => {
    const days: { key: string; label: string; mood?: Mood; note?: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d.getTime());
      const detail = moodDetailMap.get(key);
      days.push({ key, label: t(WEEKDAY_KEYS[d.getDay()]), mood: detail?.mood, note: detail?.note });
    }
    return days;
  }, [moodDetailMap, t]);
  const [editingMoodDay, setEditingMoodDay] = useState<string | null>(null);
  const [draftMood, setDraftMood] = useState<Mood | undefined>(undefined);
  const [draftMoodNote, setDraftMoodNote] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  function openMoodEditor(day: { key: string; mood?: Mood; note?: string }) {
    if (!entriesByDayMap.has(day.key)) return; // nothing logged that day -- nothing to attach a mood to
    setEditingMoodDay(day.key);
    setDraftMood(day.mood);
    setDraftMoodNote(day.note ?? "");
  }

  async function saveMoodEditor() {
    const dayEntries = entriesByDayMap.get(editingMoodDay!);
    if (!dayEntries || dayEntries.length === 0) return;
    // Prefer whichever entry already carries the day's mood (matches moodDetailByDay's
    // pick); otherwise just attach it to the day's first shift.
    const target = dayEntries.find((e) => e.mood) ?? dayEntries[0];
    await updateTimeEntry(uid, target.id, {
      mood: draftMood ?? deleteField(),
      moodNote: draftMood && draftMoodNote.trim() ? draftMoodNote.trim() : deleteField(),
    });
    setEditingMoodDay(null);
  }
  const moodPoints = last7Days
    .map((d, i) => ({ ...d, x: (i / 6) * 100, y: d.mood ? MOOD_Y[d.mood] : null }))
    .filter((d): d is typeof d & { y: number } => d.y !== null);
  const moodLinePath = moodPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const moodAreaPath = moodPoints.length > 1
    ? `${moodLinePath} L${moodPoints[moodPoints.length - 1].x},100 L${moodPoints[0].x},100 Z`
    : "";
  const latestMoodDay = [...last7Days].reverse().find((d) => d.mood);
  const companionKey = latestMoodDay
    ? ({ crash: "companionCrash", normal: "companionNormal", great: "companionGreat", heartbeat: "companionHeartbeat" } as const)[latestMoodDay.mood!]
    : "companionEmpty";
  const moodCounts = useMemo(() => {
    const counts: Record<Mood, number> = { crash: 0, normal: 0, great: 0, heartbeat: 0 };
    for (const d of last7Days) if (d.mood) counts[d.mood]++;
    return MOOD_KEYS.map((m) => ({ key: m.key, n: counts[m.key] })).filter((m) => m.n > 0);
  }, [last7Days]);

  // ---- Trend: last 7 days bars ----
  const dailyPay = useMemo(() => payByDay(personalConfirmed, employerById), [personalConfirmed, employerById]);
  const dailyHours = useMemo(() => hoursByDay(personalConfirmed), [personalConfirmed]);
  const maxDailyPay = Math.max(1, ...last7Days.map((d) => dailyPay.get(d.key) ?? 0));
  const last7TotalHours = last7Days.reduce((s, d) => s + (dailyHours.get(d.key) ?? 0), 0);
  const last7TotalPayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    const last7Keys = new Set(last7Days.map((d) => d.key));
    for (const e of personalConfirmed) {
      if (!last7Keys.has(dateKey(e.startTime))) continue;
      const emp = employerById.get(e.employerId);
      if (emp) map.set(emp.currency ?? DEFAULT_CURRENCY, (map.get(emp.currency ?? DEFAULT_CURRENCY) ?? 0) + entryPay(emp, e));
    }
    return map;
  }, [personalConfirmed, employerById, last7Days]);
  const moodPayInsight = useMemo(() => {
    const withMood = last7Days.filter((d) => d.mood);
    if (withMood.length === 0) return null;
    const best = withMood.reduce((a, b) => ((dailyPay.get(b.key) ?? 0) > (dailyPay.get(a.key) ?? 0) ? b : a));
    const pay = dailyPay.get(best.key) ?? 0;
    if (pay <= 0) return null;
    return { day: best };
  }, [last7Days, dailyPay]);

  // ---- Calendar: current month heatmap ----
  // Leading blanks align day 1 under its actual weekday column (grid starts on Sunday).
  const calendarLeadingBlanks = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  }, []);

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
    return values.map((v, i) => ({
      day: i + 1,
      level: v === 0 ? 0 : v / max > 0.66 ? 3 : v / max > 0.33 ? 2 : 1,
    }));
  }, [dailyPay]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const monthStartMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let hours = 0;
    const payByCurrency = new Map<string, number>();
    for (const e of personalConfirmed) {
      if (e.startTime < monthStartMs) continue;
      hours += entryHours(e);
      const emp = employerById.get(e.employerId);
      if (emp) payByCurrency.set(emp.currency ?? DEFAULT_CURRENCY, (payByCurrency.get(emp.currency ?? DEFAULT_CURRENCY) ?? 0) + entryPay(emp, e));
    }
    return { hours, payByCurrency };
  }, [personalConfirmed, employerById]);

  const streak = useMemo(() => currentStreak(personalConfirmed), [personalConfirmed]);

  // ---- Streak calendar: same month grid as the pay heatmap, but binary punched/not ----
  const streakCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysWithEntry = new Set(personalConfirmed.map((e) => dateKey(e.startTime)));
    return Array.from({ length: daysInMonth }, (_, i) => {
      const key = dateKey(new Date(year, month, i + 1).getTime());
      return { day: i + 1, punched: daysWithEntry.has(key) };
    });
  }, [personalConfirmed]);

  // ---- Rank: this week's leaderboard + goal ring ----
  const weekStart = startOfWeek();
  const board = useMemo(() => leaderboard(personalConfirmed, employers, weekStart), [personalConfirmed, employers, weekStart]);
  const weekPay = board.reduce((sum, r) => sum + r.pay, 0);
  const weekHours = board.reduce((sum, r) => sum + r.hours, 0);
  const weekPayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of board) {
      const cur = r.employer.currency ?? DEFAULT_CURRENCY;
      map.set(cur, (map.get(cur) ?? 0) + r.pay);
    }
    return map;
  }, [board]);
  // Goal comparison assumes a single currency across employers -- weeklyGoal itself
  // is one plain number with no currency of its own (documented simplification).
  const goalPct = Math.min(100, Math.round((weekPay / weeklyGoal) * 100));
  const ringCircumference = 2 * Math.PI * 44;
  const ringOffset = ringCircumference * (1 - goalPct / 100);
  const maxBoardPay = Math.max(1, ...board.map((r) => r.pay));

  const heatHex = ["#FBF7EC", "#FFEFA8", "#FFD93D", "#E8B400"];

  return (
    <div className="stats-page">
      <h1>{t("statsTitle")}</h1>

      <div className="range-row">
        {RANGES.map((r) => (
          <button key={r.key} className={`range-chip${range === r.key ? " active" : ""}`} onClick={() => setRange(r.key)}>
            {t(r.labelKey)}
          </button>
        ))}
      </div>

      {employers.length > 1 && (
        <div className="filter-row">
          {employers.map((emp) => {
            const active = filterEmployerIds.has(emp.id);
            return (
              <button
                key={emp.id}
                className={`filter-chip${active ? " active" : ""}`}
                style={active ? { borderColor: emp.color } : undefined}
                onClick={() => toggleFilterEmployer(emp.id)}
              >
                <span className="dot" style={{ background: emp.color }} />
                {emp.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="summary-card">
        <div className="summary-card-header">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="#1A1A1A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="summary-card-title">{t("summaryCardTitle")}</p>
        </div>
        <div className="summary-card-row">
          <div className="stat"><p className="num">{totalHours.toFixed(1)}h</p><p className="lb">{t(range === "all" ? "cumulativeHours" : "periodHours")}</p></div>
          <div className="stat"><p className="num">{formatGroupedPay(totalPayByCurrency)}</p><p className="lb">{t(range === "all" ? "cumulativePay" : "periodPay")}</p></div>
        </div>
      </div>

      {totalOvertimeHours > 0.05 && (
        <div className="overtime-summary-card">
          <div className="overtime-summary-header">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="#fff" />
            </svg>
            <p className="overtime-summary-title">{t("overtimeHoursLabel")}</p>
          </div>
          <div className="overtime-summary-row">
            <div className="stat"><p className="num">{totalOvertimeHours.toFixed(1)}h</p><p className="lb">{t("overtimeHoursSub")}</p></div>
            <div className="stat"><p className="num">{formatGroupedPay(totalOvertimePayByCurrency)}</p><p className="lb">{t("overtimePaySub")}</p></div>
          </div>
        </div>
      )}

      <div className="viz-tabs">
        <button className={`viz-tab${viz === "trend" ? " active" : ""}`} onClick={() => setViz("trend")}>{t("vizTrend")}</button>
        <button className={`viz-tab${viz === "calendar" ? " active" : ""}`} onClick={() => setViz("calendar")}>{t("vizCalendar")}</button>
        <button className={`viz-tab${viz === "rank" ? " active" : ""}`} onClick={() => setViz("rank")}>{t("vizRank")}</button>
      </div>

      {viz === "trend" && (
        <div className="chart-card">
          <p className="title">{t("trendTitle")}</p>
          <div className="chart-summary-row">
            <span className="chart-summary-item"><b>{last7TotalHours.toFixed(1)}h</b>{t("chartHoursLabel")}</span>
            <span className="chart-summary-item"><b>{formatGroupedPay(last7TotalPayByCurrency)}</b>{t("chartPayLabel")}</span>
          </div>
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
            {t("streakDays", { n: streak })}
          </span>
          <p className="title">{t("payCalendarTitle", { month: monthLabel })}</p>
          <div className="chart-summary-row">
            <span className="chart-summary-item"><b>{monthTotals.hours.toFixed(1)}h</b>{t("chartHoursLabel")}</span>
            <span className="chart-summary-item"><b>{formatGroupedPay(monthTotals.payByCurrency)}</b>{t("chartPayLabel")}</span>
          </div>
          <div className="weekday-header">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="heatmap">
            {Array.from({ length: calendarLeadingBlanks }).map((_, i) => <div className="heat-cell blank" key={`b${i}`} />)}
            {heatCells.map(({ day, level }) => (
              <div className="heat-cell" key={day} style={{ background: heatHex[level] }}>
                <span className="cell-day">{day}</span>
              </div>
            ))}
          </div>
          <div className="heat-legend">
            <span>少</span>
            {heatHex.map((hex) => <i key={hex} style={{ background: hex }} />)}
            <span>多</span>
          </div>

          <p className="title" style={{ marginTop: 16 }}>{t("streakCalendarTitle", { month: monthLabel })}</p>
          <div className="weekday-header">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="heatmap streak-grid">
            {Array.from({ length: calendarLeadingBlanks }).map((_, i) => <div className="streak-cell blank" key={`b${i}`} />)}
            {streakCells.map(({ day, punched }) => (
              <div key={day} className={`streak-cell${punched ? " lit" : ""}`}>
                {punched ? (
                  <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                    <path d="M12 2.5c-1.2 2.3-4.5 3.6-4.5 8a4.5 4.5 0 009 0c0-1.4-.5-2.3-1.1-3 .1 1.2-.5 2-1.3 2.3.6-2.4-1-3.6-2.1-7.3z" fill="#fff" />
                  </svg>
                ) : (
                  <span className="cell-day">{day}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viz === "rank" && (
        <div className="chart-card">
          <p className="title">{t("weeklyGoalTitle")}</p>
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
              <div className="num"><b>{goalPct}%</b><span>{t("weeklyGoalPct")}</span></div>
            </div>
            <div className="ring-note-col">
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
                  {t("goalLabel")} <b>{currencySymbol(DEFAULT_CURRENCY)}{weeklyGoal}</b>，{t("earnedLabel")} <b>{formatGroupedPay(weekPayByCurrency)}</b>{t("tapToEditGoal")}
                </p>
              )}
              <p className="ring-hours-note">{t("weekHoursNote", { h: weekHours.toFixed(1) })}</p>
            </div>
          </div>

          <p className="title" style={{ marginTop: 18 }}>{t("leaderboardTitle")}</p>
          {board.length === 0 && <p className="empty-hint">{t("leaderboardEmpty")}</p>}
          <div className="leaderboard">
            {board.map((row, i) => (
              <div className="lb-row" key={row.employer.id}>
                <div className="lb-rank" style={{ background: i === 0 ? "#FFD93D" : "#fff" }}>{i + 1}</div>
                <div className="lb-bar-track">
                  <div className="lb-bar-fill" style={{ width: `${(row.pay / maxBoardPay) * 100}%`, background: row.employer.color }} />
                  <span className="lb-name">{row.employer.name}</span>
                </div>
                <div className="lb-amount-col">
                  <span className="lb-amount">{currencySymbol(row.employer.currency)}{row.pay.toFixed(0)}</span>
                  <span className="lb-hours">{row.hours.toFixed(1)}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chart-card">
        <p className="title">{t("moodStripTitle")}</p>
        <div className="mood-curve">
          <svg className="mood-curve-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[10, 28, 52, 78].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(26,26,26,0.06)" strokeWidth="1" />
            ))}
            {moodAreaPath && <path d={moodAreaPath} fill="url(#moodFill)" />}
            {moodLinePath && <path d={moodLinePath} fill="none" stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />}
          </svg>
          {last7Days.map((d, i) => {
            const x = (i / 6) * 100;
            const y = d.mood ? MOOD_Y[d.mood] : 52;
            return (
              <button
                key={d.key}
                type="button"
                className={`mood-point${d.mood ? "" : " empty"}${!d.mood && entriesByDayMap.has(d.key) ? " loggable" : ""}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => openMoodEditor(d)}
              >
                {d.mood ? <MoodIcon mood={d.mood} /> : <span className="mood-dot" />}
              </button>
            );
          })}
          <div className="mood-x-labels">
            {last7Days.map((d) => <span key={d.key}>{d.label}</span>)}
          </div>
        </div>

        {moodCounts.length > 0 && (
          <div className="mood-dist-row">
            {moodCounts.map(({ key, n }) => (
              <span className="mood-dist-chip" key={key}>
                <MoodIcon mood={key} size={13} />
                ×{n}
              </span>
            ))}
          </div>
        )}

        {editingMoodDay && (
          <div className="mood-editor">
            <div className="mood-edit-tags">
              {MOOD_KEYS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`mood-edit-tag${draftMood === m.key ? " selected" : ""}`}
                  onClick={() => setDraftMood(draftMood === m.key ? undefined : m.key)}
                >
                  <MoodIcon mood={m.key} size={16} />
                  {t(m.labelKey)}
                </button>
              ))}
            </div>
            {draftMood && (
              <input
                className="mood-edit-note"
                maxLength={30}
                placeholder={t("moodNotePlaceholder")}
                value={draftMoodNote}
                onChange={(e) => setDraftMoodNote(e.target.value)}
              />
            )}
            <div className="mood-editor-actions">
              <button type="button" className="mood-editor-cancel" onClick={() => setEditingMoodDay(null)}>{t("cancel")}</button>
              <button type="button" className="mood-editor-save" onClick={saveMoodEditor}>{t("confirmSave")}</button>
            </div>
          </div>
        )}

        <p className="mood-companion">
          {moodPayInsight ? t("moodPayInsight", { day: moodPayInsight.day.label, mood: t(MOOD_KEYS.find((m) => m.key === moodPayInsight.day.mood)!.labelKey) }) : t(companionKey)}
        </p>
      </div>

      <Link className="recap-teaser" to="/recap">
        <span className="t1">{t("recapTeaserT1")}</span>
        <span className="t2">{t("recapTeaserT2")}</span>
      </Link>

      <div className="list-title-row">
        <p className="list-title">{t("detailListTitle")}{range !== "all" ? `（${t(RANGES.find((r) => r.key === range)!.labelKey)}）` : ""}</p>
        <button
          className="export-btn"
          disabled={filteredEntries.length === 0}
          onClick={() => setExportOpen(true)}
        >
          {t("exportCsv")}
        </button>
      </div>

      {exportOpen && (
        <ExportPanel
          entries={filteredEntries}
          employerById={employerById}
          filenameBase={`gigtime-明细-${range}`}
          onClose={() => setExportOpen(false)}
        />
      )}
      <div className="entry-list">
        {filteredEntries.length === 0 && <p className="empty-hint">{t("detailEmpty")}</p>}
        {filteredEntries
          .slice()
          .sort((a, b) => b.startTime - a.startTime)
          .map((e) => {
            const emp = employerById.get(e.employerId);
            if (!emp) return null;
            return (
              <div className="entry" key={e.id} onClick={() => navigate(`/entries/new?editId=${e.id}`)} role="button" tabIndex={0}>
                <span className="dot" style={{ background: emp.color }} />
                <div className="info">
                  <p className="n">{emp.name}</p>
                  <p className="d">
                    {new Date(e.startTime).toLocaleDateString()} · {entryHours(e).toFixed(1)}小时
                    {e.overtimeHours && e.overtimeHours > 0.05 ? (
                      <span className="entry-ot-chip">
                        <svg viewBox="0 0 24 24" fill="none" width="9" height="9">
                          <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="currentColor" />
                        </svg>
                        {t("entryOvertimeChip", { h: e.overtimeHours.toFixed(1) })}
                      </span>
                    ) : null}
                    {e.clockInLocation && (
                      <svg viewBox="0 0 24 24" fill="none" width="12" height="12" className="loc-ic">
                        <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z" fill="#8AB4A0" />
                        <circle cx="12" cy="9" r="2.4" fill="#fff" />
                      </svg>
                    )}
                  </p>
                </div>
                <div className="pay-col">
                  <span className="pay">{currencySymbol(emp.currency)}{entryPay(emp, e).toFixed(1)}</span>
                  {(() => {
                    const otPay = entryOvertimePay(emp, e);
                    return otPay > 0 ? (
                      <span className="pay-ot-sub">
                        <svg viewBox="0 0 24 24" fill="none" width="8" height="8">
                          <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="currentColor" />
                        </svg>
                        {t("entryOvertimePaySub", { pay: `${currencySymbol(emp.currency)}${otPay.toFixed(1)}` })}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
