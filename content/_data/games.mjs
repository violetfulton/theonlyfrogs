// content/_data/games.mjs
import EleventyFetch from "@11ty/eleventy-fetch";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
dotenv.config();

const SHEET_URL = process.env.GAMES_SHEET_URL;

export default async function () {
  if (!SHEET_URL) {
    throw new Error("❌ Missing GAMES_SHEET_URL in .env");
  }

  // Fetch & cache Google Sheets CSV
  const csvText = await EleventyFetch(SHEET_URL, {
    duration: "6h",   // cache between builds
    type: "text",
  });

  // Parse the CSV safely
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Slug function
  const sanitize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();

  const basePath = "/assets/imgs/games/";

  // Add image + slug per game
  records.forEach((r) => {
    const slug = sanitize(r.Title);
    r.Slug = slug;

    // Sheet column to manually override a cover path
    const override = (r.ImageOverride || "").trim();
    r.Image = override || `${basePath}${slug}.jpg`;
  });

  // Group by platform
  const grouped = {};
  for (const game of records) {
    const platform = game.Platform || "Other";
    (grouped[platform] ||= []).push(game);
  }

  // Sort platforms and contents
  const sorted = Object.keys(grouped)
    .sort()
    .map((platform) => ({
      platform,
      slug: sanitize(platform),
      games: grouped[platform].sort((a, b) =>
        a.Title.localeCompare(b.Title)
      ),
    }));

  return sorted;
}
