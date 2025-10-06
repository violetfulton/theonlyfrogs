import fs from "fs/promises";
import fetch from "node-fetch";

// Your Discogs API token
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

// Path to your local JSON
const JSON_PATH = "./content/_data/musicCollection.json";

async function main() {
  // Load your existing collection
  const raw = await fs.readFile(JSON_PATH, "utf8");
  const collection = JSON.parse(raw);

  for (const cd of collection) {
    // Skip if you already have a local cover
    if (!cd.cover_image) {
      try {
        // Fetch release info from Discogs
        const res = await fetch(
          `https://api.discogs.com/releases/${cd.release_id}?token=${DISCOGS_TOKEN}`
        );
        if (!res.ok) throw new Error(`Discogs error: ${res.status}`);
        const data = await res.json();

        // Save the Discogs image URL
        if (data.images && data.images.length > 0) {
          cd.discogs_image = data.images[0].uri;
        }
      } catch (err) {
        console.error(`Failed to fetch ${cd.title}: ${err.message}`);
      }
    }
  }

  // Save updated JSON
  await fs.writeFile(JSON_PATH, JSON.stringify(collection, null, 2));
  console.log("Updated JSON with Discogs images!");
}

main();
