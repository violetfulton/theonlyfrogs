// content/_data/rawgOwned.js
import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

const RAWG_KEY = process.env.RAWG_API_KEY;
if (!RAWG_KEY) throw new Error("Missing RAWG_API_KEY in environment.");

const OWNED_PATH = "./content/_data/ownedGames.json";
const CACHE_DIR = "./.cache/rawg";
const CACHE_TTL = "30d"; // you can shorten if you want

function ensureString(v) {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

function slugify(s) {
  return ensureString(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function rawgGetJson(url, cacheKey) {
  ensureCacheDir();

  // Per-game cache key file so you don't refetch everything every build
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  return EleventyFetch(url, {
    duration: CACHE_TTL,
    type: "json",
    fetchOptions: {
      headers: {
        "User-Agent": "theonlyfrogs (Eleventy) - personal site",
      },
    },
    // Stable cache key
    hash: cacheKey,
  });
}

async function fetchGameDetails(rawgId) {
  const url = `https://api.rawg.io/api/games/${rawgId}?key=${encodeURIComponent(RAWG_KEY)}`;
  return rawgGetJson(url, `game_${rawgId}`);
}

export default async function () {
  const ownedRaw = JSON.parse(fs.readFileSync(OWNED_PATH, "utf-8"));

  // Safety: dedupe by rawgId so duplicates never show up
  const ownedMap = new Map();
  for (const item of Array.isArray(ownedRaw) ? ownedRaw : []) {
    const id = item?.rawgId;
    if (!Number.isFinite(id)) continue;
    const key = String(id);
    if (!ownedMap.has(key)) ownedMap.set(key, item);
    // If it repeats, keep the first one (simple + predictable)
  }
  const owned = Array.from(ownedMap.values());

  // 1) Fetch details for each owned game (cached)
  const enriched = await Promise.all(
    owned.map(async (item) => {
      const rawgId = item.rawgId;
      const d = await fetchGameDetails(rawgId);

      const name = d?.name ?? "Untitled";
      const released = d?.released ?? null;
      const year = released ? String(released).slice(0, 4) : "";

      const image = d?.background_image ?? d?.background_image_additional ?? null;

      const publishers = Array.isArray(d?.publishers)
        ? d.publishers.map((p) => p?.name).filter(Boolean)
        : [];

      // You control the filing platform if you set item.platform.
      // Otherwise we pick RAWG’s first platform name.
      // IMPORTANT: ownedGames.json may have platform as array (after merging) — normalize it.
      const ownedPlatform = ensureString(item.platform);

      const rawgPlatform =
        Array.isArray(d?.platforms) && d.platforms[0]?.platform?.name
          ? d.platforms[0].platform.name
          : "Unknown";

      const platformName = ownedPlatform || rawgPlatform;

      return {
        // Your owned metadata
        ...item,

        // RAWG metadata
        rawgId,
        title: name,
        released,
        year,
        image,
        publishers,

        // grouping key
        platformName,
        platformSlug: slugify(platformName),

        // RAWG page link (nice to have)
        rawgUrl: d?.slug ? `https://rawg.io/games/${d.slug}` : null,
      };
    })
  );

  // 2) Group by platform (to mirror your current /games/ layout)
  const platformMap = new Map();
  for (const g of enriched) {
    const key = g.platformSlug;

    if (!platformMap.has(key)) {
      platformMap.set(key, {
        platform: ensureString(g.platformName),
        slug: g.platformSlug,
        games: [],
      });
    } else {
      // prefer a "nicer" (longer) label if we see one later
      const existing = platformMap.get(key);
      const maybe = ensureString(g.platformName);
      if (maybe.length > ensureString(existing.platform).length) {
        existing.platform = maybe;
      }
    }

    platformMap.get(key).games.push(g);
  }

  // 3) Sort platforms + games
  const platforms = Array.from(platformMap.values()).sort((a, b) =>
    ensureString(a.platform).localeCompare(ensureString(b.platform))
  );

  for (const p of platforms) {
    p.games.sort((a, b) => ensureString(a.title).localeCompare(ensureString(b.title)));
  }

  return {
    platforms,
    totalGames: enriched.length,
    // RAWG attribution (required for free usage)
    rawgAttribution: {
      label: "Data & images from RAWG",
      url: "https://rawg.io/",
    },
  };
}
