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
