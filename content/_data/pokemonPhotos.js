import fs from "node:fs";
import path from "node:path";

const ROOT = "content/assets/imgs/pokemon";
const IMAGE_EXT = /\.(avif|webp|png|jpe?g|gif)$/i;

const PHYSICAL_CATEGORIES = [
  {
    key: "games",
    label: "Physical Games",
    note: "Cartridges, cases, boxes, and favourite physical game bits.",
    folder: "physical/games",
  },
  {
    key: "figures",
    label: "Figures & Plush",
    note: "Tiny Pokémon friends, display pieces, mascots, and shelf treasures.",
    folder: "physical/figures",
  },
  {
    key: "tcg",
    label: "TCG Binder",
    note: "Favourite cards, pretty art, promos, and binder highlights.",
    folder: "physical/tcg",
  },
  {
    key: "misc",
    label: "Misc Treasures",
    note: "Pins, stickers, charms, stationery, packaging, and little keepsakes.",
    folder: "physical/misc",
  },
];

const RECORD_CATEGORIES = [
  {
    key: "diplomas",
    label: "Pokédex Diplomas",
    note: "Completion screenshots, diploma screens, and dex-clear proof.",
    folder: "records/diplomas",
  },
  {
    key: "shiny-starters",
    label: "Shiny Starters",
    note: "Starter hunts, special first partners, and sparkly save-file beginnings.",
    folder: "records/shiny-starters",
  },
  {
    key: "certificates",
    label: "Certificates",
    note: "In-game certificates, awards, and completion keepsakes.",
    folder: "records/certificates",
  },
  {
    key: "ribbons",
    label: "Ribbons & Marks",
    note: "Special ribbons, marks, titles, and Pokémon achievement details.",
    folder: "records/ribbons",
  },
  {
    key: "misc",
    label: "Misc Records",
    note: "Firsts, milestones, rare moments, and miscellaneous proof-of-chaos.",
    folder: "records/misc",
  },
];

function prettifyAcronyms(text) {
  return text
    .replace(/\bTcg\b/g, "TCG")
    .replace(/\bGx\b/g, "GX")
    .replace(/\bV\b/g, "V")
    .replace(/\bDs\b/g, "DS")
    .replace(/\bGba\b/g, "GBA")
    .replace(/\bGb\b/g, "GB")
    .replace(/\bGo\b/g, "GO")
    .replace(/\bPc\b/g, "PC")
    .replace(/\bHgss\b/g, "HGSS")
    .replace(/\bFrlg\b/g, "FRLG")
    .replace(/\bLgpe\b/g, "LGPE")
    .replace(/\bSv\b/g, "SV")
    .replace(/\bXd\b/g, "XD");
}

function titleFromFilename(filename) {
  const title = path
    .basename(filename, path.extname(filename))
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return prettifyAcronyms(title);
}

function imageUrlFromFile(filePath) {
  const rel = path.relative("content", filePath).split(path.sep).join("/");
  return `/${encodeURI(rel)}`;
}

function listImages(folder) {
  const fullDir = path.resolve(ROOT, folder);

  if (!fs.existsSync(fullDir)) return [];

  return fs
    .readdirSync(fullDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) => IMAGE_EXT.test(filename))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filename) => {
      const filePath = path.join(fullDir, filename);
      const caption = titleFromFilename(filename);

      return {
        filename,
        caption,
        alt: caption,
        url: imageUrlFromFile(filePath),
      };
    });
}

export default function () {
  const physical = PHYSICAL_CATEGORIES.map((category) => ({
    ...category,
    images: listImages(category.folder),
  }));

  const records = RECORD_CATEGORIES.map((category) => ({
    ...category,
    images: listImages(category.folder),
  }));

  return {
    trainer: listImages("trainer"),
    hof: listImages("hof"),
    physical,
    physicalTotal: physical.reduce((total, category) => total + category.images.length, 0),
    records,
    recordsTotal: records.reduce((total, category) => total + category.images.length, 0),
  };
}
