import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clockIn, clockOut, watchEmployers, watchTimeEntries } from "../lib/firestore";
import { entryPay, mergedHoursToday } from "../lib/pay";
import type { Adjustment, Employer, Mood, TimeEntry } from "../lib/types";
import { Mascot } from "../components/Mascot";
import { PunchConfirmModal } from "../components/PunchConfirmModal";
import { RetroClockInModal } from "../components/RetroClockInModal";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { getCurrentLocation } from "../lib/geolocation";
import { useT } from "../lib/i18n";
import { DEFAULT_CURRENCY, currencySymbol, formatGroupedPay } from "../lib/currency";
import "./HomePage.css";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HomePage({ uid }: { uid: string }) {
  const t = useT();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [confirmingEntry, setConfirmingEntry] = useState<{ entry: TimeEntry; employer: Employer } | null>(null);
  const [retroEmployer, setRetroEmployer] = useState<Employer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [simpleMode] = useLocalToggle(SETTINGS_KEYS.simpleMode, false);
  const [locationPunch] = useLocalToggle(SETTINGS_KEYS.locationPunch, false);
  const [aiPhotoOn] = useLocalToggle(SETTINGS_KEYS.aiPhoto, true);
  const [aiVoiceOn] = useLocalToggle(SETTINGS_KEYS.aiVoice, true);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [uid]);

  // Personal entries only -- team-logged (workerId set) entries never mix into this view.
  const personalEntries = useMemo(() => entries.filter((e) => !e.workerId), [entries]);

  const activeByEmployer = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const e of personalEntries) if (!e.endTime) map.set(e.employerId, e);
    return map;
  }, [personalEntries]);

  const todaysEntries = useMemo(
    () => personalEntries.filter((e) => e.status === "confirmed" && e.startTime >= startOfToday()),
    [personalEntries],
  );

  const employerById = useMemo(() => new Map(employers.map((e) => [e.id, e])), [employers]);

  const todaysIncomeByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of todaysEntries) {
      const emp = employerById.get(e.employerId);
      if (!emp) continue;
      const cur = emp.currency ?? DEFAULT_CURRENCY;
      map.set(cur, (map.get(cur) ?? 0) + entryPay(emp, e));
    }
    return map;
  }, [todaysEntries, employerById]);

  const todaysHours = useMemo(() => mergedHoursToday(personalEntries), [personalEntries]);
  const workingCount = activeByEmployer.size;

  async function handlePunch(employer: Employer) {
    const active = activeByEmployer.get(employer.id);
    if (active) {
      setConfirmingEntry({ entry: active, employer });
    } else if (locationPunch) {
      const loc = await getCurrentLocation();
      clockIn(uid, employer.id, loc ?? undefined);
    } else {
      clockIn(uid, employer.id);
    }
  }

  function handleRetroConfirm(startTime: number) {
    if (!retroEmployer) return;
    clockIn(uid, retroEmployer.id, undefined, startTime);
    setRetroEmployer(null);
  }

  function handleConfirm(
    mood: Mood | undefined,
    moodNote: string | undefined,
    note: string,
    adjustment: Adjustment[] | undefined,
    isOvertime: boolean,
    isHoliday: boolean,
    orderCount: number | undefined,
  ) {
    if (!confirmingEntry) return;
    const recurring = confirmingEntry.employer.defaultAdjustments ?? [];
    const combinedAdjustment = [...recurring, ...(adjustment ?? [])];
    clockOut(uid, confirmingEntry.entry.id, {
      mood,
      moodNote,
      note: note || undefined,
      adjustment: combinedAdjustment.length > 0 ? combinedAdjustment : undefined,
      isOvertime: isOvertime || undefined,
      isHoliday: isHoliday || undefined,
      orderCount,
    });
    setConfirmingEntry(null);
  }

  return (
    <div className="home-page">
      {!simpleMode && (
        <div className="banner">
          <Mascot size={44} />
          <div className="banner-text">
            <p className="banner-title">{t("homeBanner")}</p>
          </div>
        </div>
      )}

      {employers.length > 0 ? (
        <>
          {!simpleMode && workingCount >= 2 && (
            <div className="combo-badge">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <span>{t("comboBadge", { n: workingCount })}</span>
            </div>
          )}

          <div className="income-card">
            <p className="income-label">{t("todayEarned")}</p>
            <p className="income-value">{formatGroupedPay(todaysIncomeByCurrency, 1)}</p>
            <p className="income-note">{t("todayWorked", { h: todaysHours.toFixed(1) })}</p>
          </div>

          <div className="list">
            {employers.map((emp) => {
              const active = activeByEmployer.get(emp.id);
              return (
                <div className={`row${active ? " is-working" : ""}`} key={emp.id}>
                  <span className="dot" style={{ background: emp.color }} />
                  <Link to={`/employers/${emp.id}`} className="row-name">
                    <div className="row-title-line">
                      <p className="row-title">{emp.name}</p>
                      <span className="row-rate">
                        {emp.payType === "hourly" || emp.payType === "comprehensive"
                          ? `${currencySymbol(emp.currency)}${emp.hourlyRate ?? 0}/h`
                          : emp.payType}
                      </span>
                    </div>
                    {!active && (
                      <button
                        type="button"
                        className="retro-link"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRetroEmployer(emp); }}
                      >
                        忘记打卡了？补录开始时间
                      </button>
                    )}
                  </Link>
                  <button
                    className={`punch-btn${active ? " working" : ""}`}
                    onClick={() => handlePunch(emp)}
                  >
                    {active ? t("clockOut") : t("clockIn")}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty">
          <Mascot size={100} />
          <p>{t("noEmployersHint")}</p>
          <Link className="empty-cta" to="/employers/new">{t("addFirstEmployer")}</Link>
        </div>
      )}

      {employers.length > 0 && (
        <div className="fab-wrap">
          {menuOpen && (
            <>
              {(aiPhotoOn || aiVoiceOn) && (
                <Link className="fab-menu-item" to="/ai-capture" onClick={() => setMenuOpen(false)}>
                  <span className="fab-menu-label">{t("aiCapture")}</span>
                  <span className="fab-mini" style={{ background: "#B084F5" }}>
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" fill="#fff" />
                    </svg>
                  </span>
                </Link>
              )}
              <Link className="fab-menu-item" to="/entries/new" onClick={() => setMenuOpen(false)}>
                <span className="fab-menu-label">{t("backfill")}</span>
                <span className="fab-mini" style={{ background: "#FFD93D" }}>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                    <path d="M14 3l4 4-9.5 9.5L4 18l1.5-4.5z" fill="#fff" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
              <Link className="fab-menu-item" to="/employers/new" onClick={() => setMenuOpen(false)}>
                <span className="fab-menu-label">{t("addEmployer")}</span>
                <span className="fab-mini" style={{ background: "#5AC8FA" }}>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                    <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </Link>
            </>
          )}
          <button className={`fab${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
            <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
              <path d="M12 5v14M5 12h14" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {confirmingEntry && (
        <PunchConfirmModal
          employer={confirmingEntry.employer}
          entry={confirmingEntry.entry}
          onCancel={() => setConfirmingEntry(null)}
          onConfirm={handleConfirm}
        />
      )}

      {retroEmployer && (
        <RetroClockInModal
          employer={retroEmployer}
          onCancel={() => setRetroEmployer(null)}
          onConfirm={handleRetroConfirm}
        />
      )}
    </div>
  );
}
