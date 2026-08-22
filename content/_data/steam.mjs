import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_USER_ID;

export default async function () {
  if (!API_KEY || !STEAM_ID) {
    console.warn("⚠️ Missing Steam API credentials");
    return { games: [], total_hours: 0, recent_total_hours: 0 };
  }

  const recentURL = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&count=5`;
  const recentData = await EleventyFetch(recentURL, {
    duration: "6h",
    type: "json",
  });
  const recentGames = recentData?.response?.games || [];

  // Keep lifetime total for compatibility with any older templates, but the
  // Currently page deliberately focuses on recent playtime instead.
  const ownedURL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=true`;
  const ownedData = await EleventyFetch(ownedURL, {
    duration: "12h",
    type: "json",
  });

  const ownedGames = ownedData?.response?.games || [];
  const totalMinutes = ownedGames.reduce(
    (sum, game) => sum + (game.playtime_forever || 0),
    0
  );
  const totalHours = Math.round(totalMinutes / 60);

  const recentTotalMinutes = recentGames.reduce(
    (sum, game) => sum + (game.playtime_2weeks || 0),
    0
  );

  const formattedRecent = recentGames.map((game) => ({
    name: game.name,
    appid: game.appid,
    playtime_hours: Math.round((game.playtime_2weeks || 0) / 60),
    last_played_at: game.rtime_last_played
      ? new Date(game.rtime_last_played * 1000).toISOString()
      : null,
    img: game.img_logo_url
      ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg`
      : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
  }));

  return {
    games: formattedRecent,
    total_hours: totalHours,
    recent_total_hours: Math.round(recentTotalMinutes / 60),
  };
}
