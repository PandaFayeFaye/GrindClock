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

/** Hours actually paid for a shift: clocked duration minus the employer's unpaid break. */
function payableHours(employer: Employer, entry: TimeEntry, now = Date.now()): number {
  const breakHours = (employer.breakMinutes ?? 0) / 60;
  return Math.max(0, entryHours(entry, now) - breakHours);
}

export function entryPay(employer: Employer, entry: TimeEntry, now = Date.now()): number {
  const hours = payableHours(employer, entry, now);
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

function isConfirmedPersonalFor(employerId: string) {
  return (e: TimeEntry) => e.employerId === employerId && !e.workerId && e.status === "confirmed" && !!e.endTime;
}

/**
 * `monthly` and `base+overtime` pay a fixed lump sum that isn't tied to any
 * single shift -- entryPay() deliberately returns 0 for it there. This adds
 * that lump sum back in for a given set of entries, once, if the employee
 * actually logged at least one shift for that employer in the period (no
 * shifts logged = nothing earned, even on a nominal salary).
 */
export function lumpSumForPeriod(employer: Employer, periodEntries: TimeEntry[]): number {
  const amount = employer.payType === "monthly" ? employer.monthlySalary ?? 0
    : employer.payType === "base+overtime" ? employer.baseSalary ?? 0
    : 0;
  if (amount <= 0) return 0;
  return periodEntries.some(isConfirmedPersonalFor(employer.id)) ? amount : 0;
}

/** All-time version of lumpSumForPeriod: pays once per distinct calendar month
 * the employee logged at least one shift, since a monthly salary recurs monthly. */
export function lumpSumAllTime(employer: Employer, entries: TimeEntry[]): number {
  const amount = employer.payType === "monthly" ? employer.monthlySalary ?? 0
    : employer.payType === "base+overtime" ? employer.baseSalary ?? 0
    : 0;
  if (amount <= 0) return 0;
  const months = new Set<string>();
  for (const e of entries) {
    if (!isConfirmedPersonalFor(employer.id)(e)) continue;
    const d = new Date(e.startTime);
    months.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  return months.size * amount;
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
