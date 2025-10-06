import "dotenv/config";
import fetch from "@11ty/eleventy-fetch";

const DISCOGS_USERNAME = process.env.DISCOGS_USERNAME || "onlyfrogs";
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

const localImages = {
  "The Only Frogs - Sample Album": "/assets/img/sample-album.jpg",
};

export default async function () {
  const fallback = [
    {
      title: "Sample Album",
      artist: "The Only Frogs",
      year: 2000,
      image: "/assets/img/sample-album.jpg",
      userRating: 5,
    },
  ];

  if (!DISCOGS_TOKEN) return fallback;

  try {
    const url = `https://api.discogs.com/users/${DISCOGS_USERNAME}/collection/folders/0/releases?per_page=100&page=1`;

    // Cache for one day to avoid rate-limit issues
    const data = await fetch(url, {
      duration: "1d",
      type: "json",
      fetchOptions: {
        headers: {
          "User-Agent": "TheOnlyFrogsApp/1.0",
          "Authorization": `Discogs token=${DISCOGS_TOKEN}`,
        },
      },
    });

    if (!data.releases?.length) return fallback;

    const releases = data.releases.map((r) => {
      const basic = r.basic_information;
      const title = basic.title || "Untitled";
      const artist = basic.artists?.map((a) => a.name).join(", ") || "Unknown";
      const year = basic.year || "Unknown";
      const image =
        localImages[`${artist} - ${title}`] ||
        basic.cover_image ||
        "/assets/img/placeholder.jpg";

      // ✅ user rating is already inside collection data
      const userRating = r.rating?.value ?? null;

      return {
        title,
        artist,
        year,
        image,
        userRating,
      };
    });

    return releases.sort((a, b) => a.artist.localeCompare(b.artist));
  } catch (err) {
    console.error("Error fetching Discogs data:", err);
    return fallback;
  }
}
