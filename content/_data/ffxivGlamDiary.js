// A presentation layer for Aggro's wardrobe.
// Keep adding your real outfits to ffxivGlams.js; this file automatically
// handles the lookbook, favourites, archive, images and current rotation.
import wardrobe from "./ffxivGlams.js";

const text = (value) => typeof value === "string" ? value.trim() : "";
const all = Array.isArray(wardrobe.looks) ? wardrobe.looks : [];

const looks = all.map((look, index) => {
  const gear = look.gear && typeof look.gear === "object" ? look.gear : {};
  const gearEntries = Object.entries(gear)
    .filter(([, value]) => text(value) && text(value) !== "—")
    .map(([label, value]) => ({ label, value }));
  const extraPhotos = Array.isArray(look.photos) ? look.photos : [];
  const photos = [look.image, ...extraPhotos]
    .filter((url) => text(url))
    .map((url) => ({ url, alt: text(look.alt) || text(look.title) || "Aggro's glamour" }));
  const era = look.era === "current" ? "current" : "archive";
  const title = text(look.title) || `Look ${index + 1}`;
  const category = text(look.category) || "Other";
  return {
    ...look,
    id: text(look.id) || `look-${index + 1}`,
    title,
    category,
    era,
    image: text(look.image),
    alt: text(look.alt) || title,
    note: text(look.note),
    job: text(look.job),
    dyes: text(look.dyes),
    date: text(look.date),
    favourite: Boolean(look.favourite),
    photos,
    gearEntries,
    index,
    search: [title, category, text(look.job), text(look.dyes), text(look.note),
      ...gearEntries.map((entry) => entry.value)].join(" ").toLowerCase(),
  };
});

const current = looks.filter((look) => look.era === "current");
const archive = looks.filter((look) => look.era === "archive");
const featured = current.find((look) => look.featured && look.image)
  || current.find((look) => look.image)
  || looks.find((look) => look.featured && look.image)
  || looks.find((look) => look.favourite && look.image)
  || looks.find((look) => look.image)
  || null;
const categories = [...new Set(looks.map((look) => look.category))]
  .sort((a, b) => a.localeCompare(b));

export default {
  intro: wardrobe.intro,
  looks,
  current,
  archive,
  featured,
  categories,
  repeatPieces: wardrobe.repeatPieces ?? [],
  stats: {
    looks: looks.length,
    current: current.length,
    archive: archive.length,
    photographed: looks.filter((look) => look.image).length,
  },
};
