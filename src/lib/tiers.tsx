import type { ReactElement } from "react";
import type { DictKey } from "./i18n";

export const TIERS: { nameKey: DictKey; threshold: number }[] = [
  { nameKey: "tierNewbie", threshold: 0 },
  { nameKey: "tierSlacker", threshold: 10 },
  { nameKey: "tierGrinder", threshold: 50 },
  { nameKey: "tierGrindCandidate", threshold: 200 },
  { nameKey: "tierKing", threshold: 500 },
];

export function currentTierIndex(totalHours: number): number {
  return TIERS.reduce((idx, tier, i) => (totalHours >= tier.threshold ? i : idx), 0);
}

// Each tier gets its own signature color so titles read as distinct stages,
// not five copies of the same badge -- escalating green -> sky -> yellow ->
// coral -> purple as the "prestige" ramps up.
export const TIER_COLORS: string[] = [
  "var(--accent-green)",
  "var(--accent-skyblue)",
  "var(--accent-yellow)",
  "var(--accent-coral)",
  "var(--accent-purple)",
];

// One hand-drawn icon per tier (sprout -> hatchling -> dumbbell -> flame -> crown),
// filled white so they sit on the tier node's colored circle background.
export const TIER_ICONS: (() => ReactElement)[] = [
  () => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M12 21v-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 14C7.5 14 5 10.8 5 7c3.9 0 7 2.3 7 7z" fill="#fff" />
      <path d="M12 14c4.5 0 7-3.2 7-7-3.9 0-7 2.3-7 7z" fill="#fff" />
    </svg>
  ),
  () => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M12 4c-4 0-6.5 6.2-6.5 10.2A6.5 6.5 0 0012 20.5a6.5 6.5 0 006.5-6.3C18.5 10.2 16 4 12 4z" fill="#fff" />
      <path d="M9.3 10.5l1.8 1.6-1.8 1.6 2.4 1.3" stroke="#C9BBA0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  () => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <rect x="2" y="9.5" width="4" height="5" rx="1.2" fill="#fff" />
      <rect x="18" y="9.5" width="4" height="5" rx="1.2" fill="#fff" />
      <rect x="6" y="11" width="12" height="2" rx="1" fill="#fff" />
    </svg>
  ),
  () => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M12 2.2c1.7 3.8-2 5-2 8.6a2 2 0 104 0c0-1.1-.6-1.6-.6-1.6.9.9 1.7 2.4 1.7 3.8a5 5 0 11-10 0c0-5.1 4-6.6 3-10.8z" fill="#fff" />
    </svg>
  ),
  () => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M4 18.5h16l-1.3-7.6-4 3.3-2.7-5.5-2.7 5.5-4-3.3z" fill="#fff" />
      <rect x="4" y="18.5" width="16" height="2" rx="1" fill="#fff" />
    </svg>
  ),
];
