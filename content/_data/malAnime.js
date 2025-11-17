import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";

dotenv.config();

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;
const MAL_USERNAME = process.env.MAL_USERNAME || "your_mal_username";

export default async function () {
  if (!MAL_CLIENT_ID) {
    console.warn("[MAL] MAL_CLIENT_ID is not set; returning empty anime list.");
    return { anime: [] };
  }

  const url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(
    MAL_USERNAME
  )}/animelist?status=watching&sort=list_updated_at&limit=6&fields=list_status,num_episodes`;

  try {
    const json = await EleventyFetch(url, {
      duration: "1h", // cache for 1 hour
      type: "json",
      fetchOptions: {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CLIENT_ID, // required for MAL API v2 :contentReference[oaicite:1]{index=1}
        },
      },
    });

    const anime = (json.data || []).map((item) => {
      const node = item.node || {};
      const status = item.list_status || {};

      return {
        id: node.id,
        title: node.title,
        image:
          node.main_picture?.medium ||
          node.main_picture?.large ||
          "/assets/imgs/frog-placeholder.png",
        url: `https://myanimelist.net/anime/${node.id}`,
        score: status.score || null,
        progress: status.num_episodes_watched || 0,
        totalEpisodes: node.num_episodes || null,
      };
    });

    return { anime };
  } catch (err) {
    console.error("[MAL] Failed to fetch animelist:", err);
    return { anime: [] };
  }
}
