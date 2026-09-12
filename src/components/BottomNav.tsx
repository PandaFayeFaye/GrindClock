import { NavLink } from "react-router-dom";
import "./BottomNav.css";

const TABS = [
  {
    to: "/",
    label: "首页",
    accent: "var(--accent-coral)",
    icon: (
      <>
        <path d="M3.2 11.5L12 4l8.8 7.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 10v8.5a1.2 1.2 0 001.2 1.2h10.6a1.2 1.2 0 001.2-1.2V10" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
  {
    to: "/stats",
    label: "统计",
    accent: "var(--accent-blue)",
    icon: (
      <>
        <rect x="3.5" y="13" width="5" height="8" rx="1.5" fill="currentColor" />
        <rect x="9.5" y="8" width="5" height="13" rx="1.5" fill="currentColor" />
        <rect x="15.5" y="4.5" width="5" height="16.5" rx="1.5" fill="currentColor" />
        <circle cx="18" cy="2" r="2" fill="#FF6B6B" stroke="currentColor" strokeWidth="1" />
      </>
    ),
  },
  {
    to: "/settings",
    label: "我的",
    accent: "var(--accent-purple)",
    icon: (
      <>
        <circle cx="12" cy="8.2" r="4" fill="currentColor" />
        <path d="M4 20.5c0-4.4 3.6-7.2 8-7.2s8 2.8 8 7.2" fill="currentColor" />
      </>
    ),
  },
];

export function BottomNav() {
  return (
    <div className="tabbar-dock">
      <div className="tabbar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => `tab${isActive ? " active" : ""}`}
            style={{ "--tab-accent": tab.accent } as React.CSSProperties}
          >
            <span className="tab-icon-badge">
              <svg className="tab-icon" viewBox="0 0 24 24" fill="none">
                {tab.icon}
              </svg>
            </span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
