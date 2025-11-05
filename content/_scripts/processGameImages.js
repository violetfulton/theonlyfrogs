/**
 * Game Cover Processor
 * 🐸 Reads final Eleventy games data (from Google Sheets)
 * 🐸 Processes ONLY new game covers
 * 🐸 Auto-matches incoming images → slugs
 * 🐸 Falls back to no-cover.png for missing ones
 */

import fs from "fs";
import path from "path";
import Image from "@11ty/eleventy-img";

// === CONFIG ===
const incomingFolder = path.resolve("content/assets/imgs/incoming");
const outputFolder = path.resolve("content/assets/imgs/games");

// 📌 After Eleventy runs, games data exists here:
const gamesDataFile = path.resolve("public/_data/games.json");

const fallbackImage = path.resolve("content/assets/imgs/no-cover.png");
const OUTPUT_WIDTH = 600;

// === CLI PLATFORM ARGUMENTS (optional) ===
// Example: node processGameImages.js "Nintendo Switch"
const argPlatforms = process.argv.slice(2);

// === HELPERS ===
const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
};

const sanitize = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const getGameRecords = () => {
  if (!fs.existsSync(gamesDataFile)) {
    console.error("❌ games.json not found. Run Eleventy build first!");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(gamesDataFile, "utf-8"));
};

// === MAIN ===
async function processGameImages() {
  ensureFolder(incomingFolder);
  ensureFolder(outputFolder);

  // 1️⃣ Load games from final Eleventy output (Google Sheets → Eleventy → here)
  const data = getGameRecords(); // [{ platform, slug, games: [] }]
  const allGames = data.flatMap(p => p.games);

  const records = argPlatforms.length
    ? allGames.filter((g) => argPlatforms.includes(g.Platform))
    : allGames;

  console.log(`🎮 Loaded ${records.length} game entries`);

  if (records.length === 0) {
    console.warn("⚠️ No matching games found. Check platform filters?");
    return;
  }

  // 2️⃣ Create slug → title map
  const slugMap = new Map(records.map((r) => [sanitize(r.Title), r.Title]));

  // 3️⃣ Determine existing covers
  const existingCovers = new Set(
    fs.existsSync(outputFolder)
      ? fs.readdirSync(outputFolder)
          .filter(f => f.endsWith(".jpg"))
          .map(f => path.basename(f, ".jpg"))
      : []
  );

  console.log(`🧠 Found ${existingCovers.size} existing covers.`);

  const processedTitles = new Set(existingCovers);

  // 4️⃣ Process incoming images
  const incomingFiles = fs.readdirSync(incomingFolder);
  console.log(`📸 Found ${incomingFiles.length} incoming file(s)`);

  for (const file of incomingFiles) {
    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      console.log(`⚠️ Skipping non-image: ${file}`);
      continue;
    }

    const base = path.basename(file, ext).toLowerCase();

    const match = Array.from(slugMap.keys()).find(
      slug =>
        base.includes(slug.slice(0, 8)) ||
        slug.includes(base.slice(0, 8).replace(/[^a-z0-9]/g, ""))
    );

    if (!match) {
      console.log(`❓ No match found for: ${file}`);
      continue;
    }

    // Already processed? skip
    if (processedTitles.has(match)) {
      console.log(`↩️ Skipping existing cover: ${match}.jpg`);
      continue;
    }

    const newName = `${match}.jpg`;
    const srcPath = path.join(incomingFolder, file);

    try {
      await Image(srcPath, {
        widths: [OUTPUT_WIDTH],
        formats: ["jpeg"],
        outputDir: outputFolder,
        filenameFormat: () => newName,
        sharpJpegOptions: {
          quality: 85,
          progressive: true,
          chromaSubsampling: "4:4:4",
        },
      });

      processedTitles.add(match);
      fs.unlinkSync(srcPath);
      console.log(`✅ Created cover: ${newName}`);
    } catch (err) {
      console.error(`❌ Failed ${file}: ${err.message}`);
    }
  }

  // 5️⃣ Add fallback for ONLY new slugs
  for (const slug of slugMap.keys()) {
    if (!processedTitles.has(slug)) {
      fs.copyFileSync(fallbackImage, path.join(outputFolder, `${slug}.jpg`));
      console.log(`🪄 Added fallback for: ${slug}.jpg`);
    }
  }

  console.log("\n✨ Done! Images processed & fallbacks applied.");
}

processGameImages().catch(console.error);
