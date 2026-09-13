import { useState, type FormEvent } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { setUserProfile } from "../lib/firestore";
import { linkEmailPassword } from "../lib/auth";
import type { AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import "./OnboardingScreen.css";

const ONBOARDED_KEY = "gigtime_onboarded";
export const PENDING_COACH_TOUR_KEY = "gigtime_coach_tour_pending";

export function hasOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "true";
  } catch {
    return true; // fail open -- never trap a user behind onboarding due to a storage error
  }
}

function markOnboarded() {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "true");
  } catch {
    // ignore
  }
}

export function OnboardingScreen({
  uid,
  hasEmail,
  onDone,
}: {
  uid: string;
  hasEmail: boolean;
  onDone: (goToAddEmployer: boolean) => void;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const totalSteps = hasEmail ? 3 : 4;

  const [bindEmail, setBindEmail] = useState("");
  const [bindPassword, setBindPassword] = useState("");
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindBusy, setBindBusy] = useState(false);

  function finish(goToAddEmployer: boolean) {
    markOnboarded();
    try {
      window.localStorage.setItem(PENDING_COACH_TOUR_KEY, "true");
    } catch {
      // ignore
    }
    onDone(goToAddEmployer);
  }

  function saveAvatarAndContinue(animal: AnimalKey, mbti: string | undefined) {
    setUserProfile(uid, { animal, mbti: mbti ?? "" }).catch((err) => console.error("Failed to save avatar", err));
    setStep(2);
  }

  function afterEmployerPrompt() {
    if (hasEmail) {
      finish(true);
    } else {
      setStep(3);
    }
  }

  async function handleBindEmail(e: FormEvent) {
    e.preventDefault();
    setBindError(null);
    setBindBusy(true);
    try {
      await linkEmailPassword(bindEmail, bindPassword);
      finish(true);
    } catch (err) {
      setBindError(err instanceof Error ? err.message : t("authErrGeneric"));
    } finally {
      setBindBusy(false);
    }
  }

  return (
    <div className="onboarding-screen">
      <button className="onboarding-skip" onClick={() => finish(false)}>{t("skip")}</button>

      {step === 0 && (
        <div className="onboarding-card">
          <img src="/logo-text.png" alt={t("appName")} className="onboarding-logo" />
          <p className="onboarding-lead">{t("onboard1Lead")}</p>
          <p className="onboarding-body">{t("onboard1Body")}</p>
          <button className="onboarding-next" onClick={() => setStep(1)}>{t("nextStep")}</button>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding-card onboarding-avatar-card">
          <div className="onboarding-dots">
            {Array.from({ length: totalSteps }, (_, i) => <span key={i} className={i === 1 ? "active" : ""} />)}
          </div>
          <AvatarPicker onSave={saveAvatarAndContinue} />
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-card">
          <div className="onboarding-dots">
            {Array.from({ length: totalSteps }, (_, i) => <span key={i} className={i === 2 ? "active" : ""} />)}
          </div>
          <h1>{t("onboard2Title")}</h1>
          <p className="onboarding-body">{t("onboard2Body")}</p>
          <button className="onboarding-next" onClick={afterEmployerPrompt}>{t("addFirstEmployerArrow")}</button>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-card">
          <div className="onboarding-dots">
            {Array.from({ length: totalSteps }, (_, i) => <span key={i} className={i === 3 ? "active" : ""} />)}
          </div>
          <h1>{t("onboard3Title")}</h1>
          <p className="onboarding-body">{t("onboard3Body")}</p>
          <form onSubmit={handleBindEmail} className="onboarding-bind-form">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={bindEmail}
              onChange={(e) => setBindEmail(e.target.value)}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={bindPassword}
              onChange={(e) => setBindPassword(e.target.value)}
            />
            {bindError && <p className="onboarding-bind-error">{bindError}</p>}
            <button type="submit" className="onboarding-next" disabled={bindBusy}>{t("onboard3Confirm")}</button>
            <button type="button" className="onboarding-bind-skip" onClick={() => finish(true)}>{t("skip")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
