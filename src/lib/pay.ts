import type { Adjustment, Employer, TimeEntry } from "./types";

export function entryHours(entry: TimeEntry, now = Date.now()): number {
  const end = entry.endTime ?? now;
  return Math.max(0, end - entry.startTime) / 3_600_000;
}

function adjustmentTotal(adjustments?: Adjustment[]): number {
  if (!adjustments) return 0;
  return adjustments.reduce(
    (sum, a) => sum + (a.type === "bonus" ? a.amount : -a.amount),
    0,
  );
}

/**
 * Per-entry pay estimate. `monthly` and the base-salary portion of
 * `base+overtime` aren't tied to a single shift, so they contribute 0 here --
 * those employers' income shows up in a lump sum elsewhere, not per entry.
 */
function rateMultiplier(employer: Employer, entry: TimeEntry): number {
  if (entry.isHoliday) return employer.holidayMultiplier ?? 1;
  if (entry.isOvertime) return employer.overtimeMultiplier ?? 1;
  return 1;
}

export function entryPay(employer: Employer, entry: TimeEntry, now = Date.now()): number {
  const hours = entryHours(entry, now);
  let base = 0;
  switch (employer.payType) {
    case "hourly":
    case "comprehensive":
      base = hours * (employer.hourlyRate ?? 0) * rateMultiplier(employer, entry);
      break;
    case "daily":
      base = employer.dailyRate ?? 0;
      break;
    case "per-order":
      base = (entry.orderCount ?? 0) * (employer.pricePerOrder ?? 0);
      break;
    case "base+overtime":
      // The base salary itself is a monthly lump sum, not tied to a single shift --
      // only overtime/holiday-flagged entries contribute a per-entry amount here.
      base = entry.isOvertime || entry.isHoliday
        ? hours * (employer.hourlyRate ?? 0) * rateMultiplier(employer, entry)
        : 0;
      break;
    case "monthly":
      base = 0;
      break;
  }
  return base + adjustmentTotal(entry.adjustment);
}

/** Physical time actually worked today, deduplicating overlapping concurrent shifts
 * across different employers (a rider dual-apping doesn't get 36-hour days). */
export function mergedHoursToday(entries: TimeEntry[], now = Date.now()): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();

  const ranges = entries
    .map((e) => [Math.max(e.startTime, dayStart), Math.min(e.endTime ?? now, now)] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const [s, e] of ranges) {
    if (s > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else {
      curEnd = Math.max(curEnd, e);
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total / 3_600_000;
}
