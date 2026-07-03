import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

import faveShinyList, { FAVE_GROUP_LABELS } from "./pokemonFaveShinyList.js";

const SHEET_CSV_URL = process.env.SHINY_SHEET_CSV_URL || "";
const LOCAL_CSV = "content/_data/shinies.local.csv";
const MAX_DEX = 1025;

const GENERATION_LABELS = {
  gen1: "Generation I",
  gen2: "Generation II",
  gen3: "Generation III",
  gen4: "Generation IV",
  gen5: "Generation V",
  gen6: "Generation VI",
  gen7: "Generation VII",
  gen8: "Generation VIII",
  gen9: "Generation IX",
};

const CATEGORY_LABELS = {
  "target-hunts": "Target Hunts",
  "full-odds": "Full Odds",
  "random-finds": "Random Finds",
  community: "Community Events",
  "pokemon-go": "Pokémon GO",
  misc: "Misc Shinies",

  // Legacy values from the old sheet, kept so old rows still work.
  methods: "Target Hunts",
  "gifts-events": "Community Events",
  "safari-week": "Community Events",
  go: "Pokémon GO",
};

const CATEGORY_ORDER = [
  "target-hunts",
  "full-odds",
  "random-finds",
  "community",
  "pokemon-go",
  "misc",
];

const GAME_GROUP_LABELS = {
  lgpe: "Let's Go Pikachu/Eevee",
  xy: "X/Y",
  oras: "Omega Ruby/Alpha Sapphire",
  sm: "Sun/Moon",
  usum: "Ultra Sun/Ultra Moon",
  swsh: "Sword/Shield",
  bdsp: "Brilliant Diamond/Shining Pearl",
  pla: "Pokémon Legends: Arceus",
  sv: "Scarlet/Violet",
  plza: "Pokémon Legends: Z-A",
  "pokemon-go": "Pokémon GO",
  go: "Pokémon GO",
};

const METHOD_LABELS = {
  "catch-combo": "Catch Combo",
  "random-encounter": "Random Encounter",
  "soft-reset": "Soft Reset",
  "mass-outbreak": "Mass Outbreak",
  sandwich: "Sandwich",
  "tera-raid": "Tera Raid",
  "community-event": "Community Event",
  gift: "Gift",
  trade: "Trade",
  other: "Other",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = String(values[index] ?? "").trim();
    });
    return obj;
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseName(value) {
  return String(value || "")
    .split("-")
    .map((part) => {
      if (part === "f") return "♀";
      if (part === "m") return "♂";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function normaliseDexNo(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return String(Number(digits));
}

function displayDexNo(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n >= 1000 ? String(n) : String(n).padStart(3, "0");
}

function inferGenerationFromDexNo(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "unsorted";
  if (n >= 1 && n <= 151) return "gen1";
  if (n >= 152 && n <= 251) return "gen2";
  if (n >= 252 && n <= 386) return "gen3";
  if (n >= 387 && n <= 493) return "gen4";
  if (n >= 494 && n <= 649) return "gen5";
  if (n >= 650 && n <= 721) return "gen6";
  if (n >= 722 && n <= 809) return "gen7";
  if (n >= 810 && n <= 905) return "gen8";
  if (n >= 906 && n <= 1025) return "gen9";
  return "unsorted";
}

function isFalseyStatus(value) {
  return ["false", "no", "n", "private", "draft", "hidden", "0"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function isTruthy(value) {
  return ["true", "yes", "y", "1", "target", "current"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function isPublished(row) {
  const published =
    row.published ??
    row.Published ??
    row.publish ??
    row.Publish ??
    row["Publish"] ??
    "";

  const status =
    row.status ??
    row.Status ??
    row.huntStatus ??
    row["Hunt Status"] ??
    row.publishStatus ??
    row["Publish Status"] ??
    "";

  if (published && isFalseyStatus(published)) return false;

  // If a status exists, only hide obvious draft/private values.
  // Values like "Caught" should stay visible.
  if (status && isFalseyStatus(status)) return false;

  return true;
}

function normaliseGameGroup(value) {
  const raw = slugify(value);

  if (raw === "go") return "pokemon-go";
  if (raw === "pokemon-go") return "pokemon-go";

  if (
    raw === "legends-z-a" ||
    raw === "legends-za" ||
    raw === "pokemon-legends-z-a" ||
    raw === "pokemon-legends-za"
  ) {
    return "plza";
  }

  return raw;
}

function normaliseMethod(value) {
  const raw = slugify(value);

  if (raw === "tera-raids") return "tera-raid";
  if (raw === "tera-raid") return "tera-raid";
  if (raw === "community-events") return "community-event";

  return raw;
}

function normaliseCategory(row) {
  const raw = slugify(row.category ?? row.Category);
  const method = normaliseMethod(row.method ?? row.Method);
  const target = isTruthy(row.target ?? row["Target?"] ?? row.Target);

  if (raw === "go" || raw === "pokemon-go") return "pokemon-go";
  if (raw === "community-events") return "community";
  if (raw === "gifts-events") return "community";
  if (raw === "safari-week") return "community";
  if (raw === "target" || raw === "target-hunt") return "target-hunts";
  if (raw === "target-hunts") return "target-hunts";
  if (raw === "full-odds") return "full-odds";
  if (raw === "random" || raw === "random-finds") return "random-finds";
  if (raw === "misc") return "misc";

  // Old sheet value. If it was a target, put it in Target Hunts.
  // If not, most old "methods" rows were better treated as random/misc finds.
  if (raw === "methods") {
    if (target) return "target-hunts";
    if (
      method === "mass-outbreak" ||
      method === "sandwich" ||
      method === "catch-combo"
    ) {
      return "target-hunts";
    }
    return "random-finds";
  }

  return raw || "misc";
}

function isGoRow(row) {
  const category = normaliseCategory(row);
  const gameGroup = normaliseGameGroup(row.gameGroup ?? row["Game Group"]);
  const originGame = String(
    row.originGame ?? row["Origin Game"] ?? ""
  ).trim().toLowerCase();

  return (
    category === "pokemon-go" ||
    gameGroup === "pokemon-go" ||
    originGame === "pokémon go" ||
    originGame === "pokemon go"
  );
}

function shinySpriteUrl(dexNo) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${Number(dexNo)}.png`;
}

function cleanCapture(row) {
  const dexNo = normaliseDexNo(row.dexNo ?? row["Dex No"] ?? row.dex ?? row.Dex);
  const category = normaliseCategory(row);
  const generation =
    slugify(row.generation ?? row.Generation) || inferGenerationFromDexNo(dexNo);
  const gameGroup = normaliseGameGroup(row.gameGroup ?? row["Game Group"]);
  const methodRaw = String(row.method ?? row.Method ?? "").trim();
  const methodKey = normaliseMethod(methodRaw);

  const species =
    row.species ??
    row.Species ??
    row.pokemon ??
    row.Pokemon ??
    row.Pokémon ??
    "";

  const imageOverride = row.imageOverride ?? row["Image Override"] ?? "";

  return {
    published: isPublished(row),
    huntStatus: String(
      row.huntStatus ?? row["Hunt Status"] ?? row.status ?? row.Status ?? ""
    ).trim(),

    dexNo,
    dexDisplay: displayDexNo(dexNo),
    species: String(species).trim(),
    speciesSlug: slugify(species),
    nickname: String(row.nickname ?? row.Nickname ?? "").trim(),
    form: String(row.form ?? row.Form ?? "").trim(),

    generation,
    generationLabel: GENERATION_LABELS[generation] || generation || "Unsorted",

    gameGroup,
    gameGroupLabel:
      GAME_GROUP_LABELS[gameGroup] || titleCaseName(gameGroup || "unsorted"),

    category,
    categoryLabel:
      CATEGORY_LABELS[category] || titleCaseName(category || "unsorted"),

    originGame: String(
      row.originGame ?? row["Origin Game"] ?? row.game ?? row.Game ?? ""
    ).trim(),

    method: methodRaw,
    methodKey,
    methodLabel: METHOD_LABELS[methodKey] || methodRaw || titleCaseName(methodKey),

    eventName: String(row.eventName ?? row["Event Name"] ?? "").trim(),

    encounters: String(row.encounters ?? row.Encounters ?? "").trim(),
    odds: String(row.odds ?? row.Odds ?? "").trim(),
    caughtDate: String(
      row.caughtDate ?? row["Caught Date"] ?? row.date ?? row.Date ?? ""
    ).trim(),

    ball: String(row.ball ?? row.Ball ?? "").trim(),
    nature: String(row.nature ?? row.Nature ?? "").trim(),
    gender: String(row.gender ?? row.Gender ?? "").trim(),
    ability: String(row.ability ?? row.Ability ?? "").trim(),
    location: String(row.location ?? row.Location ?? "").trim(),
    phase: String(row.phase ?? row.Phase ?? "").trim(),

    target: String(row.target ?? row["Target?"] ?? row.Target ?? "").trim(),
    isTarget: isTruthy(row.target ?? row["Target?"] ?? row.Target),

    currentHunt: String(
      row.currentHunt ?? row["Current Hunt?"] ?? row["Current Hunt"] ?? ""
    ).trim(),
    isCurrentHunt: isTruthy(
      row.currentHunt ?? row["Current Hunt?"] ?? row["Current Hunt"]
    ),

    mark: String(row.mark ?? row.Mark ?? row.markRibbon ?? row["Mark/Ribbon"] ?? "").trim(),
    notes: String(row.notes ?? row.Notes ?? "").trim(),

    eleventySlug: String(row.eleventySlug ?? row["Eleventy Slug"] ?? "").trim(),
    spriteKey: String(row.spriteKey ?? row["Sprite Key"] ?? "").trim(),

    image: imageOverride || (dexNo ? shinySpriteUrl(dexNo) : ""),
    isGo: false,
  };
}

function sortByDateDesc(a, b) {
  const ad = Date.parse(a.caughtDate || "1900-01-01");
  const bd = Date.parse(b.caughtDate || "1900-01-01");
  return bd - ad;
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key] || "unsorted";
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {});
}

function sortCategoryKeys(a, b) {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);

  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;

  return a.localeCompare(b);
}

/**
 * Favourite sparkle helpers.
 * These let the faves page be generated from your master shiny log
 * without adding tags to every row in the sheet.
 */
function normaliseFaveName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/♀/g, " female")
    .replace(/♂/g, " male")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function faveNameCandidates(item) {
  const species = normaliseFaveName(item.species);
  const form = normaliseFaveName(item.form);

  return new Set(
    [
      species,
      form ? `${form} ${species}` : "",
      form ? `${species} ${form}` : "",
    ].filter(Boolean)
  );
}

function captureMatchesFave(capture, fave) {
  const captureCandidates = faveNameCandidates(capture);
  const faveCandidates = faveNameCandidates(fave);

  const nameMatches = [...faveCandidates].some((name) =>
    captureCandidates.has(name)
  );

  if (!nameMatches) return false;

  // If the fave asks for a specific form, try to match form more carefully.
  if (fave.form) {
    const captureForm = normaliseFaveName(capture.form);
    const faveForm = normaliseFaveName(fave.form);
    const captureSpecies = normaliseFaveName(capture.species);
    const faveSpecies = normaliseFaveName(fave.species);

    return (
      captureForm === faveForm ||
      captureSpecies === normaliseFaveName(`${fave.form} ${fave.species}`) ||
      captureSpecies === faveSpecies
    );
  }

  return true;
}

function dexEntryMatchesFave(pokemon, fave) {
  if (fave.dexNo && String(Number(fave.dexNo)) === String(Number(pokemon.dexNo))) {
    return true;
  }

  return normaliseFaveName(pokemon.species) === normaliseFaveName(fave.species);
}

function buildFaveShinyData(captures, livingDex) {
  const decorated = faveShinyList.map((fave, index) => {
    const matchingCaptures = captures
      .filter((capture) => captureMatchesFave(capture, fave))
      .sort(sortByDateDesc);

    const firstCatch = matchingCaptures[0] || null;
    const dexEntry = livingDex.find((pokemon) => dexEntryMatchesFave(pokemon, fave));

    return {
      ...fave,
      key: `${slugify(fave.species)}-${slugify(fave.form || fave.group || index)}`,
      groupLabel:
        FAVE_GROUP_LABELS[fave.group] || titleCaseName(fave.group || "faves"),
      caught: Boolean(firstCatch),
      count: matchingCaptures.length,
      captures: matchingCaptures,
      firstCatch,
      dexEntry: dexEntry || null,
      image: firstCatch?.image || fave.image || dexEntry?.image || "",
      dexDisplay:
        firstCatch?.dexDisplay || dexEntry?.dexDisplay || displayDexNo(fave.dexNo),
    };
  });

  const caught = decorated.filter((fave) => fave.caught);
  const missing = decorated.filter((fave) => !fave.caught);
  const byGroup = groupBy(decorated, "group");

  return {
    all: decorated,
    caught,
    missing,
    byGroup,
    groups: Object.keys(byGroup).map((key) => ({
      key,
      label: FAVE_GROUP_LABELS[key] || titleCaseName(key),
      count: byGroup[key].length,
      caught: byGroup[key].filter((fave) => fave.caught).length,
      missing: byGroup[key].filter((fave) => !fave.caught).length,
      faves: byGroup[key],
    })),

    counts: {
      all: decorated.length,
      caught: caught.length,
      missing: missing.length,
    },
  };
}

async function getCsvText() {
  if (SHEET_CSV_URL) {
    return EleventyFetch(SHEET_CSV_URL, {
      duration: "1h",
      type: "text",
    });
  }

  const localPath = path.resolve(LOCAL_CSV);
  if (!fs.existsSync(localPath)) return "";
  return fs.readFileSync(localPath, "utf8");
}

async function getNationalDexSpecies() {
  try {
    const data = await EleventyFetch(
      `https://pokeapi.co/api/v2/pokemon-species?limit=${MAX_DEX}`,
      {
        duration: "30d",
        type: "json",
      }
    );

    return data.results.map((pokemon, index) => {
      const dexNo = index + 1;
      return {
        dexNo: String(dexNo),
        dexDisplay: displayDexNo(dexNo),
        species: titleCaseName(pokemon.name),
        speciesSlug: slugify(pokemon.name),
        image: shinySpriteUrl(dexNo),
      };
    });
  } catch (error) {
    console.warn("[pokemonShinies] PokéAPI species fetch failed; using fallback names.");

    return Array.from({ length: MAX_DEX }, (_, index) => {
      const dexNo = index + 1;
      return {
        dexNo: String(dexNo),
        dexDisplay: displayDexNo(dexNo),
        species: `Pokémon #${displayDexNo(dexNo)}`,
        speciesSlug: `pokemon-${dexNo}`,
        image: shinySpriteUrl(dexNo),
      };
    });
  }
}

export default async function () {
  const csvText = await getCsvText();
  const rawRows = parseCsv(csvText);

  const captures = rawRows
    .map((row) => {
      const capture = cleanCapture(row);
      capture.isGo = isGoRow(row);
      return capture;
    })
    .filter((capture) => capture.published)
    .filter((capture) => capture.dexNo && capture.species)
    .sort(sortByDateDesc);

  const recent = captures.slice(0, 8);
  const latest = recent[0] || null;

  const byGeneration = groupBy(captures, "generation");
  const byCategory = groupBy(captures, "category");
  const byGameGroup = groupBy(captures, "gameGroup");
  const byMethod = groupBy(captures, "methodKey");

  const nonGoCaptures = captures.filter((capture) => !capture.isGo);
  const caughtByDex = new Map();

  for (const capture of nonGoCaptures) {
    if (!caughtByDex.has(capture.dexNo)) {
      caughtByDex.set(capture.dexNo, {
        firstCatch: capture,
        count: 0,
      });
    }

    caughtByDex.get(capture.dexNo).count++;
  }

  const nationalDex = await getNationalDexSpecies();

  const livingDex = nationalDex.map((pokemon) => {
    const caughtInfo = caughtByDex.get(pokemon.dexNo);
    const caught = Boolean(caughtInfo);

    return {
      ...pokemon,
      caught,
      sourceCount: caughtInfo?.count || 0,
      firstCatch: caughtInfo?.firstCatch || null,
    };
  });

  const livingDexCaught = livingDex.filter((pokemon) => pokemon.caught).length;
  const livingDexTotal = livingDex.length;
  const livingDexPercent = livingDexTotal
    ? Math.round((livingDexCaught / livingDexTotal) * 1000) / 10
    : 0;

  const faves = buildFaveShinyData(captures, livingDex);

  return {
    captures,
    recent,
    byGeneration,
    byCategory,
    byGameGroup,
    byMethod,
    faves,

    generations: Object.keys(byGeneration)
      .sort()
      .map((key) => ({
        key,
        label: GENERATION_LABELS[key] || titleCaseName(key),
        count: byGeneration[key].length,
        captures: byGeneration[key],
      })),

    categories: Object.keys(byCategory)
      .sort(sortCategoryKeys)
      .map((key) => ({
        key,
        label: CATEGORY_LABELS[key] || titleCaseName(key),
        count: byCategory[key].length,
        captures: byCategory[key],
      })),

    gameGroups: Object.keys(byGameGroup)
      .sort()
      .map((key) => ({
        key,
        label: GAME_GROUP_LABELS[key] || titleCaseName(key),
        count: byGameGroup[key].length,
        captures: byGameGroup[key],
      })),

    methods: Object.keys(byMethod)
      .sort()
      .map((key) => ({
        key,
        label: METHOD_LABELS[key] || titleCaseName(key),
        count: byMethod[key].length,
        captures: byMethod[key],
      })),

    livingDex,
    livingDexStats: {
      caught: livingDexCaught,
      total: livingDexTotal,
      percent: livingDexPercent,
      missing: livingDexTotal - livingDexCaught,
    },

    stats: {
      total: captures.length,
      unique: new Set(captures.map((capture) => capture.dexNo)).size,
      targetHunts: captures.filter((capture) => capture.category === "target-hunts").length,
      fullOdds: captures.filter((capture) => capture.category === "full-odds").length,
      randomFinds: captures.filter((capture) => capture.category === "random-finds").length,
      community: captures.filter((capture) => capture.category === "community").length,
      go: captures.filter((capture) => capture.isGo).length,
      nonGo: nonGoCaptures.length,
      currentHunts: captures.filter((capture) => capture.isCurrentHunt).length,

      // Legacy value kept so older templates do not crash.
      safariWeek: 0,

      latest,
    },
  };
}