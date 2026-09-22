import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { characterImageSrc, type AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import { watchUserProfile } from "../lib/firestore";
import {
  DAILY_RATION,
  HUD_ICON_CHEST,
  HUD_ICON_COIN,
  HUD_ICON_FLAG,
  HUD_ICON_TROPHY,
  HUD_WOOD_STRIP,
  ITEM_LABEL_KEY,
  TOWN_DECORATIONS,
  TOWN_IDLE_SPOT,
  TOWN_JOBS,
  TOWN_LEVELS,
  TOWN_SCENE_BG,
  buildingImageSrc,
  canPromote,
  decorationIconSrc,
  emptyTownProfile,
  isNightNow,
  isSameLocalDay,
  type TownJob,
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
  const [animal, setAnimal] = useState<AnimalKey | undefined>(undefined);
  const [mbti, setMbti] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [pendingJob, setPendingJob] = useState<TownJob | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showPromote, setShowPromote] = useState(false);

  useEffect(() => {
    const unsub = watchTownProfile(uid, setProfile);
    const unsubDisplay = watchUserProfile(uid, (p) => {
      setAnimal(p.animal as AnimalKey | undefined);
      setMbti(p.mbti || undefined);
      syncTownDisplayFields(uid, { nickname: p.nickname, animal: p.animal, mbti: p.mbti }).catch(() => {});
    });
    claimDailyRation(uid)
      .then(({ claimed }) => { if (claimed) flash(t("townRationClaimed", { n: DAILY_RATION })); })
      .catch(() => {});
    return () => { unsub(); unsubDisplay(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
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
  const night = isNightNow();

  function handleBuildingTap(job: TownJob) {
    if (profile.currentJob) {
      if (currentJobDef?.key === job.key && jobReady) handleCollect();
      return;
    }
    if (profile.titleIndex < job.unlockLevel) {
      flash(t("townJobLocked", { title: t(TOWN_LEVELS[job.unlockLevel].titleKey) }));
      return;
    }
    if (job.nightOnly && !night) {
      flash(t("townJobStartFailNight"));
      return;
    }
    setPendingJob(job);
  }

  async function handleConfirmStart() {
    if (!pendingJob) return;
    const job = pendingJob;
    setPendingJob(null);
    try {
      await sendToWork(uid, job.key);
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

  async function handleClaimRation() {
    const { claimed } = await claimDailyRation(uid);
    if (claimed) flash(t("townRationClaimed", { n: DAILY_RATION }));
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

  const inventoryEntries = Object.entries(profile.inventory).filter(([, qty]) => (qty || 0) > 0);
  const spriteSpot = currentJobDef ? { x: currentJobDef.x, y: currentJobDef.y } : TOWN_IDLE_SPOT;

  return (
    <div className="town-page">
      {toast && <div className="town-toast">{toast}</div>}

      <div className="town-scene">
        <img className="town-scene-bg" src={TOWN_SCENE_BG} alt="" />

        {TOWN_JOBS.map((job) => {
          const locked = profile.titleIndex < job.unlockLevel;
          const isWorkingHere = profile.currentJob?.jobKey === job.key;
          return (
            <button
              key={job.key}
              type="button"
              className={`town-building${locked ? " locked" : ""}${isWorkingHere ? " active" : ""}`}
              style={{ left: `${job.x}%`, top: `${job.y}%` }}
              onClick={() => handleBuildingTap(job)}
            >
              <img className="town-building-img" src={buildingImageSrc(job.key)} alt={t(job.nameKey)} />
              {locked && <span className="town-building-lock">{t("townLockedTag")}</span>}
              <span className="town-building-label">{t(job.nameKey)}</span>
              {isWorkingHere && (
                <span className={`town-building-badge${jobReady ? " ready" : ""}`}>
                  {jobReady ? t("townCollect") : `${remainingMin}m`}
                </span>
              )}
            </button>
          );
        })}

        {animal && (
          <div className="town-sprite" style={{ left: `${spriteSpot.x}%`, top: `${spriteSpot.y}%` }}>
            <div className="town-sprite-bubble">
              <span>
                {profile.currentJob
                  ? jobReady ? t("townJobReady") : t("townJobRemaining", { m: remainingMin })
                  : t("townJobsTitle")}
              </span>
            </div>
            <img className="town-sprite-img" src={characterImageSrc(animal, mbti)} alt="" />
            <div className="town-sprite-shadow" />
          </div>
        )}

        <div className="town-hud-top">
          <img className="town-hud-wood" src={HUD_WOOD_STRIP} alt="" />
          <div className="town-hud-top-content">
            <span className="town-title-badge">{t(TOWN_LEVELS[profile.titleIndex].titleKey)}</span>
            <span className="town-exp">{t("townExp", { n: profile.companionExp })}</span>
            <div className="town-hud-spacer" />
            <span className="town-resource" aria-label={t("townOxFeed", { n: profile.oxFeed })}>
              <img className="town-resource-icon" src={HUD_ICON_COIN} alt="" />
              {profile.oxFeed}
            </span>
            <button
              type="button"
              className={`town-ration-btn${rationClaimedToday ? " claimed" : ""}`}
              disabled={rationClaimedToday}
              onClick={handleClaimRation}
            >
              {rationClaimedToday ? t("townRation") : t("townClaimRationBtn")}
            </button>
          </div>
        </div>

        <div className="town-hud-bottom">
          <button type="button" className="town-hud-btn" onClick={() => setShowInventory(true)}>
            <img className="town-hud-btn-wood" src={HUD_WOOD_STRIP} alt="" />
            <span className="town-hud-btn-content">
              <img className="town-hud-btn-icon" src={HUD_ICON_CHEST} alt="" />
              {t("townInventoryTitle")}
            </span>
          </button>
          <button type="button" className="town-hud-btn" onClick={() => setShowPromote(true)}>
            <img className="town-hud-btn-wood" src={HUD_WOOD_STRIP} alt="" />
            <span className="town-hud-btn-content">
              <img className="town-hud-btn-icon" src={HUD_ICON_TROPHY} alt="" />
              {t("townPromoteNav")}
            </span>
          </button>
          <Link to="/town/world" className="town-hud-btn">
            <img className="town-hud-btn-wood" src={HUD_WOOD_STRIP} alt="" />
            <span className="town-hud-btn-content">
              <img className="town-hud-btn-icon" src={HUD_ICON_FLAG} alt="" />
              {t("townWorldNav")}
            </span>
          </Link>
        </div>

        <Link to="/" className="town-back-link">← {t("home")}</Link>
      </div>

      {pendingJob && (
        <div className="town-mask" onClick={() => setPendingJob(null)}>
          <div className="town-sheet town-confirm-sheet" onClick={(e) => e.stopPropagation()}>
            <img className="town-confirm-img" src={buildingImageSrc(pendingJob.key)} alt="" />
            <p className="town-sheet-title">{t(pendingJob.nameKey)}</p>
            <p className="town-meta">
              {t("townJobDuration", { h: pendingJob.durationMs / 3_600_000 })} · {t("townJobCost", { n: pendingJob.feedCost })}
            </p>
            <button className="town-collect-btn" onClick={handleConfirmStart}>{t("townJobStart")}</button>
          </div>
        </div>
      )}

      {showInventory && (
        <div className="town-mask" onClick={() => setShowInventory(false)}>
          <div className="town-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="town-sheet-title">{t("townInventoryTitle")}</p>
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

            <p className="town-sheet-title town-deco-title">{t("townDecorateTitle")}</p>
            <div className="town-deco-grid">
              {TOWN_DECORATIONS.map((deco) => {
                const owned = profile.decorations.includes(deco.key);
                return (
                  <div className={`town-deco-card${owned ? " owned" : ""}`} key={deco.key}>
                    <img className="town-deco-icon-img" src={decorationIconSrc(deco.key)} alt="" />
                    <p className="town-deco-name">{t(deco.nameKey)}</p>
                    <p className="town-deco-cost">
                      {t(ITEM_LABEL_KEY[deco.costItem])} {profile.inventory[deco.costItem] || 0}/{deco.costAmount}
                    </p>
                    <button
                      className="town-deco-buy-btn"
                      disabled={owned || (profile.inventory[deco.costItem] || 0) < deco.costAmount}
                      onClick={() => handleBuyDecoration(deco.key)}
                    >
                      {owned ? t("townDecorateOwned") : t("townDecorateBuy")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
