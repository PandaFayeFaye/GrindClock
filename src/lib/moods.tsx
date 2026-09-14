import type { Mood } from "./types";

// Higher mood = higher up the mood curve (smaller y%, since SVG y grows downward).
export const MOOD_Y: Record<Mood, number> = {
  heartbeat: 6,
  grind: 16,
  great: 26,
  slack: 40,
  normal: 50,
  flat: 62,
  ox: 74,
  crash: 86,
};

export const MOOD_COLOR: Record<Mood, string> = {
  crash: "#5AC8FA",
  normal: "#B9AC9C",
  great: "#FFD93D",
  heartbeat: "#FF6B6B",
  slack: "#8AC9B8",
  grind: "#FF8C42",
  ox: "#A89078",
  flat: "#C7C2B8",
};

export const MOOD_KEYS: { key: Mood; labelKey: "moodCrash" | "moodNormal" | "moodGreat" | "moodHeartbeat" | "moodSlack" | "moodGrind" | "moodOx" | "moodFlat" }[] = [
  { key: "crash", labelKey: "moodCrash" },
  { key: "ox", labelKey: "moodOx" },
  { key: "flat", labelKey: "moodFlat" },
  { key: "normal", labelKey: "moodNormal" },
  { key: "slack", labelKey: "moodSlack" },
  { key: "great", labelKey: "moodGreat" },
  { key: "grind", labelKey: "moodGrind" },
  { key: "heartbeat", labelKey: "moodHeartbeat" },
];

export function MoodIcon({ mood, size = 18 }: { mood: Mood; size?: number }) {
  const c = MOOD_COLOR[mood];
  if (mood === "crash") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 15.5c1-1.3 2.2-2 3.5-2s2.5.7 3.5 2" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1.1" fill="#1A1A1A" />
        <circle cx="15" cy="10" r="1.1" fill="#1A1A1A" />
      </svg>
    );
  }
  if (mood === "normal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 14.5h7" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1.1" fill="#1A1A1A" />
        <circle cx="15" cy="10" r="1.1" fill="#1A1A1A" />
      </svg>
    );
  }
  if (mood === "great") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M8.5 13c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.7 9.5l.9.9M15.3 9.5l-.9.9" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (mood === "heartbeat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 6.5a4.3 4.3 0 017.5 3.3C19.5 15.4 12 20 12 20z" fill={c} stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  // 摸鱼 (slacking off) -- half-lidded, coasting smirk, with a little fish tail flourish.
  if (mood === "slack") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M7.8 10h2.6M13.6 10h2.6" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 14.5c1.2.8 3.8.8 5-.3" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M18.5 6.5l2 .7-1.2 1.7z" fill="#1A1A1A" />
      </svg>
    );
  }
  // 爆肝 (grinding hard) -- fierce brows, gritted-teeth grin, spark accents.
  if (mood === "grind") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M7.8 9.3l2.4 1M16.2 9.3l-2.4 1" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.3 14.5h7.4v1.4a1 1 0 01-1 1H9.3a1 1 0 01-1-1v-1.4z" fill="#1A1A1A" />
        <path d="M9.6 14.5v2.4M11.5 14.5v2.4M13.4 14.5v2.4M15.3 14.5v2.4" stroke={c} strokeWidth="1" />
        <path d="M4 5l1.3 2.6L8 9l-2.7 1.4L4 13l-1.3-2.6L0 9l2.7-1.4z" fill="#1A1A1A" transform="translate(1 -1) scale(0.7)" />
      </svg>
    );
  }
  // 社畜 (overworked/burnt out) -- droopy eye-bags, flat tired mouth.
  if (mood === "ox") {
    return (
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
        <path d="M7.7 10.3q1.3-1 2.6 0M13.7 10.3q1.3-1 2.6 0" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="8.7" cy="12" rx="1.3" ry="0.7" fill="#1A1A1A" opacity="0.35" />
        <ellipse cx="15.3" cy="12" rx="1.3" ry="0.7" fill="#1A1A1A" opacity="0.35" />
        <path d="M9 15.3h6" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  // 躺平 (checked out / lying flat) -- closed flat eyes, tilted face, tiny "zzz".
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ transform: "rotate(-14deg)" }}>
      <circle cx="12" cy="12" r="9.5" fill={c} stroke="#1A1A1A" strokeWidth="1.6" />
      <path d="M7.8 10.5h2.6M13.6 10.5h2.6" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.3 15h5.4" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 5.5h1.4M17.7 4.8v1.4" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
