import fs from "node:fs";
import path from "node:path";

const OWNED_PATH = path.resolve("./content/_data/ffxivGlamOwned.json");
const CACHE_DIR = path.resolve("./.cache/ffxiv-glams");

const MIRAGE_URL =
  "https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/MirageStoreSetItem.csv";

const XIVAPI_ITEM_URL = "https://v2.xivapi.com/api/sheet/Item";

const CACHE_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const ITEM_BATCH_SIZE = 100;

const SLOT_LABELS = {
  MainHand: "Main Hand",
  OffHand: "Off Hand",
  Head: "Head",
  Body: "Body",
  Hands: "Hands",
  Legs: "Legs",
  Feet: "Feet",
  Earrings: "Earrings",
  Necklace: "Necklace",
  Bracelets: "Bracelets",
  Ring: "Ring",
};

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

function cacheIsFresh(filePath, maxAge = CACHE_AGE_MS) {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs < maxAge;
  } catch {
    return false;
  }
}

async function fetchTextWithCache(url, cacheName) {
  const cachePath = path.join(CACHE_DIR, cacheName);

  if (cacheIsFresh(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "theonlyfrogs.com FFXIV Glam Projects",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const text = await response.text();
    ensureCacheDir();
    fs.writeFileSync(cachePath, text);
    return text;
  } catch (error) {
    if (fs.existsSync(cachePath)) {
      console.warn(`[ffxiv-glams] Using stale ${cacheName}: ${error.message}`);
      return fs.readFileSync(cachePath, "utf8");
    }

    throw error;
  }
}

function parseMirageStoreCsv(csv) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return new Map();

  const headers = lines[0].split(",");
  const idIndex = headers.indexOf("#");
  const rows = new Map();

  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const outfitId = Number(cells[idIndex]);

    if (!Number.isFinite(outfitId) || outfitId <= 0) continue;

    const pieces = [];

    headers.forEach((header, index) => {
      if (header === "#") return;

      const itemId = Number(cells[index]);
      if (!Number.isFinite(itemId) || itemId <= 0) return;

      pieces.push({
        id: itemId,
        slot: header,
        slotLabel: SLOT_LABELS[header] ?? header,
      });
    });

    if (pieces.length) rows.set(outfitId, pieces);
  }

  return rows;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function xivapiAssetUrl(icon) {
  const iconPath = icon?.path_hr1 || icon?.path;
  if (!iconPath) return null;

  const params = new URLSearchParams({
    path: iconPath,
    format: "png",
  });

  return `https://v2.xivapi.com/api/asset?${params.toString()}`;
}

async function getItemMetadata(itemIds) {
  const cachePath = path.join(CACHE_DIR, "items.json");
  const cached = readJson(cachePath, { updated: 0, items: {} });
  const cacheFresh =
    cached?.updated && Date.now() - cached.updated < CACHE_AGE_MS;

  const items = cached?.items ?? {};
  const idsToFetch = cacheFresh
    ? itemIds.filter((id) => !items[String(id)])
    : itemIds;

  if (!idsToFetch.length) return items;

  try {
    for (const ids of chunk(idsToFetch, ITEM_BATCH_SIZE)) {
      const params = new URLSearchParams({
        rows: ids.join(","),
        fields: "Name,Icon,LevelEquip",
      });

      const response = await fetch(`${XIVAPI_ITEM_URL}?${params.toString()}`, {
        headers: {
          "User-Agent": "theonlyfrogs.com FFXIV Glam Projects",
        },
      });

      if (!response.ok) {
        throw new Error(`XIVAPI returned HTTP ${response.status}`);
      }

      const data = await response.json();

      for (const row of data.rows ?? []) {
        const fields = row.fields ?? {};

        items[String(row.row_id)] = {
          id: row.row_id,
          name: fields.Name || `Item #${row.row_id}`,
          level: Number(fields.LevelEquip || 0),
          icon: xivapiAssetUrl(fields.Icon),
        };
      }
    }

    writeJson(cachePath, {
      updated: Date.now(),
      items,
    });
  } catch (error) {
    if (!Object.keys(items).length) throw error;
    console.warn(`[ffxiv-glams] Using cached item metadata: ${error.message}`);
  }

  return items;
}

function commonWordPrefix(names) {
  if (!names.length) return "";

  const split = names.map((name) => name.trim().split(/\s+/));
  const shortest = Math.min(...split.map((parts) => parts.length));
  const common = [];

  for (let i = 0; i < shortest; i++) {
    const candidate = split[0][i];
    const same = split.every(
      (parts) => parts[i]?.toLowerCase() === candidate.toLowerCase()
    );

    if (!same) break;
    common.push(candidate);
  }

  return common.join(" ");
}

function deriveSetName(pieces, outfitId) {
  const names = pieces
    .map((piece) => piece.name)
    .filter((name) => name && !name.startsWith("Item #"));

  if (!names.length) return `Outfit ${outfitId}`;

  const prefix = commonWordPrefix(names);

  // A useful shared prefix is usually the actual FFXIV set name.
  if (prefix && prefix.length >= 4) return `${prefix} Set`;

  if (names.length === 1) return names[0];

  return `Outfit ${outfitId}`;
}

function expansionForLevel(level) {
  if (!level) return "Unknown";
  if (level <= 50) return "ARR";
  if (level <= 60) return "HW";
  if (level <= 70) return "SB";
  if (level <= 80) return "ShB";
  if (level <= 90) return "EW";
  return "DT";
}

function statusForMissing(missingCount) {
  if (missingCount === 0) return "complete";
  if (missingCount === 1) return "almost";
  if (missingCount === 2) return "close";
  return "project";
}

export default async function () {
  if (!fs.existsSync(OWNED_PATH)) {
    console.warn(
      "[ffxiv-glams] Missing content/_data/ffxivGlamOwned.json — returning an empty project list."
    );

    return {
      projects: [],
      stats: {
        total: 0,
        incomplete: 0,
        complete: 0,
        almost: 0,
        close: 0,
        project: 0,
        missingPieces: 0,
      },
    };
  }

  const owned = readJson(OWNED_PATH, { outfits: {}, armoires: [] });
  const storedOutfits = owned.outfits ?? {};
  const armoireIds = new Set((owned.armoires ?? []).map(Number));

  const csv = await fetchTextWithCache(MIRAGE_URL, "MirageStoreSetItem.csv");
  const mirageRows = parseMirageStoreCsv(csv);

  // A project can come from either storage system:
  // 1. an Outfit Glamour code exported in `outfits`, or
  // 2. one or more matching item IDs exported in `armoires`.
  //
  // Previously seeded this list from `outfits` only, which meant
  // Armoire-only sets could never appear on the page.
  const storedOutfitIds = new Set(
    Object.keys(storedOutfits)
      .map(Number)
      .filter(Number.isFinite)
  );

  const relevantRows = [...mirageRows.entries()]
    .filter(([outfitId, pieces]) =>
      storedOutfitIds.has(outfitId) ||
      pieces.some((piece) => armoireIds.has(piece.id))
    )
    .map(([outfitId, pieces]) => ({ outfitId, pieces }));

  const relevantItemIds = [
    ...new Set(
      relevantRows.flatMap((row) => row.pieces.map((piece) => piece.id))
    ),
  ].sort((a, b) => a - b);

  const itemMetadata = await getItemMetadata(relevantItemIds);

  const projects = relevantRows.map(({ outfitId, pieces }) => {
    const storedIds = new Set((storedOutfits[String(outfitId)] ?? []).map(Number));

    const resolvedPieces = pieces.map((piece) => {
      const meta = itemMetadata[String(piece.id)] ?? {
        id: piece.id,
        name: `Item #${piece.id}`,
        level: 0,
        icon: null,
      };

      const ownership = storedIds.has(piece.id)
        ? "outfit"
        : armoireIds.has(piece.id)
          ? "armoire"
          : "missing";

      return {
        ...piece,
        ...meta,
        ownership,
      };
    });

    const missing = resolvedPieces.filter(
      (piece) => piece.ownership === "missing"
    );
    const stored = resolvedPieces.filter(
      (piece) => piece.ownership === "outfit"
    );
    const ownedElsewhere = resolvedPieces.filter(
      (piece) => piece.ownership === "armoire"
    );

    const inOutfitStorage = storedOutfitIds.has(outfitId);
    const armoireCount = ownedElsewhere.length;
    const hasArmoire = armoireCount > 0;

    const total = resolvedPieces.length;
    const ownedAnywhere = total - missing.length;
    const percent = total ? Math.round((ownedAnywhere / total) * 100) : 0;
    const storedPercent = total
      ? Math.round((stored.length / total) * 100)
      : 0;

    const highestLevel = Math.max(
      0,
      ...resolvedPieces.map((piece) => Number(piece.level || 0))
    );

    const project = {
      id: outfitId,
      name: deriveSetName(resolvedPieces, outfitId),
      pieces: resolvedPieces,
      missing,
      stored,
      ownedElsewhere,
      total,
      ownedCount: ownedAnywhere,
      storedCount: stored.length,
      armoireCount,
      hasArmoire,
      inOutfitStorage,
      source: inOutfitStorage
        ? hasArmoire
          ? "mixed"
          : "outfit"
        : "armoire",
      missingCount: missing.length,
      percent,
      storedPercent,
      status: statusForMissing(missing.length),
      expansion: expansionForLevel(highestLevel),
      level: highestLevel,
    };

    project.searchText = [
      project.name,
      project.id,
      project.expansion,
      ...resolvedPieces.map((piece) => piece.name),
    ]
      .join(" ")
      .toLowerCase();

    return project;
  });

  projects.sort((a, b) => {
    // Incomplete first, easiest finishes first.
    if (a.missingCount === 0 && b.missingCount !== 0) return 1;
    if (b.missingCount === 0 && a.missingCount !== 0) return -1;

    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }

    return a.name.localeCompare(b.name);
  });

  const stats = {
    total: projects.length,
    incomplete: projects.filter((p) => p.missingCount > 0).length,
    complete: projects.filter((p) => p.missingCount === 0).length,
    almost: projects.filter((p) => p.missingCount === 1).length,
    close: projects.filter((p) => p.missingCount === 2).length,
    project: projects.filter((p) => p.missingCount >= 3).length,
    missingPieces: projects.reduce((sum, p) => sum + p.missingCount, 0),
  };

  return {
    projects,
    stats,
  };
}