import { logout } from "../lib/auth";
import "./SettingsPage.css";

export function SettingsPage({ uid }: { uid: string }) {
  return (
    <div className="settings-page">
      <h1>我的</h1>

      <div className="group">
        <p className="group-label">账户</p>
        <p className="uid-line">用户ID：{uid.slice(0, 10)}…</p>
        <button className="logout-btn" onClick={() => logout()}>退出登录</button>
      </div>

      <p className="todo-note">
        定位打卡开关、每日小结推送、简洁模式、语言切换、AI功能开关这些设置项还在开发中。
      </p>
    </div>
  );
}
