// content/_data/gamesOwned.js
// TheGamesDB + Google Sheets games collection pipeline.
// Google Sheets is the master collection list; TheGamesDB enriches rows with covers/metadata.

import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

const GAMES_CSV_URL = process.env.GAMES_CSV_URL;
const THEGAMESDB_API_KEY = process.env.THEGAMESDB_API_KEY;
const THEGAMESDB_OFFLINE = process.env.THEGAMESDB_OFFLINE === "1";

const CACHE_DIR = "./.cache/thegamesdb";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NO_COVER = "/assets/imgs/games/no-cover.png";

// If a search result scores below this, it still appears on the site,
// but it is written to .cache/thegamesdb/needs-review.json.
const REVIEW_SCORE_THRESHOLD = 75;

function ensureString(v) {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

function ensureNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugify(s) {
  return ensureString(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function kebabSlug(s) {
  return ensureString(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cachePath(cacheKey) {
  ensureCacheDir();
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

function readLocalCache(cacheKey, { ignoreTtl = false } = {}) {
  const file = cachePath(cacheKey);
  if (!fs.existsSync(file)) return null;

  try {
    const stat = fs.statSync(file);
    if (!ignoreTtl && Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    console.warn(`[TheGamesDB] Could not read local cache ${file}: ${error.message}`);
    return null;
  }
}

function writeLocalCache(cacheKey, data) {
  const file = cachePath(cacheKey);

  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(`[TheGamesDB] Could not write local cache ${file}: ${error.message}`);
  }
}

function writeReviewFile(items) {
  ensureCacheDir();
  const file = path.join(CACHE_DIR, "needs-review.json");

  try {
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
  } catch (error) {
    console.warn(`[TheGamesDB] Could not write review file: ${error.message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tgdbGet(endpoint, params = {}, cacheKey) {
  const freshCache = readLocalCache(cacheKey);
  if (freshCache) return freshCache;

  const staleCache = readLocalCache(cacheKey, { ignoreTtl: true });
  if (THEGAMESDB_OFFLINE) {
    if (staleCache) {
      console.warn(`[TheGamesDB] Offline mode: using stale cache for ${cacheKey}`);
      return staleCache;
    }

    console.warn(`[TheGamesDB] Offline mode: no cache for ${cacheKey}`);
    return null;
  }


  if (!THEGAMESDB_API_KEY) {
    console.warn("[TheGamesDB] Missing THEGAMESDB_API_KEY. Using sheet data + stale cache only.");
    return staleCache ?? null;
  }

  const url = new URL(endpoint.replace(/^\//, ""), "https://api.thegamesdb.net/");
  url.searchParams.set("apikey", THEGAMESDB_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      writeLocalCache(cacheKey, data);
      return data;
    } catch (error) {
      console.warn(`[TheGamesDB] Attempt ${attempt} failed for ${cacheKey}: ${error.message}`);
      if (attempt < 3) await wait(750 * attempt);
    }
  }

  if (staleCache) {
    console.warn(`[TheGamesDB] Using stale cache for ${cacheKey}`);
    return staleCache;
  }

  return null;
}

function parseCsv(csv) {
  const text = ensureString(csv).replace(/^\uFEFF/, "");
  const records = [];

  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(field);

      if (row.some((cell) => ensureString(cell).trim() !== "")) {
        records.push(row);
      }

      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);

  if (row.some((cell) => ensureString(cell).trim() !== "")) {
    records.push(row);
  }

  if (records.length < 2) return [];

  const headers = records[0].map((header) => ensureString(header).trim());

  return records.slice(1).map((cells) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = ensureString(cells[index]).trim();
    });

    return item;
  });
}

function getField(item, names, fallback = "") {
  if (!item || typeof item !== "object") return fallback;

  const lookup = new Map(
    Object.entries(item).map(([key, value]) => [
      ensureString(key).trim().toLowerCase(),
      value,
    ])
  );

  for (const name of names) {
    const value = lookup.get(ensureString(name).trim().toLowerCase());

    if (value !== undefined && value !== null && ensureString(value).trim() !== "") {
      return ensureString(value).trim();
    }
  }

  return fallback;
}

function getTitle(item) {
  return getField(item, ["Title", "title", "Name", "name", "Game", "game"]);
}

function getPlatform(item) {
  return getField(item, ["Platform", "platform", "Console", "console", "System", "system"], "Unknown");
}

function getPublisher(item) {
  return getField(item, ["Publisher", "publisher"]);
}

function getFormat(item) {
  return getField(item, ["Format", "format", "Ownership", "ownership"], "Unknown");
}

function getStatus(item) {
  return getField(item, ["Status", "status"], "Owned");
}

function getStorefront(item) {
  return getField(item, ["Storefront", "storefront", "Store", "store", "Shop", "shop"]);
}

function getEdition(item) {
  return getField(item, ["Edition", "edition", "Version", "version"]);
}

function getRegion(item) {
  return getField(item, ["Region", "region"]);
}

function getProgress(item) {
  return getField(item, ["Progress", "progress", "Completion", "completion"]);
}

function getCondition(item) {
  return getField(item, ["Condition", "condition"]);
}

function getNotes(item) {
  return getField(item, ["Notes", "notes", "Note", "note"]);
}

function getImageOverride(item) {
  return getField(item, ["ImageOverride", "imageOverride", "Image", "image", "Cover", "cover"]);
}

function getTheGamesDbId(item) {
  return ensureNumber(
    getField(item, [
      "TheGamesDBID",
      "TheGamesDBId",
      "thegamesdbId",
      "thegamesdb_id",
      "TGDBID",
      "tgdbId",
      "GamesDBID",
      "gamesdbId",
    ])
  );
}

function getIgdbId(item) {
  return ensureNumber(getField(item, ["IGDBID", "IGDBId", "igdbId", "igdb_id"]));
}

function normaliseText(s) {
  return ensureString(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bthe\b/g, "")
    .replace(/\bversion\b/g, "")
    .replace(/\bedition\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalisePlatform(s) {
  const raw = normaliseText(s);

  const aliases = new Map([
    ["pc", "pc"],
    ["windows", "pc"],
    ["steam", "pc"],
    ["mac", "mac"],
    ["nintendo switch", "nintendo switch"],
    ["switch", "nintendo switch"],
    ["nintendo switch 2", "nintendo switch 2"],
    ["switch 2", "nintendo switch 2"],
    ["nintendo ds", "nintendo ds"],
    ["ds", "nintendo ds"],
    ["nds", "nintendo ds"],
    ["nintendo 3ds", "nintendo 3ds"],
    ["3ds", "nintendo 3ds"],
    ["game boy", "nintendo game boy"],
    ["gb", "nintendo game boy"],
    ["game boy color", "nintendo game boy color"],
    ["gbc", "nintendo game boy color"],
    ["game boy advance", "nintendo game boy advance"],
    ["gba", "nintendo game boy advance"],
    ["gamecube", "nintendo gamecube"],
    ["nintendo gamecube", "nintendo gamecube"],
    ["wii", "nintendo wii"],
    ["nintendo wii", "nintendo wii"],
    ["wii u", "nintendo wii u"],
    ["nintendo wii u", "nintendo wii u"],
    ["playstation", "sony playstation"],
    ["ps1", "sony playstation"],
    ["sony playstation", "sony playstation"],
    ["playstation 2", "sony playstation 2"],
    ["ps2", "sony playstation 2"],
    ["playstation 3", "sony playstation 3"],
    ["ps3", "sony playstation 3"],
    ["playstation 4", "sony playstation 4"],
    ["ps4", "sony playstation 4"],
    ["playstation 5", "sony playstation 5"],
    ["ps5", "sony playstation 5"],
    ["playstation portable", "sony playstation portable"],
    ["psp", "sony playstation portable"],
    ["playstation vita", "sony playstation vita"],
    ["ps vita", "sony playstation vita"],
    ["vita", "sony playstation vita"],
    ["sony playstation vita", "sony playstation vita"],
    ["xbox", "microsoft xbox"],
    ["microsoft xbox", "microsoft xbox"],
    ["xbox 360", "microsoft xbox 360"],
    ["microsoft xbox 360", "microsoft xbox 360"],
    ["xbox one", "microsoft xbox one"],
    ["microsoft xbox one", "microsoft xbox one"],
    ["xbox series x", "microsoft xbox series x s"],
    ["xbox series s", "microsoft xbox series x s"],
    ["xbox series x s", "microsoft xbox series x s"],
  ]);

  return aliases.get(raw) || raw;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function responseGames(data) {
  return asArray(data?.data?.games);
}

function responsePlatforms(data) {
  return asArray(data?.data?.platforms);
}

function responsePublishers(data) {
  return asArray(
    data?.data?.publishers ||
    data?.data?.publisher ||
    data?.publishers ||
    data?.publisher
  );
}

async function fetchPlatforms() {
  const data = await tgdbGet("/v1/Platforms", {}, "platforms");
  return responsePlatforms(data);
}

async function fetchPublishers() {
  const data = await tgdbGet("/v1/Publishers", {}, "publishers");
  return responsePublishers(data);
}

function buildPublisherMap(publishers) {
  const map = new Map();

  for (const publisher of asArray(publishers)) {
    const id = ensureString(publisher?.id || publisher?.publisher_id || publisher?.ID);
    const name = ensureString(
      publisher?.name ||
      publisher?.publisher_name ||
      publisher?.company_name ||
      publisher?.title
    );

    if (id && name) {
      map.set(id, name);
    }
  }

  return map;
}

function findPlatformId(platforms, platformName) {
  const wanted = normalisePlatform(platformName);
  if (!wanted || wanted === "unknown") return null;

  const exact = platforms.find((p) => {
    const name = normalisePlatform(p?.name);
    const alias = normalisePlatform(p?.alias);
    return name === wanted || alias === wanted;
  });

  if (exact?.id) return exact.id;

  const loose = platforms.find((p) => {
    const name = normalisePlatform(p?.name);
    const alias = normalisePlatform(p?.alias);
    return (
      (name && (name.includes(wanted) || wanted.includes(name))) ||
      (alias && (alias.includes(wanted) || wanted.includes(alias)))
    );
  });

  return loose?.id ?? null;
}

function getGamePlatformName(game, platformsById) {
  const platformId = ensureString(game?.platform);
  const fromMap = platformsById.get(platformId)?.name;
  return fromMap || game?.platform_name || game?.platform || "";
}

function scoreMatch(game, item, platformsById) {
  const wantedTitle = normaliseText(getTitle(item));
  const gameTitle = normaliseText(game?.game_title || game?.name);
  const wantedPlatform = normalisePlatform(getPlatform(item));
  const gamePlatform = normalisePlatform(getGamePlatformName(game, platformsById));

  let score = 0;

  if (wantedTitle && gameTitle === wantedTitle) {
    score += 70;
  } else if (wantedTitle && gameTitle) {
    if (gameTitle.includes(wantedTitle) || wantedTitle.includes(gameTitle)) score += 35;

    const wantedWords = new Set(wantedTitle.split(" ").filter(Boolean));
    const gameWords = new Set(gameTitle.split(" ").filter(Boolean));
    const overlap = [...wantedWords].filter((word) => gameWords.has(word)).length;
    score += Math.min(25, overlap * 5);
  }

  if (wantedPlatform && wantedPlatform !== "unknown" && gamePlatform) {
    if (gamePlatform === wantedPlatform) {
      score += 35;
    } else if (gamePlatform.includes(wantedPlatform) || wantedPlatform.includes(gamePlatform)) {
      score += 18;
    }
  }

  if (game?.release_date) score += 3;

  return score;
}

function sortMatches(games, item, platformsById) {
  return asArray(games)
    .map((game) => ({
      game,
      score: scoreMatch(game, item, platformsById),
    }))
    .sort((a, b) => b.score - a.score);
}

async function fetchGameById(id) {
  const data = await tgdbGet(
    "/v1/Games/ByGameID",
    {
      id,
      fields: "publishers,overview,platform,genres,players,rating",
      include: "boxart,platform",
    },
    `game_${id}`
  );

  return responseGames(data)[0] ?? null;
}

async function searchGame(item, platformId, platformsById) {
  const title = getTitle(item);
  if (!title) return { game: null, score: 0, candidates: [] };

  const params = {
    name: title,
    fields: "publishers,overview,platform,genres,players,rating",
    include: "boxart,platform",
  };

  if (platformId) params["filter[platform]"] = platformId;

  const data = await tgdbGet(
    "/v1.1/Games/ByGameName",
    params,
    `search_${slugify(getPlatform(item))}_${slugify(title)}`
  );

  let candidates = responseGames(data);

  // If platform-filtered search fails, retry without platform. This helps when
  // TheGamesDB platform names do not line up with your sheet labels.
  if (candidates.length === 0 && platformId) {
    const fallbackData = await tgdbGet(
      "/v1.1/Games/ByGameName",
      {
        name: title,
        fields: "publishers,overview,platform,genres,players,rating",
        include: "boxart,platform",
      },
      `search_anyplatform_${slugify(title)}`
    );

    candidates = responseGames(fallbackData);
  }

  const sorted = sortMatches(candidates, item, platformsById);
  const best = sorted[0];

  return {
    game: best?.game ?? null,
    score: best?.score ?? 0,
    candidates: sorted.slice(0, 5).map(({ game, score }) => ({
      id: game?.id ?? null,
      title: game?.game_title || game?.name || "",
      platform: getGamePlatformName(game, platformsById),
      releaseDate: game?.release_date || "",
      score,
      url: game?.id ? `https://thegamesdb.net/game.php?id=${game.id}` : "",
    })),
  };
}

function getBaseImageUrl(data) {
  const baseUrl = data?.data?.base_url || data?.base_url || {};
  return (
    baseUrl.original ||
    baseUrl.large ||
    baseUrl.medium ||
    baseUrl.small ||
    "https://cdn.thegamesdb.net/images/original"
  );
}

async function fetchBoxart(gameId) {
  if (!gameId) return null;

  const data = await tgdbGet(
    "/v1/Games/Images",
    {
      games_id: gameId,
      "filter[type]": "boxart",
    },
    `images_${gameId}`
  );

  const imagesByGame = data?.data?.images || data?.images || {};
  const images = asArray(imagesByGame[String(gameId)] || imagesByGame[gameId]);
  const front = images.find((img) => img?.type === "boxart" && img?.side === "front");
  const firstBox = images.find((img) => img?.type === "boxart");
  const chosen = front || firstBox || images[0];

  if (!chosen?.filename) return null;
  if (/^https?:\/\//i.test(chosen.filename)) return chosen.filename;

  return `${getBaseImageUrl(data).replace(/\/$/, "")}/${ensureString(chosen.filename).replace(/^\//, "")}`;
}

function extractPublishers(game, item, publishersById = new Map()) {
  const sheetPublisher = getPublisher(item);
  if (sheetPublisher) return [sheetPublisher];

  const raw = game?.publishers;
  if (!raw) return [];

  const values = asArray(raw);
  const names = [];

  for (const value of values) {
    const directName = ensureString(
      value?.name ||
      value?.publisher_name ||
      value?.company_name ||
      value?.title
    );

    if (directName) {
      names.push(directName);
      continue;
    }

    const id = ensureString(value?.id || value?.publisher_id || value);

    if (id && publishersById.has(id)) {
      names.push(publishersById.get(id));
    }
  }

  return [...new Set(names.filter(Boolean))];
}

function collectionKey(item, index) {
  // One row = one owned copy/version. Include index to prevent accidental merging.
  return [
    index + 1,
    slugify(getPlatform(item)),
    slugify(getTitle(item)),
    slugify(getFormat(item)),
    slugify(getStorefront(item)),
    slugify(getEdition(item)),
    slugify(getRegion(item)),
  ].join("_");
}

function uniqueTitleKey(game) {
  return [slugify(game.platformName), slugify(game.title)].join("_");
}

function normaliseGame({ item, game, boxartUrl, matchScore = null, candidates = [], publishersById = new Map() }) {
  const title = game?.game_title || game?.name || getTitle(item) || "Unknown Game";
  const platformName = getPlatform(item) || "Unknown";
  const released = game?.release_date || null;
  const year = released ? String(released).slice(0, 4) : "";
  const image = getImageOverride(item) || boxartUrl || NO_COVER;

  const format = getFormat(item);
  const status = getStatus(item);
  const storefront = getStorefront(item);
  const edition = getEdition(item);
  const region = getRegion(item);
  const progress = getProgress(item);
  const condition = getCondition(item);
  const notes = getNotes(item);
  const explicitId = getTheGamesDbId(item);

  const noMatch = !game;
  const lowConfidence = !explicitId && matchScore !== null && matchScore < REVIEW_SCORE_THRESHOLD;
  const noBoxart = !getImageOverride(item) && !boxartUrl;

  const reviewReasons = [];
  if (noMatch) reviewReasons.push("No TheGamesDB match found");
  if (lowConfidence) reviewReasons.push(`Low confidence match (${matchScore})`);
  if (noBoxart) reviewReasons.push("No boxart found");

  return {
    ...item,

    // IDs
    thegamesdbId: game?.id ?? explicitId ?? null,
    igdbId: getIgdbId(item),

    // Display fields used by your existing templates
    title,
    released,
    year,
    image,
    publishers: extractPublishers(game, item, publishersById),
    platformName,
    platformSlug: slugify(platformName),
    platformKebabSlug: kebabSlug(platformName),

    // Collection fields from your sheet
    format,
    formatSlug: slugify(format),
    status,
    statusSlug: slugify(status),
    storefront,
    storefrontSlug: slugify(storefront),
    edition,
    editionSlug: slugify(edition),
    region,
    regionSlug: slugify(region),
    progress,
    progressSlug: slugify(progress),
    condition,
    conditionSlug: slugify(condition),
    notes,

    // Links/source
    sourceUrl: game?.id ? `https://thegamesdb.net/game.php?id=${game.id}` : null,
    gamesDbUrl: game?.id ? `https://thegamesdb.net/game.php?id=${game.id}` : null,

    // Review/debug
    matchScore,
    candidates,
    needsReview: reviewReasons.length > 0,
    reviewReason: reviewReasons.join("; "),
    gamesDbFailed: noMatch,
  };
}

function incrementCount(map, label) {
  const cleanLabel = ensureString(label) || "Unknown";
  const key = slugify(cleanLabel) || "unknown";

  if (!map[key]) {
    map[key] = { label: cleanLabel, count: 0 };
  }

  map[key].count++;
}

function asSortedCountArray(counts) {
  return Object.values(counts).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default async function () {
  if (!GAMES_CSV_URL) {
    console.warn("[Games] Missing GAMES_CSV_URL. Add your published Google Sheet CSV URL to env vars.");

    return {
      platforms: [],
      allGames: [],
      totalGames: 0,
      totalCopies: 0,
      uniqueTitles: 0,
      needsReview: [],
      reviewCount: 0,
      attribution: {
        label: "Game data and images from TheGamesDB",
        url: "https://thegamesdb.net/",
      },
    };
  }

  const csv = await EleventyFetch(GAMES_CSV_URL, {
    duration: "1h",
    type: "text",
  });

  const rows = parseCsv(csv).filter((item) => getTitle(item));
  const tgdbPlatforms = await fetchPlatforms();
  const tgdbPublishers = await fetchPublishers();

  const platformsById = new Map(tgdbPlatforms.map((p) => [String(p.id), p]));
  const publishersById = buildPublisherMap(tgdbPublishers);

  const enriched = [];
  const needsReview = [];

  for (const [index, item] of rows.entries()) {
    const explicitId = getTheGamesDbId(item);
    const platformId = findPlatformId(tgdbPlatforms, getPlatform(item));

    let game = null;
    let matchScore = null;
    let candidates = [];

    if (explicitId) {
      game = await fetchGameById(explicitId);
      matchScore = 999;
    } else {
      const search = await searchGame(item, platformId, platformsById);
      game = search.game;
      matchScore = search.score;
      candidates = search.candidates;
    }

    const boxartUrl = game?.id ? await fetchBoxart(game.id) : null;
    const normalised = normaliseGame({ item, game, boxartUrl, matchScore, candidates, publishersById });

    normalised.collectionKey = collectionKey(item, index);
    normalised.uniqueTitleKey = uniqueTitleKey(normalised);

    enriched.push(normalised);

    if (normalised.needsReview) {
      needsReview.push({
        rowNumber: item.rowNumber,
        title: getTitle(item),
        platform: getPlatform(item),
        format: getFormat(item),
        storefront: getStorefront(item),
        edition: getEdition(item),
        thegamesdbId: normalised.thegamesdbId,
        reason: normalised.reviewReason,
        selectedMatch: normalised.thegamesdbId
          ? {
              id: normalised.thegamesdbId,
              title: normalised.title,
              url: normalised.gamesDbUrl,
              score: normalised.matchScore,
            }
          : null,
        candidates: normalised.candidates,
      });
    }
  }

  writeReviewFile(needsReview);

  const platformMap = new Map();
  const formatCounts = {};
  const statusCounts = {};
  const storefrontCounts = {};
  const regionCounts = {};
  const uniqueTitleSet = new Set();

  for (const game of enriched) {
    uniqueTitleSet.add(game.uniqueTitleKey);
    incrementCount(formatCounts, game.format);
    incrementCount(statusCounts, game.status);
    incrementCount(storefrontCounts, game.storefront || "None");
    incrementCount(regionCounts, game.region || "Unknown");

    const key = game.platformSlug || "unknown";

    if (!platformMap.has(key)) {
      platformMap.set(key, {
        platform: ensureString(game.platformName) || "Unknown",
        slug: key,
        kebabSlug: game.platformKebabSlug || kebabSlug(game.platformName),
        games: [],
      });
    }

    platformMap.get(key).games.push(game);
  }

  const groupedPlatforms = Array.from(platformMap.values()).sort((a, b) =>
    ensureString(a.platform).localeCompare(ensureString(b.platform))
  );

  for (const platform of groupedPlatforms) {
    platform.games.sort((a, b) => ensureString(a.title).localeCompare(ensureString(b.title)));
    platform.totalGames = platform.games.length;
    platform.physicalGames = platform.games.filter((g) => g.formatSlug === "physical");
    platform.digitalGames = platform.games.filter((g) => g.formatSlug === "digital");
  }

  const physicalGames = enriched.filter((g) => g.formatSlug === "physical");
  const digitalGames = enriched.filter((g) => g.formatSlug === "digital");
  const currentGames = enriched.filter((g) => ["playing", "currentlyplaying", "current"].includes(g.statusSlug));
  const completedGames = enriched.filter((g) => ["completed", "beaten"].includes(g.statusSlug));
  const wishlistGames = enriched.filter((g) => g.statusSlug === "wishlist");

  const attribution = {
    label: "Game data and images from TheGamesDB",
    url: "https://thegamesdb.net/",
  };

  return {
    platforms: groupedPlatforms,
    allGames: enriched,

    // Total rows/copies. Keeping totalGames for your current templates.
    totalGames: enriched.length,
    totalCopies: enriched.length,
    uniqueTitles: uniqueTitleSet.size,

    physicalGames,
    digitalGames,
    currentGames,
    completedGames,
    wishlistGames,

    physicalCount: physicalGames.length,
    digitalCount: digitalGames.length,

    formatCounts,
    formatCountsList: asSortedCountArray(formatCounts),
    statusCounts,
    statusCountsList: asSortedCountArray(statusCounts),
    storefrontCounts,
    storefrontCountsList: asSortedCountArray(storefrontCounts),
    regionCounts,
    regionCountsList: asSortedCountArray(regionCounts),

    needsReview,
    reviewCount: needsReview.length,

    attribution,

    updatedAt: new Date().toISOString(),
  };
}
