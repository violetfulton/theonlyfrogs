// content/_data/ffxivCollections.js
//
// Aggro's collection-shaped view of the FFXIV shrine.
//
// IMPORTANT:
// - Mount/minion cards are read directly from Lodestone's MOBILE collection
//   markup using the same exact selectors as FFXIV Collect itself.
// - FFXIV Collect's character endpoint is only a stale-safe fallback.
// - Orchestrions remain sourced from Aggro's in-game exporter because that
//   collection is not public on Lodestone.
// - Manual shelves live in ffxivCollectionsManual.json.

import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import getGilShopping from "./ffxivGilShopping.js";

const CHARACTER_ID = "56132424";
const CHARACTER_NAME = "Aggro Phobic";
const CHARACTER_WORLD = "Lich";

const MANUAL_PATH = path.resolve("./content/_data/ffxivCollectionsManual.json");
const CACHE_DIR = path.resolve("./.cache/ffxiv-collections");
const CACHE_AGE_MS = 1000 * 60 * 60 * 6; // six hours
const COLLECT_API = "https://ffxivcollect.com/api";

// FFXIV Collect deliberately requests Lodestone collection pages with a mobile
// browser UA. The mobile markup exposes stable `.mount__name` / `.minion__name`
// elements that its own parser uses.
const LODESTONE_MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36";

// FFXIV Collect uses one shared 128×128 music-roll item icon for orchestrions.
// Keep that as the guaranteed fallback so every owned roll has artwork even when
// the gil catalogue does not expose an item-specific image.
const ORCHESTRION_FALLBACK_IMAGE =
  "https://ffxivcollect.com/assets/orchestrion-1715025e27527af41fc5daa8feb192d49887fa2c1b70b2f6fc6dcc74a5570109.png";

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureCacheDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function cacheFresh(filePath) {
  try {
    return Date.now() - fs.statSync(filePath).mtimeMs < CACHE_AGE_MS;
  } catch {
    return false;
  }
}

async function fetchJsonWithCache(url, cacheName) {
  const cachePath = path.join(CACHE_DIR, cacheName);

  if (cacheFresh(cachePath)) {
    const cached = readJson(cachePath);
    if (cached != null) return cached;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "theonlyfrogs.com FFXIV collection log",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    writeJson(cachePath, payload);
    return payload;
  } catch (error) {
    const stale = readJson(cachePath);
    if (stale != null) {
      console.warn(
        `[ffxiv-collections] Using stale ${cacheName}: ${error.message}`,
      );
      return stale;
    }

    throw error;
  }
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return null;
}

function firstSource(item) {
  const source = Array.isArray(item?.sources) ? item.sources[0] : null;
  if (!source) return "";
  if (typeof source === "string") return clean(source);

  return clean(
    source.text ||
      source.name ||
      source.location ||
      source.requirement ||
      source.type ||
      "",
  );
}

function mapOwnedItem(item, imageFallback = null) {
  return {
    id: item?.id ?? item?.item_id ?? item?.itemId ?? item?.name,
    name: clean(item?.name),
    image:
      item?.image ||
      item?.icon ||
      item?.image_url ||
      item?.icon_url ||
      imageFallback ||
      null,
    patch: item?.patch || item?.version || null,
    source: firstSource(item),
    note: "",
    favourite: false,
    rare: false,
  };
}

function catalogueStats(category = {}) {
  const catalogueCount = Number(category?.catalogueCount || 0) || null;
  const ownedCount = Number(category?.ownedCount || 0);

  return {
    catalogueCount,
    missingCount:
      category?.missingCatalogueCount == null
        ? catalogueCount
          ? Math.max(0, catalogueCount - ownedCount)
          : null
        : Number(category.missingCatalogueCount),
    completionPercent:
      category?.catalogueCompletionPercent == null
        ? catalogueCount
          ? Math.round((ownedCount / catalogueCount) * 100)
          : null
        : Number(category.catalogueCompletionPercent),
  };
}

function exactNameKey(value = "") {
  return clean(value)
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .toLocaleLowerCase("en");
}

function lodestoneTotalCount(html) {
  const $ = load(html);
  const text = clean($("body").text());
  const match = text.match(/\bTotal\s*:\s*([\d,]+)/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

async function fetchCollectCatalogue(plural) {
  const payload = await fetchJsonWithCache(
    `${COLLECT_API}/${plural}`,
    `${plural}-catalogue.json`,
  );

  const rows = rowsFromPayload(payload);
  if (!rows?.length) {
    throw new Error(`Empty FFXIV Collect ${plural} catalogue`);
  }

  return rows;
}

function lodestoneNameSelector(kind) {
  if (kind === "mount") return ".mount__name";
  if (kind === "minion") return ".minion__name";
  throw new Error(`No Lodestone name selector configured for ${kind}`);
}

function extractExactLodestoneItems(html, catalogueByName, kind) {
  const $ = load(html);
  const selector = lodestoneNameSelector(kind);
  const found = new Map();
  const rawNames = [];
  const unmatchedNames = [];

  $(selector).each((_, element) => {
    const name = clean($(element).text());
    if (!name) return;

    rawNames.push(name);

    const item = catalogueByName.get(exactNameKey(name));
    if (item) {
      found.set(String(item.id ?? exactNameKey(name)), item);
    } else {
      unmatchedNames.push(name);
    }
  });

  return {
    items: [...found.values()],
    rawNames: [...new Set(rawNames)],
    unmatchedNames: [...new Set(unmatchedNames)],
  };
}

async function fetchOwnedDirectFromLodestone(kind, plural) {
  const catalogue = await fetchCollectCatalogue(plural);
  const catalogueByName = new Map(
    catalogue.map((item) => [exactNameKey(item.name), item]),
  );

  const url = `https://eu.finalfantasyxiv.com/lodestone/character/${CHARACTER_ID}/${kind}/`;

  // Use a NEW cache name for v3 so the old desktop-markup cache from v2 can
  // never poison this fetch for another six hours.
  const html = await fetchJsonWithCacheText(
    url,
    `${plural}-lodestone-mobile-v3.html`,
  );

  const totalCount = lodestoneTotalCount(html);
  const extracted = extractExactLodestoneItems(html, catalogueByName, kind);

  if (!extracted.rawNames.length && Number(totalCount || 0) > 0) {
    throw new Error(
      `Lodestone reported ${totalCount} ${plural}, but ${lodestoneNameSelector(kind)} returned none`,
    );
  }

  if (extracted.unmatchedNames.length) {
    console.warn(
      `[ffxiv-collections] ${kind}: ${extracted.unmatchedNames.length} Lodestone names did not exactly match the FFXIV Collect catalogue: ${extracted.unmatchedNames.join(", ")}`,
    );
  }

  const authoritativeCount = totalCount ?? extracted.rawNames.length;

  if (extracted.items.length !== authoritativeCount) {
    console.warn(
      `[ffxiv-collections] ${kind}: Lodestone says ${authoritativeCount} owned; ${extracted.items.length} names matched the catalogue exactly.`,
    );
  }

  return {
    items: extracted.items,
    totalCount: authoritativeCount,
    listedCount: extracted.rawNames.length,
    unmatchedNames: extracted.unmatchedNames,
    source: "lodestone-mobile-exact",
  };
}

async function fetchJsonWithCacheText(url, cacheName) {
  const cachePath = path.join(CACHE_DIR, cacheName);

  if (cacheFresh(cachePath)) {
    try {
      return fs.readFileSync(cachePath, "utf8");
    } catch {
      // Continue to network fetch.
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": LODESTONE_MOBILE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    ensureCacheDir();
    fs.writeFileSync(cachePath, text);
    return text;
  } catch (error) {
    try {
      const stale = fs.readFileSync(cachePath, "utf8");
      console.warn(
        `[ffxiv-collections] Using stale ${cacheName}: ${error.message}`,
      );
      return stale;
    } catch {
      throw error;
    }
  }
}

async function fetchOwnedFromCollectCharacter(plural) {
  // Ask FFXIV Collect to refresh its character record first when it considers
  // the record stale. This is only a fallback: live Lodestone remains the
  // authority for mount/minion ownership in this site.
  try {
    await fetch(`${COLLECT_API}/characters/${CHARACTER_ID}?latest=1`, {
      headers: {
        "User-Agent": "theonlyfrogs.com FFXIV collection log",
        Accept: "application/json",
      },
    });
  } catch {
    // A refresh failure should not prevent us from trying the owned endpoint.
  }

  const response = await fetch(
    `${COLLECT_API}/characters/${CHARACTER_ID}/${plural}/owned`,
    {
      headers: {
        "User-Agent": "theonlyfrogs.com FFXIV collection log",
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload = await response.json();
  const rows = rowsFromPayload(payload);
  if (!rows) throw new Error("Unexpected FFXIV Collect response shape");

  // Save the newest fallback payload, but never let a stale local cache hide a
  // successful refresh attempt.
  writeJson(path.join(CACHE_DIR, `${plural}-owned.json`), payload);

  return {
    items: rows,
    totalCount: rows.length,
    source: "ffxiv-collect-character",
  };
}

async function exactOwnedShelf({
  type,
  plural,
  title,
  icon,
  fallbackCategory = {},
}) {
  const stats = catalogueStats(fallbackCategory);
  const fallbackCount = Number(fallbackCategory?.ownedCount || 0);
  let exactResult = null;
  let directError = null;

  try {
    exactResult = await fetchOwnedDirectFromLodestone(type, plural);
  } catch (error) {
    directError = error;
    console.warn(
      `[ffxiv-collections] Direct exact ${type} sync unavailable: ${error.message}`,
    );
  }

  if (!exactResult) {
    try {
      exactResult = await fetchOwnedFromCollectCharacter(plural);
    } catch (error) {
      console.warn(
        `[ffxiv-collections] FFXIV Collect character ${type} sync unavailable: ${error.message}`,
      );
    }
  }

  if (exactResult) {
    const items = exactResult.items
      .map((item) => mapOwnedItem(item))
      .filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    // If Lodestone itself succeeded, its Total is authoritative. If we had to
    // fall back to FFXIV Collect, never allow an older character record to
    // undercut the fresher Lodestone-derived count already known by the gil
    // data layer.
    const resultCount = Number(exactResult.totalCount ?? items.length);
    const ownedCount =
      exactResult.source === "lodestone-mobile-exact"
        ? resultCount
        : Math.max(resultCount, fallbackCount);
    const completeList = items.length === ownedCount;

    if (
      exactResult.source === "ffxiv-collect-character" &&
      fallbackCount > items.length
    ) {
      console.warn(
        `[ffxiv-collections] ${type}: FFXIV Collect character data is stale (${items.length} named cards vs ${fallbackCount} live Lodestone-owned). Keeping the Lodestone count.`,
      );
    }

    console.log(
      `[ffxiv-collections] ${type}: ${items.length} exact named cards / ${ownedCount} owned (${exactResult.source}${completeList ? "" : ", incomplete list"}).`,
    );

    return {
      type,
      title,
      icon,
      mode: "exact-sync",
      automatic: true,
      ownershipKnown: true,
      listKnown: completeList,
      exactSource: exactResult.source,
      ownedCount,
      catalogueCount: stats.catalogueCount,
      missingCount:
        stats.catalogueCount == null
          ? null
          : Math.max(0, stats.catalogueCount - ownedCount),
      completionPercent:
        stats.catalogueCount == null
          ? null
          : Math.round((ownedCount / stats.catalogueCount) * 100),
      items,
      syncGap: Math.max(0, ownedCount - items.length),
    };
  }

  // Fail closed. A known total is still useful, but a fuzzy list is not.
  if (directError) {
    console.warn(
      `[ffxiv-collections] ${type}: keeping count only; no guessed cards will be rendered.`,
    );
  }

  return {
    type,
    title,
    icon,
    mode: "exact-sync",
    automatic: true,
    ownershipKnown: Boolean(fallbackCategory?.ownershipKnown || fallbackCount),
    listKnown: false,
    exactSource: null,
    ownedCount: fallbackCount,
    catalogueCount: stats.catalogueCount,
    missingCount: stats.missingCount,
    completionPercent: stats.completionPercent,
    items: [],
    syncGap: fallbackCount,
  };
}

function exportedShelf(category = {}, imageFallback = null) {
  const items = Array.isArray(category?.ownedItems)
    ? category.ownedItems
        .map((item) => mapOwnedItem(item, imageFallback))
        .filter((item) => item.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const stats = catalogueStats(category);
  const ownedCount = Number(category?.ownedCount || items.length);

  return {
    type: category?.type || "orchestrion",
    title: category?.title || "Orchestrion Rolls",
    icon: category?.icon || "♫",
    mode: "owned-export",
    automatic: false,
    ownershipKnown: Boolean(category?.ownershipKnown || items.length),
    listKnown: true,
    ownedCount,
    catalogueCount: stats.catalogueCount,
    missingCount: stats.missingCount,
    completionPercent: stats.completionPercent,
    items,
    syncGap: Math.max(0, ownedCount - items.length),
  };
}

function normaliseManualItem(item, shelfType, index) {
  if (typeof item === "string") {
    return {
      id: `${shelfType}-${index}`,
      name: clean(item),
      image: null,
      patch: null,
      source: "",
      note: "",
      favourite: false,
      rare: false,
    };
  }

  return {
    id: item?.id ?? `${shelfType}-${index}`,
    name: clean(item?.name),
    image: item?.image || null,
    patch: item?.patch || null,
    source: clean(item?.source),
    note: clean(item?.note),
    favourite: Boolean(item?.favourite),
    rare: Boolean(item?.rare),
  };
}

function readManualShelves() {
  try {
    const payload = JSON.parse(fs.readFileSync(MANUAL_PATH, "utf8"));
    const shelves = Array.isArray(payload?.shelves) ? payload.shelves : [];

    return shelves.map((shelf) => {
      const items = (Array.isArray(shelf?.items) ? shelf.items : [])
        .map((item, index) => normaliseManualItem(item, shelf.type, index))
        .filter((item) => item.name);

      return {
        type: clean(shelf?.type),
        title: clean(shelf?.title),
        icon: clean(shelf?.icon) || "◇",
        mode: "manual",
        automatic: false,
        ownershipKnown: true,
        listKnown: true,
        ownedCount: items.length,
        catalogueCount: null,
        missingCount: null,
        completionPercent: null,
        items,
        syncGap: 0,
      };
    });
  } catch (error) {
    console.warn(
      `[ffxiv-collections] Could not read manual shelves: ${error.message}`,
    );
    return [];
  }
}

export default async function () {
  let shopping = {};

  try {
    shopping = (await getGilShopping()) || {};
  } catch (error) {
    console.warn(
      `[ffxiv-collections] Gil shopping data unavailable: ${error.message}`,
    );
  }

  const [mounts, minions] = await Promise.all([
    exactOwnedShelf({
      type: "mount",
      plural: "mounts",
      title: shopping?.mounts?.title || "Mounts",
      icon: shopping?.mounts?.icon || "✦",
      fallbackCategory: shopping?.mounts || {},
    }),
    exactOwnedShelf({
      type: "minion",
      plural: "minions",
      title: shopping?.minions?.title || "Minions",
      icon: shopping?.minions?.icon || "♡",
      fallbackCategory: shopping?.minions || {},
    }),
  ]);

  const orchestrions = exportedShelf(
    shopping?.orchestrions || {},
    ORCHESTRION_FALLBACK_IMAGE,
  );

  const automaticShelves = [mounts, minions, orchestrions];
  const manualShelves = readManualShelves();
  const visibleManualShelves = manualShelves.filter(
    (shelf) => shelf.items.length > 0,
  );

  const categories = [
    ...automaticShelves.filter((shelf) => shelf.ownershipKnown),
    ...visibleManualShelves,
  ];

  return {
    ok: categories.length > 0,
    character: shopping?.character || {
      id: CHARACTER_ID,
      name: CHARACTER_NAME,
      world: CHARACTER_WORLD,
    },
    updatedAt: new Date().toISOString(),
    mounts,
    minions,
    orchestrions,
    featured: automaticShelves.filter((shelf) => shelf.ownershipKnown),
    categories,
    manualShelves,
    stats: {
      visibleShelves: categories.length,
      automaticShelves: automaticShelves.filter((shelf) => shelf.ownershipKnown)
        .length,
      manualItems: visibleManualShelves.reduce(
        (sum, shelf) => sum + shelf.ownedCount,
        0,
      ),
    },
  };
}
