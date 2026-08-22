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

function watchedLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function simklUrl(type, media) {
  const id = media?.ids?.slug || media?.ids?.simkl;
  if (!id) return "https://simkl.com";
  return `https://simkl.com/${type}/${id}`;
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
    return {
      movies: [],
      show: null,
      latestMovie: null,
      latestShow: null,
      recentMovies: [],
      recentShows: [],
      recentTv: [],
      recentAnime: [],
    };
  }

  const recentMovies = (moviesData.movies || [])
    .filter((x) => x?.movie && x?.last_watched_at)
    .sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at))
    .slice(0, 12)
    .map((item) => ({
      kind: "movie",
      title: item.movie?.title ?? "Untitled",
      year: item.movie?.year ?? "",
      poster: poster(item.movie?.poster),
      stars: stars(item.user_rating),
      rating: Number(item.user_rating) || 0,
      watchedAt: item.last_watched_at,
      watchedLabel: watchedLabel(item.last_watched_at),
      url: simklUrl("movies", item.movie),
    }));

  const recentShows = [
    ...(showsData.shows || []).map((x) => ({ ...x, __type: "tv" })),
    ...(animeData.anime || []).map((x) => ({ ...x, __type: "anime" })),
  ]
    .filter((x) => (x?.show || x?.anime) && x?.last_watched_at)
    .sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at))
    .slice(0, 12)
    .map((item) => {
      const media = item.show || item.anime;
      return {
        kind: item.__type,
        title: media?.title ?? "Untitled",
        year: media?.year ?? "",
        poster: poster(media?.poster),
        stars: stars(item.user_rating),
        rating: Number(item.user_rating) || 0,
        watchedAt: item.last_watched_at,
        watchedLabel: watchedLabel(item.last_watched_at),
        url: simklUrl(item.__type === "anime" ? "anime" : "tv", media),
        subtitle: item.next_to_watch ? `Next: ${item.next_to_watch}` : "",
      };
    });

  const recentTv = recentShows.filter((item) => item.kind === "tv");
  const recentAnime = recentShows.filter((item) => item.kind === "anime");

  // Keep the original `movies` + `show` interface for any old includes that
  // still use it, while exposing clearer fields for the combined Currently page.
  return {
    movies: recentMovies.slice(0, 3),
    show: recentShows[0] || null,
    latestMovie: recentMovies[0] || null,
    latestShow: recentTv[0] || recentShows[0] || null,
    recentMovies,
    recentShows,
    recentTv,
    recentAnime,
  };
}
