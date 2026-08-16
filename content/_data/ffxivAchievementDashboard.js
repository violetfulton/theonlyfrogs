import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { load } from "cheerio";

const CHARACTER = {
  id: "56132424",
  name: "Aggro Phobic",
  world: "Lich",
  dataCenter: "Light",
};

const LODESTONE_BASE = `https://eu.finalfantasyxiv.com/lodestone/character/${CHARACTER.id}`;
const FFXIV_COLLECT_ACHIEVEMENTS = "https://ffxivcollect.com/api/achievements?limit=5000";
const FFXIV_COLLECT_LIMITED_CONFIG =
  "https://raw.githubusercontent.com/skyborn-industries/ffxiv-collect/main/config/achievements.yml";

const CACHE_DIR = ".cache/ffxiv-achievement-dashboard";
const SIX_HOURS = 6 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const USER_AGENT =
  "TheOnlyFrogs achievement dashboard (+https://theonlyfrogs.com/)";

const TYPE_ORDER = [
  "Battle",
  "PvP",
  "Character",
  "Items",
  "Crafting & Gathering",
  "Quests",
  "Exploration",
  "Grand Company",
];

const TYPE_META = {
  Battle: { icon: "⚔️", blurb: "Duties, raids, hunts, field operations and battle milestones." },
  PvP: { icon: "🏹", blurb: "Frontline, Crystalline Conflict and other PvP goals." },
  Character: { icon: "🩷", blurb: "Levels, jobs, Island Sanctuary and character milestones." },
  Items: { icon: "🎒", blurb: "Collections, relics, tools and item-related achievements." },
  "Crafting & Gathering": { icon: "🪡", blurb: "Crafting, gathering, fishing and cosy long-term progress." },
  Quests: { icon: "📖", blurb: "Main story, sidequests, job quests and allied societies." },
  Exploration: { icon: "🧭", blurb: "Mapping, sightseeing and discovering Eorzea." },
  "Grand Company": { icon: "🎖️", blurb: "Company ranks, supply work and Grand Company goals." },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashUrl(url) {
  return crypto.createHash("sha1").update(url).digest("hex");
}

async function readCache(file) {
  try {
    const [text, stat] = await Promise.all([fs.readFile(file, "utf8"), fs.stat(file)]);
    return { text, age: Date.now() - stat.mtimeMs };
  } catch {
    return null;
  }
}

async function fetchCached(url, { ttl = SIX_HOURS, json = false } = {}) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const ext = json ? ".json" : ".txt";
  const file = path.join(CACHE_DIR, `${hashUrl(url)}${ext}`);
  const cached = await readCache(file);

  if (cached && cached.age < ttl) {
    return json ? JSON.parse(cached.text) : cached.text;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: json ? "application/json" : "text/html, text/plain;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await fs.writeFile(file, text, "utf8");
    return json ? JSON.parse(text) : text;
  } catch (error) {
    if (cached) {
      console.warn(`[ffxiv-achievements] ${url} failed; using stale cache: ${error.message}`);
      return json ? JSON.parse(cached.text) : cached.text;
    }
    throw error;
  }
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function number(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value) {
  return new Intl.NumberFormat("en-GB").format(Number(value || 0));
}

function percent(numerator, denominator, digits = 1) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(digits));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function dateLabel(iso) {
  if (!iso) return "Unknown date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function shortDateLabel(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function parseOwnedPercent(value) {
  const match = String(value || "").match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function parseLimitedConfig(text) {
  const idsBlock = text.match(/time_limited_ids:\s*([\s\S]*?)time_limited_category_ids:/)?.[1] || "";
  const categoriesBlock = text.match(/time_limited_category_ids:\s*([\s\S]*)$/)?.[1] || "";

  return {
    ids: new Set([...idsBlock.matchAll(/-\s*(\d+)/g)].map((m) => Number(m[1]))),
    categoryIds: new Set([...categoriesBlock.matchAll(/-\s*(\d+)/g)].map((m) => Number(m[1]))),
  };
}

function parseAchievementPage(html) {
  const $ = load(html);
  const entries = [];

  $(".ldst__achievement .entry, .entry").each((_, element) => {
    const root = $(element);
    const href = root.find(".entry__achievement").attr("href") || "";
    const idMatch = href.match(/\/achievement\/detail\/(\d+)\//);
    if (!idMatch) return;

    const activity = cleanText(root.find(".entry__activity__txt").text());
    const quotedName = activity.match(/[\"“「](.*?)[\"”」]/)?.[1];
    const category = activity.match(/^(.+?)\s+achievement\b/i)?.[1] || "Achievement";
    const script = root.find(".entry__activity__time script").text();
    const timestamp = number(script.match(/ldst_strftime\((\d+)/)?.[1]);

    entries.push({
      id: Number(idMatch[1]),
      name: cleanText(quotedName || activity),
      lodestoneCategory: cleanText(category),
      timestamp,
      earnedAt: timestamp ? new Date(timestamp * 1000).toISOString() : null,
      url: `${LODESTONE_BASE}/achievement/detail/${idMatch[1]}/`,
    });
  });

  const pagerText = cleanText($(".btn__pager").last().text());
  const pageCount = number(pagerText.match(/Page\s+\d+\s+of\s+(\d+)/i)?.[1]) || 1;
  const achievementPoints = number($(".achievement__point").first().text());
  const totalAchievements = number($(".parts__total").first().text());

  return { entries, pageCount, achievementPoints, totalAchievements };
}

async function fetchLodestoneHistory() {
  const firstHtml = await fetchCached(`${LODESTONE_BASE}/achievement/?page=1`, { ttl: SIX_HOURS });
  const first = parseAchievementPage(firstHtml);
  const entries = [...first.entries];

  for (let page = 2; page <= first.pageCount; page += 1) {
    await sleep(220);
    const html = await fetchCached(`${LODESTONE_BASE}/achievement/?page=${page}`, { ttl: SIX_HOURS });
    entries.push(...parseAchievementPage(html).entries);
  }

  const seen = new Set();
  const deduped = entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  deduped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    entries: deduped,
    achievementPoints: first.achievementPoints,
    totalAchievements: first.totalAchievements || deduped.length,
  };
}

async function fetchProfile() {
  try {
    const html = await fetchCached(`${LODESTONE_BASE}/`, { ttl: SIX_HOURS });
    const $ = load(html);
    const portrait = $(".js__image_popup > img").first().attr("src") || null;
    const avatar = $(".frame__chara__face > img").first().attr("src") || null;
    const title = cleanText($(".frame__chara__title").first().text());
    return { portrait, avatar, title };
  } catch (error) {
    console.warn(`[ffxiv-achievements] Profile fetch failed: ${error.message}`);
    return { portrait: null, avatar: null, title: "" };
  }
}

function romanToNumber(roman) {
  if (!roman) return null;
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  let previous = 0;
  for (const char of roman.toUpperCase().split("").reverse()) {
    const value = values[char];
    if (!value) return null;
    if (value < previous) total -= value;
    else {
      total += value;
      previous = value;
    }
  }
  return total || null;
}

function seriesInfo(name) {
  const match = cleanText(name).match(/^(.*?)(?:\s+)([IVXLCDM]+)$/);
  if (!match) return null;
  const tier = romanToNumber(match[2]);
  if (!tier) return null;
  return { key: match[1].toLowerCase(), base: match[1], tier };
}

function rewardLabel(reward) {
  if (!reward) return null;
  if (reward.type === "Title") {
    const name = reward.title?.name || reward.title?.female_name || reward.title?.male_name;
    return name ? `Title: ${name}` : "Title reward";
  }
  if (reward.type === "Item") return reward.name ? `Item: ${reward.name}` : "Item reward";
  return reward.type || "Achievement reward";
}

function hasLongGrindLanguage(description = "") {
  const text = description.toLowerCase().replace(/,/g, "");
  const hugeNumber = text.match(/\b(\d{4,})\b/g)?.some((n) => Number(n) >= 1000);
  return Boolean(
    hugeNumber ||
      /accrue .*500000|earn .*500000|complete .*1000|win .*1000|gather .*10000|catch .*1000/.test(text)
  );
}

function suggestionScore(achievement) {
  const owned = parseOwnedPercent(achievement.owned);
  const series = seriesInfo(achievement.name);
  let score = owned * 2 + number(achievement.points) * 1.2;

  if (/discover every location|complete .*(dungeon|trial|raid)|achieve level|attain rank/i.test(achievement.description)) {
    score += 16;
  }
  if (hasLongGrindLanguage(achievement.description)) score -= 30;
  if (series?.tier >= 5) score -= 5;

  return score;
}

function makeSuggestion(achievement, extra = {}) {
  const ownedPercent = parseOwnedPercent(achievement.owned);
  const reward = rewardLabel(achievement.reward);

  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    points: number(achievement.points),
    pointsDisplay: `+${fmt(achievement.points)} pts`,
    type: achievement.type?.name || "Achievement",
    category: achievement.category?.name || "General",
    owned: achievement.owned || "",
    ownedPercent,
    ownedDisplay: ownedPercent ? `${ownedPercent}% own` : "",
    icon: achievement.icon || null,
    patch: achievement.patch || "",
    reward,
    url: `https://ffxivcollect.com/achievements/${achievement.id}`,
    ...extra,
  };
}

function buildRecommendations(catalog, earnedIds, obtainableIds) {
  const missing = catalog.filter((achievement) => obtainableIds.has(achievement.id) && !earnedIds.has(achievement.id));
  const bySeries = new Map();
  const earnedSeries = new Map();

  for (const achievement of catalog) {
    const info = seriesInfo(achievement.name);
    if (!info) continue;
    const row = { achievement, ...info };
    if (!bySeries.has(info.key)) bySeries.set(info.key, []);
    bySeries.get(info.key).push(row);
    if (earnedIds.has(achievement.id)) {
      if (!earnedSeries.has(info.key)) earnedSeries.set(info.key, new Set());
      earnedSeries.get(info.key).add(info.tier);
    }
  }

  const nextInSeries = [];
  for (const achievement of missing) {
    const info = seriesInfo(achievement.name);
    if (!info || info.tier <= 1) continue;
    if (earnedSeries.get(info.key)?.has(info.tier - 1)) {
      nextInSeries.push(
        makeSuggestion(achievement, {
          reason: `Next tier after ${info.base} ${info.tier - 1 === 1 ? "I" : ""}`.trim(),
          recommendationKind: "series",
        })
      );
    }
  }
  nextInSeries.sort((a, b) => b.ownedPercent - a.ownedPercent || b.points - a.points);

  const quickWins = missing
    .filter((achievement) => parseOwnedPercent(achievement.owned) >= 20)
    .filter((achievement) => !hasLongGrindLanguage(achievement.description))
    .sort((a, b) => suggestionScore(b) - suggestionScore(a))
    .slice(0, 18)
    .map((achievement) =>
      makeSuggestion(achievement, {
        reason: parseOwnedPercent(achievement.owned)
          ? `A relatively common unlock: ${achievement.owned} of tracked characters own it.`
          : "A comparatively straightforward-looking missing achievement.",
        recommendationKind: "quick",
      })
    );

  const comfyTypes = new Set(["Crafting & Gathering", "Exploration", "Character", "Quests"]);
  const comfy = missing
    .filter((achievement) => comfyTypes.has(achievement.type?.name))
    .filter((achievement) => !hasLongGrindLanguage(achievement.description))
    .sort((a, b) => suggestionScore(b) - suggestionScore(a))
    .slice(0, 16)
    .map((achievement) =>
      makeSuggestion(achievement, {
        reason: `A ${achievement.type?.name?.toLowerCase() || "general"} goal you can chip away at.`,
        recommendationKind: "comfy",
      })
    );

  const rewards = missing
    .filter((achievement) => achievement.reward)
    .sort((a, b) => suggestionScore(b) - suggestionScore(a))
    .slice(0, 16)
    .map((achievement) =>
      makeSuggestion(achievement, {
        reason: rewardLabel(achievement.reward) || "Comes with an achievement reward.",
        recommendationKind: "reward",
      })
    );

  const ranked = [...missing].sort((a, b) => suggestionScore(b) - suggestionScore(a));
  return { missing, nextInSeries, quickWins, comfy, rewards, ranked };
}

function uniqueSuggestions(groups) {
  const seen = new Set();
  const result = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

function buildPlan(target, candidateSuggestions) {
  const achievements = [];
  let total = 0;

  for (const achievement of candidateSuggestions) {
    if (total >= target) break;
    achievements.push(achievement);
    total += achievement.points;
  }

  return {
    target,
    targetDisplay: `+${fmt(target)}`,
    total,
    totalDisplay: `+${fmt(total)} pts`,
    covered: total >= target,
    achievements,
  };
}

function buildCategories(catalog, earnedIds, obtainableIds) {
  return TYPE_ORDER.map((name) => {
    const all = catalog.filter((a) => a.type?.name === name && obtainableIds.has(a.id));
    const earned = all.filter((a) => earnedIds.has(a.id));
    const missing = all.filter((a) => !earnedIds.has(a.id));
    const totalPoints = all.reduce((sum, a) => sum + number(a.points), 0);
    const earnedPoints = earned.reduce((sum, a) => sum + number(a.points), 0);
    const pct = percent(earnedPoints, totalPoints);
    const suggestions = missing
      .sort((a, b) => suggestionScore(b) - suggestionScore(a))
      .slice(0, 3)
      .map((a) => makeSuggestion(a));

    return {
      name,
      slug: slugify(name),
      icon: TYPE_META[name]?.icon || "✦",
      blurb: TYPE_META[name]?.blurb || "Achievement progress.",
      earnedPoints,
      earnedPointsDisplay: fmt(earnedPoints),
      totalPoints,
      totalPointsDisplay: fmt(totalPoints),
      remainingPoints: totalPoints - earnedPoints,
      remainingPointsDisplay: fmt(totalPoints - earnedPoints),
      earnedCount: earned.length,
      totalCount: all.length,
      percent: pct,
      percentDisplay: formatPercent(pct),
      suggestions,
    };
  }).filter((category) => category.totalCount > 0);
}

function buildRecent(entries, catalogById) {
  return entries.slice(0, 18).map((entry) => {
    const achievement = catalogById.get(entry.id);
    return {
      ...entry,
      name: achievement?.name || entry.name,
      type: achievement?.type?.name || entry.lodestoneCategory,
      category: achievement?.category?.name || "",
      points: number(achievement?.points),
      pointsDisplay: achievement ? `+${fmt(achievement.points)} pts` : "",
      icon: achievement?.icon || null,
      dateDisplay: dateLabel(entry.earnedAt),
    };
  });
}

function buildMomentum(entries, catalogById, now) {
  return [7, 30, 90].map((days) => {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    const recent = entries.filter((entry) => entry.timestamp && entry.timestamp * 1000 >= cutoff);
    const points = recent.reduce((sum, entry) => sum + number(catalogById.get(entry.id)?.points), 0);
    return {
      days,
      label: `Last ${days} days`,
      points,
      pointsDisplay: `+${fmt(points)}`,
      achievements: recent.length,
    };
  });
}

function buildMonthlyHistory(entries, catalogById, now) {
  const months = new Map();

  for (const entry of entries) {
    if (!entry.earnedAt) continue;
    const date = new Date(entry.earnedAt);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) months.set(key, { key, points: 0, achievements: 0 });
    const row = months.get(key);
    row.points += number(catalogById.get(entry.id)?.points);
    row.achievements += 1;
  }

  const keys = [];
  for (let offset = 7; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  const rows = keys.map((key) => months.get(key) || { key, points: 0, achievements: 0 });
  const max = Math.max(...rows.map((row) => row.points), 1);
  return rows.map((row) => ({
    ...row,
    label: monthLabel(row.key),
    pointsDisplay: `+${fmt(row.points)}`,
    barPercent: Number(((row.points / max) * 100).toFixed(1)),
  }));
}

function lastUpdatedLabel(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short",
  }).format(date);
}

async function buildDashboard() {
  const now = new Date();

  const [lodestone, profile, catalogResponse, limitedText] = await Promise.all([
    fetchLodestoneHistory(),
    fetchProfile(),
    fetchCached(FFXIV_COLLECT_ACHIEVEMENTS, { ttl: SIX_HOURS, json: true }),
    fetchCached(FFXIV_COLLECT_LIMITED_CONFIG, { ttl: SEVEN_DAYS }),
  ]);

  const catalog = Array.isArray(catalogResponse?.results) ? catalogResponse.results : [];
  const catalogById = new Map(catalog.map((achievement) => [Number(achievement.id), achievement]));
  const earnedIds = new Set(lodestone.entries.map((entry) => Number(entry.id)));
  const limited = parseLimitedConfig(limitedText);

  const obtainableCatalog = catalog.filter((achievement) => {
    const typeName = achievement.type?.name;
    const categoryName = achievement.category?.name;
    return (
      !limited.ids.has(Number(achievement.id)) &&
      !limited.categoryIds.has(Number(achievement.category?.id)) &&
      typeName !== "Legacy" &&
      categoryName !== "Seasonal Events" &&
      categoryName !== "Ranking"
    );
  });
  const obtainableIds = new Set(obtainableCatalog.map((achievement) => Number(achievement.id)));

  const obtainableTotalPoints = obtainableCatalog.reduce((sum, achievement) => sum + number(achievement.points), 0);
  const obtainableEarnedPoints = obtainableCatalog
    .filter((achievement) => earnedIds.has(Number(achievement.id)))
    .reduce((sum, achievement) => sum + number(achievement.points), 0);
  const obtainableEarnedCount = obtainableCatalog.filter((achievement) => earnedIds.has(Number(achievement.id))).length;

  const recommendations = buildRecommendations(catalog, earnedIds, obtainableIds);
  const planningCandidates = uniqueSuggestions([
    recommendations.nextInSeries,
    recommendations.quickWins,
    recommendations.comfy,
    recommendations.ranked.map((a) => makeSuggestion(a, { recommendationKind: "ranked" })),
  ]);

  const nextMilestoneTarget = Math.ceil((lodestone.achievementPoints + 1) / 250) * 250;
  const nextMilestoneNeeded = Math.max(0, nextMilestoneTarget - lodestone.achievementPoints);
  const milestonePlan = buildPlan(nextMilestoneNeeded || 250, planningCandidates);
  const targetPlans = [50, 100, 250, 500].map((target) => buildPlan(target, planningCandidates));

  const pointsPct = percent(obtainableEarnedPoints, obtainableTotalPoints);
  const countPct = percent(obtainableEarnedCount, obtainableCatalog.length);
  const recent = buildRecent(lodestone.entries, catalogById);

  return {
    sourceOk: true,
    character: {
      ...CHARACTER,
      ...profile,
      lodestoneUrl: `${LODESTONE_BASE}/`,
      achievementUrl: `${LODESTONE_BASE}/achievement/`,
      worldDisplay: `${CHARACTER.world} [${CHARACTER.dataCenter}]`,
    },
    updatedAt: now.toISOString(),
    updatedDisplay: lastUpdatedLabel(now),
    points: {
      total: lodestone.achievementPoints,
      totalDisplay: fmt(lodestone.achievementPoints),
      earnedCount: lodestone.totalAchievements || lodestone.entries.length,
      earnedCountDisplay: fmt(lodestone.totalAchievements || lodestone.entries.length),
      catalogueCount: catalog.length,
      catalogueCountDisplay: fmt(catalog.length),
      obtainableEarned: obtainableEarnedPoints,
      obtainableEarnedDisplay: fmt(obtainableEarnedPoints),
      obtainableTotal: obtainableTotalPoints,
      obtainableTotalDisplay: fmt(obtainableTotalPoints),
      obtainableRemaining: Math.max(0, obtainableTotalPoints - obtainableEarnedPoints),
      obtainableRemainingDisplay: fmt(Math.max(0, obtainableTotalPoints - obtainableEarnedPoints)),
      obtainablePercent: pointsPct,
      obtainablePercentDisplay: formatPercent(pointsPct),
      obtainableCount: obtainableCatalog.length,
      obtainableCountDisplay: fmt(obtainableCatalog.length),
      obtainableEarnedCount,
      obtainableEarnedCountDisplay: fmt(obtainableEarnedCount),
      obtainableCountPercent: countPct,
      obtainableCountPercentDisplay: formatPercent(countPct),
    },
    nextMilestone: {
      target: nextMilestoneTarget,
      targetDisplay: fmt(nextMilestoneTarget),
      needed: nextMilestoneNeeded,
      neededDisplay: fmt(nextMilestoneNeeded),
      plan: milestonePlan,
    },
    momentum: buildMomentum(lodestone.entries, catalogById, now),
    monthlyHistory: buildMonthlyHistory(lodestone.entries, catalogById, now),
    categories: buildCategories(catalog, earnedIds, obtainableIds),
    quickWins: recommendations.quickWins.slice(0, 6),
    nextInSeries: recommendations.nextInSeries.slice(0, 8),
    comfy: recommendations.comfy.slice(0, 6),
    rewards: recommendations.rewards.slice(0, 8),
    recent: recent.slice(0, 14),
    targetPlans,
    methodology: {
      note: "Obtainable completion excludes Legacy, Seasonal Events, Ranking achievements and FFXIV Collect's maintained time-limited achievement list.",
      recNote: "Suggestions use public achievement ownership rates, point values, descriptions and series progression as hints. They do not know hidden in-game counters.",
    },
  };
}

export default async function () {
  try {
    return await buildDashboard();
  } catch (error) {
    console.error("[ffxiv-achievements] Dashboard build failed:", error);
    return {
      sourceOk: false,
      error: error.message,
      character: {
        ...CHARACTER,
        portrait: null,
        avatar: null,
        title: "",
        lodestoneUrl: `${LODESTONE_BASE}/`,
        achievementUrl: `${LODESTONE_BASE}/achievement/`,
        worldDisplay: `${CHARACTER.world} [${CHARACTER.dataCenter}]`,
      },
      updatedAt: new Date().toISOString(),
      updatedDisplay: lastUpdatedLabel(new Date()),
      points: {
        total: 0,
        totalDisplay: "—",
        earnedCount: 0,
        earnedCountDisplay: "—",
        catalogueCount: 0,
        catalogueCountDisplay: "—",
        obtainableEarned: 0,
        obtainableEarnedDisplay: "—",
        obtainableTotal: 0,
        obtainableTotalDisplay: "—",
        obtainableRemaining: 0,
        obtainableRemainingDisplay: "—",
        obtainablePercent: 0,
        obtainablePercentDisplay: "—",
        obtainableCount: 0,
        obtainableCountDisplay: "—",
        obtainableEarnedCount: 0,
        obtainableEarnedCountDisplay: "—",
        obtainableCountPercent: 0,
        obtainableCountPercentDisplay: "—",
      },
      nextMilestone: { target: 0, targetDisplay: "—", needed: 0, neededDisplay: "—", plan: { achievements: [] } },
      momentum: [],
      monthlyHistory: [],
      categories: [],
      quickWins: [],
      nextInSeries: [],
      comfy: [],
      rewards: [],
      recent: [],
      targetPlans: [],
      methodology: { note: "", recNote: "" },
    };
  }
}
