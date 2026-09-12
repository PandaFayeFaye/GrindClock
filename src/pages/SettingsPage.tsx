import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { logout } from "../lib/auth";
import { watchEmployers, watchTimeEntries } from "../lib/firestore";
import { exportEntriesCsv } from "../lib/exportCsv";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { useLang, useT } from "../lib/i18n";
import type { Employer, TimeEntry } from "../lib/types";
import "./SettingsPage.css";

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row" onClick={() => onChange(!value)}>
      <div className="toggle-label">
        <p className="t">{title}</p>
        {subtitle && <p className="s">{subtitle}</p>}
      </div>
      <div className={`switch${value ? " on" : ""}`}><div className="knob" /></div>
    </div>
  );
}

function NavRow({ to, title }: { to: string; title: string }) {
  return (
    <Link className="nav-row" to={to}>
      <span className="t">{title}</span>
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

export function SettingsPage({ uid }: { uid: string }) {
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

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  function handleExportAll() {
    setExporting(true);
    const employerById = new Map(employers.map((e) => [e.id, e]));
    const confirmed = entries.filter((e) => e.status === "confirmed" && e.endTime);
    exportEntriesCsv(confirmed, employerById, "gigtime-全部数据.csv");
    setExporting(false);
  }

  return (
    <div className="settings-page">
      <h1>{t("settingsTitle")}</h1>

      <Link className="profile-card" to="/badges">
        <span className="t">{t("viewBadges")}</span>
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>

      <div>
        <p className="group-label">{t("groupInsights")}</p>
        <div className="group">
          <NavRow to="/net-pay" title={t("netPay")} />
          <NavRow to="/recap" title={t("monthlyRecap")} />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupTeam")}</p>
        <div className="group">
          <NavRow to="/team" title={t("teamNav")} />
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupAccount")}</p>
        <div className="group">
          <p className="uid-line">{t("userId", { id: uid.slice(0, 10) })}</p>
          <button className="logout-btn" onClick={() => logout()}>{t("logout")}</button>
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupPunch")}</p>
        <div className="group">
          <ToggleRow
            title={t("locationPunchTitle")}
            subtitle={t("locationPunchSub")}
            value={locationPunch}
            onChange={setLocationPunch}
          />
          <ToggleRow
            title={t("dailyRecapTitle")}
            subtitle={t("dailyRecapSub")}
            value={dailyRecapPush}
            onChange={setDailyRecapPush}
          />
        </div>
      </div>

      <div>
        <p className="group-label">AI功能</p>
        <div className="group">
          <ToggleRow
            title="拍照识别"
            subtitle="首页“+”菜单里的“AI记工”会显示拍照识别选项"
            value={aiPhoto}
            onChange={setAiPhoto}
          />
          <ToggleRow
            title="语音记工"
            subtitle="首页“+”菜单里的“AI记工”会显示语音记工选项"
            value={aiVoice}
            onChange={setAiVoice}
          />
        </div>
      </div>

      <div>
        <p className="group-label">数据</p>
        <div className="group">
          <div className="nav-row" onClick={handleExportAll} style={{ cursor: "pointer" }}>
            <span className="t">{exporting ? "导出中..." : "导出全部数据（CSV）"}</span>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="uid-line" style={{ paddingBottom: 14 }}>
            云同步状态：<b>已连接</b>（数据实时同步到 Firebase，登录同一账号即可在其他设备看到）
          </p>
        </div>
      </div>

      <div>
        <p className="group-label">{t("groupFun")}</p>
        <div className="group">
          <ToggleRow
            title={t("simpleModeTitle")}
            subtitle={t("simpleModeSub")}
            value={simpleMode}
            onChange={setSimpleMode}
          />
          <div className="toggle-row">
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
    </div>
  );
}
