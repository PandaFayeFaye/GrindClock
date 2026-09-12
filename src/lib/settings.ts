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
