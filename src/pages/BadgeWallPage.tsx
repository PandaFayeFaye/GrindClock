import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryHours } from "../lib/pay";
import { consecutiveWeeksMeetingGoal, currentStreak, dateKey } from "../lib/stats";
import { useWeeklyGoal } from "../lib/settings";
import { DEFAULT_CURRENCY, currencySymbol } from "../lib/currency";
import { Mascot } from "../components/Mascot";
import { useT } from "../lib/i18n";
import { TIERS, currentTierIndex } from "../lib/tiers";
import type { Employer, TimeEntry } from "../lib/types";
import "./BadgeWallPage.css";

// Zigzag x-position (% of track width) for each path node, Duolingo-style.
const PATH_X = [50, 22, 78, 22, 78, 50];

interface Badge {
  name: string;
  cond: string;
  unlocked: boolean;
}

export function BadgeWallPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [weeklyGoal] = useWeeklyGoal();
  useEffect(() => {
    const unsubEntries = watchTimeEntries(uid, setEntries);
    const unsubEmployers = watchEmployers(uid, setEmployers);
    return () => { unsubEntries(); unsubEmployers(); };
  }, [uid]);
  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);

  const personalConfirmed = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime),
    [entries],
  );
  const totalHours = personalConfirmed.reduce((s, e) => s + entryHours(e), 0);

  const currentTierIdx = currentTierIndex(totalHours);
  const currentTier = TIERS[currentTierIdx];
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier
    ? Math.min(100, Math.round(((totalHours - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100))
    : 100;

  const tierBadges: Badge[] = TIERS.map((tier) => ({
    name: t(tier.nameKey),
    cond: tier.threshold === 0 ? t("zeroHours") : t("fullHours", { n: tier.threshold }),
    unlocked: totalHours >= tier.threshold,
  }));

  const hasComboDay = useMemo(() => {
    const byDay = new Map<string, Set<string>>();
    for (const e of personalConfirmed) {
      const key = dateKey(e.startTime);
      const set = byDay.get(key) ?? new Set<string>();
      set.add(e.employerId);
      byDay.set(key, set);
    }
    return [...byDay.values()].some((set) => set.size >= 2);
  }, [personalConfirmed]);

  const nightShiftCount = personalConfirmed.filter((e) => new Date(e.startTime).getHours() >= 22).length;
  const streak = currentStreak(personalConfirmed);
  const goalStreak = useMemo(
    () => consecutiveWeeksMeetingGoal(personalConfirmed, employerById, weeklyGoal),
    [personalConfirmed, employerById, weeklyGoal],
  );

  const funBadges: Badge[] = [
    { name: t("badgeComboName"), cond: t("badgeComboCond"), unlocked: hasComboDay },
    { name: t("badgeStreakName"), cond: t("badgeStreakCond"), unlocked: streak >= 30 },
    { name: t("badgeNightName"), cond: t("badgeNightCond"), unlocked: nightShiftCount >= 10 },
    {
      name: t("badgeSaverName"),
      cond: t("badgeSaverCond", { sym: currencySymbol(DEFAULT_CURRENCY), goal: weeklyGoal, n: goalStreak }),
      unlocked: goalStreak >= 3,
    },
  ];

  const [selected, setSelected] = useState<Badge | null>(null);

  return (
    <div className="badge-page">
      <div className="topbar">
        <button className="back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1>{t("badgeWallTitle")}</h1>
      </div>

      <div className="body">
        <div className="hero">
          <p className="hero-title">{t(currentTier.nameKey)}</p>
          <div className="hero-track"><div className="hero-fill" style={{ width: `${progressPct}%` }} /></div>
          <p className="hero-note">
            {nextTier ? t("distanceToNext", { name: t(nextTier.nameKey), h: (nextTier.threshold - totalHours).toFixed(0) }) : t("topTierReached")}
          </p>
        </div>

        <div>
          <p className="section-label">{t("tierProgressLabel")}</p>
          <div className="tier-path" style={{ height: `${TIERS.length * 108 + 40}px` }}>
            <svg className="tier-path-line" viewBox={`0 0 100 ${TIERS.length * 108 + 40}`} preserveAspectRatio="none">
              <polyline
                points={TIERS.map((_, i) => `${PATH_X[i % PATH_X.length]},${i * 108 + 40}`).join(" ")}
                fill="none"
                stroke="#DDD6C2"
                strokeWidth="3"
                strokeDasharray="1 7"
                strokeLinecap="round"
              />
            </svg>
            {TIERS.map((tier, i) => {
              const b = tierBadges[i];
              const isCurrent = i === currentTierIdx;
              return (
                <div
                  key={tier.nameKey}
                  className={`tier-node${b.unlocked ? " unlocked" : " locked"}${isCurrent ? " current" : ""}`}
                  style={{ left: `${PATH_X[i % PATH_X.length]}%`, top: `${i * 108 + 40}px` }}
                  onClick={() => setSelected(b)}
                >
                  {isCurrent && (
                    <div className="tier-mascot">
                      <Mascot size={40} />
                    </div>
                  )}
                  <div className="tier-node-circle">
                    {b.unlocked ? (
                      <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                        <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" fill="#fff" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                        <rect x="6" y="10" width="12" height="9" rx="1.5" stroke="#B9AC9C" strokeWidth="1.8" />
                        <path d="M8.5 10V7a3.5 3.5 0 017 0v3" stroke="#B9AC9C" strokeWidth="1.8" />
                      </svg>
                    )}
                  </div>
                  <span className="tier-node-label">{t(tier.nameKey)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="section-label">{t("hiddenAchievements")}</p>
          <div className="badge-grid">
            {funBadges.map((b) => (
              <div className={`badge${b.unlocked ? " unlocked" : " locked"}`} key={b.name} onClick={() => setSelected(b)}>
                <div className="badge-ic">
                  {b.unlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" fill="#1A1A1A" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <rect x="6" y="10" width="12" height="9" rx="1.5" stroke="#B9AC9C" strokeWidth="1.8" />
                      <path d="M8.5 10V7a3.5 3.5 0 017 0v3" stroke="#B9AC9C" strokeWidth="1.8" />
                    </svg>
                  )}
                </div>
                <span className="badge-name">{b.name}</span>
                <span className="badge-cond">{b.cond}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="backdrop" onClick={() => setSelected(null)}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()}>
            <p className="detail-name">{selected.name}</p>
            <span className={`detail-status ${selected.unlocked ? "on" : "off"}`}>
              {selected.unlocked ? t("unlocked") : t("locked")}
            </span>
            <p className="detail-cond">{t("unlockCondition", { cond: selected.cond })}</p>
            <button className="detail-close" onClick={() => setSelected(null)}>{t("gotIt")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
