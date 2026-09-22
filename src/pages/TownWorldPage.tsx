import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { characterImageSrc, type AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import {
  ITEM_LABEL_KEY,
  TOWN_JOBS,
  TOWN_LEVELS,
  TOWN_SCENE_BG,
  decorationIconSrc,
  isSameLocalDay,
  type TownItemType,
} from "../lib/town";
import { fetchWorld, skimFrom, stealFrom, type WorldEntry } from "../lib/townFirestore";
import "./TownWorldPage.css";

// Deterministic pseudo-random 0..1 from a string -- same player always
// stands in the same plaza spot on every load instead of jumping around.
function seededFraction(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

// Golden-ratio (Weyl sequence) spacing: frac(i * 0.618...) spreads N points
// across 0..1 far more evenly than plain randomness, so the crowd doesn't
// clump together regardless of headcount.
const GOLDEN_FRACTION = 0.6180339887;
function weylFraction(i: number, offset: number): number {
  const v = i * GOLDEN_FRACTION + offset;
  return v - Math.floor(v);
}

export function TownWorldPage({ uid }: { uid: string }) {
  const t = useT();
  const [list, setList] = useState<WorldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [activeEntry, setActiveEntry] = useState<WorldEntry | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  function load() {
    setLoading(true);
    fetchWorld()
      .then(setList)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const me = list.find((e) => e.uid === uid);
  const others = list.filter((e) => e.uid !== uid);

  async function handleSteal(entry: WorldEntry) {
    try {
      const res = await stealFrom(uid, entry.uid);
      flash(t("townStealSuccess", { item: t(ITEM_LABEL_KEY[res.item as TownItemType]), n: res.amount }));
      load();
    } catch (err) {
      const msg = (err as Error).message;
      const key =
        msg === "steal_cooldown" ? "townStealFailCooldown" :
        msg === "steal_global_cooldown" ? "townStealFailGlobalCooldown" :
        msg === "nothing_to_steal" ? "townStealFailEmpty" : "townStealFailGeneric";
      flash(t(key));
    }
  }

  async function handleSkim(entry: WorldEntry) {
    try {
      const res = await skimFrom(uid, entry.uid);
      const jobName = TOWN_JOBS.find((j) => j.key === res.jobKey);
      flash(t("townSkimSuccess", { job: jobName ? t(jobName.nameKey) : res.jobKey }));
      load();
    } catch (err) {
      const msg = (err as Error).message;
      const key =
        msg === "skim_cooldown" ? "townSkimFailCooldown" :
        msg === "no_job_available" ? "townSkimFailNoJob" : "townSkimFailGeneric";
      flash(t(key));
    }
  }

  const myTitleIndex = me?.titleIndex ?? -1;

  return (
    <div className="town-world-page">
      <img className="town-world-bg" src={TOWN_SCENE_BG} alt="" />
      <div className="town-world-content">
      {toast && <div className="town-toast">{toast}</div>}
      <Link to="/town" className="town-back-link">← {t("townTitle")}</Link>
      <h1 className="town-world-title">{t("townWorldTitle")}</h1>
      <p className="town-world-hint">{t("townWorldHint")}</p>

      {list.length > 0 && (
        <div className="world-plaza">
          {list.map((entry, i) => {
            const isMe = entry.uid === uid;
            const seed = seededFraction(entry.uid);
            const x = 12 + weylFraction(i, 0.13) * 76;
            const y = 16 + weylFraction(i, 0.71) * 60;
            const bobDelay = seed * -3;
            return (
              <button
                key={entry.uid}
                type="button"
                className={`world-roamer${isMe ? " is-me" : ""}`}
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${bobDelay}s` }}
                onClick={() => (isMe ? null : setActiveEntry(entry))}
              >
                {entry.animal && (
                  <img className="world-roamer-img" src={characterImageSrc(entry.animal as AnimalKey, entry.mbti)} alt="" />
                )}
                <span className="world-roamer-name">{isMe ? t("townWorldMe") : entry.nickname || "?"}</span>
              </button>
            );
          })}
        </div>
      )}

      {me && (
        <div className="world-card me-card">
          <div className="world-card-head">
            <span className="world-rank">#{list.indexOf(me) + 1}</span>
            {me.animal && <img className="world-avatar" src={characterImageSrc(me.animal as AnimalKey, me.mbti)} alt="" />}
            <span className="world-nickname">{t("townWorldMe")}</span>
            <span className="world-title-badge">{t(TOWN_LEVELS[me.titleIndex].titleKey)}</span>
          </div>
          <p className="world-exp-line">{t("townExp", { n: me.companionExp })}</p>
          {me.decorations.length > 0 && (
            <div className="world-deco-row">
              {me.decorations.map((key) => (
                <img key={key} className="world-deco-icon" src={decorationIconSrc(key)} alt="" />
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="town-meta">…</p>
      ) : others.length === 0 ? (
        <p className="town-meta">{t("townWorldNone")}</p>
      ) : (
        others.map((entry) => {
          const checkedIn = entry.lastDailyRationAt != null && isSameLocalDay(entry.lastDailyRationAt, Date.now());
          const working = !!entry.currentJob && Date.now() < entry.currentJob.endsAt;
          const inventoryCount = Object.values(entry.inventory).reduce((s, q) => s + (q || 0), 0);
          const canSkim = list.length > 0 && (list.find((e) => e.uid === uid)?.titleIndex ?? -1) > entry.titleIndex;
          const blocked = (list.find((e) => e.uid === uid)?.titleIndex ?? -1) < entry.titleIndex;
          return (
            <div className="world-card" key={entry.uid}>
              <div className="world-card-head">
                <span className="world-rank">#{list.indexOf(entry) + 1}</span>
                {entry.animal && (
                  <img className="world-avatar" src={characterImageSrc(entry.animal as AnimalKey, entry.mbti)} alt="" />
                )}
                <span className="world-nickname">{entry.nickname || t("townWorldMe")}</span>
                <span className="world-title-badge">{t(TOWN_LEVELS[entry.titleIndex].titleKey)}</span>
              </div>
              <p className="world-exp-line">{t("townExp", { n: entry.companionExp })}</p>
              {entry.decorations.length > 0 && (
                <div className="world-deco-row">
                  {entry.decorations.map((key) => (
                    <img key={key} className="world-deco-icon" src={decorationIconSrc(key)} alt="" />
                  ))}
                </div>
              )}
              <div className="world-badge-row">
                <span className={`world-badge${checkedIn ? " ok" : " warn"}`}>
                  {checkedIn ? t("townWorldCheckedIn") : t("townWorldNotCheckedIn")}
                </span>
                {working && <span className="world-badge working">{t("townWorldWorking")}</span>}
                {inventoryCount > 0 ? (
                  <span className="world-badge steal">{t("townWorldStealable", { n: inventoryCount })}</span>
                ) : (
                  <span className="world-badge empty">{t("townWorldEmpty")}</span>
                )}
              </div>
              {blocked ? (
                <p className="world-blocked">{t("townWorldBlocked")}</p>
              ) : (
                <div className="world-actions">
                  <button className="world-btn" onClick={() => handleSteal(entry)}>{t("townWorldSteal")}</button>
                  {canSkim && (
                    <button className="world-btn skim" onClick={() => handleSkim(entry)}>{t("townWorldSkim")}</button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      </div>

      {activeEntry && (
        <div className="town-mask" onClick={() => setActiveEntry(null)}>
          <div className="town-sheet world-picker-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="world-card-head">
              {activeEntry.animal && (
                <img className="world-avatar" src={characterImageSrc(activeEntry.animal as AnimalKey, activeEntry.mbti)} alt="" />
              )}
              <span className="world-nickname">{activeEntry.nickname || "?"}</span>
              <span className="world-title-badge">{t(TOWN_LEVELS[activeEntry.titleIndex].titleKey)}</span>
            </div>
            <p className="world-exp-line">{t("townExp", { n: activeEntry.companionExp })}</p>
            {myTitleIndex < activeEntry.titleIndex ? (
              <p className="world-blocked">{t("townWorldBlocked")}</p>
            ) : (
              <div className="world-actions">
                <button className="world-btn" onClick={() => { handleSteal(activeEntry); setActiveEntry(null); }}>
                  {t("townWorldSteal")}
                </button>
                {myTitleIndex > activeEntry.titleIndex && (
                  <button className="world-btn skim" onClick={() => { handleSkim(activeEntry); setActiveEntry(null); }}>
                    {t("townWorldSkim")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
