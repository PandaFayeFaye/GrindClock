import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries, watchUserProfile } from "../lib/firestore";
import { entryHours, entryOvertimePay, entryPay, lumpSumForPeriod } from "../lib/pay";
import { DEFAULT_CURRENCY, currencySymbol, formatGroupedPay } from "../lib/currency";
import { currentStreak, dateKey, leaderboard, startOfMonth } from "../lib/stats";
import { downloadBlob, renderRecapShareImage } from "../lib/shareImage";
import { useLang, useT } from "../lib/i18n";
import { TIERS, currentTierIndex } from "../lib/tiers";
import { characterImageSrc, type AnimalKey } from "../lib/avatar";
import { Mascot } from "../components/Mascot";
import type { Employer, TimeEntry } from "../lib/types";
import "./MonthlyRecapPage.css";

const EN_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SLIDE_COUNT = 6;

function useCountUp(target: number, active: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);
  return value;
}

export function MonthlyRecapPage({ uid }: { uid: string }) {
  const t = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [animal, setAnimal] = useState<AnimalKey | undefined>(undefined);
  const [mbti, setMbti] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    const unsubProfile = watchUserProfile(uid, (profile) => {
      setAnimal(profile.animal as AnimalKey | undefined);
      setMbti(profile.mbti || undefined);
    });
    return () => { unsubEmployers(); unsubEntries(); unsubProfile(); };
  }, [uid]);

  const monthStart = startOfMonth();
  const prevMonthStart = useMemo(() => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() - 1);
    return d.getTime();
  }, [monthStart]);

  const monthEntries = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime && e.startTime >= monthStart),
    [entries, monthStart],
  );
  const prevMonthEntries = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime && e.startTime >= prevMonthStart && e.startTime < monthStart),
    [entries, prevMonthStart, monthStart],
  );

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);
  const totalHours = monthEntries.reduce((s, e) => s + entryHours(e), 0);
  const prevTotalHours = prevMonthEntries.reduce((s, e) => s + entryHours(e), 0);
  const hoursDeltaPct = prevTotalHours > 0 ? Math.round(((totalHours - prevTotalHours) / prevTotalHours) * 100) : null;

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

  const totalOvertimeHours = useMemo(() => monthEntries.reduce((s, e) => s + (e.overtimeHours ?? 0), 0), [monthEntries]);
  const totalOvertimePayByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthEntries) {
      const emp = employerById.get(e.employerId);
      if (!emp) continue;
      const otPay = entryOvertimePay(emp, e);
      if (otPay > 0) {
        const cur = emp.currency ?? DEFAULT_CURRENCY;
        map.set(cur, (map.get(cur) ?? 0) + otPay);
      }
    }
    return map;
  }, [monthEntries, employerById]);

  const board = useMemo(() => leaderboard(monthEntries, employers, monthStart, true), [monthEntries, employers, monthStart]);
  const topEmployer = board[0]?.employer.name ?? "—";
  const streak = useMemo(() => currentStreak(entries), [entries]);

  const monthNames = lang === "en" ? EN_MONTH_NAMES : null;

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

  const allTimeHours = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime).reduce((s, e) => s + entryHours(e), 0),
    [entries],
  );
  const tierIdx = currentTierIndex(allTimeHours);
  const tier = TIERS[tierIdx];

  const hoursCount = useCountUp(totalHours, slide === 1);
  const singleCurrency = totalPayByCurrency.size <= 1;
  const singleCurrencyCode = Array.from(totalPayByCurrency.keys())[0] ?? DEFAULT_CURRENCY;
  const payTarget = totalPayByCurrency.get(singleCurrencyCode) ?? 0;
  const payCount = useCountUp(payTarget, slide === 2);

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
      downloadBlob(blob, `grindclock-recap-${monthLabel}.png`);
    } finally {
      setGenerating(false);
    }
  }

  function goTo(next: number) {
    setSlide(Math.max(0, Math.min(SLIDE_COUNT - 1, next)));
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goTo(slide - 1);
    else goTo(slide + 1);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) goTo(dx > 0 ? slide - 1 : slide + 1);
    touchStartX.current = null;
  }

  return (
    <div className="recap-page">
      <span className="sticker c1" />
      <span className="sticker c2" />
      <span className="sticker c3" />

      <div className="topbar">
        <div className="story-dots">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <span key={i} className={`story-dot${i === slide ? " active" : i < slide ? " done" : ""}`} />
          ))}
        </div>
        <button className="close-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="recap-tap-zone" onClick={handleTap} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {slide === 0 && (
          <div className="slide slide-cover" key="s0">
            {animal ? (
              <img className="recap-companion" src={characterImageSrc(animal, mbti)} alt="" />
            ) : (
              <Mascot size={120} />
            )}
            <p className="eyebrow">{t("recapEyebrow", { month: monthLabel })}</p>
            <p className="cover-headline">{t("recapCoverHeadline")}</p>
            <p className="tap-hint">{t("recapTapHint")}</p>
          </div>
        )}

        {slide === 1 && (
          <div className="slide" key="s1">
            <p className="eyebrow">{t("recapHoursEyebrow")}</p>
            <p className="big-number">{hoursCount.toFixed(0)}<span className="big-number-unit">{t("recapHoursUnit")}</span></p>
            {hoursDeltaPct !== null && (
              <p className={`delta-chip${hoursDeltaPct >= 0 ? " up" : " down"}`}>
                {hoursDeltaPct >= 0 ? "▲" : "▼"} {t("recapVsLastMonth", { pct: Math.abs(hoursDeltaPct) })}
              </p>
            )}
            <p className="slide-caption">{t("recapHoursCaption", { n: employers.length })}</p>
            {totalOvertimeHours > 0.05 && (
              <p className="recap-ot-note">{t("recapOvertimeHoursNote", { h: totalOvertimeHours.toFixed(1) })}</p>
            )}
          </div>
        )}

        {slide === 2 && (
          <div className="slide" key="s2">
            <p className="eyebrow">{t("recapPayEyebrow")}</p>
            <p className="big-number">
              {singleCurrency ? `${currencySymbol(singleCurrencyCode)}${payCount.toFixed(0)}` : formatGroupedPay(totalPayByCurrency)}
            </p>
            <p className="slide-caption">{t("recapPayCaption", { name: topEmployer })}</p>
            {totalOvertimePayByCurrency.size > 0 && (
              <p className="recap-ot-note">{t("recapOvertimePayNote", { pay: formatGroupedPay(totalOvertimePayByCurrency) })}</p>
            )}
          </div>
        )}

        {slide === 3 && (
          <div className="slide" key="s3">
            <p className="eyebrow">{t("recapHighlightsEyebrow")}</p>
            <div className="grid">
              <div className="stat-tile stagger-1"><p className="n">{t("daysUnit", { n: streak })}</p><p className="l">{t("currentStreakLabel")}</p></div>
              <div className="stat-tile stagger-2"><p className="n">{topEmployer}</p><p className="l">{t("topEmployerLabel")}</p></div>
              <div className="stat-tile stagger-3"><p className="n">{hardestDay}</p><p className="l">{t("memorableDayLabel")}</p></div>
              <div className="stat-tile stagger-4"><p className="n">{formatGroupedPay(totalPayByCurrency)}</p><p className="l">{t("crossEmployerTotal", { n: employers.length })}</p></div>
              {totalOvertimeHours > 0.05 && (
                <div className="stat-tile stat-tile-ot stagger-5">
                  <p className="n">{totalOvertimeHours.toFixed(1)}h · {formatGroupedPay(totalOvertimePayByCurrency)}</p>
                  <p className="l">{t("recapOvertimeTileLabel")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {slide === 4 && (
          <div className="slide" key="s4">
            <p className="eyebrow">{t("monthActivity")}</p>
            <div className="heat-mini">
              <div className="heat-grid">
                {heatCells.map((level, i) => (
                  <div className="heat-cell pop-in" style={{ background: heatHex[level], animationDelay: `${i * 12}ms` }} key={i} />
                ))}
              </div>
            </div>
            <p className="slide-caption">{t("recapHeatCaption")}</p>
          </div>
        )}

        {slide === 5 && (
          <div className="slide slide-finale" key="s5">
            <div className="confetti-wrap">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={`confetti c${i % 6}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 130) % 900}ms` }} />
              ))}
            </div>
            {animal ? (
              <img className="recap-companion finale" src={characterImageSrc(animal, mbti)} alt="" />
            ) : (
              <Mascot size={110} />
            )}
            <p className="eyebrow">{t("recapTierEyebrow")}</p>
            <p className="tier-reveal">{t(tier.nameKey)}</p>
            <div className="actions">
              <button className="share-btn" onClick={handleShare} disabled={generating}>
                {generating ? t("generatingBtn") : t("generateShareImage")}
              </button>
              <button className="detail-link" onClick={() => navigate("/stats")}>{t("viewFullDetail")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
