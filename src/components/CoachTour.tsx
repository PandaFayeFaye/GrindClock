import { useEffect, useLayoutEffect, useState } from "react";
import { useT, type DictKey } from "../lib/i18n";
import "./CoachTour.css";

export interface CoachStep {
  target: string; // matches a [data-tour="..."] attribute
  titleKey: DictKey;
  bodyKey: DictKey;
}

const PADDING = 8;

const COACH_TOUR_SEEN_KEY = "gigtime_coach_tour_seen";

export function hasSeenCoachTour(): boolean {
  try {
    return window.localStorage.getItem(COACH_TOUR_SEEN_KEY) === "true";
  } catch {
    return true; // fail open -- never force the tour on due to a storage error
  }
}

export function markCoachTourSeen() {
  try {
    window.localStorage.setItem(COACH_TOUR_SEEN_KEY, "true");
  } catch {
    // ignore
  }
}

export function CoachTour({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const t = useT();
  const [availableSteps, setAvailableSteps] = useState<{ step: CoachStep; rect: DOMRect }[] | null>(null);
  const [index, setIndex] = useState(0);

  // Resolve which steps actually have a target on screen right now -- a
  // brand-new user with no employers yet simply won't have some of these.
  useEffect(() => {
    const resolved = steps
      .map((step) => {
        const el = document.querySelector(`[data-tour="${step.target}"]`);
        return el ? { step, rect: el.getBoundingClientRect() } : null;
      })
      .filter((s): s is { step: CoachStep; rect: DOMRect } => s !== null);
    setAvailableSteps(resolved);
  }, [steps]);

  const current = availableSteps?.[index];

  // Re-measure on resize/scroll so the highlight tracks the real element.
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!current) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : current.rect);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current]);

  if (!availableSteps || availableSteps.length === 0 || !current || !rect) {
    return null;
  }

  const spotlightStyle = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const tooltipBelow = rect.top < window.innerHeight * 0.55;
  const tooltipStyle = tooltipBelow
    ? { top: rect.bottom + PADDING + 12 }
    : { bottom: window.innerHeight - rect.top + PADDING + 12 };

  function next() {
    if (index + 1 < availableSteps!.length) setIndex(index + 1);
    else onDone();
  }

  return (
    <div className="coach-backdrop">
      <div className="coach-spotlight" style={spotlightStyle} />
      <div className="coach-tooltip" style={tooltipStyle}>
        <p className="coach-title">{t(current.step.titleKey)}</p>
        <p className="coach-body">{t(current.step.bodyKey)}</p>
        <div className="coach-footer">
          <div className="coach-dots">
            {availableSteps.map((_, i) => (
              <span key={i} className={`coach-dot${i === index ? " active" : ""}`} />
            ))}
          </div>
          <div className="coach-actions">
            <button className="coach-skip" onClick={onDone}>{t("coachSkip")}</button>
            <button className="coach-next" onClick={next}>
              {index + 1 === availableSteps.length ? t("coachDone") : t("coachNext")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
