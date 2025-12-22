import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const USERNAME = "onlyfrogs";
const API_KEY = process.env.RA_WEB_API_KEY;

// Big lookback so you still get “last 3” even if you haven’t unlocked in the last hour.
const LOOKBACK_MINUTES = 525600; // 365 days

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

    const recent = (Array.isArray(data) ? data : [])
      .slice(0, 3)
      .map((a) => {
        const gameIconUrl = a.GameIcon
          ? `https://i.retroachievements.org${a.GameIcon}`
          : null;

        return {
          date: a.Date, // already a readable string
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
        };
      });

    return { recent };
  } catch (err) {
    return {
      recent: [],
      error: err?.message || "Failed to fetch RetroAchievements data.",
    };
  }
}
