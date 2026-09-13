import type { DictKey } from "./i18n";
import type { Employer } from "./types";

export type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export const WEEKDAYS: { key: WeekdayKey; labelKey: DictKey }[] = [
  { key: "0", labelKey: "weekdaySun" },
  { key: "1", labelKey: "weekdayMon" },
  { key: "2", labelKey: "weekdayTue" },
  { key: "3", labelKey: "weekdayWed" },
  { key: "4", labelKey: "weekdayThu" },
  { key: "5", labelKey: "weekdayFri" },
  { key: "6", labelKey: "weekdaySat" },
];

/** Today's scheduled hours for a fixed-schedule employer, or null if today isn't a working day / not fixed-mode. */
export function todaysSchedule(employer: Employer, now = new Date()): { start: string; end: string } | null {
  if (employer.scheduleMode !== "fixed") return null;
  const key = String(now.getDay()) as WeekdayKey;
  return employer.fixedSchedule?.[key] ?? null;
}

/** Combines a date with an "HH:MM" time string into an epoch ms timestamp, anchored to that date. */
export function combineDateAndTime(date: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime();
}
