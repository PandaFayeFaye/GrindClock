// Client-side config for "Slackerville ("Mole-Fish Town" in Chinese)" -- a hidden social easter egg
// (ported from the WeChat Mini Program build; see MOYU_TOWN_SPEC.md). Two
// growth lines are kept deliberately separate: the user's own real tier
// (TIERS in lib/tiers.tsx, driven only by real clocked hours) is never
// touched by anything in this file -- the companion's TOWN title here is a
// second, purely virtual ladder driven by town play.
//
// There is no Cloud Functions backend on the web build (static hosting +
// Firestore only), so unlike the Mini Program's server-authoritative cloud
// functions, these numbers are enforced by the client and by Firestore
// security rules alone. That is an accepted trade-off for a small,
// friends-only hobby feature -- see townFirestore.ts's own comment for the
// exact rule shape and what it does and doesn't protect.

export type TownItemType =
  | "milkTea"
  | "snackPack"
  | "coffeeBean"
  | "riderSubsidy"
  | "phoneCard"
  | "gasCard"
  | "veggie"
  | "bbqCoupon"
  | "liveCommission"
  | "tutorFee"
  | "dividend";

export const ITEM_LABEL_KEY: Record<TownItemType, "itemMilkTea" | "itemSnackPack" | "itemCoffeeBean" | "itemRiderSubsidy" | "itemPhoneCard" | "itemGasCard" | "itemVeggie" | "itemBbqCoupon" | "itemLiveCommission" | "itemTutorFee" | "itemDividend"> = {
  milkTea: "itemMilkTea",
  snackPack: "itemSnackPack",
  coffeeBean: "itemCoffeeBean",
  riderSubsidy: "itemRiderSubsidy",
  phoneCard: "itemPhoneCard",
  gasCard: "itemGasCard",
  veggie: "itemVeggie",
  bbqCoupon: "itemBbqCoupon",
  liveCommission: "itemLiveCommission",
  tutorFee: "itemTutorFee",
  dividend: "itemDividend",
};

export type TownJob = {
  key: string;
  nameKey:
    | "jobMilkTeaShop" | "jobConvenienceStore" | "jobBarista" | "jobRider" | "jobCallCenter"
    | "jobDriver" | "jobFarmer" | "jobBbqStall" | "jobLiveStream" | "jobTutor" | "jobBoardroom";
  emoji: string;
  feedCost: number;
  durationMs: number;
  expGain: number;
  item: TownItemType;
  itemAmount: number;
  unlockLevel: number; // index into TOWN_LEVELS
  nightOnly?: boolean; // 22:00-6:00 local time only
  doubleChance?: number;
  // Ground anchor point (% of the scene box) for the building sprite in the
  // illustrated town square -- mirrors the Mini Program's exact layout
  // (src/lib/town.ts there) so the two versions read as the same place.
  x: number;
  y: number;
};

export const TOWN_JOBS: TownJob[] = [
  { key: "milkTeaShop", nameKey: "jobMilkTeaShop", emoji: "🧋", feedCost: 5, durationMs: 1 * 3_600_000, expGain: 5, item: "milkTea", itemAmount: 1, unlockLevel: 0, x: 13, y: 27 },
  { key: "convenienceStore", nameKey: "jobConvenienceStore", emoji: "🏪", feedCost: 5, durationMs: 1.5 * 3_600_000, expGain: 5, item: "snackPack", itemAmount: 1, unlockLevel: 0, x: 89, y: 30 },
  { key: "barista", nameKey: "jobBarista", emoji: "☕", feedCost: 8, durationMs: 2 * 3_600_000, expGain: 8, item: "coffeeBean", itemAmount: 2, unlockLevel: 1, x: 36, y: 28 },
  { key: "rider", nameKey: "jobRider", emoji: "🛵", feedCost: 8, durationMs: 0.5 * 3_600_000, expGain: 5, item: "riderSubsidy", itemAmount: 1, unlockLevel: 1, x: 9, y: 50 },
  { key: "callCenter", nameKey: "jobCallCenter", emoji: "📞", feedCost: 10, durationMs: 4 * 3_600_000, expGain: 12, item: "phoneCard", itemAmount: 3, unlockLevel: 2, x: 62, y: 27 },
  { key: "driver", nameKey: "jobDriver", emoji: "🚗", feedCost: 10, durationMs: 3 * 3_600_000, expGain: 10, item: "gasCard", itemAmount: 2, unlockLevel: 3, x: 91, y: 53 },
  { key: "farmer", nameKey: "jobFarmer", emoji: "🥬", feedCost: 12, durationMs: 3 * 3_600_000, expGain: 12, item: "veggie", itemAmount: 4, unlockLevel: 4, x: 18, y: 69 },
  { key: "bbqStall", nameKey: "jobBbqStall", emoji: "🍢", feedCost: 12, durationMs: 2 * 3_600_000, expGain: 15, item: "bbqCoupon", itemAmount: 3, unlockLevel: 5, nightOnly: true, x: 40, y: 75 },
  { key: "liveStream", nameKey: "jobLiveStream", emoji: "📱", feedCost: 15, durationMs: 2 * 3_600_000, expGain: 15, item: "liveCommission", itemAmount: 1, unlockLevel: 6, doubleChance: 0.1, x: 64, y: 70 },
  { key: "tutor", nameKey: "jobTutor", emoji: "📚", feedCost: 15, durationMs: 3 * 3_600_000, expGain: 18, item: "tutorFee", itemAmount: 1, unlockLevel: 7, x: 87, y: 68 },
  { key: "boardroom", nameKey: "jobBoardroom", emoji: "💼", feedCost: 20, durationMs: 4 * 3_600_000, expGain: 20, item: "dividend", itemAmount: 1, unlockLevel: 8, x: 50, y: 47 },
];

export function buildingImageSrc(jobKey: string): string {
  return `/town/${jobKey}.png`;
}

export function decorationIconSrc(key: string): string {
  return `/town/deco-icons/${key}.png`;
}

export const TOWN_SCENE_BG = "/town/scene_bg.png";
export const TOWN_IDLE_SPOT = { x: 30, y: 46 };
export const HUD_WOOD_STRIP = "/town/hud/wood_strip.png";
export const HUD_ICON_CHEST = "/town/hud/chest.png";
export const HUD_ICON_TROPHY = "/town/hud/trophy.png";
export const HUD_ICON_FLAG = "/town/hud/flag.png";
export const HUD_ICON_COIN = "/town/hud/coin.png";

export type TownLevel = {
  titleKey:
    | "titleIntern" | "titleAssociate" | "titleSenior" | "titleLead" | "titleSupervisor"
    | "titleManager" | "titleSeniorManager" | "titleDirector" | "titleVp" | "titleGm" | "titleCeo" | "titleChairman";
  expThreshold: number;
  materials?: Partial<Record<TownItemType, number>>;
};

export const TOWN_LEVELS: TownLevel[] = [
  { titleKey: "titleIntern", expThreshold: 0 },
  { titleKey: "titleAssociate", expThreshold: 50 },
  { titleKey: "titleSenior", expThreshold: 150, materials: { milkTea: 5 } },
  { titleKey: "titleLead", expThreshold: 350, materials: { coffeeBean: 8, snackPack: 5 } },
  { titleKey: "titleSupervisor", expThreshold: 700, materials: { riderSubsidy: 10, gasCard: 5 } },
  { titleKey: "titleManager", expThreshold: 1300, materials: { veggie: 15 } },
  { titleKey: "titleSeniorManager", expThreshold: 2200, materials: { bbqCoupon: 10 } },
  { titleKey: "titleDirector", expThreshold: 3500, materials: { liveCommission: 8 } },
  { titleKey: "titleVp", expThreshold: 5500, materials: { tutorFee: 5, dividend: 2 } },
  { titleKey: "titleGm", expThreshold: 8000, materials: { dividend: 5 } },
  { titleKey: "titleCeo", expThreshold: 12000, materials: { dividend: 10 } },
  { titleKey: "titleChairman", expThreshold: 18000, materials: { dividend: 15 } },
];

export function townLevelIndex(exp: number): number {
  return TOWN_LEVELS.reduce((idx, lvl, i) => (exp >= lvl.expThreshold ? i : idx), 0);
}

export type TownDecoration = {
  key: string;
  nameKey:
    | "decoMilkTeaLantern" | "decoSnackBox" | "decoCoffeeSign" | "decoHelmet" | "decoPhoneBooth"
    | "decoGasPump" | "decoScarecrow" | "decoBbqLights" | "decoNeonLive" | "decoLightbulb"
    | "decoGoldTrophy" | "decoLuckyCat" | "decoLoungeChair" | "decoBossSofa";
  emoji: string;
  costItem: TownItemType;
  costAmount: number;
};

export const TOWN_DECORATIONS: TownDecoration[] = [
  { key: "milkTeaLantern", nameKey: "decoMilkTeaLantern", emoji: "🏮", costItem: "milkTea", costAmount: 5 },
  { key: "snackBox", nameKey: "decoSnackBox", emoji: "🎁", costItem: "snackPack", costAmount: 6 },
  { key: "coffeeSign", nameKey: "decoCoffeeSign", emoji: "🪧", costItem: "coffeeBean", costAmount: 8 },
  { key: "helmet", nameKey: "decoHelmet", emoji: "🪖", costItem: "riderSubsidy", costAmount: 6 },
  { key: "phoneBooth", nameKey: "decoPhoneBooth", emoji: "☎️", costItem: "phoneCard", costAmount: 6 },
  { key: "gasPump", nameKey: "decoGasPump", emoji: "⛽", costItem: "gasCard", costAmount: 6 },
  { key: "harvestScarecrow", nameKey: "decoScarecrow", emoji: "🧑‍🌾", costItem: "veggie", costAmount: 10 },
  { key: "bbqLights", nameKey: "decoBbqLights", emoji: "🎏", costItem: "bbqCoupon", costAmount: 6 },
  { key: "neonLive", nameKey: "decoNeonLive", emoji: "💡", costItem: "liveCommission", costAmount: 5 },
  { key: "lightbulb", nameKey: "decoLightbulb", emoji: "🔆", costItem: "tutorFee", costAmount: 6 },
  { key: "goldTrophy", nameKey: "decoGoldTrophy", emoji: "🏆", costItem: "dividend", costAmount: 3 },
  { key: "luckyCat", nameKey: "decoLuckyCat", emoji: "🐱", costItem: "snackPack", costAmount: 12 },
  { key: "loungeChair", nameKey: "decoLoungeChair", emoji: "🛋️", costItem: "veggie", costAmount: 16 },
  { key: "bossSofa", nameKey: "decoBossSofa", emoji: "🛏️", costItem: "dividend", costAmount: 8 },
];

export const DAILY_RATION = 15;
export const FEED_COST = 10;
export const STEAL_COOLDOWN_MS = 24 * 3_600_000;
export const STEAL_MAX_PER_WINDOW = 3;
export const SKIM_COOLDOWN_MS = 6 * 3_600_000;
export const CRITICIZE_COOLDOWN_MS = 12 * 3_600_000;
// Room kept for both a real-time push (there is none on web -- see
// townFirestore.ts) and an in-app inbox: capped so a doc can't grow forever.
export const MAX_NOTICES = 8;

// ---- Anti-theft: police badges (reactive) + daily trap (proactive) ----
// A badge is earned once per successful steal AGAINST you and lets you
// "catch" that specific thief if you open Town/World within this window
// of the theft -- they have to give back double what they took. Badges
// reset every local day; the count accumulates within the same day.
export const STEAL_CATCH_WINDOW_MS = 5 * 60_000;
export const MAX_RECENT_THEFTS = 10;
// The trap is a single self-chosen 2h window, once per local day, that
// nobody else can see. A steal attempt landing inside it never succeeds:
// the thief is jailed and fined the item(s) they were trying to take,
// paid straight to whoever set the trap.
export const TRAP_DURATION_MS = 2 * 3_600_000;
export const JAIL_DURATION_MS = 3 * 3_600_000;

export type TownInventory = Partial<Record<TownItemType, number>>;

export type TownCurrentJob = { jobKey: string; startedAt: number; endsAt: number; assignedBy?: string } | null;

export type TownRecentTheft = {
  thiefUid: string;
  thiefNickname: string;
  item: TownItemType;
  amount: number;
  stolenAt: number;
};

// A lightweight in-app inbox standing in for the Mini Program's WeChat push
// (steal/skim/criticize) -- there's no push infra on the web build, so this
// is what tells a victim anything happened at all: shown as a toast next
// time they open Town/World, then cleared.
export type TownNotice = {
  type: "stolen" | "skimmed" | "criticized";
  fromNickname: string;
  createdAt: number;
};

export type TownProfile = {
  unlocked: boolean;
  unlockedAt: number | null;
  oxFeed: number;
  lastDailyRationAt: number | null;
  lastFedAt: number | null;
  companionExp: number;
  titleIndex: number;
  currentJob: TownCurrentJob;
  inventory: TownInventory;
  decorations: string[];
  lastActiveAt: number | null;
  // Denormalized display fields, kept in sync from the owner's private
  // profile doc -- lets the World leaderboard read one public collection
  // instead of needing cross-user access to users/{uid}/profile/main.
  nickname?: string;
  animal?: string;
  mbti?: string;
  // Cooldown bookkeeping for steal/skim/criticize, kept on the ACTOR's own
  // doc (not the target's) specifically so enforcing them never needs a
  // townJobLog query -- and therefore never needs a Firestore composite
  // index. See townFirestore.ts's header comment for the fuller rationale.
  lastStealAt?: number;
  stealCounts?: Record<string, { count: number; windowStart: number }>;
  skimCooldowns?: Record<string, number>;
  criticizeCooldowns?: Record<string, number>;
  notices?: TownNotice[];
  // Anti-theft state. `policeBadges`/`policeBadgesResetAt` need the same
  // "reset once per local day, accumulate within it" read pattern as the
  // daily ration -- see townFirestore.ts's todayBadgeCount() helper.
  policeBadges?: number;
  policeBadgesResetAt?: number | null;
  recentThefts?: TownRecentTheft[];
  trapSetAt?: number | null;
  jailedUntil?: number | null;
};

export function emptyTownProfile(): TownProfile {
  return {
    unlocked: false,
    unlockedAt: null,
    oxFeed: 0,
    lastDailyRationAt: null,
    lastFedAt: null,
    companionExp: 0,
    titleIndex: 0,
    currentJob: null,
    inventory: {},
    decorations: [],
    lastActiveAt: null,
  };
}

/** Promotion needs BOTH the exp threshold met AND materials on hand -- exp
 * alone never auto-advances the title (see MOYU_TOWN_SPEC.md 6.3). */
export function canPromote(profile: Pick<TownProfile, "companionExp" | "titleIndex" | "inventory">): boolean {
  const next = TOWN_LEVELS[profile.titleIndex + 1];
  if (!next) return false;
  if (profile.companionExp < next.expThreshold) return false;
  const materials = next.materials || {};
  return Object.entries(materials).every(([item, need]) => (profile.inventory[item as TownItemType] || 0) >= (need as number));
}

export function isNightNow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 22 || h < 6;
}

export function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** Badges reset every local day -- this is the "what's the count actually
 * worth right now" read, same shape as checking the daily ration. */
export function todayBadgeCount(profile: Pick<TownProfile, "policeBadges" | "policeBadgesResetAt">, now = Date.now()): number {
  if (!profile.policeBadgesResetAt || !isSameLocalDay(profile.policeBadgesResetAt, now)) return 0;
  return profile.policeBadges || 0;
}

export function isJailed(profile: Pick<TownProfile, "jailedUntil">, now = Date.now()): boolean {
  return !!profile.jailedUntil && profile.jailedUntil > now;
}

/** Whether the caller's own trap window is armed right now -- only ever
 * read from the caller's OWN profile in the UI; a thief's steal transaction
 * reads the TARGET's copy of this same field server-side-equivalent (see
 * townFirestore.ts's header comment on the client-trust model this whole
 * feature already runs on). */
export function isTrapActive(profile: Pick<TownProfile, "trapSetAt">, now = Date.now()): boolean {
  return !!profile.trapSetAt && now < profile.trapSetAt + TRAP_DURATION_MS;
}

export function trapAlreadySetToday(profile: Pick<TownProfile, "trapSetAt">, now = Date.now()): boolean {
  return !!profile.trapSetAt && isSameLocalDay(profile.trapSetAt, now);
}
