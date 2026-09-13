import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { watchEmployers, watchTimeEntries, watchUserProfile } from "../lib/firestore";
import { entryHours } from "../lib/pay";
import { consecutiveWeeksMeetingGoal, currentStreak, dateKey } from "../lib/stats";
import { useWeeklyGoal } from "../lib/settings";
import { DEFAULT_CURRENCY, currencySymbol } from "../lib/currency";
import { Mascot } from "../components/Mascot";
import { characterImageSrc, type AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import { TIER_ICONS, TIERS, currentTierIndex } from "../lib/tiers";
import type { Employer, TimeEntry } from "../lib/types";
import "./BadgeWallPage.css";

// Zigzag x-position (% of track width) for each path node, Duolingo-style.
const PATH_X = [50, 22, 78, 22, 78, 50];

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <rect x="6" y="10" width="12" height="9" rx="1.5" stroke="#B9AC9C" strokeWidth="1.8" />
    <path d="M8.5 10V7a3.5 3.5 0 017 0v3" stroke="#B9AC9C" strokeWidth="1.8" />
  </svg>
);

const LightningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#fff" /></svg>
);
const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
    <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="#fff" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
    <path d="M15.5 3.2a8.6 8.6 0 100 17.2 7 7 0 010-17.2z" fill="#fff" />
    <path d="M7.6 4.6l.6 1.5 1.5.5-1.5.5-.6 1.5-.6-1.5-1.5-.5 1.5-.5z" fill="#fff" />
  </svg>
);
const MoneyBagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
    <path d="M9.3 5.6L10.7 4h2.6l1.4 1.6c2.7.9 4.3 3.7 4.3 6.9 0 4.3-3.1 8-6.5 8s-6.5-3.7-6.5-8c0-3.2 1.6-6 4.3-6.9z" fill="#fff" />
  </svg>
);

interface Badge {
  name: string;
  cond: string;
  icon: ReactNode;
  unlocked: boolean;
}

export function BadgeWallPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [animal, setAnimal] = useState<AnimalKey | undefined>(undefined);
  const [mbti, setMbti] = useState<string | undefined>(undefined);
  const [weeklyGoal] = useWeeklyGoal();
  useEffect(() => {
    const unsubEntries = watchTimeEntries(uid, setEntries);
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubProfile = watchUserProfile(uid, (profile) => {
      setAnimal(profile.animal as AnimalKey | undefined);
      setMbti(profile.mbti || undefined);
    });
    return () => { unsubEntries(); unsubEmployers(); unsubProfile(); };
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

  const tierBadges: Badge[] = TIERS.map((tier, i) => ({
    name: t(tier.nameKey),
    cond: tier.threshold === 0 ? t("zeroHours") : t("fullHours", { n: tier.threshold }),
    icon: TIER_ICONS[i](),
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
    { name: t("badgeComboName"), cond: t("badgeComboCond"), icon: <LightningIcon />, unlocked: hasComboDay },
    { name: t("badgeStreakName"), cond: t("badgeStreakCond"), icon: <FlameIcon />, unlocked: streak >= 30 },
    { name: t("badgeNightName"), cond: t("badgeNightCond"), icon: <MoonIcon />, unlocked: nightShiftCount >= 10 },
    {
      name: t("badgeSaverName"),
      cond: t("badgeSaverCond", { sym: currencySymbol(DEFAULT_CURRENCY), goal: weeklyGoal, n: goalStreak }),
      icon: <MoneyBagIcon />,
      unlocked: goalStreak >= 3,
    },
  ];

  const [selected, setSelected] = useState<Badge | null>(null);

  const pathHeight = TIERS.length * 108 + 40;

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
          <div className="hero-companion-wrap">
            {animal ? (
              <img className="hero-companion" src={characterImageSrc(animal, mbti)} alt="" />
            ) : (
              <Mascot size={72} />
            )}
          </div>
          <p className="hero-title">{t(currentTier.nameKey)}</p>
          <div className="hero-track"><div className="hero-fill" style={{ width: `${progressPct}%` }} /></div>
          <p className="hero-note">
            {nextTier ? t("distanceToNext", { name: t(nextTier.nameKey), h: (nextTier.threshold - totalHours).toFixed(0) }) : t("topTierReached")}
          </p>
        </div>

        <div>
          <p className="section-label">{t("tierProgressLabel")}</p>
          <div className="tier-path" style={{ height: `${pathHeight}px` }}>
            <div className="tier-terrain t1" />
            <div className="tier-terrain t2" />
            <div className="tier-terrain t3" />
            <div className="tier-terrain t4" />
            <svg className="tier-path-line" viewBox={`0 0 100 ${pathHeight}`} preserveAspectRatio="none">
              <polyline
                className="road-shadow"
                points={TIERS.map((_, i) => `${PATH_X[i % PATH_X.length]},${i * 108 + 40}`).join(" ")}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="road-bed"
                points={TIERS.map((_, i) => `${PATH_X[i % PATH_X.length]},${i * 108 + 40}`).join(" ")}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="road-center tier-path-draw"
                points={TIERS.map((_, i) => `${PATH_X[i % PATH_X.length]},${i * 108 + 40}`).join(" ")}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="start-flag" style={{ left: `${PATH_X[0]}%`, top: `${pathHeight - 6}px` }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M6 20V4" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 5l11 3-11 3z" fill="var(--accent-coral)" stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>

            {TIERS.map((tier, i) => {
              const b = tierBadges[i];
              const isCurrent = i === currentTierIdx;
              return (
                <div
                  key={tier.nameKey}
                  className={`tier-node${b.unlocked ? " unlocked" : " locked"}${isCurrent ? " current" : ""}`}
                  style={{ left: `${PATH_X[i % PATH_X.length]}%`, top: `${i * 108 + 40}px`, animationDelay: `${i * 90}ms` }}
                  onClick={() => setSelected(b)}
                >
                  {isCurrent && (
                    <div className="tier-mascot">
                      {animal ? <img className="tier-mascot-img" src={characterImageSrc(animal, mbti)} alt="" /> : <Mascot size={40} />}
                    </div>
                  )}
                  <div className="tier-node-circle">
                    {b.unlocked ? b.icon : <LockIcon />}
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
            {funBadges.map((b, i) => (
              <div
                className={`badge${b.unlocked ? " unlocked" : " locked"}`}
                key={b.name}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => setSelected(b)}
              >
                <div className="badge-ic">{b.unlocked ? b.icon : <LockIcon />}</div>
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
            <div className="detail-icon-wrap">{selected.icon}</div>
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
