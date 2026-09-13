import { useState } from "react";
import { characterImageSrc, type AnimalKey, type PetAccessory } from "../lib/avatar";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { useT, type DictKey } from "../lib/i18n";
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
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useLocalToggle(SETTINGS_KEYS.companionHintSeen, false);

  function handleTap() {
    setOpen((o) => !o);
    if (!hintSeen) setHintSeen(true);
  }

  return (
    <div className="companion-widget">
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
        </div>
      )}
      {!hintSeen && !open && (
        <button type="button" className="companion-hint" onClick={handleTap}>
          {t("companionHint")}
        </button>
      )}
      <div className="companion-shadow" />
      <button type="button" className="companion-avatar-btn" onClick={handleTap} aria-label={t("petCardTitle")}>
        <img
          className={hungry ? "companion-img hungry" : "companion-img"}
          src={characterImageSrc(animal, mbti)}
          alt={t("petCardTitle")}
        />
        {stageAccessory === "star" && <span className="companion-accessory companion-accessory-star">⭐</span>}
        {stageAccessory === "crown" && <span className="companion-accessory companion-accessory-crown">👑</span>}
        {hungry && <span className="companion-status-badge">💤</span>}
      </button>
    </div>
  );
}
