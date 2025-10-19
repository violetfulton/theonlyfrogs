import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import Image from "@11ty/eleventy-img";

// === CONFIG ===
const incomingFolder = path.resolve("content/assets/imgs/incoming");
const outputFolder = path.resolve("content/assets/imgs/games");
const gamesDataFile = path.resolve("content/_data/games.csv"); // or .json
const fallbackImage = path.resolve("content/assets/imgs/no-cover.png");
const OUTPUT_WIDTH = 600;

// === CLI PLATFORM ARGUMENTS ===
// Example: node content/_scripts/processGameImages.js "Nintendo DS" "Nintendo 3DS"
const argPlatforms = process.argv.slice(2);
const PLATFORMS_ALLOWED =
  argPlatforms.length > 0 ? argPlatforms : ["Nintendo DS", "Nintendo 3DS"];

// === HELPERS ===
const sanitize = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
};

const getGameRecords = () => {
  if (!fs.existsSync(gamesDataFile)) {
    console.error("❌ Game data file not found:", gamesDataFile);
    process.exit(1);
  }

  if (gamesDataFile.endsWith(".csv")) {
    const csvData = fs.readFileSync(gamesDataFile, "utf-8");
    return parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });
  } else if (gamesDataFile.endsWith(".json")) {
    return JSON.parse(fs.readFileSync(gamesDataFile, "utf-8"));
  } else {
    throw new Error("Unsupported data file type.");
  }
};

// === MAIN ===
async function processGameImages() {
  ensureFolder(incomingFolder);
  ensureFolder(outputFolder);

  // 1️⃣ Load & filter by platform
  const records = getGameRecords().filter((r) =>
    PLATFORMS_ALLOWED.includes(r.Platform)
  );

  console.log(
    `🎮 Loaded ${records.length} records for platforms: ${PLATFORMS_ALLOWED.join(
      ", "
    )}`
  );

  if (records.length === 0) {
    console.warn("⚠️ No games found for these platforms. Check your CSV!");
    return;
  }

  // 2️⃣ Create slug → title map
  const slugMap = new Map(records.map((r) => [sanitize(r.Title), r.Title]));
  const incomingFiles = fs.readdirSync(incomingFolder);

  if (incomingFiles.length === 0) {
    console.log("📂 No new files found in incoming folder.");
  }

  console.log(`📸 Found ${incomingFiles.length} file(s) in incoming folder:`);

  // 3️⃣ Keep track of which titles got covers
  const processedTitles = new Set();

  // 4️⃣ Process incoming files
  for (const file of incomingFiles) {
    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      console.log(`⚠️ Skipping non-image file: ${file}`);
      continue;
    }

    const base = path.basename(file, ext).toLowerCase();

    // Try to find a slug match based on partial name
    const match = Array.from(slugMap.keys()).find(
      (slug) =>
        base.includes(slug.slice(0, 8)) ||
        slug.includes(base.slice(0, 8).replace(/[^a-z0-9]/g, ""))
    );

    if (!match) {
      console.log(`❓ No match found for: ${file}`);
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
      console.log(`✅ Processed cover: ${newName}`);
    } catch (err) {
      console.error(`❌ Failed to process ${file}: ${err.message}`);
    }
  }

  // 5️⃣ For any titles missing covers, create a fallback image
  for (const slug of slugMap.keys()) {
    if (processedTitles.has(slug)) continue;

    const outputPath = path.join(outputFolder, `${slug}.jpg`);

    if (!fs.existsSync(outputPath)) {
      fs.copyFileSync(fallbackImage, outputPath);
      console.log(`🪄 Added fallback cover: ${slug}.jpg`);
    }
  }

  console.log("\n✨ Game images processed — missing covers filled with fallback!");
}

processGameImages().catch(console.error);
