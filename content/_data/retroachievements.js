import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const USERNAME = "onlyfrogs";
const API_KEY = process.env.RA_WEB_API_KEY;

// Big lookback so I still get “last 3 games”
const LOOKBACK_MINUTES = 525600; // 365 days

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "minute", secs: 60 },
  ];

  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) {
      return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

export default async function () {
  if (!API_KEY) {
    return {
      recent: [],
      error: "Missing RA_WEB_API_KEY in environment.",
    };
  }

  const url =
    `https://retroachievements.org/API/API_GetUserRecentAchievements.php` +
    `?y=${encodeURIComponent(API_KEY)}` +
    `&u=${encodeURIComponent(USERNAME)}` +
    `&m=${encodeURIComponent(LOOKBACK_MINUTES)}`;

  try {
    const data = await EleventyFetch(url, {
      duration: "30m",
      type: "json",
    });

    const sorted = (Array.isArray(data) ? data : []).sort(
      (a, b) => new Date(b.Date) - new Date(a.Date)
    );

    // 1 achievement per game
    const seenGames = new Set();
    const lastThreeGames = [];

    for (const a of sorted) {
      if (!seenGames.has(a.GameID)) {
        seenGames.add(a.GameID);

        const gameIconUrl = a.GameIcon
          ? `https://i.retroachievements.org${a.GameIcon}`
          : null;

        const achievementIconUrl = a.BadgeName
        ? `https://i.retroachievements.org/Badge/${a.BadgeName}.png`
        : null;

        lastThreeGames.push({
          date: a.Date,
          dateAgo: timeAgo(a.Date),
          hardcore: Number(a.HardcoreMode) === 1,

          achievementId: a.AchievementID,
          title: a.Title,
          description: a.Description,
          points: a.Points,
          trueRatio: a.TrueRatio,

          gameId: a.GameID,
          gameTitle: a.GameTitle,
          consoleName: a.ConsoleName,

          gameIconUrl,
          achievementIconUrl,
        });
      }

      if (lastThreeGames.length >= 3) break;
    }

    return { recent: lastThreeGames };
  } catch (err) {
    return {
      recent: [],
      error: err?.message || "Failed to fetch RetroAchievements data.",
    };
  }
}
