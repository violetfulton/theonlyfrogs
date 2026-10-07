// content/_data/playnite.js
// Playnite = tracked/library activity, not ownership.

import fs from "node:fs";
import path from "node:path";

const DEFAULT_LIBRARY_PATH = "./content/_data/playnite-library.json";

function text(value) {
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
    .replace(/^-+|-+$/g, "");
}

function normalisePlatform(name) {
  const raw = text(name).toLowerCase();

  const aliases = new Map([
    ["pc (windows)", ["Windows PC", "windowspc"]],
    ["sony playstation 5", ["PlayStation 5", "playstation5"]],
    ["sony playstation 4", ["PlayStation 4", "playstation4"]],
    ["sony playstation 3", ["PlayStation 3", "playstation3"]],
    ["sony playstation vita", ["PlayStation Vita", "playstationvita"]],
    ["nintendo switch", ["Nintendo Switch", "nintendoswitch"]],
    ["nintendo switch 2", ["Nintendo Switch 2", "nintendoswitch2"]],
    ["nintendo 3ds", ["Nintendo 3DS", "nintendo3ds"]],
    ["nintendo ds", ["Nintendo DS", "nintendods"]],
    ["nintendo gamecube", ["Nintendo GameCube", "nintendogamecube"]],
    ["game boy", ["Game Boy", "gameboy"]],
    ["game boy advance", ["Game Boy Advance", "gameboyadvance"]],
    ["wii", ["Wii", "wii"]],
    ["wii u", ["Wii U", "wiiu"]],
  ]);

  if (aliases.has(raw)) {
    const [label, platformSlug] = aliases.get(raw);
    return { name: label, slug: platformSlug };
  }

  return {
    name: text(name) || "Unknown",
    slug: slug(name) || "unknown",
  };
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

function releaseYear(value) {
  const match = text(value).match(/^(\d{4})/);
  return match?.[1] || "";
}

function makeMatchKey(title, platformSlug) {
  return `${kebab(title)}--${platformSlug}`;
}

function emptyResult(error = "") {
  return {
    games: [],
    platformGames: [],
    platforms: [],
    favouriteGames: [],
    recentlyPlayed: [],
    totalGames: 0,
    totalPlatformEntries: 0,
    totalPlaytimeSeconds: 0,
    totalPlaytime: "",
    generatedAtUtc: null,
    schemaVersion: null,
    error,
  };
}

export default function () {
  const libraryPath = path.resolve(
    process.env.PLAYNITE_LIBRARY_PATH || DEFAULT_LIBRARY_PATH
  );

  if (!fs.existsSync(libraryPath)) {
    console.warn(
      `[Playnite] No library export at ${libraryPath}. ` +
      "Copy playnite-library.json there or set PLAYNITE_LIBRARY_PATH."
    );
    return emptyResult("missing-library");
  }

  try {
    const raw = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
    const sourceGames = Array.isArray(raw?.games) ? raw.games : [];

    const games = sourceGames
      .filter((game) => !game.hidden && text(game.name))
      .map((game) => {
        const platforms = (Array.isArray(game.platforms) ? game.platforms : [])
          .map(normalisePlatform)
          .filter((platform, index, list) =>
            list.findIndex((other) => other.slug === platform.slug) === index
          );

        const playtimeSeconds = Number(game.playtimeSeconds) || 0;

        return {
          playniteId: text(game.playniteId),
          providerGameId: text(game.providerGameId),
          sourceName: text(game.sourceName) || "Unknown",
          steamAppId: game.steamAppId || null,
          steamAppIdConfidence: text(game.steamAppIdConfidence),

          title: text(game.name),
          sortingName: text(game.sortingName),
          platforms,

          genres: Array.isArray(game.genres) ? game.genres : [],
          categories: Array.isArray(game.categories) ? game.categories : [],
          tags: Array.isArray(game.tags) ? game.tags : [],

          favourite: Boolean(game.favorite),
          isInstalled: Boolean(game.isInstalled),

          playtimeSeconds,
          playtime: formatPlaytime(playtimeSeconds),
          lastActivity: text(game.lastActivity) || null,

          releaseDate: text(game.releaseDate),
          year: releaseYear(game.releaseDate),
        };
      });

    const platformGames = games.flatMap((game) => {
      const platforms = game.platforms.length
        ? game.platforms
        : [{ name: "Unknown", slug: "unknown" }];

      return platforms.map((platform) => ({
        ...game,
        platformName: platform.name,
        platformSlug: platform.slug,
        matchKey: makeMatchKey(game.title, platform.slug),
      }));
    });

    const platformMap = new Map();

    for (const game of platformGames) {
      if (!platformMap.has(game.platformSlug)) {
        platformMap.set(game.platformSlug, {
          platform: game.platformName,
          slug: game.platformSlug,
          games: [],
        });
      }
      platformMap.get(game.platformSlug).games.push(game);
    }

    const platforms = [...platformMap.values()]
      .map((platform) => ({
        ...platform,
        totalGames: platform.games.length,
      }))
      .sort((a, b) => a.platform.localeCompare(b.platform));

    const recentlyPlayed = [...games]
      .filter((game) => game.lastActivity)
      .sort((a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )
      .slice(0, 12);

    const favouriteGames = games.filter((game) => game.favourite);
    const totalPlaytimeSeconds = games.reduce(
      (sum, game) => sum + game.playtimeSeconds,
      0
    );

    console.log(
      `[Playnite] Loaded ${games.length} games / ` +
      `${platformGames.length} platform entries.`
    );

    return {
      games,
      platformGames,
      platforms,
      favouriteGames,
      recentlyPlayed,
      totalGames: games.length,
      totalPlatformEntries: platformGames.length,
      totalPlaytimeSeconds,
      totalPlaytime: formatPlaytime(totalPlaytimeSeconds),
      generatedAtUtc: raw.generatedAtUtc || null,
      schemaVersion: raw.schemaVersion ?? null,
      error: "",
    };
  } catch (error) {
    console.warn(`[Playnite] Could not read library export: ${error.message}`);
    return emptyResult(error.message);
  }
}
