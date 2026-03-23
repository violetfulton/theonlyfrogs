import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const RA_USERNAME = process.env.RA_USERNAME;
const RA_WEB_API_KEY = process.env.RA_WEB_API_KEY;
const RA_CITY_FOLK_GAME_ID = process.env.RA_CITY_FOLK_GAME_ID;

if (!RA_USERNAME || !RA_WEB_API_KEY || !RA_CITY_FOLK_GAME_ID) {
  console.error("Missing RA env vars. Need RA_USERNAME, RA_WEB_API_KEY, RA_CITY_FOLK_GAME_ID.");
  process.exit(1);
}

const OUT_FILE = path.resolve("content/_data/accf/retroachievements.json");

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function toArrayOfAchievements(raw) {
  if (!raw || typeof raw !== "object") return [];
  return Object.values(raw);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "theonlyfrogs-eleventy-ra-fetcher/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`RA API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const url =
    `https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php` +
    `?g=${encodeURIComponent(RA_CITY_FOLK_GAME_ID)}` +
    `&u=${encodeURIComponent(RA_USERNAME)}` +
    `&a=1` +
    `&y=${encodeURIComponent(RA_WEB_API_KEY)}`;

  const raw = await fetchJson(url);

 const achievements = toArrayOfAchievements(raw.Achievements)
  .sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0))
  .map((achievement) => {
    const earnedHardcore = Boolean(achievement.DateEarnedHardcore);
    const earnedSoftcore = Boolean(achievement.DateEarned);
    const earned = earnedHardcore || earnedSoftcore;

    const earnedDateRaw = achievement.DateEarnedHardcore || achievement.DateEarned || null;
    const badgeName = achievement.BadgeName || "";

    return {
      id: achievement.ID,
      title: achievement.Title || "Untitled Achievement",
      description: achievement.Description || "",
      points: achievement.Points || 0,
      trueRatio: Number(achievement.TrueRatio || 0),
      badgeName,
      badgeLocked: badgeName
        ? `https://media.retroachievements.org/Badge/${badgeName}.png`
        : "",
      badgeUnlocked: badgeName
        ? `https://media.retroachievements.org/Badge/${badgeName}.png`
        : "",
      earned,
      earnedHardcore,
      earnedDate: formatDate(earnedDateRaw)
    };
  });
  const earnedCount = achievements.filter((a) => a.earned).length;

  const output = {
    fetchedAt: new Date().toISOString(),
    user: raw.User || RA_USERNAME,
    game: {
      id: Number(RA_CITY_FOLK_GAME_ID),
      title: raw.Title || "Animal Crossing: City Folk",
imageIcon: raw.ImageIcon
  ? `https://retroachievements.org${raw.ImageIcon}`
  : "",
      imageTitle: raw.ImageTitle
  ? `https://retroachievements.org${raw.ImageTitle}`
  : "",
      consoleName: raw.ConsoleName || "",
      achievementCount: achievements.length,
      earnedCount
    },
    achievements
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(
    `Saved ${achievements.length} achievements to ${OUT_FILE} (${earnedCount} earned).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});