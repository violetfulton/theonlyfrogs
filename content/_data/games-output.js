import fs from "fs";
import path from "path";
import games from "./games.mjs"; // this imports the data Eleventy loads

export default async function () {
  const data = await games(); // get processed game data

  const outputPath = path.join("public", "_data");
  const outputFile = path.join(outputPath, "games.json");

  // Ensure folder exists
  fs.mkdirSync(outputPath, { recursive: true });

  // Write proper JSON
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

  // Return nothing (Eleventy will ignore this)
  return {};
}
