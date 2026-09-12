import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import "./Layout.css";

const NO_NAV_PREFIXES = ["/employers/"];

export function Layout({ uid }: { uid: string }) {
  const location = useLocation();
  const showNav = !NO_NAV_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-shell">
      <div className="app-content">
        <Outlet context={{ uid }} />
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
