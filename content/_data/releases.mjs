import fs from "fs";

export default function () {
  const cacheFile = "./content/_data/discogsCache.json";
  if (!fs.existsSync(cacheFile)) {
    console.warn("⚠️ Discogs cache not found, using fallback");
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    return data.map(item => ({
      title: item.basic_information.title,
      artist: item.basic_information.artists?.[0]?.name || "Unknown",
      year: item.basic_information.year || "N/A",
      format: item.basic_information.formats?.[0]?.name || "CD",
      image: item.basic_information.cover_image,
    }));
  } catch (err) {
    console.error("❌ Error reading Discogs cache:", err);
    return [];
  }
}
