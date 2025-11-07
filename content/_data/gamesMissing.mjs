import EleventyFetch from "@11ty/eleventy-fetch";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const SHEET_URL = process.env.GAMES_SHEET_URL;
const coverDir = "content/assets/imgs/games";

export default async function () {
  if (!SHEET_URL) {
    console.warn("⚠️ No GAMES_SHEET_URL — returning empty missing list");
    return [];
  }

  // Fetch sheet
  const csvText = await EleventyFetch(SHEET_URL, {
    duration: "6h",
    type: "text"
  });

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Slug function — must match games.mjs
  const sanitize = (s) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^-+|-+$/g, "");

  const covers = fs.existsSync(coverDir) ? fs.readdirSync(coverDir) : [];
  const coverSet = new Set(covers.map((f) => f.toLowerCase()));

  const missing = [];

  records.forEach((r) => {
    const slug = sanitize(r.Title);
    const expectedFile = `${slug}.jpg`;

    if (!coverSet.has(expectedFile)) {
      missing.push({
        title: r.Title,
        slug,
        platform: r.Platform
      });
    }
  });

  console.log(`📦 Missing covers found: ${missing.length}`);
  return missing;
}
