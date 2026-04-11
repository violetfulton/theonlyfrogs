import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

const CHARACTER_ID = process.env.FFXIV_CHARACTER_ID;
const REGION = process.env.FFXIV_LODESTONE_REGION || "eu";

if (!CHARACTER_ID) {
  throw new Error("Missing FFXIV_CHARACTER_ID");
}

const BASE_URL = `https://${REGION}.finalfantasyxiv.com`;
const CHARACTER_BASE = `${BASE_URL}/lodestone/character/${CHARACTER_ID}`;

const URLS = {
  profile: `${CHARACTER_BASE}/`,
  achievements: `${CHARACTER_BASE}/achievement/`,
  categories: `${CHARACTER_BASE}/achievement/`
};

const OUTPUT_PATH = path.resolve("content/_data/ffxivAchievements.json");
const MAX_ACHIEVEMENT_PAGES = 10;

const CATEGORY_META = {
  General: {
    icon: "☁️",
    theme: "moogle",
    label: "General",
    hint: "A cute mix of broad little milestones.",
    focusIdeas: [
      "all-round account progress",
      "system milestones",
      "general long-term goals"
    ]
  },
  Quests: {
    icon: "📖",
    theme: "storybook",
    label: "Quests & Unlocks",
    hint: "Lovely for sidequest clears, role quests, and content unlock progress.",
    focusIdeas: [
      "sidequests",
      "role quests",
      "feature unlock chains"
    ]
  },
  Battle: {
    icon: "⚔️",
    theme: "crystal",
    label: "Battle & Duties",
    hint: "Good for roulettes, dungeon clears, and job progress.",
    focusIdeas: [
      "roulettes",
      "job levelling",
      "dungeons / trials",
      "deep dungeons"
    ]
  },
  PvP: {
    icon: "🏹",
    theme: "ribbon",
    label: "PvP",
    hint: "A slow-and-steady category for Frontline or CC days.",
    focusIdeas: [
      "Frontline",
      "Crystalline Conflict",
      "casual PvP sessions"
    ]
  },
  Character: {
    icon: "🩷",
    theme: "axolotl",
    label: "Character Growth",
    hint: "A dreamy pocket of personal long-term milestones.",
    focusIdeas: [
      "job milestones",
      "level thresholds",
      "personal progression"
    ]
  },
  Items: {
    icon: "🎒",
    theme: "pom",
    label: "Items & Collecting",
    hint: "Often passive progress from collecting things naturally.",
    focusIdeas: [
      "gear unlocks",
      "tool upgrades",
      "collection progress"
    ]
  },
  "Crafting & Gathering": {
    icon: "🪡",
    theme: "petal",
    label: "Crafting & Gathering",
    hint: "Perfect for calm, cosy progress sessions.",
    focusIdeas: [
      "crafting logs",
      "gathering goals",
      "tool progression",
      "levequests"
    ]
  },
  Exploration: {
    icon: "🧭",
    theme: "cloud",
    label: "Exploration",
    hint: "Nice for sightseeing and wandering around the world.",
    focusIdeas: [
      "sightseeing",
      "map exploration",
      "zone wandering"
    ]
  },
  "Grand Company": {
    icon: "🎖️",
    theme: "medal",
    label: "Grand Company",
    hint: "A steady category with ranky little goals.",
    focusIdeas: [
      "company rank progress",
      "seal-related goals",
      "squadron bits"
    ]
  },
  "Treasure Hunt": {
    icon: "💎",
    theme: "crystal",
    label: "Treasure Hunt",
    hint: "Cute group progress if you enjoy maps.",
    focusIdeas: [
      "map nights",
      "portal runs",
      "treasure achievements"
    ]
  },
  "Gold Saucer": {
    icon: "🎰",
    theme: "star",
    label: "Gold Saucer",
    hint: "A sweet place to grind side goals next.",
    focusIdeas: [
      "Mini Cactpot",
      "GATEs",
      "Jumbo Cactpot",
      "chocobo racing"
    ]
  },
  "Field Operations": {
    icon: "🗺️",
    theme: "map",
    label: "Field Operations",
    hint: "A chunkier long-term grind bucket.",
    focusIdeas: [
      "Eureka",
      "Bozja",
      "big grind sessions"
    ]
  },
  Commendation: {
    icon: "💌",
    theme: "heart",
    label: "Commendations",
    hint: "Mostly passive progress from doing duties with people.",
    focusIdeas: [
      "party play",
      "duty clears with others",
      "long-term passive progress"
    ]
  }
};

function clean(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function toNumber(text = "") {
  const value = clean(text).replace(/[^\d]/g, "");
  return value ? Number(value) : null;
}

function slugify(text = "") {
  return clean(text)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function absoluteUrl(href = "") {
  try {
    return new URL(href, BASE_URL).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "accept-language": "en-GB,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function pickFirstText($, selectors = []) {
  for (const selector of selectors) {
    const value = clean($(selector).first().text());
    if (value) return value;
  }
  return null;
}

function pickFirstAttr($, selectors = [], attr = "src") {
  for (const selector of selectors) {
    const value = $(selector).first().attr(attr);
    if (value) return value;
  }
  return null;
}

function parseProfile(html) {
  const $ = cheerio.load(html);

  return {
    characterName: pickFirstText($, [
      ".frame__chara__name",
      ".frame__chara__box__name",
      ".character__name"
    ]),
    world: pickFirstText($, [
      ".frame__chara__world",
      ".character__world"
    ]),
    portrait: pickFirstAttr($, [
      ".frame__chara__face img",
      ".character__face img",
      ".frame__chara__visual img"
    ])
  };
}

function parseAchievementPage(html) {
  const $ = cheerio.load(html);
  const rootText = clean($.root().text());

  const recent = [];
  const seen = new Set();

  $("li, .entry, article").each((_, el) => {
    const item = $(el);

    const clone = item.clone();
    clone.find("script").remove();

    const text = clean(clone.text());
    const titleMatch = text.match(/achievement\s+"(.+?)"\s+earned!/i);
    if (!titleMatch) return;

    const categoryMatch = text.match(/^(.+?)\s+achievement\s+"/i);
    const title = titleMatch[1];
    const rawCategory = categoryMatch ? clean(categoryMatch[1]) : null;

    const rawHtml = item.html() || "";
    const timestampMatch = rawHtml.match(/ldst_strftime\((\d+),\s*'YMD'\)/i);

    let date = null;
    if (timestampMatch) {
      const unix = Number(timestampMatch[1]);
      if (!Number.isNaN(unix)) {
        date = new Date(unix * 1000).toISOString().slice(0, 10);
      }
    }

    if (!date) {
      date =
        clean(item.find("time").first().text()) ||
        clean(item.find(".entry__date").first().text()) ||
        null;
    }

    const category = rawCategory
      ? rawCategory.replace(/^[-–—\s]+/, "").trim()
      : null;

    const href =
      item.find('a[href*="/achievement/detail/"]').first().attr("href") || null;

    const key = `${category || ""}|${title}|${date || ""}`;
    if (seen.has(key)) return;
    seen.add(key);

    recent.push({
      category,
      title,
      date,
      url: href ? absoluteUrl(href) : null
    });
  });

  let achievementPoints = null;

  const pointsMatch =
    rootText.match(/Achievement\s*Points\s*([\d,]+)/i) ||
    rootText.match(/Points\s*([\d,]+)/i);

  if (pointsMatch) {
    achievementPoints = toNumber(pointsMatch[1]);
  }

  if (achievementPoints == null) {
    const largeNumberMatch = rootText.match(/\b\d{4,6}\b/);
    if (largeNumberMatch) {
      achievementPoints = toNumber(largeNumberMatch[0]);
    }
  }

  return {
    achievementPoints,
    recent
  };
}

async function fetchAllRecentAchievements() {
  const allRecent = [];
  const seen = new Set();
  let achievementPoints = null;

  for (let page = 1; page <= MAX_ACHIEVEMENT_PAGES; page++) {
    const url =
      page === 1
        ? URLS.achievements
        : `${URLS.achievements}?page=${page}`;

    console.log(`Fetching achievements page ${page}: ${url}`);

    let html;
    try {
      html = await fetchHtml(url);
    } catch (error) {
      console.warn(`Failed to fetch achievements page ${page}: ${error.message}`);
      break;
    }

    const parsed = parseAchievementPage(html);

    if (achievementPoints == null && parsed.achievementPoints != null) {
      achievementPoints = parsed.achievementPoints;
    }

    if (!parsed.recent.length) {
      console.log(`No achievements found on page ${page}, stopping.`);
      break;
    }

    let addedThisPage = 0;

    for (const item of parsed.recent) {
      const key = `${item.category || ""}|${item.title}|${item.date || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allRecent.push(item);
      addedThisPage++;
    }

    if (addedThisPage === 0) {
      console.log(`No new achievements found on page ${page}, stopping.`);
      break;
    }
  }

  return {
    achievementPoints,
    recent: allRecent
  };
}

function parseCategoryLinks(html) {
  const $ = cheerio.load(html);
  const categories = [];
  const seen = new Set();

  $("a").each((_, el) => {
    const link = $(el);
    const href = link.attr("href");
    const name = clean(link.text());

    if (!href || !name) return;
    if (!/\/lodestone\/character\/\d+\/achievement\/kind\/\d+/.test(href)) return;

    const url = absoluteUrl(href);
    if (!url || seen.has(url)) return;

    seen.add(url);

    categories.push({
      name,
      url
    });
  });

  return categories;
}

function parseCategoryDetail(_html, fallbackName, fallbackUrl, recent = []) {
  const name = fallbackName;
  const meta = CATEGORY_META[name] || {};
  const recentInCategory = recent.filter(item => item.category === name);

  return {
    slug: slugify(name),
    name,
    displayName: meta.label || name,
    url: fallbackUrl,
    recentCount: recentInCategory.length,
    recentTitles: recentInCategory.slice(0, 3).map(item => item.title),
    icon: meta.icon || "✧",
    theme: meta.theme || "pink",
    hint: meta.hint || "A sweet little pocket of progress.",
    focusIdeas: meta.focusIdeas || []
  };
}

function getTag(category) {
  if (category.recentCount >= 3) return "active lately";
  if (category.recentCount >= 1) return "recent progress";
  return "quiet lately";
}

function buildSuggestions(categories) {
  const easyWins = [...categories]
    .filter(cat => cat.recentCount >= 1 && cat.recentCount <= 2)
    .sort((a, b) => b.recentCount - a.recentCount)
    .slice(0, 3)
    .map(cat => ({
      category: cat.displayName || cat.name,
      icon: cat.icon,
      reason: "You’ve touched this recently, so it could be a nice category to keep nudging.",
      url: cat.url,
      focusIdeas: cat.focusIdeas || []
    }));

  const neglected = [...categories]
    .filter(cat => cat.recentCount === 0)
    .slice(0, 3)
    .map(cat => ({
      category: cat.displayName || cat.name,
      icon: cat.icon,
      reason: "Nothing recent here, so this could be a cute fresh focus.",
      url: cat.url,
      focusIdeas: cat.focusIdeas || []
    }));

  const active = [...categories]
    .filter(cat => cat.recentCount > 0)
    .sort((a, b) => b.recentCount - a.recentCount)
    .slice(0, 3)
    .map(cat => ({
      category: cat.displayName || cat.name,
      icon: cat.icon,
      reason: "You’ve had recent progress here, so it’s a comfy category to keep pushing.",
      url: cat.url,
      focusIdeas: cat.focusIdeas || []
    }));

  return {
    easyWins,
    neglected,
    active
  };
}

async function fetchCategoryDetails(categoryLinks, recent = []) {
  const results = [];

  for (const category of categoryLinks) {
    try {
      const html = await fetchHtml(category.url);
      results.push(parseCategoryDetail(html, category.name, category.url, recent));
    } catch (error) {
      console.warn(`Failed to fetch category ${category.name}: ${error.message}`);

      const meta = CATEGORY_META[category.name] || {};
      const recentInCategory = recent.filter(item => item.category === category.name);

      results.push({
        slug: slugify(category.name),
        name: category.name,
        displayName: meta.label || category.name,
        url: category.url,
        recentCount: recentInCategory.length,
        recentTitles: recentInCategory.slice(0, 3).map(item => item.title),
        icon: meta.icon || "✧",
        theme: meta.theme || "pink",
        hint: meta.hint || "A sweet little pocket of progress.",
        focusIdeas: meta.focusIdeas || []
      });
    }
  }

  return results;
}

async function writeDataFile(data) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  console.log("Fetching FFXIV Lodestone data...");

  const [profileHtml, categoryIndexHtml, summary] = await Promise.all([
    fetchHtml(URLS.profile),
    fetchHtml(URLS.categories),
    fetchAllRecentAchievements()
  ]);

  const profile = parseProfile(profileHtml);
  const categoryLinks = parseCategoryLinks(categoryIndexHtml);
  const categoryDetails = await fetchCategoryDetails(categoryLinks, summary.recent);

  const categories = categoryDetails.map(cat => ({
    ...cat,
    tag: getTag(cat)
  }));

  const data = {
    characterId: CHARACTER_ID,
    lodestoneUrl: CHARACTER_BASE,
    achievementsUrl: URLS.achievements,
    categoryIndexUrl: URLS.categories,
    characterName: profile.characterName,
    world: profile.world,
    portrait: profile.portrait,
    achievementPoints: summary.achievementPoints,
    recent: summary.recent,
    categories,
    suggestions: buildSuggestions(categories),
    updatedAt: new Date().toISOString()
  };

  await writeDataFile(data);

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Found ${summary.recent.length} recent achievements`);
  console.log(`Found ${categories.length} achievement categories`);
  console.log(`Achievement points: ${summary.achievementPoints ?? "—"}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});