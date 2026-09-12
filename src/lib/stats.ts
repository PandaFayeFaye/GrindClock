import type { Employer, Mood, TimeEntry } from "./types";
import { entryHours, entryPay } from "./pay";

export function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isConfirmedPersonal(e: TimeEntry) {
  return !e.workerId && e.status === "confirmed" && e.endTime;
}

/** Total pay per calendar day, for the heatmap. Key is `YYYY-M-D`. */
export function payByDay(entries: TimeEntry[], employerById: Map<string, Employer>): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!isConfirmedPersonal(e)) continue;
    const emp = employerById.get(e.employerId);
    if (!emp) continue;
    const key = dateKey(e.startTime);
    map.set(key, (map.get(key) ?? 0) + entryPay(emp, e));
  }
  return map;
}

/** Consecutive days (including today) with at least one confirmed entry. */
export function currentStreak(entries: TimeEntry[], now = Date.now()): number {
  const daysWithEntries = new Set(
    entries.filter(isConfirmedPersonal).map((e) => dateKey(e.startTime)),
  );
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  // If nothing logged today yet, the streak still "counts" through yesterday.
  if (!daysWithEntries.has(dateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daysWithEntries.has(dateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const MOOD_PRIORITY: Mood[] = ["crash", "heartbeat", "great", "normal"];

/** One representative mood per day (worst/most-notable wins when several entries share a day). */
export function moodByDay(entries: TimeEntry[]): Map<string, Mood> {
  const map = new Map<string, Mood>();
  for (const e of entries) {
    if (!isConfirmedPersonal(e) || !e.mood) continue;
    const key = dateKey(e.startTime);
    const existing = map.get(key);
    if (!existing || MOOD_PRIORITY.indexOf(e.mood) < MOOD_PRIORITY.indexOf(existing)) {
      map.set(key, e.mood);
    }
  }
  return map;
}

export interface LeaderboardRow {
  employer: Employer;
  hours: number;
  pay: number;
}

export function leaderboard(entries: TimeEntry[], employers: Employer[], since: number): LeaderboardRow[] {
  const byId = new Map(employers.map((e) => [e.id, e]));
  const totals = new Map<string, { hours: number; pay: number }>();
  for (const e of entries) {
    if (!isConfirmedPersonal(e) || e.startTime < since) continue;
    const emp = byId.get(e.employerId);
    if (!emp) continue;
    const prev = totals.get(emp.id) ?? { hours: 0, pay: 0 };
    totals.set(emp.id, { hours: prev.hours + entryHours(e), pay: prev.pay + entryPay(emp, e) });
  }
  return [...totals.entries()]
    .map(([id, t]) => ({ employer: byId.get(id)!, ...t }))
    .sort((a, b) => b.pay - a.pay);
}

export function startOfWeek(now = Date.now()): number {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(now = Date.now()): number {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
