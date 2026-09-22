// Client-side config for "Mole-Fish Town" -- a hidden social easter egg
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

export type TownInventory = Partial<Record<TownItemType, number>>;

export type TownCurrentJob = { jobKey: string; startedAt: number; endsAt: number; assignedBy?: string } | null;

export type TownProfile = {
  unlocked: boolean;
  unlockedAt: number | null;
  oxFeed: number;
  lastDailyRationAt: number | null;
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
  // Cooldown bookkeeping for steal/skim, kept on the ACTOR's own doc (not the
  // target's) specifically so enforcing them never needs a townJobLog query
  // -- and therefore never needs a Firestore composite index. See
  // townFirestore.ts's header comment for the fuller rationale.
  lastStealAt?: number;
  stealCounts?: Record<string, { count: number; windowStart: number }>;
  skimCooldowns?: Record<string, number>;
};

export function emptyTownProfile(): TownProfile {
  return {
    unlocked: false,
    unlockedAt: null,
    oxFeed: 0,
    lastDailyRationAt: null,
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
