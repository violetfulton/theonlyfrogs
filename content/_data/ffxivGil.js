// content/_data/ffxivGil.js
//
// Aggro Phobic's manual gil-goal file.
// You only need to edit the obvious values near the top.
//
// 1) Change currentGil whenever you fancy.
// 2) Change gilFloor as your "do not spend below this" number grows.
// 3) Flip owned: false -> true when you buy one of the luxury mounts.
// 4) Add purchases to purchaseDiary so money spent on collectibles still
//    counts toward the "lifetime progress" number.
//


const GIL_CAP = 999_999_999;

// ─────────────────────────────────────────────────────────────
// EDIT THESE
// ─────────────────────────────────────────────────────────────
const currentGil = 64_817_891;
const gilFloor = 50_000_000;

const luxuryMounts = [
  {
    name: "Air-wheeler A9",
    cost: 7_500_000,
    source: "Neon · Solution Nine",
    owned: false,
  },
  {
    name: "Resplendent Vessel of Ronka",
    cost: 25_000_000,
    source: "Tabeth · Eulmore",
    owned: false,
  },
  {
    name: "Gilded Mikoshi",
    cost: 50_000_000,
    source: "Edelina · Mor Dhona",
    owned: false,
  },
  {
    name: "Chrysomallos",
    cost: 50_000_000,
    source: "Edelina · Mor Dhona",
    owned: false,
  },
  {
    name: "Magitek Avenger G1",
    cost: 50_000_000,
    source: "Edelina · Mor Dhona",
    owned: false,
  },
];

// Add real purchases here after you make them.
// "cost" is what Aggro actually paid.
const purchaseDiary = [
  {
    name: "Medium House — The Goblet, Ward 24, Plot 12",
    type: "Housing",
    cost: 16_000_000,
    date: "2026-08-08",
    note: "Won with lottery number 8 ♡ maybe 8 is my lucky number?",
  },
  {
    name: "Air-wheeler A9",
    type: "Mount",
    cost: 7_500_000,
    date: "2026-08-31",
    note: "Bought from Neon in Solution Nine.",
  },
  {
    name: "Modern Aesthetics - A Half Times Two",
    type: "Hairstyle",
    cost: 17_000_000,
    date: "2026-08-23",
    note: "Bought for 17m gil.",
  },
];

const collections = {
  minions: {
    ownedCount: null,
    totalCount: null,
    fixedRemainingGil: null,
    marketboardMissing: null,
    marketboardEstimate: null,
  },

  orchestrions: {
    ownedCount: null,
    totalCount: null,
    fixedRemainingGil: null,
    marketboardMissing: null,
    marketboardEstimate: null,
  },
};

// ─────────────────────────────────────────────────────────────
// THE REST CALCULATES ITSELF
// ─────────────────────────────────────────────────────────────

const milestones = [
  1_000_000,
  5_000_000,
  10_000_000,
  25_000_000,
  50_000_000,
  100_000_000,
  250_000_000,
  500_000_000,
  750_000_000,
  GIL_CAP,
];

const fmt = new Intl.NumberFormat("en-GB");

function gil(value) {
  if (value == null) return null;
  return `${fmt.format(value)} gil`;
}

function compactGil(value) {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}m`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return fmt.format(value);
}

function pct(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

const nextMilestoneValue =
  milestones.find((value) => value > currentGil) ?? GIL_CAP;

const previousMilestoneValue =
  [...milestones].reverse().find((value) => value <= currentGil) ?? 0;

const nextMilestoneDelta = Math.max(0, nextMilestoneValue - currentGil);

const completedMilestones = milestones.filter((value) => value <= currentGil).length;

const safeSpend = Math.max(0, currentGil - gilFloor);

const trackedCollectionSpend = purchaseDiary.reduce(
  (sum, purchase) => sum + Number(purchase.cost || 0),
  0
);

const lifetimeProgress = currentGil + trackedCollectionSpend;

const luxuryMountTotal = luxuryMounts.reduce((sum, mount) => sum + mount.cost, 0);
const luxuryMountSpent = luxuryMounts
  .filter((mount) => mount.owned)
  .reduce((sum, mount) => sum + mount.cost, 0);
const luxuryMountRemaining = luxuryMountTotal - luxuryMountSpent;
const luxuryMountOwned = luxuryMounts.filter((mount) => mount.owned).length;

const luxuryMountsCalculated = luxuryMounts.map((mount) => ({
  ...mount,
  costDisplay: gil(mount.cost),
  costCompact: compactGil(mount.cost),
  canAffordRaw: currentGil >= mount.cost,
  canAffordSafely: currentGil - mount.cost >= gilFloor,
  shortBy: Math.max(0, mount.cost - currentGil),
  shortByDisplay: gil(Math.max(0, mount.cost - currentGil)),
}));

const nextLuxuryMount =
  luxuryMountsCalculated.find((mount) => !mount.owned) ?? null;

const milestoneCards = milestones.map((value) => ({
  value,
  label: value === GIL_CAP ? "Gil cap" : compactGil(value),
  display: gil(value),
  reached: currentGil >= value,
  isNext: value === nextMilestoneValue,
}));

function decorateCollection(collection) {
  const hasCounts =
    Number.isFinite(collection.ownedCount) &&
    Number.isFinite(collection.totalCount) &&
    collection.totalCount > 0;

  return {
    ...collection,
    hasCounts,
    countLabel: hasCounts
      ? `${fmt.format(collection.ownedCount)} / ${fmt.format(collection.totalCount)}`
      : "not counted yet",
    countPercent: hasCounts ? pct(collection.ownedCount, collection.totalCount) : 0,
    fixedRemainingDisplay:
      collection.fixedRemainingGil == null
        ? "add vendor total later"
        : gil(collection.fixedRemainingGil),
    marketboardEstimateDisplay:
      collection.marketboardEstimate == null
        ? "add estimate later"
        : `~${gil(collection.marketboardEstimate)}`,
  };
}

const currentPct = pct(currentGil, GIL_CAP);
const lifetimePct = pct(lifetimeProgress, GIL_CAP);

export default {
  character: "Aggro Phobic",
  cap: GIL_CAP,
  capDisplay: gil(GIL_CAP),

  currentGil,
  currentGilDisplay: gil(currentGil),
  currentGilCompact: compactGil(currentGil),
  capPercent: currentPct,
  capPercentDisplay: currentPct < 0.01 && currentGil > 0
    ? "<0.01%"
    : `${currentPct.toFixed(2)}%`,

  gilFloor,
  gilFloorDisplay: gil(gilFloor),
  safeSpend,
  safeSpendDisplay: gil(safeSpend),

  nextMilestone: {
    value: nextMilestoneValue,
    display: gil(nextMilestoneValue),
    compact: compactGil(nextMilestoneValue),
    delta: nextMilestoneDelta,
    deltaDisplay: gil(nextMilestoneDelta),
    previous: previousMilestoneValue,
    bandPercent:
      nextMilestoneValue === previousMilestoneValue
        ? 100
        : pct(currentGil - previousMilestoneValue, nextMilestoneValue - previousMilestoneValue),
  },

  milestones: milestoneCards,
  completedMilestones,

  trackedCollectionSpend,
  trackedCollectionSpendDisplay: gil(trackedCollectionSpend),
  lifetimeProgress,
  lifetimeProgressDisplay: gil(lifetimeProgress),
  lifetimePercent: lifetimePct,
  lifetimePercentDisplay: `${lifetimePct.toFixed(2)}%`,

  luxuryMounts: luxuryMountsCalculated,
  luxuryMount: {
    owned: luxuryMountOwned,
    total: luxuryMounts.length,
    totalCost: luxuryMountTotal,
    totalCostDisplay: gil(luxuryMountTotal),
    spent: luxuryMountSpent,
    spentDisplay: gil(luxuryMountSpent),
    remaining: luxuryMountRemaining,
    remainingDisplay: gil(luxuryMountRemaining),
    percent: pct(luxuryMountSpent, luxuryMountTotal),
    next: nextLuxuryMount,
  },

  collections: {
    minions: decorateCollection(collections.minions),
    orchestrions: decorateCollection(collections.orchestrions),
  },

  purchases: [...purchaseDiary].reverse().map((purchase) => ({
    ...purchase,
    costDisplay: gil(purchase.cost),
  })),
};
