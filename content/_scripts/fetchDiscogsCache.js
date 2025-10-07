import fs from "fs";
import fetch from "node-fetch";

const DISCOGS_USERNAME = process.env.DISCOGS_USERNAME || "onlyfrogs";
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const CACHE_FILE = "./content/_data/discogsCache.json";
const CACHE_TTL_HOURS = 6;

function isCacheValid() {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const stats = fs.statSync(CACHE_FILE);
  const ageHours = (Date.now() - stats.mtimeMs) / 36e5;
  return ageHours < CACHE_TTL_HOURS;
}

async function fetchDiscogsData() {
  const url = `https://api.discogs.com/users/${DISCOGS_USERNAME}/collection/folders/0/releases?per_page=100&page=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "TheOnlyFrogsApp/1.0",
      "Authorization": `Discogs token=${DISCOGS_TOKEN}`,
    },
  });

  if (!res.ok) throw new Error(`Discogs API error: ${res.status}`);
  const data = await res.json();
  return data.releases || [];
}

(async () => {
  try {
    if (isCacheValid()) {
      console.log("🧊 Using cached Discogs data");
      return;
    }

    console.log("🌐 Fetching new Discogs data...");
    const releases = await fetchDiscogsData();

    fs.writeFileSync(CACHE_FILE, JSON.stringify(releases, null, 2));
    console.log(`✅ Saved ${releases.length} Discogs releases to cache`);
  } catch (err) {
    console.error("❌ Discogs fetch failed, using existing cache if available", err);
  }
})();
