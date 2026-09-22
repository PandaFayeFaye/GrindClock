import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { characterImageSrc, type AnimalKey } from "../lib/avatar";
import { useT } from "../lib/i18n";
import { ITEM_LABEL_KEY, TOWN_JOBS, TOWN_LEVELS, decorationIconSrc, isSameLocalDay, type TownItemType } from "../lib/town";
import { fetchWorld, skimFrom, stealFrom, type WorldEntry } from "../lib/townFirestore";
import "./TownWorldPage.css";

export function TownWorldPage({ uid }: { uid: string }) {
  const t = useT();
  const [list, setList] = useState<WorldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

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

  return (
    <div className="town-world-page">
      {toast && <div className="town-toast">{toast}</div>}
      <Link to="/town" className="town-back-link">← {t("townTitle")}</Link>
      <h1 className="town-world-title">{t("townWorldTitle")}</h1>
      <p className="town-world-hint">{t("townWorldHint")}</p>

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
  );
}
