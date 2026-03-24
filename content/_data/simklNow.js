import dotenv from "dotenv";
dotenv.config();

const SIMKL_CLIENT_ID = process.env.SIMKL_CLIENT_ID;
const SIMKL_ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN;

if (!SIMKL_CLIENT_ID) throw new Error("Missing SIMKL_CLIENT_ID");
if (!SIMKL_ACCESS_TOKEN) throw new Error("Missing SIMKL_ACCESS_TOKEN");

function poster(p) {
  if (!p) return "/assets/imgs/frog-dvd-placeholder.png";
  return `https://wsrv.nl/?url=https://simkl.in/posters/${p}_ca.webp`;
}

function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round((Number(n) || 0) / 2)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

async function simklGet(path) {
  const res = await fetch(`https://api.simkl.com${path}`, {
    headers: {
      "simkl-api-key": SIMKL_CLIENT_ID,
      Authorization: `Bearer ${SIMKL_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Simkl error ${res.status}: ${txt}`);
  }

  return res.json();
}

export default async function () {
  let moviesData, showsData, animeData;

  try {
    [moviesData, showsData, animeData] = await Promise.all([
      simklGet("/sync/all-items/movies/?extended=full"),
      simklGet("/sync/all-items/shows/?extended=full"),
      simklGet("/sync/all-items/anime/?extended=full"),
    ]);
  } catch (e) {
    console.error("[simklNow] failed:", e.message);
    return { movies: [], show: null };
  }

  const moviePool = (moviesData.movies || [])
    .filter((x) => x?.movie && x?.last_watched_at)
    .sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at))
    .slice(0, 3);

  const movies = moviePool.map((item) => ({
    kind: "movie",
    title: item.movie?.title ?? "Untitled",
    year: item.movie?.year ?? "",
    poster: poster(item.movie?.poster),
    stars: stars(item.user_rating),
    url: `https://simkl.com/movies/${item.movie?.ids?.slug || item.movie?.ids?.simkl}`,
  }));

  const showPool = [
    ...(showsData.shows || []).map((x) => ({ ...x, __type: "tv" })),
    ...(animeData.anime || []).map((x) => ({ ...x, __type: "anime" })),
  ]
    .filter((x) => (x?.show || x?.anime) && x?.last_watched_at)
    .sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at));

  let show = null;

  if (showPool[0]) {
    const item = showPool[0];
    const media = item.show || item.anime;

    show = {
      kind: "tv",
      title: media?.title ?? "Untitled",
      year: media?.year ?? "",
      poster: poster(media?.poster),
      stars: stars(item.user_rating),
      url: `https://simkl.com/${item.__type === "anime" ? "anime" : "tv"}/${media?.ids?.slug || media?.ids?.simkl}`,
      subtitle: item.next_to_watch ? `Next: ${item.next_to_watch}` : "",
    };
  }

  return { movies, show };
}