import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

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
  "full-odds": "Full Odds",
  methods: "Methods",
  "random-finds": "Random Finds",
  "gifts-events": "Gifts & Events",
  "safari-week": "Safari Week",
  go: "Pokémon GO",
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

function isGoRow(row) {
  const category = slugify(row.category ?? row.Category);
  const gameGroup = slugify(row.gameGroup ?? row["Game Group"]);
  const originGame = String(row.originGame ?? row["Origin Game"] ?? "").trim().toLowerCase();

  return (
    category === "go" ||
    category === "pokemon-go" ||
    gameGroup === "go" ||
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
  const category = slugify(row.category ?? row.Category);
  const generation = slugify(row.generation ?? row.Generation) || inferGenerationFromDexNo(dexNo);
  const gameGroup = slugify(row.gameGroup ?? row["Game Group"]);

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
    dexNo,
    dexDisplay: displayDexNo(dexNo),
    species: String(species).trim(),
    speciesSlug: slugify(species),
    nickname: String(row.nickname ?? row.Nickname ?? "").trim(),
    form: String(row.form ?? row.Form ?? "").trim(),
    generation,
    generationLabel: GENERATION_LABELS[generation] || generation || "Unsorted",
    gameGroup,
    category,
    categoryLabel: CATEGORY_LABELS[category] || titleCaseName(category || "unsorted"),
    originGame: String(row.originGame ?? row["Origin Game"] ?? row.game ?? row.Game ?? "").trim(),
    method: String(row.method ?? row.Method ?? "").trim(),
    encounters: String(row.encounters ?? row.Encounters ?? "").trim(),
    caughtDate: String(row.caughtDate ?? row["Caught Date"] ?? row.date ?? row.Date ?? "").trim(),
    ball: String(row.ball ?? row.Ball ?? "").trim(),
    nature: String(row.nature ?? row.Nature ?? "").trim(),
    gender: String(row.gender ?? row.Gender ?? "").trim(),
    location: String(row.location ?? row.Location ?? "").trim(),
    phase: String(row.phase ?? row.Phase ?? "").trim(),
    target: String(row.target ?? row.Target ?? "").trim(),
    mark: String(row.mark ?? row.Mark ?? row.markRibbon ?? row["Mark/Ribbon"] ?? "").trim(),
    notes: String(row.notes ?? row.Notes ?? "").trim(),
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

  return {
    captures,
    recent,
    byGeneration,
    byCategory,

    generations: Object.keys(byGeneration)
      .sort()
      .map((key) => ({
        key,
        label: GENERATION_LABELS[key] || titleCaseName(key),
        count: byGeneration[key].length,
        captures: byGeneration[key],
      })),

    categories: Object.keys(byCategory)
      .sort()
      .map((key) => ({
        key,
        label: CATEGORY_LABELS[key] || titleCaseName(key),
        count: byCategory[key].length,
        captures: byCategory[key],
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
      safariWeek: captures.filter((capture) => capture.category === "safari-week").length,
      go: captures.filter((capture) => capture.isGo).length,
      nonGo: nonGoCaptures.length,
      latest,
    },
  };
}
