import { useState } from "react";
import { Mascot } from "./Mascot";
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

export function OnboardingScreen({ onDone }: { onDone: (goToAddEmployer: boolean) => void }) {
  const [step, setStep] = useState(0);

  function finish(goToAddEmployer: boolean) {
    markOnboarded();
    onDone(goToAddEmployer);
  }

  return (
    <div className="onboarding-screen">
      <button className="onboarding-skip" onClick={() => finish(false)}>跳过</button>

      {step === 0 && (
        <div className="onboarding-card">
          <Mascot size={96} />
          <h1>GigTime</h1>
          <p className="onboarding-lead">一个App，管住你所有的兼职</p>
          <p className="onboarding-body">
            送外卖、跑网约车、drive Uber、发传单、代课……不管同时打几份工，
            这里都能一起记工时、算收入，不用来回切几个App。
          </p>
          <button className="onboarding-next" onClick={() => setStep(1)}>下一步</button>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding-card">
          <div className="onboarding-dots">
            <span /><span className="active" />
          </div>
          <h1>先添加第一份工作</h1>
          <p className="onboarding-body">
            填一下雇主名字、结算方式（时薪/日结/按单……），马上就能开始打卡记工时了。
          </p>
          <button className="onboarding-next" onClick={() => finish(true)}>添加第一个雇主 →</button>
        </div>
      )}
    </div>
  );
}
