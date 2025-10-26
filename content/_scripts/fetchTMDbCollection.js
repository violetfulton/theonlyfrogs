// content/_scripts/fetchTMDbCollection.js
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import { config } from "dotenv";

config();

const API_KEY = process.env.TMDB_API_KEY; // ✅ MUST be a V4 READ ACCESS TOKEN
const LIST_ID = "8567230"; // your physical list ID on TMDb

const DATA_DIR = path.join(process.cwd(), "content", "_data");
const TMDB_CACHE = path.join(DATA_DIR, "movieCollectionPhysical.json");
const MY_META_PATH = path.join(DATA_DIR, "myPhysicalMovieMeta.json");

// Ensure folder exists
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

// Load JSON file or return empty array
async function loadJSON(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return [];
  }
}

// ✅ Fetch list items from TMDb v4 (NO recommendations!)
// ✅ Fetch ALL pages of a TMDb v4 list
async function fetchAllListItems() {
  let page = 1;
  let totalPages = 1;
  let allItems = [];

  while (page <= totalPages) {
    const url = `https://api.themoviedb.org/4/list/${LIST_ID}?page=${page}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json;charset=utf-8"
      }
    });

    const data = await res.json();

    if (!data.results) break;

    allItems.push(...data.results);

    // ✅ this is the missing key previously ❗️
    totalPages = data.total_pages || 1;

    console.log(`📄 Page ${page}/${totalPages} => ${data.results.length} items`);
    page++;
  }

  console.log(`✅ Retrieved ${allItems.length} total list items from TMDb v4`);
  return allItems;
}
// Fetch movie or TV details by ID

async function fetchDetails(id, mediaType) {
  const v3key = process.env.TMDB_V3_KEY;
  if (!v3key) {
    console.error("❌ Missing TMDB_V3_KEY in .env");
    process.exit(1);
  }

  // ✅ Try movie first if no media_type provided
  const urls = [
    `https://api.themoviedb.org/3/movie/${id}?api_key=${v3key}&language=en-US`,
    `https://api.themoviedb.org/3/tv/${id}?api_key=${v3key}&language=en-US`
  ];

  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) continue;

    const data = await res.json();
    const type = data.media_type || (data.title ? "movie" : "tv");

    console.log(`${type === "movie" ? "🎬 Movie" : "📺 TV Show"}: ${data.title || data.name} (${id})`);

    return {
      tmdb_id: id,
      title: data.title || data.name,
      release_date: data.release_date || data.first_air_date,
      poster_path: data.poster_path,
      genres: data.genres || [],
      overview: data.overview || "",
      vote_average: data.vote_average,
      runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null,
      media_type: type
    };
  }

  console.warn(`❌ Failed detail on BOTH movie & tv endpoints — ID: ${id}`);
  return null;
}


async function main() {
  if (!API_KEY) {
    console.error("❌ TMDB_API_KEY (V4 access token) missing in .env");
    process.exit(1);
  }

  await ensureDir(DATA_DIR);

  const listItems = await fetchAllListItems(); // v4 list fetch

  const cache = await loadJSON(TMDB_CACHE);
  const myMeta = await loadJSON(MY_META_PATH);

  const cacheById = new Map(cache.map(m => [m.tmdb_id, m]));
  const metaById = new Map(myMeta.map(m => [m.tmdb_id, m]));

  const merged = [];

  for (const item of listItems) {
    const id = item.id;
    const mediaType = item.media_type;

    let movieData = cacheById.get(id);

    if (!movieData) {
      // ✅ Fetch details using detected media type
      const details = await fetchDetails(id, mediaType);
      if (!details) continue;
      movieData = details;

      // gentle API pacing
      await new Promise(r => setTimeout(r, 200));
    }

    // ✅ Merge or create personal metadata
    const personal = metaById.get(id);
    if (personal) {
      movieData.my_rating = personal.my_rating ?? null;
      movieData.format = personal.format ?? "DVD";
      movieData.purchased = personal.purchased ?? null;
      movieData.status = personal.status ?? "unwatched";
    } else {
      metaById.set(id, {
        tmdb_id: id,
        my_rating: null,
        format: "DVD",
        purchased: null,
        status: "unwatched"
      });
    }

    merged.push(movieData);
  }

  merged.sort((a, b) => a.title.localeCompare(b.title));

  await fs.writeFile(TMDB_CACHE, JSON.stringify(merged, null, 2));
  await fs.writeFile(MY_META_PATH, JSON.stringify([...metaById.values()], null, 2));

  console.log("✅ Sync complete!");
  console.log(`📀 Final Movie Count: ${merged.length}`);
  console.log("📁 Stored in: content/_data/");
}

main();
