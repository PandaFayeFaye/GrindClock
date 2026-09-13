import { useState } from "react";
import { Mascot } from "./Mascot";
import { AvatarPicker } from "./AvatarPicker";
import { setUserProfile } from "../lib/firestore";
import type { AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import "./OnboardingScreen.css";

const ONBOARDED_KEY = "gigtime_onboarded";

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

export function OnboardingScreen({ uid, onDone }: { uid: string; onDone: (goToAddEmployer: boolean) => void }) {
  const t = useT();
  const [step, setStep] = useState(0);

  function finish(goToAddEmployer: boolean) {
    markOnboarded();
    onDone(goToAddEmployer);
  }

  function saveAvatarAndContinue(animal: AnimalKey, mbti: string | undefined) {
    setUserProfile(uid, { animal, mbti: mbti ?? "" }).catch((err) => console.error("Failed to save avatar", err));
    setStep(2);
  }

  return (
    <div className="onboarding-screen">
      <button className="onboarding-skip" onClick={() => finish(false)}>{t("skip")}</button>

      {step === 0 && (
        <div className="onboarding-card">
          <Mascot size={96} />
          <h1>GigTime</h1>
          <p className="onboarding-lead">{t("onboard1Lead")}</p>
          <p className="onboarding-body">{t("onboard1Body")}</p>
          <button className="onboarding-next" onClick={() => setStep(1)}>{t("nextStep")}</button>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding-card onboarding-avatar-card">
          <div className="onboarding-dots">
            <span /><span className="active" /><span />
          </div>
          <AvatarPicker onSave={saveAvatarAndContinue} />
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-card">
          <div className="onboarding-dots">
            <span /><span /><span className="active" />
          </div>
          <h1>{t("onboard2Title")}</h1>
          <p className="onboarding-body">{t("onboard2Body")}</p>
          <button className="onboarding-next" onClick={() => finish(true)}>{t("addFirstEmployerArrow")}</button>
        </div>
      )}
    </div>
  );
}
