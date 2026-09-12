export function Mascot({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ animation: "mascot-idle 2.6s ease-in-out infinite" }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes mascot-idle {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-2px) rotate(-1.5deg); }
          }
        }
      `}</style>
      <ellipse cx="24" cy="48" rx="14" ry="18" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="3" transform="rotate(-25 24 48)" />
      <ellipse cx="96" cy="48" rx="14" ry="18" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="3" transform="rotate(25 96 48)" />
      <ellipse cx="40" cy="24" rx="7" ry="10" fill="#FF6B6B" stroke="#1A1A1A" strokeWidth="3" transform="rotate(-15 40 24)" />
      <ellipse cx="80" cy="24" rx="7" ry="10" fill="#FF6B6B" stroke="#1A1A1A" strokeWidth="3" transform="rotate(15 80 24)" />
      <circle cx="60" cy="68" r="42" fill="#fff" stroke="#1A1A1A" strokeWidth="3.5" />
      <ellipse cx="60" cy="18" rx="30" ry="15" fill="#4361EE" stroke="#1A1A1A" strokeWidth="3" />
      <rect x="25" y="27" width="70" height="10" rx="2" fill="#1A1A1A" />
      <circle cx="46" cy="66" r="6" fill="#1A1A1A" />
      <circle cx="74" cy="66" r="6" fill="#1A1A1A" />
      <circle cx="38" cy="76" r="5" fill="#FF9FA6" opacity=".7" />
      <circle cx="82" cy="76" r="5" fill="#FF9FA6" opacity=".7" />
      <ellipse cx="60" cy="90" rx="22" ry="14" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="3" />
      <circle cx="52" cy="90" r="3" fill="#1A1A1A" />
      <circle cx="68" cy="90" r="3" fill="#1A1A1A" />
    </svg>
  );
}
