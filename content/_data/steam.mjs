import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_USER_ID;

export default async function () {
  if (!API_KEY || !STEAM_ID) {
    console.warn("⚠️ Missing Steam API credentials");
    return { games: [], total_hours: 0 };
  }

  // 1️⃣ Recently played
  const recentURL = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&count=5`;
  const recentData = await EleventyFetch(recentURL, { duration: "6h", type: "json" });
  const recentGames = recentData?.response?.games || [];

  // 2️⃣ Owned games (for total hours)
  const ownedURL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=true`;
  const ownedData = await EleventyFetch(ownedURL, { duration: "12h", type: "json" });

  const ownedGames = ownedData?.response?.games || [];
  const totalMinutes = ownedGames.reduce((sum, g) => sum + (g.playtime_forever || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  // 3️⃣ Format recently played for display
  const formattedRecent = recentGames.map(g => ({
    name: g.name,
    appid: g.appid,
    playtime_hours: Math.round(g.playtime_2weeks / 60),
    img: g.img_logo_url
      ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appid}/${g.img_logo_url}.jpg`
      : `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
  }));

  return {
    games: formattedRecent,
    total_hours: totalHours,
  };
}