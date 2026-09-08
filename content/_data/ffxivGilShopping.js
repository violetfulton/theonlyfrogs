// content/_data/ffxivGilShopping.js
//
// Builds Aggro Phobic's ACTUAL gil-buyable collectible shopping list.
//
// Sources:
// - FFXIV Collect: collectible catalogue, source text, tradeability + item IDs
// - Lodestone: Aggro's public mount/minion ownership
// - Universalis: current Lich marketboard estimates for tradeable items
//
// Vendor prices are treated as exact when FFXIV Collect's source text includes
// a gil price. Marketboard prices are estimates and can change between builds.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { load } from "cheerio";
import {
  ownedOrchestrions,
  ignoredCollectibles,
} from "./ffxivGilShoppingConfig.js";

const CHARACTER_ID = "56132424";
const CHARACTER_NAME = "Aggro Phobic";
const WORLD = "Lich";
const LODESTONE_BASE =
  `https://eu.finalfantasyxiv.com/lodestone/character/${CHARACTER_ID}`;

const ENDPOINTS = {
  mounts: "https://ffxivcollect.com/api/mounts?limit=5000",
  minions: "https://ffxivcollect.com/api/minions?limit=5000",
  orchestrions: "https://ffxivcollect.com/api/orchestrions?limit=5000",
};

const CACHE_DIR = ".cache/ffxiv-gil-shopping";
const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const USER_AGENT =
  "TheOnlyFrogs gil shopping list (+https://theonlyfrogs.com/)";

const fmt = new Intl.NumberFormat("en-GB");

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeName(value = "") {
  return cleanText(value)
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

function normalizeOrchestrionName(value = "") {
  // FFXIV Collect's orchestrion catalogue is title-based (e.g. "A Long Fall"),
  // while the in-game exporter writes item-style names
  // (e.g. "A Long Fall Orchestrion Roll").
  //
  // Strip only the trailing item suffix so either format matches.
  return normalizeName(value)
    .replace(/\s+orchestrion\s+roll$/i, "")
    .trim();
}

function gil(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${fmt.format(Math.round(Number(value)))} gil`;
}

function compactGil(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  value = Number(value);

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}b`;
  }

  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}m`;
  }

  if (value >= 1_000) {
    const n = value / 1_000;
    return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}k`;
  }

  return fmt.format(value);
}

function percent(value, total) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function hashUrl(url) {
  return crypto.createHash("sha1").update(url).digest("hex");
}

async function readCache(file) {
  try {
    const [text, stat] = await Promise.all([
      fs.readFile(file, "utf8"),
      fs.stat(file),
    ]);

    return {
      text,
      age: Date.now() - stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

async function fetchCached(
  url,
  {
    ttl = SIX_HOURS,
    json = false,
    staleFor = SEVEN_DAYS,
    optional = false,
  } = {},
) {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const ext = json ? ".json" : ".html";
  const file = path.join(CACHE_DIR, `${hashUrl(url)}${ext}`);
  const cached = await readCache(file);

  if (cached && cached.age < ttl) {
    return json ? JSON.parse(cached.text) : cached.text;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: json
          ? "application/json"
          : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await fs.writeFile(file, text, "utf8");

    return json ? JSON.parse(text) : text;
  } catch (error) {
    if (cached && cached.age < staleFor) {
      console.warn(
        `[ffxiv-gil-shopping] ${url} failed; using stale cache: ${error.message}`,
      );
      return json ? JSON.parse(cached.text) : cached.text;
    }

    if (optional) {
      console.warn(
        `[ffxiv-gil-shopping] Optional request failed: ${url}: ${error.message}`,
      );
      return null;
    }

    throw error;
  }
}

function unpackResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function parseGilPrice(text = "") {
  const cleaned = cleanText(text);

  // Handles:
  // "25,000 Gil"
  // "Purchase for 25,000 gil"
  // "25,000,000 gil from Edelina"
  const matches = [
    ...cleaned.matchAll(/([\d][\d,.\s]*)\s*gil\b/gi),
  ];

  const prices = matches
    .map((match) =>
      Number(String(match[1]).replace(/[^\d]/g, "")),
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  return prices.length ? Math.min(...prices) : null;
}

function sourceText(source) {
  if (source == null) return "";
  if (typeof source === "string") return cleanText(source);

  return cleanText(
    [
      source.type,
      source.text,
      source.name,
      source.location,
      source.requirement,
    ]
      .filter(Boolean)
      .join(" · "),
  );
}

function normalizeCatalogItem(raw, type) {
  const sources = Array.isArray(raw?.sources) ? raw.sources : [];

  const purchaseSources = sources
    .map((source) => {
      const text = sourceText(source);
      const price = parseGilPrice(text);
      return {
        text,
        price,
        isPurchase:
          /purchase|vendor|shop|gil\b/i.test(text) || price != null,
      };
    })
    .filter((source) => source.text);

  const pricedSources = purchaseSources.filter(
    (source) => Number.isFinite(source.price) && source.price > 0,
  );

  const vendorPrice = pricedSources.length
    ? Math.min(...pricedSources.map((source) => source.price))
    : null;

  const vendorSource =
    pricedSources
      .sort((a, b) => a.price - b.price)
      .find((source) => source.price === vendorPrice)?.text || "";

  const itemId = Number(
    raw?.item_id ??
      raw?.itemId ??
      raw?.item?.id ??
      0,
  );

  return {
    id: Number(raw?.id || 0),
    itemId: Number.isFinite(itemId) && itemId > 0 ? itemId : null,
    name: cleanText(raw?.name),
    normalizedName: normalizeName(raw?.name),
    type,
    patch: raw?.patch ?? null,
    image: raw?.image ?? raw?.icon ?? null,
    tradeable: Boolean(raw?.tradeable ?? raw?.tradable),
    ownedGlobal: raw?.owned ?? null,
    sources,
    purchaseSources,
    vendorPrice,
    vendorPriceDisplay: gil(vendorPrice),
    vendorPriceCompact: compactGil(vendorPrice),
    vendorSource,
  };
}

async function fetchCatalog(type) {
  const payload = await fetchCached(ENDPOINTS[type], {
    ttl: SIX_HOURS,
    json: true,
  });

  return unpackResults(payload)
    .map((raw) => normalizeCatalogItem(raw, type))
    .filter((item) => item.name);
}

function lodestonePageCount(html) {
  const $ = load(html);
  const texts = [
    cleanText($(".btn__pager").last().text()),
    cleanText($(".pager").last().text()),
    cleanText($("body").text()),
  ];

  for (const text of texts) {
    const match = text.match(/Page\s+\d+\s+of\s+(\d+)/i);
    if (match) return Math.max(1, Number(match[1]));
  }

  return 1;
}

function lodestoneTotalCount(html) {
  const $ = load(html);
  const text = cleanText($("body").text());
  const match = text.match(/\bTotal:\s*([\d,]+)/i);
  if (!match) return null;

  const total = Number(match[1].replace(/[^\d]/g, ""));
  return Number.isFinite(total) ? total : null;
}

function matchCatalogNamesInHtml(html, catalog) {
  const $ = load(html);
  const found = new Set();

  // First use explicit image alt/title text, which Lodestone uses heavily in
  // character collection grids.
  $("img[alt], [title]").each((_, element) => {
    const alt = cleanText($(element).attr("alt"));
    const title = cleanText($(element).attr("title"));

    if (alt) found.add(normalizeName(alt));
    if (title) found.add(normalizeName(title));
  });

  // Then use visible page text as a fallback. We only test names that exist in
  // the FFXIV Collect catalogue, which prevents nav labels/site chrome from
  // becoming false collection entries.
  const visible = normalizeName($("body").text());

  const owned = new Set();

  for (const item of catalog) {
    if (found.has(item.normalizedName)) {
      owned.add(item.normalizedName);
      continue;
    }

    // Name boundaries are intentionally loose because punctuation varies
    // slightly between Lodestone and external catalogues.
    if (
      item.normalizedName.length >= 3 &&
      visible.includes(item.normalizedName)
    ) {
      owned.add(item.normalizedName);
    }
  }

  return owned;
}


// Shared rule with Aggro's Hoard: mount/minion ownership must come from the
// exact names in Lodestone's mobile collection markup. Never fuzzy-match the
// whole page, because that can mark collectibles Aggro does not own as owned.
const GIL_LODESTONE_EXACT_CHARACTER_ID = "56132424";
const GIL_LODESTONE_MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36";

function gilExactNameKey(value = "") {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .toLocaleLowerCase("en");
}

function gilLodestoneKind(kind) {
  const value = String(kind || "").toLowerCase();
  if (value.startsWith("mount")) return "mount";
  if (value.startsWith("minion")) return "minion";
  throw new Error(`Unsupported Lodestone collection kind: ${kind}`);
}

function gilLodestoneTotal(html) {
  const $ = load(html);
  const text = String($("body").text() || "").replace(/\s+/g, " ").trim();
  const match = text.match(/\bTotal\s*:\s*([\d,]+)/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

async function fetchLodestoneOwned(kind, catalog) {
  const singular = gilLodestoneKind(kind);
  const selector = singular === "mount" ? ".mount__name" : ".minion__name";
  const url = `https://eu.finalfantasyxiv.com/lodestone/character/${GIL_LODESTONE_EXACT_CHARACTER_ID}/${singular}/`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": GIL_LODESTONE_MOBILE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = load(html);
    const totalCount = gilLodestoneTotal(html);

    const catalogueByExactName = new Map();
    for (const item of Array.isArray(catalog) ? catalog : []) {
      const key = gilExactNameKey(item?.name);
      if (key) catalogueByExactName.set(key, item);
    }

    const owned = new Set();
    const rawNames = new Set();
    const unmatched = new Set();

    $(selector).each((_, element) => {
      const rawName = String($(element).text() || "").replace(/\s+/g, " ").trim();
      if (!rawName) return;

      rawNames.add(rawName);
      const matched = catalogueByExactName.get(gilExactNameKey(rawName));

      if (matched) {
        // summarizeCategory() compares against item.normalizedName, so retain
        // that exact catalogue key rather than inventing another normalizer.
        owned.add(matched.normalizedName ?? gilExactNameKey(matched.name));
      } else {
        unmatched.add(rawName);
      }
    });

    const authoritativeCount = totalCount ?? rawNames.size;

    if (authoritativeCount > 0 && rawNames.size === 0) {
      throw new Error(
        `Lodestone reported ${authoritativeCount} ${singular}s, but ${selector} returned none`,
      );
    }

    if (unmatched.size) {
      console.warn(
        `[ffxiv-gil] ${singular}: ${unmatched.size} exact Lodestone names were not in the shopping catalogue: ${[...unmatched].join(", ")}`,
      );
    }

    if (owned.size !== authoritativeCount) {
      console.warn(
        `[ffxiv-gil] ${singular}: Lodestone says ${authoritativeCount} owned; ${owned.size} names matched the catalogue exactly. Unmatched entries will NOT be guessed.`,
      );
    }

    console.log(
      `[ffxiv-gil] ${singular}: ${owned.size} exact named ownership matches / ${authoritativeCount} owned (lodestone-mobile-exact).`,
    );

    return {
      names: owned,
      known: true,
      pageCount: 1,
      totalCount: authoritativeCount,
      source: "lodestone-mobile-exact",
    };
  } catch (error) {
    // Fail closed. If exact ownership cannot be read, do not fall back to fuzzy
    // matching and accidentally put already-owned collectibles on the wishlist.
    console.warn(
      `[ffxiv-gil] Exact ${singular} ownership unavailable: ${error.message}`,
    );

    return {
      names: new Set(),
      known: false,
      pageCount: 0,
      totalCount: null,
      source: null,
    };
  }
}

function chunks(values, size) {
  const output = [];
  for (let i = 0; i < values.length; i += size) {
    output.push(values.slice(i, i + size));
  }
  return output;
}

function marketPriceFromUniversalis(record) {
  if (!record) return null;

  const candidates = [
    record.minPriceNQ,
    record.minPrice,
    record.currentAveragePriceNQ,
    record.currentAveragePrice,
  ]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  return candidates.length ? Math.min(...candidates) : null;
}

async function fetchUniversalisPrices(itemIds) {
  const uniqueIds = [
    ...new Set(
      itemIds
        .map(Number)
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  ];

  const prices = new Map();

  // Universalis supports multiple comma-separated item IDs. Smaller batches
  // keep request URLs manageable.
  for (const batch of chunks(uniqueIds, 80)) {
    if (!batch.length) continue;

    const url =
      `https://universalis.app/api/v2/${encodeURIComponent(WORLD)}/` +
      `${batch.join(",")}?listings=1&entries=0`;

    const payload = await fetchCached(url, {
      ttl: ONE_HOUR,
      json: true,
      optional: true,
      staleFor: SEVEN_DAYS,
    });

    if (!payload) continue;

    if (payload.items && typeof payload.items === "object") {
      for (const [id, record] of Object.entries(payload.items)) {
        const price = marketPriceFromUniversalis(record);
        if (price != null) prices.set(Number(id), price);
      }
      continue;
    }

    // Single-item response fallback.
    if (batch.length === 1) {
      const price = marketPriceFromUniversalis(payload);
      if (price != null) prices.set(batch[0], price);
    }
  }

  return prices;
}

function sortByPriceThenName(a, b, field) {
  const av = a[field] ?? Number.POSITIVE_INFINITY;
  const bv = b[field] ?? Number.POSITIVE_INFINITY;
  if (av !== bv) return av - bv;
  return a.name.localeCompare(b.name, "en");
}

function decorateMarket(items, prices) {
  return items
    .map((item) => {
      const marketPrice =
        item.itemId != null ? prices.get(item.itemId) ?? null : null;

      return {
        ...item,
        marketPrice,
        marketPriceDisplay:
          marketPrice == null ? "no current listing" : `~${gil(marketPrice)}`,
        marketPriceCompact:
          marketPrice == null ? "—" : `~${compactGil(marketPrice)}`,
      };
    })
    .sort((a, b) => sortByPriceThenName(a, b, "marketPrice"));
}

function summarizeCategory({
  type,
  catalog,
  ownedNames,
  ownershipKnown,
  ownedTotalCount = null,
  manualOwned = new Set(),
  ignored = new Set(),
  prices,
}) {
  // Keep actual collection ownership separate from the shopping ignore list.
  // An ignored collectible should disappear from the shopping page, but it
  // must never be falsely counted as something Aggro owns.
  const isCollected = (item) => {
    if (type === "orchestrions") {
      return manualOwned.has(normalizeOrchestrionName(item.name));
    }

    return ownedNames.has(item.normalizedName);
  };

  const isOwned = (item) =>
    ignored.has(item.normalizedName) || isCollected(item);

  const ownedItems = ownershipKnown
    ? catalog
        .filter(isCollected)
        .sort((a, b) => a.name.localeCompare(b.name, "en"))
    : [];

  const ownedCount = ownershipKnown
    ? Math.max(ownedItems.length, Number(ownedTotalCount || 0))
    : 0;

  const buyable = catalog.filter(
    (item) =>
      item.vendorPrice != null ||
      (item.tradeable && item.itemId != null),
  );

  const missing = ownershipKnown
    ? buyable.filter((item) => !isOwned(item))
    : [];

  // Fixed-price vendor items are kept out of the MB bucket to avoid double
  // counting the shopping budget. If they are tradeable, the vendor is still
  // the deterministic price/source.
  const vendor = missing
    .filter((item) => item.vendorPrice != null)
    .sort((a, b) => sortByPriceThenName(a, b, "vendorPrice"));

  const marketBase = missing.filter(
    (item) =>
      item.vendorPrice == null &&
      item.tradeable &&
      item.itemId != null,
  );

  const market = decorateMarket(marketBase, prices);

  const vendorTotal = vendor.reduce(
    (sum, item) => sum + Number(item.vendorPrice || 0),
    0,
  );

  const marketKnown = market.filter((item) => item.marketPrice != null);
  const marketEstimate = marketKnown.reduce(
    (sum, item) => sum + Number(item.marketPrice || 0),
    0,
  );

  const marketUnknown = market.length - marketKnown.length;

  return {
    type,
    title:
      type === "mounts"
        ? "Mounts"
        : type === "minions"
          ? "Minions"
          : "Orchestrion rolls",
    icon:
      type === "mounts"
        ? "♞"
        : type === "minions"
          ? "♧"
          : "♫",
    ownershipKnown,
    ownershipMode:
      type === "orchestrions"
        ? "manual"
        : ownershipKnown
          ? "lodestone"
          : "unknown",

    catalogueCount: catalog.length,

    // Full collection fields. These intentionally count every catalogued
    // collectible Aggro owns, not only items that can be bought with gil.
    ownedCount,
    ownedItems,
    missingCatalogueCount: ownershipKnown
      ? Math.max(0, catalog.length - ownedCount)
      : null,
    catalogueCompletionPercent: ownershipKnown
      ? percent(Math.min(ownedCount, catalog.length), catalog.length)
      : 0,

    // Shopping-only fields retained for the gil page.
    buyableCount: buyable.length,
    missingCount: missing.length,
    ownedBuyableCount: Math.max(0, buyable.length - missing.length),
    completionPercent:
      buyable.length > 0
        ? percent(buyable.length - missing.length, buyable.length)
        : 0,

    vendor: {
      items: vendor,
      count: vendor.length,
      total: vendorTotal,
      totalDisplay: gil(vendorTotal),
      totalCompact: compactGil(vendorTotal),
    },

    market: {
      items: market,
      count: market.length,
      pricedCount: marketKnown.length,
      unknownCount: marketUnknown,
      estimate: marketEstimate,
      estimateDisplay:
        market.length === 0
          ? "0 gil"
          : marketKnown.length === 0
            ? "price unavailable"
            : `~${gil(marketEstimate)}`,
      estimateCompact:
        marketKnown.length === 0
          ? "—"
          : `~${compactGil(marketEstimate)}`,
      priceCoverage:
        market.length > 0
          ? percent(marketKnown.length, market.length)
          : 100,
    },

    fixedPlusMarketEstimate: vendorTotal + marketEstimate,
    fixedPlusMarketEstimateDisplay:
      `~${gil(vendorTotal + marketEstimate)}`,
  };
}

async function buildShoppingList() {
  const [mountCatalog, minionCatalog, orchestrionCatalog] = await Promise.all([
    fetchCatalog("mounts"),
    fetchCatalog("minions"),
    fetchCatalog("orchestrions"),
  ]);

  const [mountOwned, minionOwned] = await Promise.all([
    fetchLodestoneOwned("mounts", mountCatalog),
    fetchLodestoneOwned("minions", minionCatalog),
  ]);

  const ignored = new Set(ignoredCollectibles.map(normalizeName));
  const manualOrchestrions = new Set(
    ownedOrchestrions.map(normalizeOrchestrionName),
  );

  const allMarketItemIds = [
    ...mountCatalog,
    ...minionCatalog,
    ...orchestrionCatalog,
  ]
    .filter(
      (item) =>
        item.vendorPrice == null &&
        item.tradeable &&
        item.itemId != null,
    )
    .map((item) => item.itemId);

  const prices = await fetchUniversalisPrices(allMarketItemIds);

  const mounts = summarizeCategory({
    type: "mounts",
    catalog: mountCatalog,
    ownedNames: mountOwned.names,
    ownershipKnown: mountOwned.known,
    ownedTotalCount: mountOwned.totalCount,
    ignored,
    prices,
  });

  const minions = summarizeCategory({
    type: "minions",
    catalog: minionCatalog,
    ownedNames: minionOwned.names,
    ownershipKnown: minionOwned.known,
    ownedTotalCount: minionOwned.totalCount,
    ignored,
    prices,
  });

  const orchestrions = summarizeCategory({
    type: "orchestrions",
    catalog: orchestrionCatalog,
    ownedNames: new Set(),
    ownershipKnown: manualOrchestrions.size > 0,
    ownedTotalCount: manualOrchestrions.size,
    manualOwned: manualOrchestrions,
    ignored,
    prices,
  });

  const categories = [mounts, minions, orchestrions];

  const vendorTotal = categories.reduce(
    (sum, category) => sum + category.vendor.total,
    0,
  );

  const marketEstimate = categories.reduce(
    (sum, category) => sum + category.market.estimate,
    0,
  );

  const marketUnknownCount = categories.reduce(
    (sum, category) => sum + category.market.unknownCount,
    0,
  );

  const missingTotal = categories.reduce(
    (sum, category) => sum + category.missingCount,
    0,
  );

  return {
    ok: true,
    character: {
      id: CHARACTER_ID,
      name: CHARACTER_NAME,
      world: WORLD,
    },
    updatedAt: new Date().toISOString(),

    mounts,
    minions,
    orchestrions,
    categories,

    totals: {
      missing: missingTotal,
      vendor: vendorTotal,
      vendorDisplay: gil(vendorTotal),
      vendorCompact: compactGil(vendorTotal),
      marketEstimate,
      marketEstimateDisplay:
        marketEstimate > 0 ? `~${gil(marketEstimate)}` : "price unavailable",
      marketEstimateCompact:
        marketEstimate > 0 ? `~${compactGil(marketEstimate)}` : "—",
      marketUnknownCount,
      combinedEstimate: vendorTotal + marketEstimate,
      combinedEstimateDisplay:
        `~${gil(vendorTotal + marketEstimate)}`,
      combinedEstimateCompact:
        `~${compactGil(vendorTotal + marketEstimate)}`,
    },

    notes: {
      vendor:
        "Vendor totals use gil prices found in the FFXIV Collect source data.",
      market:
        `Marketboard prices are current ${WORLD} estimates from Universalis and can change.`,
      ownership:
        "Mount and minion ownership is compared with Aggro Phobic's public Lodestone collection.",
      orchestrions:
        "Orchestrion ownership is not public on Lodestone, so owned rolls are excluded using ffxivGilShoppingConfig.js.",
    },
  };
}

export default async function () {
  try {
    return await buildShoppingList();
  } catch (error) {
    console.error("[ffxiv-gil-shopping] Build failed:", error);

    const emptyCategory = (type, title, icon) => ({
      type,
      title,
      icon,
      ownershipKnown: false,
      ownershipMode: "unknown",
      catalogueCount: 0,
      ownedCount: 0,
      ownedItems: [],
      missingCatalogueCount: null,
      catalogueCompletionPercent: 0,
      buyableCount: 0,
      missingCount: 0,
      ownedBuyableCount: 0,
      completionPercent: 0,
      vendor: {
        items: [],
        count: 0,
        total: 0,
        totalDisplay: "—",
        totalCompact: "—",
      },
      market: {
        items: [],
        count: 0,
        pricedCount: 0,
        unknownCount: 0,
        estimate: 0,
        estimateDisplay: "—",
        estimateCompact: "—",
        priceCoverage: 0,
      },
      fixedPlusMarketEstimate: 0,
      fixedPlusMarketEstimateDisplay: "—",
    });

    const mounts = emptyCategory("mounts", "Mounts", "♞");
    const minions = emptyCategory("minions", "Minions", "♧");
    const orchestrions = emptyCategory(
      "orchestrions",
      "Orchestrion rolls",
      "♫",
    );

    return {
      ok: false,
      error: error.message,
      character: {
        id: CHARACTER_ID,
        name: CHARACTER_NAME,
        world: WORLD,
      },
      updatedAt: new Date().toISOString(),
      mounts,
      minions,
      orchestrions,
      categories: [mounts, minions, orchestrions],
      totals: {
        missing: 0,
        vendor: 0,
        vendorDisplay: "—",
        vendorCompact: "—",
        marketEstimate: 0,
        marketEstimateDisplay: "—",
        marketEstimateCompact: "—",
        marketUnknownCount: 0,
        combinedEstimate: 0,
        combinedEstimateDisplay: "—",
        combinedEstimateCompact: "—",
      },
      notes: {
        vendor: "",
        market: "",
        ownership: "",
        orchestrions: "",
      },
    };
  }
}
