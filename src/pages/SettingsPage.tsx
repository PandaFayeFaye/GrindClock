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

export function SettingsPage({ uid }: { uid: string }) {
  const [simpleMode, setSimpleMode] = useLocalToggle(SETTINGS_KEYS.simpleMode, false);
  const [locationPunch, setLocationPunch] = useLocalToggle(SETTINGS_KEYS.locationPunch, false);
  const [dailyRecapPush, setDailyRecapPush] = useLocalToggle(SETTINGS_KEYS.dailyRecapPush, true);

  return (
    <div className="settings-page">
      <h1>我的</h1>

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
        语言切换（中/英）、AI功能开关这些还没做——语言切换需要先接入完整的i18n框架才能真正生效，不是这里能顺手加一个开关就解决的，先如实标注。
      </p>
    </div>
  );
}
