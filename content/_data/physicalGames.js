// content/_data/physicalGames.js
// Fresh physical collection. Never infer physical ownership from Playnite.

import EleventyFetch from "@11ty/eleventy-fetch";
import { parse } from "csv-parse/sync";

const CSV_URL = process.env.PHYSICAL_GAMES_CSV_URL;

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

function normalisePlatform(name) {
  const raw = text(name).toLowerCase();

  const aliases = new Map([
    ["pc", ["Windows PC", "windowspc"]],
    ["windows pc", ["Windows PC", "windowspc"]],
    ["ps5", ["PlayStation 5", "playstation5"]],
    ["playstation 5", ["PlayStation 5", "playstation5"]],
    ["ps4", ["PlayStation 4", "playstation4"]],
    ["playstation 4", ["PlayStation 4", "playstation4"]],
    ["ps3", ["PlayStation 3", "playstation3"]],
    ["playstation 3", ["PlayStation 3", "playstation3"]],
    ["ps vita", ["PlayStation Vita", "playstationvita"]],
    ["playstation vita", ["PlayStation Vita", "playstationvita"]],
    ["switch", ["Nintendo Switch", "nintendoswitch"]],
    ["nintendo switch", ["Nintendo Switch", "nintendoswitch"]],
    ["switch 2", ["Nintendo Switch 2", "nintendoswitch2"]],
    ["nintendo switch 2", ["Nintendo Switch 2", "nintendoswitch2"]],
    ["3ds", ["Nintendo 3DS", "nintendo3ds"]],
    ["nintendo 3ds", ["Nintendo 3DS", "nintendo3ds"]],
    ["ds", ["Nintendo DS", "nintendods"]],
    ["nintendo ds", ["Nintendo DS", "nintendods"]],
    ["gamecube", ["Nintendo GameCube", "nintendogamecube"]],
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
    slug: compactSlug(name) || "unknown",
  };
}

function truthy(value) {
  return ["1", "true", "yes", "y", "x", "♡", "♥"].includes(
    text(value).toLowerCase()
  );
}

function quantity(value) {
  const parsed = Number.parseInt(text(value) || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function makeMatchKey(title, platformSlug) {
  return `${kebab(title)}--${platformSlug}`;
}

function emptyResult() {
  return {
    games: [],
    totalTitles: 0,
    totalCopies: 0,
  };
}

export default async function () {
  if (!CSV_URL) {
    console.warn(
      "[Physical Games] No PHYSICAL_GAMES_CSV_URL yet; physical shelf is empty."
    );
    return emptyResult();
  }

  const csv = await EleventyFetch(CSV_URL, {
    duration: "1h",
    type: "text",
  });

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
  });

  const games = rows
    .map((row, index) => {
      const title = text(row.Title);
      const rawPlatform = text(row.Platform);

      if (!title || !rawPlatform) return null;

      const platform = normalisePlatform(rawPlatform);

      return {
        rowNumber: index + 2,
        title,
        platformName: platform.name,
        platformSlug: platform.slug,
        matchKey: makeMatchKey(title, platform.slug),

        playniteId: text(row.PlayniteID),
        edition: text(row.Edition),
        region: text(row.Region),
        packaging: text(row.Packaging),
        quantity: quantity(row.Quantity),
        favourite: truthy(row.Favourite),
        notes: text(row.Notes),
        coverOverride: text(row.CoverOverride),
      };
    })
    .filter(Boolean);

  return {
    games,
    totalTitles: games.length,
    totalCopies: games.reduce((sum, game) => sum + game.quantity, 0),
  };
}
