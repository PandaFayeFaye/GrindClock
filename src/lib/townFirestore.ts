// Firestore access for Slackerville ("Mole-Fish Town" in Chinese). There is no Cloud Functions backend
// on the web build, so every settlement here runs as a client-side
// Firestore transaction instead of the Mini Program's server-authoritative
// cloud functions. Two things make that an acceptable trade-off instead of
// a real vulnerability:
//   1. This is a small, friends-only hidden easter egg -- its numbers were
//      never meant to be as hard-guarded as real money math.
//   2. firestore.rules still locks non-owners out of every field except
//      `inventory`, `currentJob`, `companionExp`, `lastActiveAt`,
//      `stealCooldowns`, `stealCounts`, `lastStealAt` and `skimCooldowns` --
//      exactly the fields steal/skim need to touch on someone else's doc.
//      `unlocked`, `oxFeed`, `titleIndex`, `decorations` and the
//      nickname/animal/mbti mirror stay owner-only no matter what, so a
//      griefer can at most inflate someone's play-money inventory/exp, never
//      unlock/promote/rename another account or touch real progress.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DAILY_RATION,
  STEAL_COOLDOWN_MS,
  STEAL_MAX_PER_WINDOW,
  SKIM_COOLDOWN_MS,
  TOWN_DECORATIONS,
  TOWN_JOBS,
  TOWN_LEVELS,
  canPromote,
  emptyTownProfile,
  isNightNow,
  isSameLocalDay,
  type TownInventory,
  type TownItemType,
  type TownProfile,
} from "./town";

const GLOBAL_STEAL_COOLDOWN_MS = 3_600_000;

function townDoc(uid: string) {
  return doc(db, "townProfiles", uid);
}

function jobLogCol() {
  return collection(db, "townJobLog");
}

function normalize(data: Record<string, unknown> | undefined): TownProfile {
  return { ...emptyTownProfile(), ...(data as Partial<TownProfile> | undefined) };
}

export function watchTownProfile(uid: string, cb: (profile: TownProfile) => void) {
  return onSnapshot(townDoc(uid), (snap) => cb(normalize(snap.data())));
}

export async function fetchTownProfile(uid: string): Promise<TownProfile> {
  const snap = await getDoc(townDoc(uid));
  return normalize(snap.data());
}

/** Keeps the public leaderboard mirror in sync with the private profile
 * (users/{uid}/profile/main) -- call opportunistically whenever Town/World
 * mounts. A no-op write if nothing changed since Firestore merges are cheap. */
export function syncTownDisplayFields(uid: string, display: { nickname?: string; animal?: string; mbti?: string }) {
  return setDoc(townDoc(uid), display, { merge: true });
}

export async function unlockTown(uid: string, display: { nickname?: string; animal?: string; mbti?: string }) {
  const existing = await fetchTownProfile(uid);
  if (existing.unlocked) return existing;
  const now = Date.now();
  const profile: TownProfile = {
    ...emptyTownProfile(),
    unlocked: true,
    unlockedAt: now,
    oxFeed: DAILY_RATION,
    lastDailyRationAt: now,
    lastActiveAt: now,
    ...display,
  };
  await setDoc(townDoc(uid), profile);
  return profile;
}

/** Free daily ration -- available once per local calendar day regardless of
 * whether the user actually clocked a real shift that day. */
export async function claimDailyRation(uid: string): Promise<{ profile: TownProfile; claimed: boolean }> {
  const ref = townDoc(uid);
  const profile = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const p = normalize(snap.data());
    const now = Date.now();
    if (p.lastDailyRationAt && isSameLocalDay(p.lastDailyRationAt, now)) return p;
    const next: TownProfile = { ...p, oxFeed: p.oxFeed + DAILY_RATION, lastDailyRationAt: now, lastActiveAt: now };
    tx.set(ref, next, { merge: true });
    return next;
  });
  return { profile, claimed: !!profile.lastDailyRationAt && isSameLocalDay(profile.lastDailyRationAt, Date.now()) };
}

export async function sendToWork(uid: string, jobKey: string): Promise<TownProfile> {
  const job = TOWN_JOBS.find((j) => j.key === jobKey);
  if (!job) throw new Error("unknown_job");
  const ref = townDoc(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const p = normalize(snap.data());
    if (!p.unlocked) throw new Error("not_unlocked");
    if (p.currentJob) throw new Error("already_working");
    if (p.titleIndex < job.unlockLevel) throw new Error("level_too_low");
    if (p.oxFeed < job.feedCost) throw new Error("insufficient_oxfeed");
    if (job.nightOnly && !isNightNow()) throw new Error("night_only");
    const now = Date.now();
    const next: TownProfile = {
      ...p,
      oxFeed: p.oxFeed - job.feedCost,
      currentJob: { jobKey: job.key, startedAt: now, endsAt: now + job.durationMs },
      lastActiveAt: now,
    };
    tx.set(ref, next, { merge: true });
    return next;
  });
}

export type CollectResult = { profile: TownProfile; jobKey: string; itemGained: TownItemType; amountGained: number; expGained: number };

/** Settles a finished shift. Also pays out a cut to whoever force-assigned
 * this job (see skimFrom) -- a matching copy of the item plus half the exp,
 * on top of what the worker keeps, never carved out of it. */
export async function collectJob(uid: string): Promise<CollectResult> {
  const ref = townDoc(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const p = normalize(snap.data());
    if (!p.unlocked) throw new Error("not_unlocked");
    if (!p.currentJob) throw new Error("not_working");
    const now = Date.now();
    if (now < p.currentJob.endsAt) throw new Error("not_finished");
    const job = TOWN_JOBS.find((j) => j.key === p.currentJob!.jobKey);
    if (!job) throw new Error("unknown_job");

    let amount = job.itemAmount;
    if (job.doubleChance && Math.random() < job.doubleChance) amount *= 2;

    const inventory: TownInventory = { ...p.inventory };
    inventory[job.item] = (inventory[job.item] || 0) + amount;
    const companionExp = p.companionExp + job.expGain;
    const assignedBy = p.currentJob.assignedBy;

    const next: TownProfile = { ...p, inventory, companionExp, currentJob: null, lastActiveAt: now };
    tx.set(ref, next, { merge: true });

    if (assignedBy && assignedBy !== uid) {
      const bossRef = townDoc(assignedBy);
      const bossSnap = await tx.get(bossRef);
      const boss = bossSnap.exists() ? normalize(bossSnap.data()) : null;
      if (boss) {
        const bossInventory: TownInventory = { ...boss.inventory };
        bossInventory[job.item] = (bossInventory[job.item] || 0) + amount;
        const bossExpGain = Math.ceil(job.expGain / 2);
        tx.set(bossRef, { inventory: bossInventory, companionExp: boss.companionExp + bossExpGain }, { merge: true });
      }
    }

    return { profile: next, jobKey: job.key, itemGained: job.item, amountGained: amount, expGained: job.expGain };
  }).then(async (result) => {
    await setDoc(doc(jobLogCol()), {
      openid: uid,
      type: "job_complete",
      jobType: result.jobKey,
      itemsGained: { [result.itemGained]: result.amountGained },
      expGained: result.expGained,
      createdAt: Date.now(),
    }).catch(() => {});
    return result;
  });
}

export async function promote(uid: string): Promise<{ profile: TownProfile; newTitleIndex: number }> {
  const ref = townDoc(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const p = normalize(snap.data());
    if (!p.unlocked) throw new Error("not_unlocked");
    if (!canPromote(p)) throw new Error("not_eligible");
    const next = TOWN_LEVELS[p.titleIndex + 1];
    const inventory: TownInventory = { ...p.inventory };
    for (const [item, need] of Object.entries(next.materials || {})) {
      inventory[item as TownItemType] = (inventory[item as TownItemType] || 0) - (need as number);
    }
    const updated: TownProfile = { ...p, inventory, titleIndex: p.titleIndex + 1 };
    tx.set(ref, updated, { merge: true });
    return { profile: updated, newTitleIndex: updated.titleIndex };
  });
}

export async function buyDecoration(uid: string, key: string): Promise<TownProfile> {
  const deco = TOWN_DECORATIONS.find((d) => d.key === key);
  if (!deco) throw new Error("unknown_decoration");
  const ref = townDoc(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const p = normalize(snap.data());
    if (!p.unlocked) throw new Error("not_unlocked");
    if (p.decorations.includes(key)) throw new Error("already_owned");
    if ((p.inventory[deco.costItem] || 0) < deco.costAmount) throw new Error("insufficient_item");
    const inventory: TownInventory = { ...p.inventory };
    inventory[deco.costItem] = (inventory[deco.costItem] || 0) - deco.costAmount;
    const next: TownProfile = { ...p, inventory, decorations: [...p.decorations, key] };
    tx.set(ref, next, { merge: true });
    return next;
  });
}

export type StealResult = { item: TownItemType; amount: number };

export async function stealFrom(uid: string, targetUid: string): Promise<StealResult> {
  if (uid === targetUid) throw new Error("invalid_target");
  const selfRef = townDoc(uid);
  const targetRef = townDoc(targetUid);
  return runTransaction(db, async (tx) => {
    const [selfSnap, targetSnap] = await Promise.all([tx.get(selfRef), tx.get(targetRef)]);
    const self = normalize(selfSnap.data());
    const target = targetSnap.exists() ? normalize(targetSnap.data()) : null;
    if (!self.unlocked) throw new Error("not_unlocked");
    if (!target || !target.unlocked) throw new Error("target_not_found");

    const now = Date.now();
    const lastStealAt = self.lastStealAt || 0;
    if (now - lastStealAt < GLOBAL_STEAL_COOLDOWN_MS) throw new Error("steal_global_cooldown");

    const counts = self.stealCounts || {};
    const rec = counts[targetUid];
    let nextCount = 1;
    let windowStart = now;
    if (rec && now - rec.windowStart < STEAL_COOLDOWN_MS) {
      if (rec.count >= STEAL_MAX_PER_WINDOW) throw new Error("steal_cooldown");
      nextCount = rec.count + 1;
      windowStart = rec.windowStart;
    }

    const stealable = Object.entries(target.inventory).filter(([, qty]) => (qty || 0) > 0);
    if (stealable.length === 0) throw new Error("nothing_to_steal");
    const [item, available] = stealable[Math.floor(Math.random() * stealable.length)] as [TownItemType, number];
    const amount = Math.min(available, 1 + Math.floor(Math.random() * 3));

    const targetInventory: TownInventory = { ...target.inventory, [item]: available - amount };
    const selfInventory: TownInventory = { ...self.inventory };
    selfInventory[item] = (selfInventory[item] || 0) + amount;

    tx.set(targetRef, { inventory: targetInventory }, { merge: true });
    tx.set(
      selfRef,
      {
        inventory: selfInventory,
        companionExp: self.companionExp + 3,
        lastActiveAt: now,
        lastStealAt: now,
        stealCounts: { ...counts, [targetUid]: { count: nextCount, windowStart } },
      },
      { merge: true },
    );

    return { item, amount };
  }).then(async (result) => {
    await setDoc(doc(jobLogCol()), {
      openid: uid,
      targetOpenid: targetUid,
      type: "steal",
      itemsGained: { [result.item]: result.amount },
      expGained: 3,
      createdAt: Date.now(),
    }).catch(() => {});
    return result;
  });
}

export type SkimResult = { jobKey: string; endsAt: number };

/** "画饼摊派" -- only available when the caller's title outranks the target's.
 * Force-starts a random job the target has unlocked (interrupting whatever
 * they were doing, unpaid) instead of instantly lifting items -- the payoff
 * for the caller comes later, in collectJob, when the target actually
 * collects that shift. */
export async function skimFrom(uid: string, targetUid: string): Promise<SkimResult> {
  if (uid === targetUid) throw new Error("invalid_target");
  const selfRef = townDoc(uid);
  const targetRef = townDoc(targetUid);
  return runTransaction(db, async (tx) => {
    const [selfSnap, targetSnap] = await Promise.all([tx.get(selfRef), tx.get(targetRef)]);
    const self = normalize(selfSnap.data());
    const target = targetSnap.exists() ? normalize(targetSnap.data()) : null;
    if (!self.unlocked) throw new Error("not_unlocked");
    if (!target || !target.unlocked) throw new Error("target_not_found");
    if (self.titleIndex <= target.titleIndex) throw new Error("not_higher_rank");

    const now = Date.now();
    const cooldowns = self.skimCooldowns || {};
    if (cooldowns[targetUid] && now - cooldowns[targetUid] < SKIM_COOLDOWN_MS) throw new Error("skim_cooldown");

    const night = isNightNow();
    const eligible = TOWN_JOBS.filter((j) => j.unlockLevel <= target.titleIndex && (!j.nightOnly || night));
    if (eligible.length === 0) throw new Error("no_job_available");
    const job = eligible[Math.floor(Math.random() * eligible.length)];

    const currentJob = { jobKey: job.key, startedAt: now, endsAt: now + job.durationMs, assignedBy: uid };
    tx.set(targetRef, { currentJob, lastActiveAt: now }, { merge: true });
    tx.set(selfRef, { skimCooldowns: { ...cooldowns, [targetUid]: now } }, { merge: true });

    return { jobKey: job.key, endsAt: currentJob.endsAt };
  }).then(async (result) => {
    await setDoc(doc(jobLogCol()), {
      openid: uid,
      targetOpenid: targetUid,
      type: "skim",
      jobType: result.jobKey,
      createdAt: Date.now(),
    }).catch(() => {});
    return result;
  });
}

export type WorldEntry = TownProfile & { uid: string };

/** Everyone who has unlocked the town, sorted by exp -- sorted client-side
 * (rather than an orderBy query) specifically so this never needs a
 * Firestore composite index. Fine at the friends-circle scale this feature
 * targets (see MOYU_TOWN_SPEC.md 8.1). */
export async function fetchWorld(): Promise<WorldEntry[]> {
  const snap = await getDocs(query(collection(db, "townProfiles"), where("unlocked", "==", true)));
  const list = snap.docs.map((d) => ({ uid: d.id, ...normalize(d.data()) }));
  list.sort((a, b) => b.companionExp - a.companionExp || a.titleIndex - b.titleIndex);
  return list;
}
