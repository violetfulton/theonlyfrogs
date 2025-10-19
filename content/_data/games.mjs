import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export default async function () {
  const csvPath = path.join("content", "_data", "games.csv");
  const file = fs.readFileSync(csvPath, "utf8");

  const records = parse(file, {
    columns: true,
    skip_empty_lines: true,
  });

  const sanitize = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

  const basePath = "/assets/imgs/games/";

  // Attach Image and Slug
  records.forEach((r) => {
    r.Image = `${basePath}${sanitize(r.Title)}.jpg`;
    r.Slug = sanitize(r.Title);
  });

  // Group by platform
  const grouped = {};
  for (const game of records) {
    const platform = game.Platform || "Other";
    if (!grouped[platform]) grouped[platform] = [];
    grouped[platform].push(game);
  }

  const sorted = Object.keys(grouped)
    .sort()
    .map((platform) => ({
      platform,
      slug: sanitize(platform),
      games: grouped[platform].sort((a, b) => a.Title.localeCompare(b.Title)),
    }));

  return sorted;
}
