import { useMemo, useState } from "react";
import { deleteField } from "firebase/firestore";
import { updateTimeEntry } from "../lib/firestore";
import { dateKey, moodDetailByDay, payByDay } from "../lib/stats";
import { useT } from "../lib/i18n";
import { MOOD_KEYS, MOOD_Y, MoodIcon } from "../lib/moods";
import type { Employer, Mood, TimeEntry } from "../lib/types";
import "./MoodCurveCard.css";

const WEEKDAY_KEYS = ["weekdaySun", "weekdayMon", "weekdayTue", "weekdayWed", "weekdayThu", "weekdayFri", "weekdaySat"] as const;

export function MoodCurveCard({
  uid,
  personalConfirmed,
  employerById,
}: {
  uid: string;
  personalConfirmed: TimeEntry[];
  employerById: Map<string, Employer>;
}) {
  const t = useT();
  const moodDetailMap = useMemo(() => moodDetailByDay(personalConfirmed), [personalConfirmed]);
  const entriesByDayMap = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of personalConfirmed) {
      const key = dateKey(e.startTime);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [personalConfirmed]);
  const last7Days = useMemo(() => {
    const days: { key: string; label: string; mood?: Mood; note?: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d.getTime());
      const detail = moodDetailMap.get(key);
      days.push({ key, label: t(WEEKDAY_KEYS[d.getDay()]), mood: detail?.mood, note: detail?.note });
    }
    return days;
  }, [moodDetailMap, t]);
  const [editingMoodDay, setEditingMoodDay] = useState<string | null>(null);
  const [draftMood, setDraftMood] = useState<Mood | undefined>(undefined);
  const [draftMoodNote, setDraftMoodNote] = useState("");

  function openMoodEditor(day: { key: string; mood?: Mood; note?: string }) {
    if (!entriesByDayMap.has(day.key)) return; // nothing logged that day -- nothing to attach a mood to
    setEditingMoodDay(day.key);
    setDraftMood(day.mood);
    setDraftMoodNote(day.note ?? "");
  }

  async function saveMoodEditor() {
    const dayEntries = entriesByDayMap.get(editingMoodDay!);
    if (!dayEntries || dayEntries.length === 0) return;
    // Prefer whichever entry already carries the day's mood (matches moodDetailByDay's
    // pick); otherwise just attach it to the day's first shift.
    const target = dayEntries.find((e) => e.mood) ?? dayEntries[0];
    await updateTimeEntry(uid, target.id, {
      mood: draftMood ?? deleteField(),
      moodNote: draftMood && draftMoodNote.trim() ? draftMoodNote.trim() : deleteField(),
    });
    setEditingMoodDay(null);
  }
  const moodPoints = last7Days
    .map((d, i) => ({ ...d, x: (i / 6) * 100, y: d.mood ? MOOD_Y[d.mood] : null }))
    .filter((d): d is typeof d & { y: number } => d.y !== null);
  const moodLinePath = moodPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const moodAreaPath = moodPoints.length > 1
    ? `${moodLinePath} L${moodPoints[moodPoints.length - 1].x},100 L${moodPoints[0].x},100 Z`
    : "";
  const latestMoodDay = [...last7Days].reverse().find((d) => d.mood);
  const companionKey = latestMoodDay
    ? ({
      crash: "companionCrash", normal: "companionNormal", great: "companionGreat", heartbeat: "companionHeartbeat",
      slack: "companionSlack", grind: "companionGrind", ox: "companionOx", flat: "companionFlat",
    } as const)[latestMoodDay.mood!]
    : "companionEmpty";
  const moodCounts = useMemo(() => {
    const counts: Record<Mood, number> = { crash: 0, normal: 0, great: 0, heartbeat: 0, slack: 0, grind: 0, ox: 0, flat: 0 };
    for (const d of last7Days) if (d.mood) counts[d.mood]++;
    return MOOD_KEYS.map((m) => ({ key: m.key, n: counts[m.key] })).filter((m) => m.n > 0);
  }, [last7Days]);
  const dailyPay = useMemo(() => payByDay(personalConfirmed, employerById), [personalConfirmed, employerById]);
  const moodPayInsight = useMemo(() => {
    const withMood = last7Days.filter((d) => d.mood);
    if (withMood.length === 0) return null;
    const best = withMood.reduce((a, b) => ((dailyPay.get(b.key) ?? 0) > (dailyPay.get(a.key) ?? 0) ? b : a));
    const pay = dailyPay.get(best.key) ?? 0;
    if (pay <= 0) return null;
    return { day: best };
  }, [last7Days, dailyPay]);

  return (
    <div className="mood-curve-card">
      <p className="title">{t("moodStripTitle")}</p>
      <div className="mood-curve">
        <svg className="mood-curve-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[10, 28, 52, 78].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(26,26,26,0.06)" strokeWidth="1" />
          ))}
          {moodAreaPath && <path d={moodAreaPath} fill="url(#moodFill)" />}
          {moodLinePath && <path d={moodLinePath} fill="none" stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />}
        </svg>
        {last7Days.map((d, i) => {
          const x = (i / 6) * 100;
          const y = d.mood ? MOOD_Y[d.mood] : 52;
          return (
            <button
              key={d.key}
              type="button"
              className={`mood-point${d.mood ? "" : " empty"}${!d.mood && entriesByDayMap.has(d.key) ? " loggable" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => openMoodEditor(d)}
            >
              {d.mood ? <MoodIcon mood={d.mood} /> : <span className="mood-dot" />}
            </button>
          );
        })}
        <div className="mood-x-labels">
          {last7Days.map((d) => <span key={d.key}>{d.label}</span>)}
        </div>
      </div>

      {moodCounts.length > 0 && (
        <div className="mood-dist-row">
          {moodCounts.map(({ key, n }) => (
            <span className="mood-dist-chip" key={key}>
              <MoodIcon mood={key} size={13} />
              ×{n}
            </span>
          ))}
        </div>
      )}

      {editingMoodDay && (
        <div className="mood-editor">
          <div className="mood-edit-tags">
            {MOOD_KEYS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`mood-edit-tag${draftMood === m.key ? " selected" : ""}`}
                onClick={() => setDraftMood(draftMood === m.key ? undefined : m.key)}
              >
                <MoodIcon mood={m.key} size={16} />
                {t(m.labelKey)}
              </button>
            ))}
          </div>
          {draftMood && (
            <input
              className="mood-edit-note"
              maxLength={30}
              placeholder={t("moodNotePlaceholder")}
              value={draftMoodNote}
              onChange={(e) => setDraftMoodNote(e.target.value)}
            />
          )}
          <div className="mood-editor-actions">
            <button type="button" className="mood-editor-cancel" onClick={() => setEditingMoodDay(null)}>{t("cancel")}</button>
            <button type="button" className="mood-editor-save" onClick={saveMoodEditor}>{t("confirmSave")}</button>
          </div>
        </div>
      )}

      <p className="mood-companion">
        {moodPayInsight ? t("moodPayInsight", { day: moodPayInsight.day.label, mood: t(MOOD_KEYS.find((m) => m.key === moodPayInsight.day.mood)!.labelKey) }) : t(companionKey)}
      </p>
    </div>
  );
}
