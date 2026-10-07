// content/_data/gamesOwned.js
// Combined games view for the website.
//
// Playnite = activity/library source.
// Physical sheet = physical ownership source.
//
// IMPORTANT: appearing in Playnite never implies digital or physical ownership.

import fs from "node:fs";
import playniteData from "./playnite.js";
import physicalGamesData from "./physicalGames.js";

const COVER_MANIFEST = "./content/_data/gameCovers.json";
const NO_COVER = "/assets/imgs/games/no-cover.png";

function text(value) {
  return String(value ?? "").trim();
}

function kebab(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactSlug(value) {
  return kebab(value).replace(/-/g, "");
}

function identityKey(title, platformName) {
  return `${kebab(platformName)}--${kebab(title)}`;
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

function chooseCover(game, coverManifest) {
  if (game.coverOverride) return game.coverOverride;

  const legacyKey = identityKey(game.title, game.platformName);
  const manifestCover = coverManifest[legacyKey]?.image || "";
  return manifestCover || NO_COVER;
}

function formatActivityDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatPlaytime(seconds) {
  const total = Number(seconds) || 0;
  if (total <= 0) return "";

  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function makePhysicalCopy(row) {
  return {
    format: "Physical",
    formatSlug: "physical",
    edition: row.edition,
    region: row.region,
    packaging: row.packaging,
    notes: row.notes,
    quantity: row.quantity,
  };
}

function groupPhysicalRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const groupKey = row.playniteId
      ? `id:${row.playniteId}|${row.platformSlug}`
      : `match:${row.matchKey}`;

    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(row);
  }

  return grouped;
}

function sortGames(a, b) {
  return (
    a.platformName.localeCompare(b.platformName) ||
    a.title.localeCompare(b.title)
  );
}

export default async function () {
  const playnite = playniteData();
  const physical = await physicalGamesData();
  const coverManifest = readCoverManifest();

  const physicalGroups = groupPhysicalRows(physical.games);
  const matchedPhysicalGroups = new Set();
  const games = [];

  for (const tracked of playnite.platformGames) {
    const byIdKey = tracked.playniteId
      ? `id:${tracked.playniteId}|${tracked.platformSlug}`
      : "";
    const byMatchKey = `match:${tracked.matchKey}`;

    let physicalRows = [];
    let matchedGroupKey = "";

    if (byIdKey && physicalGroups.has(byIdKey)) {
      physicalRows = physicalGroups.get(byIdKey);
      matchedGroupKey = byIdKey;
    } else if (physicalGroups.has(byMatchKey)) {
      physicalRows = physicalGroups.get(byMatchKey);
      matchedGroupKey = byMatchKey;
    }

    if (matchedGroupKey) matchedPhysicalGroups.add(matchedGroupKey);

    const copies = physicalRows.map(makePhysicalCopy);
    const physicalCopyCount = copies.reduce(
      (sum, copy) => sum + copy.quantity,
      0
    );

    const coverOverride =
      physicalRows.find((row) => row.coverOverride)?.coverOverride || "";
    const favourite =
      tracked.favourite || physicalRows.some((row) => row.favourite);

    const game = {
      ...tracked,
      favourite,
      coverOverride,
      image: "",

      trackedInPlaynite: true,
      hasActivity: Boolean(tracked.lastActivity || tracked.playtimeSeconds > 0),
      lastPlayedLabel: formatActivityDate(tracked.lastActivity),

      ownsPhysical: physicalRows.length > 0,
      physicalCopyCount,
      copies,

      ownershipLabel: physicalRows.length ? "Physical" : "Tracked",
      format: physicalRows.length ? "Physical" : "Tracked",
      formatSlug: physicalRows.length ? "physical" : "tracked",

      // Legacy compatibility while older templates disappear.
      ownsDigital: false,
      ownsBoth: false,
      copyCount: physicalCopyCount,
    };

    game.image = chooseCover(game, coverManifest);
    games.push(game);
  }

  // Physical-only games still appear even if Playnite has never seen them.
  for (const [groupKey, rows] of physicalGroups.entries()) {
    if (matchedPhysicalGroups.has(groupKey)) continue;

    const first = rows[0];
    const copies = rows.map(makePhysicalCopy);
    const physicalCopyCount = copies.reduce(
      (sum, copy) => sum + copy.quantity,
      0
    );

    const game = {
      playniteId: first.playniteId || "",
      providerGameId: "",
      sourceName: "",
      steamAppId: null,

      title: first.title,
      platformName: first.platformName,
      platformSlug: first.platformSlug,
      matchKey: first.matchKey,

      genres: [],
      categories: [],
      tags: [],
      favourite: rows.some((row) => row.favourite),
      isInstalled: false,
      playtimeSeconds: 0,
      playtime: "",
      lastActivity: null,
      lastPlayedLabel: "",
      hasActivity: false,
      releaseDate: "",
      year: "",

      trackedInPlaynite: false,
      ownsPhysical: true,
      physicalCopyCount,
      copies,

      ownershipLabel: "Physical",
      format: "Physical",
      formatSlug: "physical",
      ownsDigital: false,
      ownsBoth: false,
      copyCount: physicalCopyCount,

      coverOverride:
        rows.find((row) => row.coverOverride)?.coverOverride || "",
      image: "",
    };

    game.image = chooseCover(game, coverManifest);
    games.push(game);
  }

  games.sort(sortGames);

  const platformMap = new Map();

  for (const game of games) {
    if (!platformMap.has(game.platformSlug)) {
      platformMap.set(game.platformSlug, {
        platform: game.platformName,
        slug: game.platformSlug,
        kebabSlug: kebab(game.platformName),
        games: [],
      });
    }

    platformMap.get(game.platformSlug).games.push(game);
  }

  const platforms = [...platformMap.values()]
    .sort((a, b) => a.platform.localeCompare(b.platform))
    .map((platform) => {
      platform.games.sort((a, b) => a.title.localeCompare(b.title));
      platform.totalGames = platform.games.length;
      platform.trackedCount = platform.games.filter(
        (game) => game.trackedInPlaynite
      ).length;
      platform.playedCount = platform.games.filter(
        (game) => game.hasActivity
      ).length;
      platform.favouriteCount = platform.games.filter(
        (game) => game.favourite
      ).length;
      platform.physicalCount = platform.games.filter(
        (game) => game.ownsPhysical
      ).length;
      platform.totalPhysicalCopies = platform.games.reduce(
        (sum, game) => sum + game.physicalCopyCount,
        0
      );
      platform.totalPlaytimeSeconds = platform.games.reduce(
        (sum, game) => sum + (Number(game.playtimeSeconds) || 0),
        0
      );
      platform.totalPlaytime = formatPlaytime(platform.totalPlaytimeSeconds);
      return platform;
    });

  const physicalGames = games.filter((game) => game.ownsPhysical);
  const trackedGames = games.filter((game) => game.trackedInPlaynite);
  const playedGames = games.filter((game) => game.hasActivity);
  const favouriteGames = games.filter((game) => game.favourite);

  const currentGames = [...trackedGames]
    .filter((game) => game.lastActivity)
    .sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )
    .slice(0, 12);

  return {
    platforms,
    allGames: games,

    totalGames: games.length,
    uniqueTitles: new Set(games.map((game) => compactSlug(game.title))).size,

    trackedGames,
    trackedCount: trackedGames.length,
    playedGames,
    playedCount: playedGames.length,
    totalPlaytime: playnite.totalPlaytime,
    totalPlaytimeSeconds: playnite.totalPlaytimeSeconds,

    physicalGames,
    physicalCount: physicalGames.length,
    totalCopies: physical.totalCopies,

    favouriteGames,
    currentGames,

    // Legacy compatibility; intentionally empty because Playnite is not
    // a digital ownership source.
    digitalGames: [],
    bothGames: [],
    digitalCount: 0,
    bothCount: 0,
    completedGames: [],
    wishlistGames: [],

    playniteUpdatedAt: playnite.generatedAtUtc,
    playniteSchemaVersion: playnite.schemaVersion,

    attribution: {
      label: "Cover artwork from SteamGridDB",
      url: "https://www.steamgriddb.com/",
    },

    updatedAt: new Date().toISOString(),
  };
}
