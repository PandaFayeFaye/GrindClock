import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { Link } from "react-router-dom";
import { logout, setNickname } from "../lib/auth";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { exportEntriesCsv } from "../lib/exportCsv";
import { entryHours } from "../lib/pay";
import { currentStreak } from "../lib/stats";
import { TIERS, currentTierIndex } from "../lib/tiers";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { useLang, useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./SettingsPage.css";

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row" onClick={() => onChange(!value)}>
      <span className="row-icon">{icon}</span>
      <div className="toggle-label">
        <p className="t">{title}</p>
        {subtitle && <p className="s">{subtitle}</p>}
      </div>
      <div className={`switch${value ? " on" : ""}`}><div className="knob" /></div>
    </div>
  );
}

function NavRow({ to, icon, title }: { to: string; icon: ReactNode; title: string }) {
  return (
    <Link className="nav-row" to={to}>
      <span className="row-icon">{icon}</span>
      <span className="t">{title}</span>
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M9 6l6 6-6 6" stroke="#8A8272" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

const ICONS = {
  netPay: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M12 2v20M17 6H9.5a3 3 0 000 6h5a3 3 0 010 6H6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  recap: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="#1A1A1A" strokeWidth="2" />
      <path d="M4 9.5h16M9 3v4M15 3v4" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <circle cx="9" cy="8" r="3" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="17" cy="9.5" r="2.4" stroke="#1A1A1A" strokeWidth="1.8" />
      <path d="M3.5 20c0-3.6 2.6-6 5.5-6s5.5 2.4 5.5 6M15 20c0-2.5-.8-4.4-2.3-5.5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z" stroke="#1A1A1A" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.4" stroke="#1A1A1A" strokeWidth="1.8" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M6 10a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 004 0" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M4 8a2 2 0 012-2h1.5l1-2h7l1 2H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" stroke="#1A1A1A" strokeWidth="1.8" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="#1A1A1A" strokeWidth="1.8" />
      <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" stroke="#1A1A1A" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <circle cx="12" cy="12" r="8.5" stroke="#1A1A1A" strokeWidth="1.8" />
      <path d="M3.5 12h17M12 3.5c2.3 2.3 3.5 5.3 3.5 8.5s-1.2 6.2-3.5 8.5c-2.3-2.3-3.5-5.3-3.5-8.5s1.2-6.2 3.5-8.5z" stroke="#1A1A1A" strokeWidth="1.8" />
    </svg>
  ),
};

export function SettingsPage({ uid, user }: { uid: string; user: User }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [simpleMode, setSimpleMode] = useLocalToggle(SETTINGS_KEYS.simpleMode, false);
  const [locationPunch, setLocationPunch] = useLocalToggle(SETTINGS_KEYS.locationPunch, false);
  const [dailyRecapPush, setDailyRecapPush] = useLocalToggle(SETTINGS_KEYS.dailyRecapPush, true);
  const [aiPhoto, setAiPhoto] = useLocalToggle(SETTINGS_KEYS.aiPhoto, true);
  const [aiVoice, setAiVoice] = useLocalToggle(SETTINGS_KEYS.aiVoice, true);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [nickname, setNicknameState] = useState(user.displayName ?? "");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  const personalConfirmed = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime),
    [entries],
  );
  const totalHours = personalConfirmed.reduce((s, e) => s + entryHours(e), 0);
  const tier = TIERS[currentTierIndex(totalHours)];
  const streak = currentStreak(personalConfirmed);

  function saveNickname() {
    const trimmed = nicknameDraft.trim();
    setEditingNickname(false);
    if (!trimmed || trimmed === nickname) return;
    setNicknameState(trimmed);
    setNickname(user, trimmed).catch((err) => console.error("Failed to save nickname", err));
  }

  function handleExportAll() {
    setExporting(true);
    const employerById = new Map(employers.map((e) => [e.id, e]));
    const confirmed = entries.filter((e) => e.status === "confirmed" && e.endTime);
    exportEntriesCsv(confirmed, employerById, "gigtime-all-data.csv");
    setExporting(false);
  }

  const initial = (nickname || "U").trim().slice(0, 1).toUpperCase();

  return (
    <div className="settings-page">
      <h1>{t("settingsTitle")}</h1>

      <div className="profile-hero">
        <div className="avatar">{initial}</div>
        <div className="profile-info">
          {editingNickname ? (
            <input
              className="nickname-input"
              autoFocus
              maxLength={20}
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onBlur={saveNickname}
              onKeyDown={(e) => e.key === "Enter" && saveNickname()}
            />
          ) : (
            <p
              className={`nickname${nickname ? "" : " placeholder"}`}
              onClick={() => { setNicknameDraft(nickname); setEditingNickname(true); }}
            >
              {nickname || t("setNicknamePlaceholder")}
            </p>
          )}
          <p className="profile-meta">
            <span className="tier-chip">{t(tier.nameKey)}</span>
            {streak > 0 && (
              <span className="streak-chip-mini">
                <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                  <path d="M12 2.5c-1.2 2.3-4.5 3.6-4.5 8a4.5 4.5 0 009 0c0-1.4-.5-2.3-1.1-3 .1 1.2-.5 2-1.3 2.3.6-2.4-1-3.6-2.1-7.3z" fill="#FF6B6B" />
                </svg>
                {t("streakDaysShort", { n: streak })}
              </span>
            )}
          </p>
        </div>
        <Link className="badge-wall-link" to="/badges">{t("viewBadgeWallArrow")}</Link>
      </div>

      <div>
        <p className="group-label">{t("groupInsights")}</p>
        <div className="group">
          <NavRow to="/net-pay" icon={ICONS.netPay} title={t("netPay")} />
          <NavRow to="/recap" icon={ICONS.recap} title={t("monthlyRecap")} />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupTeam")}</p>
        <div className="group">
          <NavRow to="/team" icon={ICONS.team} title={t("teamNav")} />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupAccount")}</p>
        <div className="group">
          <p className="uid-line" style={{ paddingBottom: 14 }}>{t("userId", { id: uid.slice(0, 10) })}</p>
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupPunch")}</p>
        <div className="group">
          <ToggleRow
            icon={ICONS.pin}
            title={t("locationPunchTitle")}
            subtitle={t("locationPunchSub")}
            value={locationPunch}
            onChange={setLocationPunch}
          />
          <ToggleRow
            icon={ICONS.bell}
            title={t("dailyRecapTitle")}
            subtitle={t("dailyRecapSub")}
            value={dailyRecapPush}
            onChange={setDailyRecapPush}
          />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupAiFeatures")}</p>
        <div className="group">
          <ToggleRow
            icon={ICONS.camera}
            title={t("aiPhotoTitle")}
            subtitle={t("aiPhotoSub")}
            value={aiPhoto}
            onChange={setAiPhoto}
          />
          <ToggleRow
            icon={ICONS.mic}
            title={t("aiVoiceTitle")}
            subtitle={t("aiVoiceSub")}
            value={aiVoice}
            onChange={setAiVoice}
          />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupData")}</p>
        <div className="group">
          <div className="nav-row" onClick={handleExportAll} style={{ cursor: "pointer" }}>
            <span className="row-icon">{ICONS.download}</span>
            <span className="t">{exporting ? t("exporting") : t("exportAllData")}</span>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M9 6l6 6-6 6" stroke="#8A8272" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="uid-line" style={{ paddingBottom: 14 }}>{t("syncStatus")}</p>
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupFun")}</p>
        <div className="group">
          <ToggleRow
            icon={ICONS.sparkle}
            title={t("simpleModeTitle")}
            subtitle={t("simpleModeSub")}
            value={simpleMode}
            onChange={setSimpleMode}
          />
          <div className="toggle-row">
            <span className="row-icon">{ICONS.globe}</span>
            <div className="toggle-label">
              <p className="t">{t("languageTitle")}</p>
              <p className="s">{t("languageSub")}</p>
            </div>
            <div className="lang-switch">
              <button className={`lang-btn${lang === "zh" ? " active" : ""}`} onClick={() => setLang("zh")}>中文</button>
              <button className={`lang-btn${lang === "en" ? " active" : ""}`} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
        </div>
      </div>

      <p className="todo-note">{t("pushTodo")}</p>

      <button className="logout-btn" onClick={() => logout()}>{t("logout")}</button>
    </div>
  );
}
