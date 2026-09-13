export type AnimalKey =
  | "rat" | "cat" | "cow" | "rabbit" | "tiger" | "sheep" | "monkey" | "dog"
  | "pig" | "horse" | "snake" | "chick" | "dragon" | "giraffe" | "capybara";

export const ANIMALS: { key: AnimalKey; label: string }[] = [
  { key: "rat", label: "老鼠" },
  { key: "cat", label: "猫咪" },
  { key: "cow", label: "小牛" },
  { key: "rabbit", label: "兔子" },
  { key: "tiger", label: "老虎" },
  { key: "sheep", label: "小羊" },
  { key: "monkey", label: "猴子" },
  { key: "dog", label: "狗狗" },
  { key: "pig", label: "猪猪" },
  { key: "horse", label: "小马" },
  { key: "snake", label: "小蛇" },
  { key: "chick", label: "小鸡" },
  { key: "dragon", label: "小龙" },
  { key: "giraffe", label: "长颈鹿" },
  { key: "capybara", label: "卡皮巴拉" },
];

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

// The 4 MBTI temperament groups (Keirsey), used only to pick a ring color.
function mbtiGroupColor(mbti: string): string {
  if (["INTJ", "INTP", "ENTJ", "ENTP"].includes(mbti)) return "#B084F5"; // Analysts
  if (["INFJ", "INFP", "ENFJ", "ENFP"].includes(mbti)) return "#39C97A"; // Diplomats
  if (["ISTJ", "ISFJ", "ESTJ", "ESFJ"].includes(mbti)) return "#5AC8FA"; // Sentinels
  return "#FFD93D"; // Explorers: ISTP/ISFP/ESTP/ESFP
}

// Illustrated portraits live in public/characters/, one per animal (default,
// no MBTI chosen yet) and one per animal+MBTI combo once the user picks both.
export function characterImageSrc(animal: AnimalKey, mbti?: string): string {
  return mbti ? `/characters/${animal}-${mbti}.png` : `/characters/${animal}-default.png`;
}

export type PetAccessory = "star" | "crown";

export function AvatarBadge({
  animal,
  mbti,
  size = 52,
  accessory,
  dim,
  fit = "cover",
}: {
  animal: AnimalKey;
  mbti?: string;
  size?: number;
  accessory?: PetAccessory;
  dim?: boolean;
  fit?: "cover" | "contain";
}) {
  const ringColor = mbti ? mbtiGroupColor(mbti) : "#1A1A1A";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, opacity: dim ? 0.6 : 1 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#F5F0E4",
          border: `2px solid ${ringColor}`,
        }}
      >
        <img
          src={characterImageSrc(animal, mbti)}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            objectPosition: fit === "cover" ? "50% 18%" : "50% 50%",
          }}
        />
      </div>
      {accessory === "star" && (
        <svg viewBox="0 0 24 24" fill="none" width={Math.max(14, size * 0.34)} height={Math.max(14, size * 0.34)} style={{ position: "absolute", top: -6, left: -4 }}>
          <path d="M12 3l2.4 5.8L21 9.4l-4.5 4 1.3 6.6L12 16.8l-5.8 3.2 1.3-6.6-4.5-4 6.6-.6z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
      {accessory === "crown" && (
        <svg viewBox="0 0 24 24" fill="none" width={Math.max(16, size * 0.4)} height={Math.max(16, size * 0.4)} style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}>
          <path d="M4 18.5h16l-1.3-7.6-4 3.3-2.7-5.5-2.7 5.5-4-3.3z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="4" y="18.5" width="16" height="1.8" rx="0.9" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.2" />
        </svg>
      )}
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
