import type { ReactElement } from "react";

export type AnimalKey = "rat" | "cat" | "cow" | "rabbit" | "tiger" | "sheep" | "monkey" | "dog";

export const ANIMALS: { key: AnimalKey; label: string }[] = [
  { key: "rat", label: "老鼠" },
  { key: "cat", label: "猫" },
  { key: "cow", label: "牛" },
  { key: "rabbit", label: "兔子" },
  { key: "tiger", label: "老虎" },
  { key: "sheep", label: "羊" },
  { key: "monkey", label: "猴子" },
  { key: "dog", label: "狗" },
];

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

// The 4 MBTI temperament groups (Keirsey), used only to pick a background color.
function mbtiGroupColor(mbti: string): string {
  if (["INTJ", "INTP", "ENTJ", "ENTP"].includes(mbti)) return "#B084F5"; // Analysts
  if (["INFJ", "INFP", "ENFJ", "ENFP"].includes(mbti)) return "#39C97A"; // Diplomats
  if (["ISTJ", "ISFJ", "ESTJ", "ESFJ"].includes(mbti)) return "#5AC8FA"; // Sentinels
  return "#FFD93D"; // Explorers: ISTP/ISFP/ESTP/ESFP
}

function AnimalFace({ animal }: { animal: AnimalKey }): ReactElement {
  switch (animal) {
    case "rat":
      return (
        <g>
          <ellipse cx="17" cy="9" rx="5" ry="5" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <ellipse cx="31" cy="9" rx="5" ry="5" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="26" r="14" fill="#E8E2D0" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="24" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="24" r="1.6" fill="#1A1A1A" />
          <circle cx="24" cy="29" r="1.6" fill="#1A1A1A" />
        </g>
      );
    case "cat":
      return (
        <g>
          <path d="M14 10l4 8h12l4-8-6 4-4-4-4 4z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="24" cy="27" r="13" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="25" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="25" r="1.6" fill="#1A1A1A" />
          <path d="M22 30q2 1.5 4 0" stroke="#1A1A1A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </g>
      );
    case "cow":
      return (
        <g>
          <ellipse cx="12" cy="20" rx="5" ry="6" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.6" />
          <ellipse cx="36" cy="20" rx="5" ry="6" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="27" r="14" fill="#fff" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="25" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="25" r="1.6" fill="#1A1A1A" />
          <ellipse cx="24" cy="32" rx="6" ry="4" fill="#FFB6BB" stroke="#1A1A1A" strokeWidth="1.4" />
        </g>
      );
    case "rabbit":
      return (
        <g>
          <ellipse cx="18" cy="8" rx="3.4" ry="9" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <ellipse cx="30" cy="8" rx="3.4" ry="9" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="28" r="13" fill="#fff" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="26" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="26" r="1.6" fill="#1A1A1A" />
          <circle cx="24" cy="31" r="1.2" fill="#FF9FA6" />
        </g>
      );
    case "tiger":
      return (
        <g>
          <circle cx="13" cy="12" r="4" fill="#FF9F43" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="35" cy="12" r="4" fill="#FF9F43" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="27" r="14" fill="#FF9F43" stroke="#1A1A1A" strokeWidth="1.8" />
          <path d="M15 22l4 3M33 22l-4 3M20 17l1 4M28 17l-1 4" stroke="#1A1A1A" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="19" cy="26" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="26" r="1.6" fill="#1A1A1A" />
        </g>
      );
    case "sheep":
      return (
        <g>
          <circle cx="10" cy="22" r="6" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="38" cy="22" r="6" fill="#fff" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="26" r="13" fill="#F5F0E4" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="25" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="25" r="1.6" fill="#1A1A1A" />
        </g>
      );
    case "monkey":
      return (
        <g>
          <circle cx="13" cy="16" r="5" fill="#C89F80" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="35" cy="16" r="5" fill="#C89F80" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="27" r="14" fill="#C89F80" stroke="#1A1A1A" strokeWidth="1.8" />
          <ellipse cx="24" cy="29" rx="8" ry="7" fill="#F5E6D8" stroke="#1A1A1A" strokeWidth="1.4" />
          <circle cx="20" cy="26" r="1.5" fill="#1A1A1A" />
          <circle cx="28" cy="26" r="1.5" fill="#1A1A1A" />
        </g>
      );
    case "dog":
      return (
        <g>
          <ellipse cx="12" cy="18" rx="5" ry="8" fill="#D9B589" stroke="#1A1A1A" strokeWidth="1.6" />
          <ellipse cx="36" cy="18" rx="5" ry="8" fill="#D9B589" stroke="#1A1A1A" strokeWidth="1.6" />
          <circle cx="24" cy="27" r="14" fill="#F0D9BC" stroke="#1A1A1A" strokeWidth="1.8" />
          <circle cx="19" cy="25" r="1.6" fill="#1A1A1A" />
          <circle cx="29" cy="25" r="1.6" fill="#1A1A1A" />
          <ellipse cx="24" cy="32" rx="3" ry="2" fill="#1A1A1A" />
        </g>
      );
  }
}

export function AvatarBadge({
  animal,
  mbti,
  size = 52,
}: {
  animal: AnimalKey;
  mbti?: string;
  size?: number;
}) {
  const bg = mbti ? mbtiGroupColor(mbti) : "#DDD6C2";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <circle cx="24" cy="24" r="23" fill={bg} stroke="#1A1A1A" strokeWidth="2" />
        <AnimalFace animal={animal} />
      </svg>
      {mbti && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -4,
            background: "#1A1A1A",
            color: "#fff",
            fontSize: Math.max(7, size * 0.15),
            fontWeight: 900,
            padding: "1px 4px",
            borderRadius: 6,
            border: "1.3px solid #fff",
            lineHeight: 1.4,
          }}
        >
          {mbti}
        </span>
      )}
    </div>
  );
}
