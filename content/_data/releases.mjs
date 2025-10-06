
import "dotenv/config";
import fetch from "node-fetch";

// Map albums to local images if needed
const localImages = {
  "The Only Frogs - Sample Album": "/assets/img/sample-album.jpg",
};

// Discogs credentials
const DISCOGS_USERNAME = process.env.DISCOGS_USERNAME || "onlyfrogs";
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

export default async function () {
  // Fallback for local testing
  const fallback = [
    {
      title: "Sample Album",
      artist: "The Only Frogs",
      year: 2000,
      image: "/assets/img/sample-album.jpg"
    }
  ];

  if (!DISCOGS_TOKEN) return fallback;

  const url = `https://api.discogs.com/users/${DISCOGS_USERNAME}/collection/folders/0/releases?per_page=100&page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TheOnlyFrogsApp/1.0",
        "Authorization": `Discogs token=${DISCOGS_TOKEN}`
      }
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    if (!data.releases || !data.releases.length) return fallback;

    return data.releases.map(r => {
      const title = r.basic_information.title || "Untitled";
      const artist = r.basic_information.artists?.map(a => a.name).join(", ") || "Unknown";
      const year = r.basic_information.year || "Unknown";

      const image =
        localImages[`${artist} - ${title}`] ||
        r.basic_information.cover_image ||
        "/assets/img/placeholder.jpg";

      return { title, artist, year, image };
    }).sort((a, b) => a.artist.localeCompare(b.artist));

  } catch (err) {
    console.error("Error fetching Discogs data:", err);
    return fallback;
  }
}
