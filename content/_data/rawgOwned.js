// content/_data/rawgOwned.js
import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

const RAWG_KEY = process.env.RAWG_API_KEY;

const OWNED_PATH = "./content/_data/ownedGames.json";
const CACHE_DIR = "./.cache/rawg";
const CACHE_TTL = "30d";

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
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
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

function readLocalCache(cacheKey) {
  const file = cachePath(cacheKey);

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    console.warn(`[RAWG] Could not read local cache ${file}: ${error.message}`);
    return null;
  }
}

function writeLocalCache(cacheKey, data) {
  const file = cachePath(cacheKey);

  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(`[RAWG] Could not write local cache ${file}: ${error.message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rawgGetJson(url, cacheKey) {
  const fallbackCache = readLocalCache(cacheKey);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await EleventyFetch(url, {
        duration: CACHE_TTL,
        type: "json",
        hash: cacheKey,
        fetchOptions: {
          headers: {
            "User-Agent": "theonlyfrogs (Eleventy) - personal site",
          },
        },
      });

      if (data) {
        writeLocalCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.warn(`[RAWG] Attempt ${attempt} failed for ${cacheKey}: ${error.message}`);

      if (attempt < 3) {
        await wait(750 * attempt);
      }
    }
  }

  if (fallbackCache) {
    console.warn(`[RAWG] Using stale local cache for ${cacheKey}`);
    return fallbackCache;
  }

  console.warn(`[RAWG] No cache available for ${cacheKey}; using fallback game data`);
  return null;
}

async function fetchGameDetails(rawgId) {
  if (!RAWG_KEY) {
    console.warn("[RAWG] Missing RAWG_API_KEY. Using ownedGames.json fallback data only.");
    return null;
  }

  const url = `https://api.rawg.io/api/games/${rawgId}?key=${encodeURIComponent(RAWG_KEY)}`;
  return rawgGetJson(url, `game_${rawgId}`);
}

function fallbackGame(item, rawgId) {
  const platformName = ensureString(item.platform) || "Unknown";
  const title =
    ensureString(item.title) ||
    ensureString(item.name) ||
    ensureString(item.Title) ||
    `RAWG ${rawgId}`;

  const image =
    ensureString(item.imageOverride) ||
    ensureString(item.ImageOverride) ||
    ensureString(item.image) ||
    "/assets/imgs/games/no-cover.png";

  const publisher =
    ensureString(item.publisher) ||
    ensureString(item.Publisher);

  return {
    ...item,
    rawgId,
    title,
    released: null,
    year: "",
    image,
    publishers: publisher ? [publisher] : [],
    platformName,
    platformSlug: slugify(platformName),
    rawgUrl: null,
    rawgFailed: true,
  };
}

export default async function () {
  const ownedRaw = JSON.parse(fs.readFileSync(OWNED_PATH, "utf-8"));

  const ownedMap = new Map();

  for (const item of Array.isArray(ownedRaw) ? ownedRaw : []) {
    const id = ensureNumber(item?.rawgId);

    if (!id) {
      console.warn(`[RAWG] Skipping owned game with missing/invalid rawgId: ${JSON.stringify(item)}`);
      continue;
    }

    const key = String(id);

    if (!ownedMap.has(key)) {
      ownedMap.set(key, {
        ...item,
        rawgId: id,
      });
    }
  }

  const owned = Array.from(ownedMap.values());

  const enriched = await Promise.all(
    owned.map(async (item) => {
      const rawgId = item.rawgId;
      const d = await fetchGameDetails(rawgId);

      if (!d) {
        return fallbackGame(item, rawgId);
      }

      const name =
        d?.name ||
        ensureString(item.title) ||
        ensureString(item.name) ||
        ensureString(item.Title) ||
        `RAWG ${rawgId}`;

      const released = d?.released ?? null;
      const year = released ? String(released).slice(0, 4) : "";

      const image =
        ensureString(item.imageOverride) ||
        ensureString(item.ImageOverride) ||
        d?.background_image ||
        d?.background_image_additional ||
        ensureString(item.image) ||
        "/assets/imgs/games/no-cover.png";

      const publishers = Array.isArray(d?.publishers)
        ? d.publishers.map((p) => p?.name).filter(Boolean)
        : [];

      const ownedPlatform = ensureString(item.platform);

      const rawgPlatform =
        Array.isArray(d?.platforms) && d.platforms[0]?.platform?.name
          ? d.platforms[0].platform.name
          : "Unknown";

      const platformName = ownedPlatform || rawgPlatform;

      return {
        ...item,

        rawgId,
        title: name,
        released,
        year,
        image,
        publishers,

        platformName,
        platformSlug: slugify(platformName),

        rawgUrl: d?.slug ? `https://rawg.io/games/${d.slug}` : null,
        rawgFailed: false,
      };
    })
  );

  const platformMap = new Map();

  for (const g of enriched) {
    const key = g.platformSlug || "unknown";

    if (!platformMap.has(key)) {
      platformMap.set(key, {
        platform: ensureString(g.platformName) || "Unknown",
        slug: key,
        games: [],
      });
    } else {
      const existing = platformMap.get(key);
      const maybe = ensureString(g.platformName);

      if (maybe.length > ensureString(existing.platform).length) {
        existing.platform = maybe;
      }
    }

    platformMap.get(key).games.push(g);
  }

  const platforms = Array.from(platformMap.values()).sort((a, b) =>
    ensureString(a.platform).localeCompare(ensureString(b.platform))
  );

  for (const p of platforms) {
    p.games.sort((a, b) => ensureString(a.title).localeCompare(ensureString(b.title)));
  }

  return {
    platforms,
    totalGames: enriched.length,
    rawgAttribution: {
      label: "Data & images from RAWG",
      url: "https://rawg.io/",
    },
  };
}