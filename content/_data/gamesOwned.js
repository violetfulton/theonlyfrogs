// content/_data/gamesOwned.js
// The published Google Sheet is the source of truth for collection data.
// SteamGridDB is used only for locally cached cover artwork via gameCovers.json.

import fs from "node:fs";
import EleventyFetch from "@11ty/eleventy-fetch";
import { parse } from "csv-parse/sync";

const GAMES_CSV_URL = process.env.GAMES_CSV_URL;
const COVER_MANIFEST = "./content/_data/gameCovers.json";
const NO_COVER = "/assets/imgs/games/no-cover.png";

function text(value) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function slug(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function kebab(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function getField(row, names, fallback = "") {
  if (!row || typeof row !== "object") return fallback;

  const lookup = new Map(
    Object.entries(row).map(([key, value]) => [text(key).toLowerCase(), value])
  );

  for (const name of names) {
    const value = lookup.get(text(name).toLowerCase());
    if (value !== undefined && value !== null && text(value) !== "") {
      return text(value);
    }
  }

  return fallback;
}

function getTitle(row) {
  return getField(row, ["Title", "Name", "Game"]);
}

function getPlatform(row) {
  return getField(row, ["Platform", "Console", "System"], "Unknown");
}

function getFormat(row) {
  return getField(row, ["Format"], "Unknown");
}

function getStatus(row) {
  return getField(row, ["Status"], "Owned");
}
function isDlcRow(row) {
  const type = getField(row, ["Type"]).toLowerCase();
  return type.includes("dlc") || type.includes("expansion");
}

function getOwnedDlc(row) {
  return getField(row, ["Owned DLC / Extras", "OwnedDLC", "Owned DLC", "DLC / Extras"]);
}

function getQuantity(row) {
  const value = Number.parseInt(getField(row, ["Quantity", "Qty", "Copies"], "1"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function truthy(value) {
  return ["1", "true", "yes", "y", "x", "♡", "♥", "favourite", "favorite"].includes(
    text(value).toLowerCase()
  );
}

function identityKey(title, platform) {
  return `${kebab(platform)}--${kebab(title)}`;
}

function readCoverManifest() {
  if (!fs.existsSync(COVER_MANIFEST)) return {};

  try {
    return JSON.parse(fs.readFileSync(COVER_MANIFEST, "utf8"));
  } catch (error) {
    console.warn(`[Games] Could not read ${COVER_MANIFEST}: ${error.message}`);
    return {};
  }
}

function normaliseFormat(format) {
  const raw = text(format).toLowerCase();

  if (raw.includes("physical") || raw.includes("disc") || raw.includes("cartridge") || raw.includes("cart")) {
    return "physical";
  }

  if (raw.includes("digital") || raw.includes("download") || raw.includes("eshop") || raw.includes("steam")) {
    return "digital";
  }

  return slug(format) || "unknown";
}

function normaliseStatus(status) {
  return slug(status || "Owned") || "owned";
}

function statusPriority(statusSlug) {
  const priorities = new Map([
    ["playing", 100],
    ["currentlyplaying", 100],
    ["current", 100],
    ["inprogress", 95],
    ["replaying", 92],
    ["played", 85],
    ["completed", 80],
    ["beaten", 80],
    ["backlog", 50],
    ["wishlist", 40],
    ["dropped", 30],
    ["owned", 10],
  ]);

  return priorities.get(statusSlug) ?? 20;
}

function firstNonEmpty(row, names) {
  return getField(row, names, "");
}

function makeCopy(row, rowNumber) {
  const format = getFormat(row);
  const status = getStatus(row);

  return {
    rowNumber,
    format,
    formatSlug: normaliseFormat(format),
    ownership: getField(row, ["Ownership"]),
    status,
    statusSlug: normaliseStatus(status),
    completion: getField(row, ["Completion", "Progress"]),
    storefront: getField(row, ["Storefront", "Store", "Shop"]),
    edition: getField(row, ["Edition", "Version"]),
    region: getField(row, ["Region"]),
    type: getField(row, ["Type"]),
    playtime: getField(row, ["Playtime"]),
    completionDate: getField(row, ["CompletionDate"]),
    notes: getField(row, ["Notes", "Note"]),
    quantity: getQuantity(row),
  };
}

function copyFingerprint(copy) {
  return [
    copy.formatSlug,
    slug(copy.ownership),
    slug(copy.status),
    slug(copy.completion),
    slug(copy.storefront),
    slug(copy.edition),
    slug(copy.region),
    slug(copy.type),
    slug(copy.playtime),
    slug(copy.completionDate),
    slug(copy.notes),
  ].join("|");
}

function mergeExactCopies(copies) {
  const merged = new Map();

  for (const copy of copies) {
    const key = copyFingerprint(copy);

    if (!merged.has(key)) {
      merged.set(key, { ...copy });
      continue;
    }

    // An identical repeated row is assumed to be an accidental spreadsheet duplicate.
    // Genuine identical duplicates should use Quantity > 1 on a single row.
    const existing = merged.get(key);
    existing.quantity = Math.max(existing.quantity, copy.quantity);
  }

  return [...merged.values()];
}

function chooseStatus(copies) {
  return [...copies]
    .sort((a, b) => statusPriority(b.statusSlug) - statusPriority(a.statusSlug))[0]?.status ?? "Owned";
}

function incrementCount(target, label, amount = 1) {
  const clean = text(label) || "Unknown";
  const key = slug(clean) || "unknown";

  if (!target[key]) target[key] = { label: clean, count: 0 };
  target[key].count += amount;
}

function countList(counts) {
  return Object.values(counts).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

function emptyResult() {
  return {
    platforms: [],
    allGames: [],
    totalRows: 0,
    totalGames: 0,
    totalCopies: 0,
    uniqueTitles: 0,
    physicalGames: [],
    digitalGames: [],
    bothGames: [],
    currentGames: [],
    completedGames: [],
    wishlistGames: [],
    favouriteGames: [],
    physicalCount: 0,
    digitalCount: 0,
    bothCount: 0,
    attribution: {
      label: "Cover artwork from SteamGridDB",
      url: "https://www.steamgriddb.com/",
    },
  };
}

export default async function () {
  if (!GAMES_CSV_URL) {
    console.warn("[Games] Missing GAMES_CSV_URL.");
    return emptyResult();
  }

  const csv = await EleventyFetch(GAMES_CSV_URL, {
    duration: "1h",
    type: "text",
  });

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
  }).filter((row) => getTitle(row) && !isDlcRow(row));

  const coverManifest = readCoverManifest();
  const grouped = new Map();

  rows.forEach((row, index) => {
    const title = getTitle(row);
    const platformName = getPlatform(row);
    const key = identityKey(title, platformName);

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        title,
        platformName,
        platformSlug: slug(platformName),
        platformKebabSlug: kebab(platformName),
        favourite: false,
        coverOverride: "",
        steamGridDbId: "",
        releaseDate: "",
        year: "",
        rating: "",
        tags: "",
        ownedDlc: [],
        copies: [],
      });
    }

    const game = grouped.get(key);
    game.copies.push(makeCopy(row, index + 2));

    if (truthy(getField(row, ["Favourite", "Favorite", "Fav", "Starred"]))) {
      game.favourite = true;
    }

    const coverOverride = getField(row, ["CoverOverride", "ImageOverride", "Image", "Cover"]);
    if (coverOverride && !game.coverOverride) game.coverOverride = coverOverride;

    const steamGridDbId = getField(row, ["SteamGridDBID", "SteamGridDBId", "SGDBID", "SGDBId"]);
    if (steamGridDbId && !game.steamGridDbId) game.steamGridDbId = steamGridDbId;

    const releaseDate = firstNonEmpty(row, ["ReleaseDate"]);
    if (releaseDate && !game.releaseDate) {
      game.releaseDate = releaseDate;
      game.year = releaseDate.slice(0, 4);
    }

    const rating = firstNonEmpty(row, ["Rating"]);
    if (rating && !game.rating) game.rating = rating;

    const tags = firstNonEmpty(row, ["Tags"]);
    if (tags && !game.tags) game.tags = tags;

    const ownedDlc = getOwnedDlc(row);
    if (ownedDlc) {
      ownedDlc
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          if (!game.ownedDlc.includes(item)) game.ownedDlc.push(item);
        });
    }
  });

  const games = [];

  for (const game of grouped.values()) {
    game.copies = mergeExactCopies(game.copies);

    const manifestCover = coverManifest[game.key]?.image || "";
    game.image = game.coverOverride || manifestCover || NO_COVER;
    game.coverSource = game.coverOverride
      ? "override"
      : manifestCover
        ? "steamgriddb"
        : "placeholder";

    game.copyCount = game.copies.reduce((sum, copy) => sum + copy.quantity, 0);
    game.ownsPhysical = game.copies.some((copy) => copy.formatSlug === "physical");
    game.ownsDigital = game.copies.some((copy) => copy.formatSlug === "digital");
    game.ownsBoth = game.ownsPhysical && game.ownsDigital;

    game.ownershipLabel = game.ownsBoth
      ? "Physical + Digital"
      : game.ownsPhysical
        ? "Physical"
        : game.ownsDigital
          ? "Digital"
          : "Owned";

    game.status = chooseStatus(game.copies);
    game.statusSlug = normaliseStatus(game.status);
    game.format = game.ownershipLabel;
    game.formatSlug = game.ownsBoth
      ? "both"
      : game.ownsPhysical
        ? "physical"
        : game.ownsDigital
          ? "digital"
          : "owned";

    games.push(game);
  }

  games.sort((a, b) =>
    a.platformName.localeCompare(b.platformName) || a.title.localeCompare(b.title)
  );

  const platformMap = new Map();
  const formatCounts = {};
  const statusCounts = {};

  for (const game of games) {
    if (!platformMap.has(game.platformSlug)) {
      platformMap.set(game.platformSlug, {
        platform: game.platformName,
        slug: game.platformSlug,
        kebabSlug: game.platformKebabSlug,
        games: [],
      });
    }

    platformMap.get(game.platformSlug).games.push(game);
    incrementCount(formatCounts, game.ownershipLabel);
    incrementCount(statusCounts, game.status);
  }

  const platforms = [...platformMap.values()]
    .sort((a, b) => a.platform.localeCompare(b.platform))
    .map((platform) => {
      platform.games.sort((a, b) => a.title.localeCompare(b.title));
      platform.totalGames = platform.games.length;
      platform.totalCopies = platform.games.reduce((sum, game) => sum + game.copyCount, 0);
      platform.physicalGames = platform.games.filter((game) => game.ownsPhysical);
      platform.digitalGames = platform.games.filter((game) => game.ownsDigital);
      platform.bothGames = platform.games.filter((game) => game.ownsBoth);
      platform.physicalCount = platform.physicalGames.length;
      platform.digitalCount = platform.digitalGames.length;
      platform.bothCount = platform.bothGames.length;
      return platform;
    });

  const physicalGames = games.filter((game) => game.ownsPhysical);
  const digitalGames = games.filter((game) => game.ownsDigital);
  const bothGames = games.filter((game) => game.ownsBoth);
  const favouriteGames = games.filter((game) => game.favourite);
  const currentGames = games.filter((game) =>
    ["playing", "currentlyplaying", "current", "inprogress", "replaying"].includes(game.statusSlug)
  );
  const completedGames = games.filter((game) =>
    ["completed", "beaten"].includes(game.statusSlug)
  );
  const wishlistGames = games.filter((game) => game.statusSlug === "wishlist");

  return {
    platforms,
    allGames: games,
    totalRows: rows.length,
    totalGames: games.length,
    uniqueTitles: games.length,
    totalCopies: games.reduce((sum, game) => sum + game.copyCount, 0),

    physicalGames,
    digitalGames,
    bothGames,
    favouriteGames,
    currentGames,
    completedGames,
    wishlistGames,

    physicalCount: physicalGames.length,
    digitalCount: digitalGames.length,
    bothCount: bothGames.length,

    formatCounts,
    formatCountsList: countList(formatCounts),
    statusCounts,
    statusCountsList: countList(statusCounts),

    attribution: {
      label: "Cover artwork from SteamGridDB",
      url: "https://www.steamgriddb.com/",
    },

    updatedAt: new Date().toISOString(),
  };
}
