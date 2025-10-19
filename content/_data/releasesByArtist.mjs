import fs from "fs";

export default function () {
  const cacheFile = "./content/_data/discogsCache.json";
  if (!fs.existsSync(cacheFile)) return {};

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const grouped = {};

    data.forEach(r => {
      const artist = r.basic_information.artists?.[0]?.name || "Unknown Artist";
      if (!grouped[artist]) grouped[artist] = [];
      grouped[artist].push({
        title: r.basic_information.title,
        year: r.basic_information.year || "N/A",
        format: r.basic_information.formats?.[0]?.name || "CD",
        image: r.basic_information.cover_image,
      });
    });

    return grouped;
  } catch (err) {
    console.error("❌ Failed to load releasesByArtist:", err);
    return {};
  }
}
