import { useEffect, useState } from "react";

// Lightweight per-device preferences. Not synced to Firestore (yet) -- these are
// UI/behavior toggles, not account data, so localStorage is fine for now.

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    return fallback;
  }
}

export function useLocalToggle(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => readBool(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [key, value]);

  return [value, setValue];
}

export const SETTINGS_KEYS = {
  simpleMode: "gigtime_simple_mode",
  locationPunch: "gigtime_location_punch",
  dailyRecapPush: "gigtime_daily_recap_push",
} as const;

const WEEKLY_GOAL_KEY = "gigtime_weekly_goal";

export function useWeeklyGoal(): [number, (v: number) => void] {
  const [value, setValue] = useState(() => {
    try {
      return Number(window.localStorage.getItem(WEEKLY_GOAL_KEY)) || 1000;
    } catch {
      return 1000;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(WEEKLY_GOAL_KEY, String(value));
    } catch {
      // ignore
    }
  }, [value]);

  return [value, setValue];
}
