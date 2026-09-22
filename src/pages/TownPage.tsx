import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../lib/i18n";
import { watchUserProfile } from "../lib/firestore";
import {
  ITEM_LABEL_KEY,
  TOWN_DECORATIONS,
  TOWN_JOBS,
  TOWN_LEVELS,
  canPromote,
  emptyTownProfile,
  isNightNow,
  isSameLocalDay,
  type TownProfile,
} from "../lib/town";
import {
  buyDecoration,
  claimDailyRation,
  collectJob,
  promote,
  sendToWork,
  syncTownDisplayFields,
  watchTownProfile,
} from "../lib/townFirestore";
import "./TownPage.css";

export function TownPage({ uid }: { uid: string }) {
  const t = useT();
  const [profile, setProfile] = useState<TownProfile>(emptyTownProfile());
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [showPromote, setShowPromote] = useState(false);
  const [showDecorate, setShowDecorate] = useState(false);

  useEffect(() => {
    const unsub = watchTownProfile(uid, setProfile);
    const unsubDisplay = watchUserProfile(uid, (p) => {
      syncTownDisplayFields(uid, { nickname: p.nickname, animal: p.animal, mbti: p.mbti }).catch(() => {});
    });
    claimDailyRation(uid).catch(() => {});
    return () => { unsub(); unsubDisplay(); };
  }, [uid]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  const rationClaimedToday = profile.lastDailyRationAt != null && isSameLocalDay(profile.lastDailyRationAt, now);
  const currentJobDef = profile.currentJob ? TOWN_JOBS.find((j) => j.key === profile.currentJob!.jobKey) : null;
  const jobReady = !!profile.currentJob && now >= profile.currentJob.endsAt;
  const remainingMin = profile.currentJob ? Math.max(0, Math.ceil((profile.currentJob.endsAt - now) / 60_000)) : 0;

  const nextLevel = TOWN_LEVELS[profile.titleIndex + 1];
  const eligibleToPromote = useMemo(() => canPromote(profile), [profile]);

  async function handleStartJob(jobKey: string) {
    try {
      await sendToWork(uid, jobKey);
      flash(t("townJobStartOk"));
    } catch (err) {
      const msg = (err as Error).message;
      const key =
        msg === "insufficient_oxfeed" ? "townJobStartFailInsufficient" :
        msg === "level_too_low" ? "townJobStartFailLevel" :
        msg === "night_only" ? "townJobStartFailNight" :
        msg === "already_working" ? "townJobStartFailBusy" : "townJobStartFailGeneric";
      flash(t(key));
    }
  }

  async function handleCollect() {
    try {
      const res = await collectJob(uid);
      const itemLabel = t(ITEM_LABEL_KEY[res.itemGained]);
      flash(t("townCollectResult", { item: itemLabel, n: res.amountGained, exp: res.expGained }));
    } catch (err) {
      const msg = (err as Error).message;
      flash(t(msg === "not_finished" ? "townCollectFailNotFinished" : "townCollectFailGeneric"));
    }
  }

  async function handlePromote() {
    try {
      const res = await promote(uid);
      flash(t("townPromoteSuccess", { title: t(TOWN_LEVELS[res.newTitleIndex].titleKey) }));
    } catch {
      flash(t("townPromoteFail"));
    }
  }

  async function handleBuyDecoration(key: string) {
    try {
      await buyDecoration(uid, key);
      flash(t("townDecorateBuySuccess"));
    } catch (err) {
      const msg = (err as Error).message;
      flash(t(msg === "insufficient_item" ? "townDecorateBuyFailItem" : "townDecorateBuyFailOwned"));
    }
  }

  const night = isNightNow();
  const inventoryEntries = Object.entries(profile.inventory).filter(([, qty]) => (qty || 0) > 0);

  return (
    <div className="town-page">
      {toast && <div className="town-toast">{toast}</div>}

      <Link to="/" className="town-back-link">← {t("home")}</Link>

      <div className="town-header">
        <h1 className="town-title">{t("townTitle")}</h1>
        <p className="town-title-badge">{t(TOWN_LEVELS[profile.titleIndex].titleKey)}</p>
        <div className="town-stats-row">
          <span className="town-stat">{t("townOxFeed", { n: profile.oxFeed })}</span>
          <span className="town-stat">{t("townExp", { n: profile.companionExp })}</span>
        </div>
        {rationClaimedToday && <p className="town-ration-note">{t("townRation")}</p>}
      </div>

      <div className="town-actions-row">
        <button className="town-action-btn" onClick={() => setShowPromote(true)}>{t("townPromoteNav")}</button>
        <button className="town-action-btn" onClick={() => setShowDecorate(true)}>{t("townDecorateNav")}</button>
        <Link className="town-action-btn" to="/town/world">{t("townWorldNav")}</Link>
      </div>

      {profile.currentJob && currentJobDef ? (
        <div className="town-current-job">
          <p className="town-current-job-title">
            {t("townCurrentJob", { job: t(currentJobDef.nameKey) })}
            {profile.currentJob.assignedBy && <span className="town-assigned-tag">{t("townCurrentJobAssignedByBoss")}</span>}
          </p>
          {jobReady ? (
            <>
              <p className="town-job-ready">{t("townJobReady")}</p>
              <button className="town-collect-btn" onClick={handleCollect}>{t("townCollect")}</button>
            </>
          ) : (
            <p className="town-job-remaining">{t("townJobRemaining", { m: remainingMin })}</p>
          )}
        </div>
      ) : (
        <div className="town-jobs-board">
          <h2 className="town-section-title">{t("townJobsTitle")}</h2>
          <div className="town-jobs-grid">
            {TOWN_JOBS.map((job) => {
              const locked = profile.titleIndex < job.unlockLevel;
              const nightBlocked = !!job.nightOnly && !night;
              return (
                <div key={job.key} className={`town-job-card${locked ? " locked" : ""}`}>
                  <div className="town-job-emoji">{job.emoji}</div>
                  <p className="town-job-name">{t(job.nameKey)}</p>
                  <p className="town-job-meta">{t("townJobDuration", { h: job.durationMs / 3_600_000 })} · {t("townJobCost", { n: job.feedCost })}</p>
                  {job.nightOnly && <p className="town-job-night">{t("townJobNightOnly")}</p>}
                  {locked ? (
                    <p className="town-job-locked-label">{t("townJobLocked", { title: t(TOWN_LEVELS[job.unlockLevel].titleKey) })}</p>
                  ) : (
                    <button className="town-job-start-btn" disabled={nightBlocked} onClick={() => handleStartJob(job.key)}>
                      {t("townJobStart")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="town-inventory">
        <h2 className="town-section-title">{t("townInventoryTitle")}</h2>
        {inventoryEntries.length === 0 ? (
          <p className="town-meta">{t("townInventoryEmpty")}</p>
        ) : (
          <div className="town-inventory-grid">
            {inventoryEntries.map(([item, qty]) => (
              <div className="town-inventory-item" key={item}>
                <span>{t(ITEM_LABEL_KEY[item as keyof typeof ITEM_LABEL_KEY])}</span>
                <span className="town-inventory-qty">x{qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPromote && (
        <div className="town-mask" onClick={() => setShowPromote(false)}>
          <div className="town-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="town-sheet-title">{t("townPromoteTitle")}</p>
            <div className="town-ladder">
              {TOWN_LEVELS.map((lvl, i) => {
                const state = i < profile.titleIndex ? "done" : i === profile.titleIndex ? "current" : "locked";
                return (
                  <div className={`town-ladder-row ${state}`} key={lvl.titleKey}>
                    <span className="town-ladder-title">{t(lvl.titleKey)}</span>
                    <span className="town-ladder-exp">{lvl.expThreshold}</span>
                  </div>
                );
              })}
            </div>
            {nextLevel && (
              <>
                {!eligibleToPromote && (
                  <p className="town-meta">
                    {t("townPromoteMaterialsNeed", {
                      list: Object.entries(nextLevel.materials || {})
                        .map(([item, need]) => `${t(ITEM_LABEL_KEY[item as keyof typeof ITEM_LABEL_KEY])} x${need}`)
                        .join(", "),
                    })}
                  </p>
                )}
                {eligibleToPromote && <p className="town-promote-ready">{t("townPromoteReady")}</p>}
                <button className="town-promote-btn" disabled={!eligibleToPromote} onClick={handlePromote}>
                  {t("townPromoteButton")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showDecorate && (
        <div className="town-mask" onClick={() => setShowDecorate(false)}>
          <div className="town-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="town-sheet-title">{t("townDecorateTitle")}</p>
            <div className="town-deco-grid">
              {TOWN_DECORATIONS.map((deco) => {
                const owned = profile.decorations.includes(deco.key);
                return (
                  <div className="town-deco-card" key={deco.key}>
                    <div className="town-deco-emoji">{deco.emoji}</div>
                    <p className="town-deco-name">{t(deco.nameKey)}</p>
                    <p className="town-deco-cost">{t(ITEM_LABEL_KEY[deco.costItem])} x{deco.costAmount}</p>
                    {owned ? (
                      <span className="town-deco-owned">{t("townDecorateOwned")}</span>
                    ) : (
                      <button className="town-deco-buy-btn" onClick={() => handleBuyDecoration(deco.key)}>
                        {t("townDecorateBuy")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
