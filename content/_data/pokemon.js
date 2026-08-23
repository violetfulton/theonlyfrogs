import fs from "node:fs";
import path from "node:path";
import EleventyFetch from "@11ty/eleventy-fetch";

const MAX_DEX = 1025;
const LOCAL_DIR = path.resolve("content/_data/pokemon.local");

const SHEET_ID = String(process.env.POKEMON_SHEET_ID || "").trim();

const SOURCES = {
  captures: {
    sheet: "Captures",
    env: "POKEMON_CAPTURES_CSV_URL",
    local: "captures.csv",
  },
  hunts: {
    sheet: "Hunts",
    env: "POKEMON_HUNTS_CSV_URL",
    local: "hunts.csv",
  },
  dexLists: {
    sheet: "Dex Lists",
    env: "POKEMON_DEX_LISTS_CSV_URL",
    local: "dex-lists.csv",
  },
  journeys: {
    sheet: "Journeys",
    env: "POKEMON_JOURNEYS_CSV_URL",
    local: "journeys.csv",
  },
  records: {
    sheet: "Records",
    env: "POKEMON_RECORDS_CSV_URL",
    local: "records.csv",
  },
  collection: {
    sheet: "Collection",
    env: "POKEMON_COLLECTION_CSV_URL",
    local: "collection.csv",
  },
};

const GENERATIONS = [
  [1, 151, "gen1", "Generation I"],
  [152, 251, "gen2", "Generation II"],
  [252, 386, "gen3", "Generation III"],
  [387, 493, "gen4", "Generation IV"],
  [494, 649, "gen5", "Generation V"],
  [650, 721, "gen6", "Generation VI"],
  [722, 809, "gen7", "Generation VII"],
  [810, 905, "gen8", "Generation VIII"],
  [906, 1025, "gen9", "Generation IX"],
];

const SPECIES_ALIASES = {
  gyrados: "gyarados",
};

function ensureString(value) {
  return String(value ?? "").trim();
}

function parseCsv(text = "") {
  const input = ensureString(text).replace(/^\uFEFF/, "");
  const rows = [];

  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);

      if (row.some((value) => ensureString(value))) {
        rows.push(row);
      }

      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);

  if (row.some((value) => ensureString(value))) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => ensureString(header));

  return rows.slice(1).map((values) => {
    const result = {};

    headers.forEach((header, index) => {
      if (!header) return;
      result[header] = ensureString(values[index]);
    });

    return result;
  });
}

function slugify(value = "") {
  return ensureString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value = "") {
  return ensureString(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferGeneration(dexNo) {
  const n = Number(dexNo);
  const match = GENERATIONS.find(([from, to]) => n >= from && n <= to);

  return match
    ? {
        key: match[2],
        label: match[3],
      }
    : {
        key: "",
        label: "",
      };
}

function shinySpriteUrl(dexNo) {
  return dexNo
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${Number(
        dexNo
      )}.png`
    : "";
}

function normalSpriteUrl(dexNo) {
  return dexNo
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${Number(
        dexNo
      )}.png`
    : "";
}

function localPath(name) {
  return path.join(LOCAL_DIR, name);
}

function readLocalFile(name) {
  const file = localPath(name);

  if (!fs.existsSync(file)) return "";

  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    console.warn(`[pokemon] Could not read ${file}: ${error.message}`);
    return "";
  }
}

function googleSheetCsvUrl(sheetName) {
  if (!SHEET_ID) return "";

  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`
  );

  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetName);

  return url.toString();
}

async function fetchCsv(url, cacheKey) {
  if (!url) return "";

  try {
    return await EleventyFetch(url, {
      duration: "15m",
      type: "text",
      directory: ".cache/pokemon",
      fetchOptions: {
        headers: {
          "user-agent": "theonlyfrogs.com pokemon data build",
        },
      },
    });
  } catch (error) {
    console.warn(`[pokemon] ${cacheKey} fetch failed: ${error.message}`);
    return "";
  }
}

async function getCsv(sourceKey) {
  const source = SOURCES[sourceKey];

  if (!source) return "";

  // Preferred:
  // one Google Sheet ID + named tabs.
  const sheetUrl = googleSheetCsvUrl(source.sheet);

  if (sheetUrl) {
    const text = await fetchCsv(sheetUrl, `${source.sheet} tab`);

    if (text) return text;
  }

  // Compatibility:
  // keep supporting your old individual CSV URLs for now.
  const legacyUrl = ensureString(process.env[source.env]);

  if (legacyUrl) {
    const text = await fetchCsv(legacyUrl, source.env);

    if (text) return text;
  }

  // Offline/local fallback.
  const local = readLocalFile(source.local);

  if (local) return local;

  console.warn(
    `[pokemon] No data source for ${source.sheet}. ` +
      `Set POKEMON_SHEET_ID or add ${localPath(source.local)}.`
  );

  return "";
}

function loadDerivedSpeciesIndex() {
  try {
    return JSON.parse(readLocalFile("species-index.json") || "{}");
  } catch (error) {
    console.warn(
      `[pokemon] species-index.json is invalid: ${error.message}`
    );

    return {};
  }
}

function loadLocalNationalDex() {
  try {
    const rows = JSON.parse(
      readLocalFile("national-dex.json") || "[]"
    );

    if (!Array.isArray(rows) || !rows.length) {
      return [];
    }

    return rows.map((pokemon) => {
      const dexNo = ensureString(pokemon.dexNo);
      const generation = inferGeneration(dexNo);

      return {
        dexNo,

        dexDisplay:
          pokemon.dexDisplay ||
          (dexNo
            ? String(dexNo).padStart(3, "0")
            : "---"),

        species: pokemon.species || "",

        speciesKey: slugify(
          pokemon.speciesKey ||
            pokemon.species ||
            ""
        ),

        generation:
          pokemon.generation ||
          generation.key,

        generationLabel:
          pokemon.generationLabel ||
          generation.label,

        normalImage:
          pokemon.normalImage ||
          normalSpriteUrl(dexNo),

        shinyImage:
          pokemon.shinyImage ||
          shinySpriteUrl(dexNo),
      };
    });
  } catch (error) {
    console.warn(
      `[pokemon] Local National Dex failed: ${error.message}`
    );

    return [];
  }
}

async function getNationalDex() {
  const local = loadLocalNationalDex();

  if (local.length >= MAX_DEX) {
    return local.slice(0, MAX_DEX);
  }

  try {
    const data = await EleventyFetch(
      `https://pokeapi.co/api/v2/pokemon-species?limit=${MAX_DEX}`,
      {
        duration: "30d",
        type: "json",
        directory: ".cache/pokemon",
      }
    );

    const results = Array.isArray(data?.results)
      ? data.results
      : [];

    if (!results.length) {
      throw new Error("PokeAPI returned no species");
    }

    return results
      .slice(0, MAX_DEX)
      .map((pokemon, index) => {
        const dexNo = index + 1;
        const generation =
          inferGeneration(dexNo);

        return {
          dexNo: String(dexNo),
          dexDisplay: String(dexNo).padStart(
            3,
            "0"
          ),

          species: titleCase(pokemon.name),
          speciesKey: slugify(pokemon.name),

          generation: generation.key,
          generationLabel:
            generation.label,

          normalImage:
            normalSpriteUrl(dexNo),

          shinyImage:
            shinySpriteUrl(dexNo),
        };
      });
  } catch (error) {
    console.warn(
      `[pokemon] National Dex fetch failed: ${error.message}`
    );

    return local;
  }
}

function cleanListValue(value) {
  const key = slugify(value);

  if (
    key === "goth-witchy" ||
    key === "goth-witchy-faves"
  ) {
    return "goth";
  }

  if (key === "pink-faves") return "pink";
  if (key === "cute-faves") return "cute";
  if (key === "frog-faves") return "frog";

  return key;
}

function truthy(value) {
  return [
    "true",
    "yes",
    "y",
    "1",
    "featured",
  ].includes(
    ensureString(value).toLowerCase()
  );
}

function dateValue(value) {
  const parsed = Date.parse(value || "");

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function sortDateDesc(a, b, key) {
  return (
    dateValue(b[key]) -
    dateValue(a[key])
  );
}

function dedupe(values) {
  return [
    ...new Set(values.filter(Boolean)),
  ];
}

export default async function () {
  const [
    capturesText,
    huntsText,
    dexListsText,
    journeysText,
    recordsText,
    collectionText,
    nationalDex,
  ] = await Promise.all([
    getCsv("captures"),
    getCsv("hunts"),
    getCsv("dexLists"),
    getCsv("journeys"),
    getCsv("records"),
    getCsv("collection"),
    getNationalDex(),
  ]);

  const derivedIndex =
    loadDerivedSpeciesIndex();

  const nationalByKey = new Map(
    nationalDex.map((pokemon) => [
      pokemon.speciesKey,
      pokemon,
    ])
  );

  function speciesMeta(species) {
    const rawKey = slugify(species);

    const canonicalKey =
      SPECIES_ALIASES[rawKey] ||
      rawKey;

    const api =
      nationalByKey.get(canonicalKey);

    const derived =
      derivedIndex[rawKey] ||
      derivedIndex[canonicalKey];

    const dexNo = ensureString(
      api?.dexNo ||
        derived?.dexNo ||
        ""
    );

    const generation =
      inferGeneration(dexNo);

    return {
      speciesKey: canonicalKey,
      dexNo,

      dexDisplay: dexNo
        ? String(dexNo).padStart(
            3,
            "0"
          )
        : "---",

      generation:
        api?.generation ||
        derived?.generation ||
        generation.key,

      generationLabel:
        api?.generationLabel ||
        derived?.generationLabel ||
        generation.label,

      normalImage:
        api?.normalImage ||
        derived?.normalImage ||
        normalSpriteUrl(dexNo),

      shinyImage:
        api?.shinyImage ||
        derived?.shinyImage ||
        shinySpriteUrl(dexNo),
    };
  }

  const captures = parseCsv(capturesText)
    .filter((row) => row.Species)
    .map((row, index) => {
      const meta = speciesMeta(
        row.Species
      );

      return {
        id: `capture-${index + 1}`,

        species: row.Species,
        form: row.Form || "",
        nickname: row.Nickname || "",

        originGame:
          row["Origin Game"] || "",

        method: row.Method || "",
        setup: row.Setup || "",
        event: row.Event || "",

        encounters:
          row.Encounters || "",

        odds: row.Odds || "",

        caughtDate:
          row["Caught Date"] || "",

        ball: row.Ball || "",
        nature: row.Nature || "",
        gender: row.Gender || "",
        ability: row.Ability || "",

        markRibbon:
          row["Mark / Ribbon"] || "",

        location: row.Location || "",

        image:
          row.Image ||
          meta.shinyImage,

        notes: row.Notes || "",

        ...meta,
      };
    })
    .sort((a, b) =>
      sortDateDesc(
        a,
        b,
        "caughtDate"
      )
    );

  const hunts = parseCsv(huntsText)
    .filter((row) => row.Species)
    .map((row, index) => ({
      id: `hunt-${index + 1}`,

      species: row.Species,
      form: row.Form || "",
      game: row.Game || "",

      status:
        row.Status || "Planned",

      method: row.Method || "",
      setup: row.Setup || "",

      started: row.Started || "",

      encounters:
        row.Encounters || "",

      location: row.Location || "",
      notes: row.Notes || "",

      ...speciesMeta(row.Species),
    }));

  const dexLists = parseCsv(
    dexListsText
  )
    .filter(
      (row) =>
        row.Species &&
        row.List
    )
    .map((row) => ({
      species: row.Species,
      form: row.Form || "",

      list:
        cleanListValue(row.List),

      note: row.Note || "",

      sort: Number(
        row.Sort || 9999
      ),

      ...speciesMeta(row.Species),
    }));

  const journeys = parseCsv(
    journeysText
  )
    .filter((row) => row.Game)
    .map((row) => ({
      game: row.Game,

      trainer:
        row.Trainer || "",

      status:
        row.Status || "",

      started:
        row.Started || "",

      finished:
        row.Finished || "",

      team: [
        row["Team 1"],
        row["Team 2"],
        row["Team 3"],
        row["Team 4"],
        row["Team 5"],
        row["Team 6"],
      ]
        .filter(Boolean)
        .map((species) => ({
          species,
          ...speciesMeta(species),
        })),

      notes: row.Notes || "",
      image: row.Image || "",
    }));

  const records = parseCsv(
    recordsText
  )
    .filter((row) => row.Title)
    .map((row) => ({
      type:
        row.Type || "Record",

      title: row.Title,
      game: row.Game || "",
      date: row.Date || "",

      description:
        row.Description || "",

      image: row.Image || "",
    }))
    .sort((a, b) =>
      sortDateDesc(a, b, "date")
    );

  const collection = parseCsv(
    collectionText
  )
    .filter((row) => row.Item)
    .map((row) => {
      const category =
        row.Category || "Other";

      const item = row.Item;
      const itemKey =
        slugify(item);

      const metadata = [];

      const addMeta = (value) => {
        const label =
          ensureString(value);

        if (!label) return;

        const key =
          slugify(label);

        if (
          !key ||
          itemKey.includes(key)
        ) {
          return;
        }

        if (
          metadata.some(
            (existing) =>
              slugify(existing) ===
              key
          )
        ) {
          return;
        }

        metadata.push(label);
      };

      if (
        slugify(category) !==
        "tcg-binder"
      ) {
        addMeta(row.Series);
      }

      addMeta(row.Platform);
      addMeta(row["Pokémon"]);

      return {
        category,
        item,

        pokemon:
          row["Pokémon"] || "",

        series:
          row.Series || "",

        platform:
          row.Platform || "",

        meta: metadata,

        notes: row.Notes || "",
        image: row.Image || "",

        featured:
          truthy(row.Featured),
      };
    });

  const collectionGroups = [];

  for (const item of collection) {
    let group =
      collectionGroups.find(
        (entry) =>
          entry.category ===
          item.category
      );

    if (!group) {
      group = {
        category: item.category,
        items: [],
      };

      collectionGroups.push(
        group
      );
    }

    group.items.push(item);
  }

  const capturedDex = new Map();

  for (const capture of captures) {
    if (!capture.dexNo) {
      continue;
    }

    const current =
      capturedDex.get(
        capture.dexNo
      ) || {
        count: 0,
        latest: null,
      };

    current.count += 1;

    if (
      !current.latest ||
      dateValue(
        capture.caughtDate
      ) >
        dateValue(
          current.latest
            .caughtDate
        )
    ) {
      current.latest =
        capture;
    }

    capturedDex.set(
      capture.dexNo,
      current
    );
  }

  const listsByDex = new Map();

  for (const entry of dexLists) {
    if (!entry.dexNo) continue;

    const existing =
      listsByDex.get(
        entry.dexNo
      ) || [];

    existing.push(entry.list);

    listsByDex.set(
      entry.dexNo,
      existing
    );
  }

  const dex = nationalDex.map(
    (pokemon) => {
      const owned =
        capturedDex.get(
          pokemon.dexNo
        );

      return {
        ...pokemon,

        caught:
          Boolean(owned),

        count:
          owned?.count || 0,

        latestCapture:
          owned?.latest || null,

        lists: dedupe(
          listsByDex.get(
            pokemon.dexNo
          ) || []
        ),
      };
    }
  );

  const unique =
    capturedDex.size;

  const latest =
    captures[0] || null;

  const activeHunts =
    hunts.filter(
      (hunt) =>
        slugify(hunt.status) ===
        "active"
    );

  const listGroups = [
    "pink",
    "cute",
    "goth",
    "frog",
  ].map((key) => ({
    key,

    label:
      key === "goth"
        ? "Goth / Witchy"
        : titleCase(key),

    entries: dexLists
      .filter(
        (entry) =>
          entry.list === key
      )
      .sort(
        (a, b) =>
          a.sort - b.sort
      ),
  }));

  const result = {
    captures,

    latest,
    recent: captures.slice(0, 8),

    hunts,
    activeHunts,

    dexLists,
    listGroups,

    journeys,
    records,

    collection,
    collectionGroups,

    dex,

    stats: {
      captures:
        captures.length,

      unique,

      dexTotal:
        nationalDex.length ||
        MAX_DEX,

      dexPercent:
        nationalDex.length
          ? Math.round(
              (unique /
                nationalDex.length) *
                1000
            ) / 10
          : 0,

      activeHunts:
        activeHunts.length,

      journeys:
        journeys.length,

      records:
        records.length,

      collection:
        collection.length,
    },
  };

  console.log(
    `[pokemon] loaded ${result.stats.captures} captures, ` +
      `${dexLists.length} dex-list entries, ` +
      `${hunts.length} hunts, ` +
      `${journeys.length} journeys, ` +
      `${records.length} records, ` +
      `${collection.length} collection items.`
  );

  if (
    !captures.length &&
    !dexLists.length &&
    !journeys.length &&
    !records.length &&
    !collection.length
  ) {
    console.warn(
      "[pokemon] WARNING: every Pokémon sheet is empty. " +
        "Check POKEMON_SHEET_ID and make sure the Google Sheet is publicly readable."
    );
  }

  return result;
}