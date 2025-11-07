// content/_data/games.mjs
import EleventyFetch from "@11ty/eleventy-fetch";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const SHEET_URL = process.env.GAMES_SHEET_URL;

export default async function () {
  if (!SHEET_URL) {
    throw new Error("❌ Missing GAMES_SHEET_URL in .env");
  }

  // Fetch & cache Google Sheets CSV
  const csvText = await EleventyFetch(SHEET_URL, {
    duration: "6h",
    type: "text",
  });

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // ✅ Smashed slug (no hyphens)
  const sanitize = (s) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "") // remove spaces/symbols
      .replace(/^-+|-+$/g, "");

  const basePath = "/assets/imgs/games/";
  const fallback = `${basePath}no-cover.png`;

  // Add slug + image mapping
  records.forEach((r) => {
    const slug = sanitize(r.Title);
    r.Slug = slug;

    const sheetVal = (r.Image || "").trim();
    const filename = sheetVal || `${slug}.jpg`;
    const localPath = `content/assets/imgs/games/${filename}`;

    if (fs.existsSync(localPath)) {
      r.Image = `${basePath}${filename}`;
    } else {
      if (sheetVal) {
        console.warn(`⚠️ Missing image in sheet: ${filename} — using fallback`);
      }
      r.Image = fallback;
    }
  });

  // Group by platform
  const grouped = {};
  for (const game of records) {
    const platform = game.Platform || "Other";
    (grouped[platform] ||= []).push(game);
  }

  // Sort platforms & games alphabetically
  return Object.keys(grouped)
    .sort()
    .map((platform) => ({
      platform,
      slug: sanitize(platform),
      games: grouped[platform].sort((a, b) => a.Title.localeCompare(b.Title)),
    }));
}
