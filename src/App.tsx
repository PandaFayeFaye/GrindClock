import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { HashRouter, Route, Routes } from "react-router-dom";
import { completeEmailLoginLink, isEmailLoginLink, watchAuth } from "./lib/auth";
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
import { LanguageProvider, useT } from "./lib/i18n";
import { OnboardingScreen, hasOnboarded } from "./components/OnboardingScreen";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboarding, setOnboarding] = useState(!hasOnboarded());
  const [emailLinkError, setEmailLinkError] = useState<"noPendingEmail" | "linkExpired" | null>(null);

  useEffect(() => watchAuth((u) => { setUser(u); setAuthReady(true); }), []);

  // Finish an email magic-link sign-in if the app was opened via that link.
  useEffect(() => {
    const href = window.location.href;
    if (!isEmailLoginLink(href)) return;
    completeEmailLoginLink(href)
      .catch((err) => {
        console.error("Email link sign-in failed", err);
        setEmailLinkError(
          err instanceof Error && err.message.includes("No pending email") ? "noPendingEmail" : "linkExpired",
        );
      })
      .finally(() => {
        // Strip the one-time link params so a page reload doesn't keep retrying it.
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      });
  }, []);

  return (
    <LanguageProvider>
      {!authReady ? (
        <LoadingScreen />
      ) : !user ? (
        <LoginScreen emailLinkError={emailLinkError} />
      ) : onboarding ? (
        <OnboardingScreen
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
              <Route path="/settings" element={<SettingsPage uid={user.uid} user={user} />} />
              <Route path="/net-pay" element={<NetPayComparePage uid={user.uid} />} />
              <Route path="/team" element={<TeamRosterPage uid={user.uid} />} />
              <Route path="/workers/new" element={<AddWorkerFormPage uid={user.uid} />} />
              <Route path="/recap" element={<MonthlyRecapPage uid={user.uid} />} />
              <Route path="/badges" element={<BadgeWallPage uid={user.uid} />} />
              <Route path="/ai-capture" element={<AICapturePage uid={user.uid} />} />
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
