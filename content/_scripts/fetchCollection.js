import EleventyFetch from "@11ty/eleventy-fetch";
import fs from "fs/promises";
import path from "path";

const username = "onlyfrogs"; // replace with your Discogs username
const token = process.env.DISCOGS_TOKEN;
const userAgent = "MyMusicCollection/1.0";

if (!token) {
  console.error("Set your Discogs token in DISCOGS_TOKEN");
  process.exit(1);
}

const projectRoot = path.resolve(process.cwd());
const outputFile = path.join(projectRoot, "content", "_data", "musicCollection.json");

async function fetchCollection(page = 1, allReleases = []) {
  const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=100`;

  const data = await EleventyFetch(url, {
    type: "json",
    fetchOptions: {
      headers: {
        "Authorization": `Discogs token=${token}`,
        "User-Agent": userAgent
      }
    }
  });

  allReleases.push(...data.releases);

  if (page < data.pagination.pages) {
    await new Promise(r => setTimeout(r, 500));
    return fetchCollection(page + 1, allReleases);
  }

  return allReleases;
}

async function fetchReleaseDetails(releaseId) {
  const url = `https://api.discogs.com/releases/${releaseId}`;
  try {
    const details = await EleventyFetch(url, {
      type: "json",
      fetchOptions: {
        headers: {
          "Authorization": `Discogs token=${token}`,
          "User-Agent": userAgent
        }
      }
    });
    return {
      year: details.year,
      genres: details.genres || [],
      tracklist: (details.tracklist || []).map(t => ({
        position: t.position,
        title: t.title,
        duration: t.duration
      }))
    };
  } catch (err) {
    console.error("Error fetching release details:", releaseId, err);
    return {};
  }
}

async function buildCollection() {
  console.log("Fetching collection...");
  const releases = await fetchCollection();

  console.log(`Found ${releases.length} releases, enriching metadata...`);

  const enriched = [];
  for (const r of releases) {
    const releaseId = r.basic_information.id;
    const artist = r.basic_information.artists.map(a => a.name).join(", ");
    const title = r.basic_information.title;
    const format = r.basic_information.formats.map(f => f.name).join(", ");

    const details = await fetchReleaseDetails(releaseId);
    await new Promise(r => setTimeout(r, 500));

    enriched.push({
      artist,
      title,
      format,
      release_id: releaseId,
      year: details.year,
      genres: details.genres,
      tracklist: details.tracklist,
      cover_image: r.basic_information.cover_image,
      acquisition: "Purchased from local store",
      first_listened: "2025-01-01",
      memories: "Great album, reminds me of summer.",
      rating: "5/5"
    });
  }

  await fs.mkdir(path.join(projectRoot, "content", "_data"), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(enriched, null, 2), "utf8");
  console.log(`Saved enriched collection to ${outputFile}`);
}

buildCollection();
// Run with: node content/_scripts/fetchCollection.js