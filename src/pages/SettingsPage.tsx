import { Link } from "react-router-dom";
import { logout } from "../lib/auth";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
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
  const [simpleMode, setSimpleMode] = useLocalToggle(SETTINGS_KEYS.simpleMode, false);
  const [locationPunch, setLocationPunch] = useLocalToggle(SETTINGS_KEYS.locationPunch, false);
  const [dailyRecapPush, setDailyRecapPush] = useLocalToggle(SETTINGS_KEYS.dailyRecapPush, true);

  return (
    <div className="settings-page">
      <h1>我的</h1>

      <Link className="profile-card" to="/badges">
        <span className="t">查看成就徽章墙</span>
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>

      <div>
        <p className="group-label">数据洞察</p>
        <div className="group">
          <NavRow to="/net-pay" title="净收益对比" />
          <NavRow to="/recap" title="本月战绩总结" />
        </div>
      </div>

      <div>
        <p className="group-label">团队</p>
        <div className="group">
          <NavRow to="/team" title="团队代记工时（组长模式）" />
        </div>
      </div>

      <div>
        <p className="group-label">账户</p>
        <div className="group">
          <p className="uid-line">用户ID：{uid.slice(0, 10)}…</p>
          <button className="logout-btn" onClick={() => logout()}>退出登录</button>
        </div>
      </div>

      <div>
        <p className="group-label">打卡设置</p>
        <div className="group">
          <ToggleRow
            title="定位打卡"
            subtitle="仅工作时段生效（打卡时的地理围栏校验暂未接入，这里先存偏好）"
            value={locationPunch}
            onChange={setLocationPunch}
          />
          <ToggleRow
            title="每日小结推送"
            subtitle="下班后30-60分钟推送今日战绩（推送后端暂未接入，这里先存偏好）"
            value={dailyRecapPush}
            onChange={setDailyRecapPush}
          />
        </div>
      </div>

      <div>
        <p className="group-label">趣味设置</p>
        <div className="group">
          <ToggleRow
            title="简洁模式"
            subtitle="关闭吉祥物/称号横幅，首页只留打卡列表"
            value={simpleMode}
            onChange={setSimpleMode}
          />
        </div>
      </div>

      <p className="todo-note">
        语言切换（中/英）还没做——需要先接入完整的i18n框架才能真正生效，不是这里能顺手加一个开关就解决的，先如实标注。
      </p>
    </div>
  );
}
