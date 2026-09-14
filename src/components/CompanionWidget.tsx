import { useState } from "react";
import { characterImageSrc, type AnimalKey, type PetAccessory } from "../lib/avatar";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { useT, type DictKey } from "../lib/i18n";
import { MOOD_KEYS, MoodIcon } from "../lib/moods";
import type { Mood } from "../lib/types";
import "./CompanionWidget.css";

export function CompanionWidget({
  animal,
  mbti,
  stageNameKey,
  stageAccessory,
  hungry,
  progressPct,
  progressCaptionKey,
  progressCaptionVars,
  moodCaptionKey,
  moodCaptionVars,
  userMood,
  dataTour,
}: {
  animal: AnimalKey;
  mbti?: string;
  stageNameKey: DictKey;
  stageAccessory?: PetAccessory;
  hungry: boolean;
  progressPct: number;
  progressCaptionKey: DictKey;
  progressCaptionVars?: Record<string, string | number>;
  moodCaptionKey: DictKey;
  moodCaptionVars?: Record<string, string | number>;
  userMood?: Mood;
  dataTour?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useLocalToggle(SETTINGS_KEYS.companionHintSeen, false);

  function handleTap() {
    setOpen((o) => !o);
    if (!hintSeen) setHintSeen(true);
  }

  return (
    <div className="companion-widget" data-tour={dataTour}>
      {open && (
        <div className="companion-popover">
          <p className="companion-popover-label">{t("petCardTitle")}</p>
          <p className="companion-popover-stage">{t(stageNameKey)}</p>
          <div className="companion-popover-track">
            <span className="companion-popover-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="companion-popover-caption">{t(progressCaptionKey, progressCaptionVars)}</p>
          <p className={hungry ? "companion-popover-mood hungry" : "companion-popover-mood"}>
            {t(moodCaptionKey, moodCaptionVars)}
          </p>
          {userMood && (
            <p className="companion-popover-usermood">
              <MoodIcon mood={userMood} size={14} />
              {t("companionUserMoodCaption", { mood: t(MOOD_KEYS.find((m) => m.key === userMood)!.labelKey) })}
            </p>
          )}
        </div>
      )}
      {!hintSeen && !open && (
        <button type="button" className="companion-hint" onClick={handleTap}>
          {t("companionHint")}
        </button>
      )}
      <div className="companion-shadow" />
      <button
        type="button"
        className={`companion-avatar-btn${userMood ? ` mood-${userMood}` : ""}`}
        onClick={handleTap}
        aria-label={t("petCardTitle")}
      >
        <img
          className={hungry ? "companion-img hungry" : "companion-img"}
          src={characterImageSrc(animal, mbti)}
          alt={t("petCardTitle")}
        />
        {stageAccessory === "star" && (
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22" className="companion-accessory companion-accessory-star">
            <path d="M12 3l2.4 5.8L21 9.4l-4.5 4 1.3 6.6L12 16.8l-5.8 3.2 1.3-6.6-4.5-4 6.6-.6z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        )}
        {stageAccessory === "crown" && (
          <svg viewBox="0 0 24 24" fill="none" width="26" height="26" className="companion-accessory companion-accessory-crown">
            <path d="M4 18.5h16l-1.3-7.6-4 3.3-2.7-5.5-2.7 5.5-4-3.3z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
            <rect x="4" y="18.5" width="16" height="1.8" rx="0.9" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.2" />
          </svg>
        )}
        {hungry && (
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20" className="companion-status-badge">
            <ellipse cx="12" cy="12" rx="8" ry="3" stroke="#1A1A1A" strokeWidth="1.6" />
            <path d="M4 12v1.5c0 2.5 3.6 4.5 8 4.5s8-2 8-4.5V12" stroke="#1A1A1A" strokeWidth="1.6" fill="#fff" />
          </svg>
        )}
      </button>
    </div>
  );
}
