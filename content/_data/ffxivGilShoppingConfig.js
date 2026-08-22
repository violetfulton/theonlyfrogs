// content/_data/ffxivGilShoppingConfig.js
//
// Mount + minion ownership is read automatically from Aggro Phobic's public
// Lodestone collection pages.
//
// Orchestrion ownership is exported in-game with Aggro Roll Exporter.
//
// To update orchestrions:
// 1. Run Aggro Roll Exporter.
// 2. Replace:
//      content/_data/owned-orchestrion-rolls.json
// 3. Rebuild the site.
//
// No need to paste the generated JS array into this file anymore.

import fs from "node:fs";
import path from "node:path";

const OWNED_ORCHESTRIONS_PATH = path.resolve(
  "./content/_data/owned-orchestrion-rolls.json"
);

function readOwnedOrchestrions() {
  try {
    if (!fs.existsSync(OWNED_ORCHESTRIONS_PATH)) {
      console.warn(
        "[ffxiv-gil] Missing content/_data/owned-orchestrion-rolls.json"
      );

      return [];
    }

    const data = JSON.parse(
      fs.readFileSync(OWNED_ORCHESTRIONS_PATH, "utf8")
    );

    if (!Array.isArray(data)) {
      throw new Error(
        "owned-orchestrion-rolls.json must contain a JSON array"
      );
    }

    const rolls = [
      ...new Set(
        data
          .filter((name) => typeof name === "string")
          .map((name) => name.trim())
          .filter(Boolean)
      ),
    ];

    console.log(
      `[ffxiv-gil] Loaded ${rolls.length} owned orchestrion rolls.`
    );

    return rolls;
  } catch (error) {
    console.warn(
      `[ffxiv-gil] Could not read owned orchestrion rolls: ${error.message}`
    );

    return [];
  }
}

// The shopping matcher accepts both:
//
//   "Bipolar Nightmare"
//   "Bipolar Nightmare Orchestrion Roll"
//
// so the JSON can stay in the exact item-name format produced by
// Aggro Roll Exporter.
export const ownedOrchestrions = readOwnedOrchestrions();

// Optional: hide a collectible from the gil shopping list without marking it
// owned. Useful if there is something you simply do not want to buy.
export const ignoredCollectibles = [
  // "Example Minion",
];