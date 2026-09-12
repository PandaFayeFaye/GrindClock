import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { HashRouter, Route, Routes } from "react-router-dom";
import { completeEmailLoginLink, isEmailLoginLink, watchAuth } from "./lib/auth";
import { LoginScreen } from "./components/LoginScreen";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { EmployerFormPage } from "./pages/EmployerFormPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => watchAuth((u) => { setUser(u); setAuthReady(true); }), []);

  // Finish an email magic-link sign-in if the app was opened via that link.
  useEffect(() => {
    const href = window.location.href;
    if (isEmailLoginLink(href)) {
      completeEmailLoginLink(href).catch((err) => console.error("Email link sign-in failed", err));
    }
  }, []);

  if (!authReady) return <p className="loading">加载中...</p>;
  if (!user) return <LoginScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout uid={user.uid} />}>
          <Route path="/" element={<HomePage uid={user.uid} />} />
          <Route path="/employers/new" element={<EmployerFormPage uid={user.uid} />} />
          <Route path="/employers/:employerId" element={<EmployerFormPage uid={user.uid} />} />
          <Route path="/stats" element={<StatsPage uid={user.uid} />} />
          <Route path="/settings" element={<SettingsPage uid={user.uid} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
