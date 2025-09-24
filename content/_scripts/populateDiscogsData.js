import fs from "fs/promises";
import fetch from "node-fetch";

// Your Discogs API token
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

// Path to your JSON
const JSON_PATH = "./content/_data/musicCollection.json";

async function main() {
  // Load existing collection
  const raw = await fs.readFile(JSON_PATH, "utf8");
  const collection = JSON.parse(raw);

  for (const cd of collection) {
    try {
      // Fetch full release info from Discogs
      const res = await fetch(
        `https://api.discogs.com/releases/${cd.release_id}?token=${DISCOGS_TOKEN}`
      );
      if (!res.ok) throw new Error(`Discogs error: ${res.status}`);
      const data = await res.json();

      // Keep local cover_image if exists, otherwise use Discogs
      if (!cd.cover_image && data.images && data.images.length > 0) {
        cd.discogs_image = data.images[0].uri;
      }

      // Pull additional metadata
      cd.format = data.formats?.[0]?.name || cd.format || "Unknown";
      cd.year = data.year || cd.year || "Unknown";
      cd.genres = data.genres || cd.genres || [];
      cd.tracklist = data.tracklist?.map(t => ({
        position: t.position,
        title: t.title,
        duration: t.duration || ""
      })) || cd.tracklist || [];
      cd.rating = data.community?.rating?.average?.toFixed(1) || cd.rating || "";
    } catch (err) {
      console.error(`Failed to fetch ${cd.title}: ${err.message}`);
    }
  }

  // Save updated JSON
  await fs.writeFile(JSON_PATH, JSON.stringify(collection, null, 2));
  console.log("Collection JSON updated with full Discogs metadata!");
}

main();
