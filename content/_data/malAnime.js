import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";

dotenv.config();

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;
const MAL_USERNAME = process.env.MAL_USERNAME || "your_mal_username";

async function fetchList(status, limit = 6) {
  if (!MAL_CLIENT_ID) {
    console.warn("[MAL] MAL_CLIENT_ID is not set; returning empty list for", status);
    return [];
  }

  const url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(
    MAL_USERNAME
  )}/animelist?status=${status}&sort=list_updated_at&limit=${limit}&fields=list_status,num_episodes`;

  try {
    const json = await EleventyFetch(url, {
      duration: "1h",
      type: "json",
      fetchOptions: {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CLIENT_ID,
        },
      },
    });

    const anime = (json.data || []).map((item) => {
      const node = item.node || {};
      const statusObj = item.list_status || {};

      return {
        id: node.id,
        title: node.title,
        image:
          node.main_picture?.medium ||
          node.main_picture?.large ||
          "/assets/imgs/frog-placeholder.png",
        url: `https://myanimelist.net/anime/${node.id}`,
        score: statusObj.score || null,
        progress: statusObj.num_episodes_watched || 0,
        totalEpisodes: node.num_episodes || null,
      };
    });

    return anime;
  } catch (err) {
    console.error(`[MAL] Failed to fetch animelist (${status}):`, err);
    return [];
  }
}

export default async function () {
  const watching = await fetchList("watching", 6);
  const completed = await fetchList("completed", 6);

  return {
    watching,
    completed,
  };
}
