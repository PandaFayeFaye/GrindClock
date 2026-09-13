import type { DictKey } from "./i18n";

export const TIERS: { nameKey: DictKey; threshold: number; icon: string }[] = [
  { nameKey: "tierNewbie", threshold: 0, icon: "🌱" },
  { nameKey: "tierSlacker", threshold: 10, icon: "🐣" },
  { nameKey: "tierGrinder", threshold: 50, icon: "💪" },
  { nameKey: "tierGrindCandidate", threshold: 200, icon: "🔥" },
  { nameKey: "tierKing", threshold: 500, icon: "👑" },
];

export function currentTierIndex(totalHours: number): number {
  return TIERS.reduce((idx, tier, i) => (totalHours >= tier.threshold ? i : idx), 0);
}
