import { useState } from "react";
import { ANIMALS, AvatarBadge, MBTI_TYPES, type AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import "./AvatarPicker.css";

export function AvatarPicker({
  initialAnimal,
  initialMbti,
  onSave,
  onCancel,
}: {
  initialAnimal?: AnimalKey;
  initialMbti?: string;
  onSave: (animal: AnimalKey, mbti: string | undefined) => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const [animal, setAnimal] = useState<AnimalKey>(initialAnimal ?? "cow");
  const [mbti, setMbti] = useState<string | undefined>(initialMbti);

  return (
    <div className="avatar-picker-panel">
      <p className="avatar-picker-title">{t("pickAvatarTitle")}</p>

      <div className="avatar-preview">
        <AvatarBadge animal={animal} mbti={mbti} size={112} fit="contain" />
      </div>

      <p className="avatar-section-label">{t("pickAnimalLabel")}</p>
      <div className="avatar-animal-grid">
        {ANIMALS.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`avatar-animal-btn${animal === a.key ? " selected" : ""}`}
            onClick={() => setAnimal(a.key)}
          >
            <AvatarBadge animal={a.key} size={44} />
            <span>{t(a.labelKey)}</span>
          </button>
        ))}
      </div>

      <p className="avatar-section-label">{t("pickMbtiLabel")}</p>
      <div className="avatar-mbti-grid">
        {MBTI_TYPES.map((m) => (
          <button
            key={m}
            type="button"
            className={`avatar-mbti-btn${mbti === m ? " selected" : ""}`}
            onClick={() => setMbti(mbti === m ? undefined : m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="avatar-picker-actions">
        {onCancel && <button className="avatar-cancel-btn" onClick={onCancel}>{t("cancel")}</button>}
        <button className="avatar-save-btn" onClick={() => onSave(animal, mbti)}>{t("saveAvatar")}</button>
      </div>
    </div>
  );
}
