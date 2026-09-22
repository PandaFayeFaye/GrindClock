import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { HashRouter, Route, Routes } from "react-router-dom";
import { watchAuth } from "./lib/auth";
import { hasExistingAccountData } from "./lib/firestore";
import { LoginScreen } from "./components/LoginScreen";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { EmployerFormPage } from "./pages/EmployerFormPage";
import { BackfillEntryPage } from "./pages/BackfillEntryPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NetPayComparePage } from "./pages/NetPayComparePage";
import { TeamRosterPage } from "./pages/TeamRosterPage";
import { AddWorkerFormPage } from "./pages/AddWorkerFormPage";
import { MonthlyRecapPage } from "./pages/MonthlyRecapPage";
import { BadgeWallPage } from "./pages/BadgeWallPage";
import { AICapturePage } from "./pages/AICapturePage";
import { BatchBackfillPage } from "./pages/BatchBackfillPage";
import { TownPage } from "./pages/TownPage";
import { TownWorldPage } from "./pages/TownWorldPage";
import { LanguageProvider, useT } from "./lib/i18n";
import { OnboardingScreen, hasOnboarded, markOnboarded } from "./components/OnboardingScreen";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  // null = still deciding (checking whether this is really a new account before
  // showing onboarding -- a returning user on a fresh device/browser has no local
  // "onboarded" flag, but already has real data, so onboarding must not re-trigger).
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => watchAuth((u) => { setUser(u); setAuthReady(true); }), []);

  useEffect(() => {
    if (!user) return;
    if (hasOnboarded()) { setOnboarding(false); return; }
    let cancelled = false;
    hasExistingAccountData(user.uid)
      .then((existing) => {
        if (cancelled) return;
        if (existing) markOnboarded();
        setOnboarding(!existing);
      })
      .catch(() => { if (!cancelled) setOnboarding(false); }); // fail toward not re-annoying an existing user
    return () => { cancelled = true; };
  }, [user]);

  return (
    <LanguageProvider>
      {!authReady || (user && onboarding === null) ? (
        <LoadingScreen />
      ) : !user ? (
        <LoginScreen />
      ) : onboarding ? (
        <OnboardingScreen
          uid={user.uid}
          hasEmail={!!user.email}
          onDone={(goToAddEmployer) => {
            setOnboarding(false);
            if (goToAddEmployer) window.location.hash = "#/employers/new";
          }}
        />
      ) : (
        <HashRouter>
          <Routes>
            <Route element={<Layout uid={user.uid} />}>
              <Route path="/" element={<HomePage uid={user.uid} />} />
              <Route path="/employers/new" element={<EmployerFormPage uid={user.uid} />} />
              <Route path="/employers/:employerId" element={<EmployerFormPage uid={user.uid} />} />
              <Route path="/entries/new" element={<BackfillEntryPage uid={user.uid} />} />
              <Route path="/entries/batch" element={<BatchBackfillPage uid={user.uid} />} />
              <Route path="/stats" element={<StatsPage uid={user.uid} />} />
              <Route path="/settings" element={<SettingsPage uid={user.uid} />} />
              <Route path="/net-pay" element={<NetPayComparePage uid={user.uid} />} />
              <Route path="/team" element={<TeamRosterPage uid={user.uid} />} />
              <Route path="/workers/new" element={<AddWorkerFormPage uid={user.uid} />} />
              <Route path="/recap" element={<MonthlyRecapPage uid={user.uid} />} />
              <Route path="/badges" element={<BadgeWallPage uid={user.uid} />} />
              <Route path="/ai-capture" element={<AICapturePage uid={user.uid} />} />
              <Route path="/town" element={<TownPage uid={user.uid} />} />
              <Route path="/town/world" element={<TownWorldPage uid={user.uid} />} />
            </Route>
          </Routes>
        </HashRouter>
      )}
    </LanguageProvider>
  );
}

function LoadingScreen() {
  const t = useT();
  return <p className="loading">{t("loading")}</p>;
}

export default App;
