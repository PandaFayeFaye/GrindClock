import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addManualEntry, clockIn, clockOut, watchEmployers, watchTimeEntries, watchUserProfile } from "../lib/firestore";
import { entryHours, entryPay, mergedHoursToday } from "../lib/pay";
import { TIERS, TIER_COLORS, currentTierIndex } from "../lib/tiers";
import type { Adjustment, Employer, Mood, TimeEntry } from "../lib/types";
import { Mascot } from "../components/Mascot";
import { AvatarBadge, type AnimalKey } from "../lib/avatar";
import { PET_STAGES, currentPetStageIndex, hoursSinceFed, isPetHungry } from "../lib/pet";
import { PunchConfirmModal } from "../components/PunchConfirmModal";
import { CompanionWidget } from "../components/CompanionWidget";
import { RetroClockInModal } from "../components/RetroClockInModal";
import { ScheduleConfirmModal } from "../components/ScheduleConfirmModal";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { getCurrentLocation } from "../lib/geolocation";
import { useT } from "../lib/i18n";
import { DEFAULT_CURRENCY, currencySymbol, formatGroupedPay } from "../lib/currency";
import { combineDateAndTime, todaysSchedule } from "../lib/schedule";
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
  const [animal, setAnimal] = useState<AnimalKey | undefined>(undefined);
  const [mbti, setMbti] = useState<string | undefined>(undefined);
  const [nickname, setNickname] = useState("");
  const [confirmingEntry, setConfirmingEntry] = useState<{ entry: TimeEntry; employer: Employer } | null>(null);
  const [retroEmployer, setRetroEmployer] = useState<Employer | null>(null);
  const [scheduleConfirmEmployer, setScheduleConfirmEmployer] = useState<Employer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [simpleMode] = useLocalToggle(SETTINGS_KEYS.simpleMode, false);
  const [locationPunch] = useLocalToggle(SETTINGS_KEYS.locationPunch, false);
  const [aiPhotoOn] = useLocalToggle(SETTINGS_KEYS.aiPhoto, true);
  const [aiVoiceOn] = useLocalToggle(SETTINGS_KEYS.aiVoice, true);

  useEffect(() => {
    const unsubEmployers = watchEmployers(uid, setEmployers);
    const unsubEntries = watchTimeEntries(uid, setEntries);
    const unsubProfile = watchUserProfile(uid, (profile) => {
      setAnimal(profile.animal as AnimalKey | undefined);
      setMbti(profile.mbti || undefined);
      setNickname(profile.nickname ?? "");
    });
    return () => { unsubEmployers(); unsubEntries(); unsubProfile(); };
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
  const employerIdsWithEntryToday = useMemo(() => new Set(todaysEntries.map((e) => e.employerId)), [todaysEntries]);
  const todaysHoursByEmployer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of todaysEntries) map.set(e.employerId, (map.get(e.employerId) ?? 0) + entryHours(e));
    return map;
  }, [todaysEntries]);

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

  const totalHours = useMemo(
    () => personalEntries.filter((e) => e.status === "confirmed" && e.endTime).reduce((s, e) => s + entryHours(e), 0),
    [personalEntries],
  );
  const currentTierIdx = currentTierIndex(totalHours);
  const currentTier = TIERS[currentTierIdx];
  const nextTier = TIERS[currentTierIdx + 1];
  const tierProgressPct = nextTier
    ? Math.min(100, Math.round(((totalHours - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100))
    : 100;
  const workingCount = activeByEmployer.size;

  const lastFedAt = useMemo(() => {
    const fedTimes = personalEntries
      .filter((e) => e.status === "confirmed" && e.endTime)
      .map((e) => e.endTime as number);
    return fedTimes.length > 0 ? Math.max(...fedTimes) : null;
  }, [personalEntries]);
  const petStageIdx = currentPetStageIndex(totalHours);
  const petStage = PET_STAGES[petStageIdx];
  const nextPetStage = PET_STAGES[petStageIdx + 1];
  const petHungry = isPetHungry(lastFedAt);
  const hungryHours = Math.floor(hoursSinceFed(lastFedAt));

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
    // Re-check against the live active map, not just the state captured when the
    // button was tapped -- another tab/device could have clocked this employer in
    // while the modal sat open, and same-employer double clock-ins are disallowed.
    if (!activeByEmployer.has(retroEmployer.id)) {
      clockIn(uid, retroEmployer.id, undefined, startTime);
    }
    setRetroEmployer(null);
  }

  function handleScheduleConfirm(start: string, end: string) {
    if (!scheduleConfirmEmployer) return;
    const today = new Date();
    const startTime = combineDateAndTime(today, start);
    let endTime = combineDateAndTime(today, end);
    if (endTime <= startTime) endTime += 24 * 3_600_000; // overnight shift
    addManualEntry(uid, {
      employerId: scheduleConfirmEmployer.id,
      startTime,
      endTime,
      status: "confirmed",
      source: "manual",
    });
    setScheduleConfirmEmployer(null);
  }

  function handleConfirm(
    mood: Mood | undefined,
    moodNote: string | undefined,
    note: string,
    adjustment: Adjustment[] | undefined,
    isOvertime: boolean,
    isHoliday: boolean,
    orderCount: number | undefined,
    endTime: number,
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
    }, endTime);
    setConfirmingEntry(null);
  }

  return (
    <div className="home-page">
      {!simpleMode && (
        <div className="banner">
          {animal ? <AvatarBadge animal={animal} mbti={mbti} size={44} /> : <Mascot size={44} />}
          <div className="banner-text">
            <p className="banner-title">
              {nickname ? t("homeBannerNamed", { name: nickname }) : t("homeBanner")}
            </p>
            <Link to="/badges" className="home-tier-chip">
              <span className="home-tier-name" style={{ color: TIER_COLORS[currentTierIdx] }}>{t(currentTier.nameKey)}</span>
              <span className="home-tier-track">
                <span className="home-tier-fill" style={{ width: `${tierProgressPct}%`, background: TIER_COLORS[currentTierIdx] }} />
              </span>
              {nextTier && <span className="home-tier-next">{t(nextTier.nameKey)}</span>}
            </Link>
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
            {employers.map((emp, i) => {
              const active = activeByEmployer.get(emp.id);
              const schedule = todaysSchedule(emp);
              const showScheduleCard = !!schedule && !active && !employerIdsWithEntryToday.has(emp.id);
              const rowDelay = { animationDelay: `${i * 55}ms` };

              if (showScheduleCard) {
                return (
                  <div className="row-wrap schedule-card" key={emp.id} style={rowDelay}>
                    <div className="row">
                      <span className="dot" style={{ background: emp.color }} />
                      <Link to={`/employers/${emp.id}`} className="row-name">
                        <div className="row-title-line">
                          <p className="row-title">{emp.name}</p>
                          <span className="row-rate">{t("scheduleConfirmTitle", { start: schedule.start, end: schedule.end })}</span>
                        </div>
                      </Link>
                      <button className="punch-btn schedule-btn" onClick={() => setScheduleConfirmEmployer(emp)}>
                        {t("scheduleConfirmBtn")}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className={`row-wrap${active ? " is-working" : ""}`} key={emp.id} style={rowDelay}>
                <div className="row">
                  <span className="dot" style={{ background: emp.color }} />
                  <Link to={`/employers/${emp.id}`} className="row-name">
                    <div className="row-title-line">
                      <p className="row-title">{emp.name}</p>
                      <span className="row-rate">
                        {emp.payType === "hourly" || emp.payType === "comprehensive"
                          ? `${currencySymbol(emp.currency)}${emp.hourlyRate ?? 0}/h`
                          : emp.payType}
                      </span>
                      {!active && employerIdsWithEntryToday.has(emp.id) && (
                        <span className="done-today-chip">
                          <svg viewBox="0 0 24 24" fill="none" width="9" height="9">
                            <path d="M4.5 12.5l4.5 4.5L19.5 6" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {t("doneToday", { h: (todaysHoursByEmployer.get(emp.id) ?? 0).toFixed(1) })}
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    className={`punch-btn${active ? " working" : ""}`}
                    onClick={() => handlePunch(emp)}
                  >
                    {active ? t("clockOut") : t("clockIn")}
                  </button>
                </div>
                {!active && !employerIdsWithEntryToday.has(emp.id) && (
                  <button type="button" className="retro-btn" onClick={() => setRetroEmployer(emp)}>
                    <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                      <circle cx="12" cy="13" r="8" stroke="#8A8272" strokeWidth="1.8" />
                      <path d="M12 9v4l3 1.8" stroke="#8A8272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 3h6" stroke="#8A8272" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {t("retroClockIn")}
                  </button>
                )}
                {active && Date.now() - active.startTime > 14 * 3_600_000 && (
                  <button type="button" className="retro-btn long-shift" onClick={() => handlePunch(emp)}>
                    {t("longShiftWarning", { h: Math.floor((Date.now() - active.startTime) / 3_600_000) })}
                  </button>
                )}
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

      {!simpleMode && animal && (
        <CompanionWidget
          animal={animal}
          mbti={mbti}
          stageNameKey={petStage.nameKey}
          stageAccessory={petStage.accessory}
          hungry={petHungry}
          progressPct={
            nextPetStage
              ? Math.min(100, Math.round(((totalHours - petStage.threshold) / (nextPetStage.threshold - petStage.threshold)) * 100))
              : 100
          }
          progressCaptionKey={nextPetStage ? "petFeedProgress" : "petMaxStage"}
          progressCaptionVars={nextPetStage ? { h: (nextPetStage.threshold - totalHours).toFixed(0) } : undefined}
          moodCaptionKey={lastFedAt == null ? "petNeverFedCaption" : petHungry ? "petHungryCaption" : "petFedCaption"}
          moodCaptionVars={petHungry && lastFedAt != null ? { h: hungryHours } : undefined}
        />
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
              <Link className="fab-menu-item" to="/entries/batch" onClick={() => setMenuOpen(false)}>
                <span className="fab-menu-label">{t("batchBackfill")}</span>
                <span className="fab-mini" style={{ background: "#39C97A" }}>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#fff" />
                    <rect x="13" y="4" width="7" height="7" rx="1.5" fill="#fff" />
                    <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#fff" />
                    <rect x="13" y="13" width="7" height="7" rx="1.5" fill="#fff" />
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

      {scheduleConfirmEmployer && (() => {
        const schedule = todaysSchedule(scheduleConfirmEmployer);
        if (!schedule) return null;
        return (
          <ScheduleConfirmModal
            employer={scheduleConfirmEmployer}
            scheduled={schedule}
            onCancel={() => setScheduleConfirmEmployer(null)}
            onConfirm={handleScheduleConfirm}
          />
        );
      })()}
    </div>
  );
}
