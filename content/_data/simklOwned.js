import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const SIMKL_CLIENT_ID = process.env.SIMKL_CLIENT_ID;
const SIMKL_ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN;
const TMDB_KEY = process.env.TMDB_API_KEY;

if (!SIMKL_CLIENT_ID) throw new Error("Missing SIMKL_CLIENT_ID");
if (!SIMKL_ACCESS_TOKEN) throw new Error("Missing SIMKL_ACCESS_TOKEN");
if (!TMDB_KEY) throw new Error("Missing TMDB_API_KEY");

function poster(p) {
  if (!p) return "/assets/imgs/frog-dvd-placeholder.png";
  return `https://wsrv.nl/?url=https://simkl.in/posters/${p}_ca.webp`;
}

function toFiveStar(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(0, Math.min(5, Math.round(num / 2)));
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

async function tmdbGet(path) {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  return EleventyFetch(url, {
    duration: "12h",
    type: "json",
  });
}

async function getTmdbOverview(mediaType, tmdbId) {
  if (!tmdbId) return "";

  try {
    const path =
      mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const data = await tmdbGet(path);
    return data?.overview || "";
  } catch (e) {
    console.warn(`[simklOwned] TMDb overview fetch failed for ${mediaType}:${tmdbId}`);
    return "";
  }
}

function parseMemo(item) {
  const raw = item?.memo?.text?.trim() || "";

  if (!raw) {
    return {
      isPhysical: false,
      kind: null,
      seasonsOwned: "",
      raw,
    };
  }

  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  const upper = parts.map((p) => p.toUpperCase());

  const isPhysical = upper[0] === "PHYSICAL";

  if (!isPhysical) {
    return {
      isPhysical: false,
      kind: null,
      seasonsOwned: "",
      raw,
    };
  }

  let kind = null;
  let seasonsOwned = "";

  for (let i = 1; i < upper.length; i++) {
    const part = upper[i];

    if (part === "MOVIE") kind = "movie";
    else if (part === "ANIME-MOVIE") kind = "movie";
    else if (part === "TV") kind = "tv";
    else if (part === "ANIME") kind = "tv";
    else if (!seasonsOwned) seasonsOwned = parts[i];
  }

  return {
    isPhysical: true,
    kind,
    seasonsOwned,
    raw,
  };
}

export default async function () {
  let moviesData, showsData, animeData;

  try {
    [moviesData, showsData, animeData] = await Promise.all([
      simklGet("/sync/all-items/movies/?extended=full&memos=yes"),
      simklGet("/sync/all-items/shows/?extended=full&memos=yes"),
      simklGet("/sync/all-items/anime/?extended=full&memos=yes"),
    ]);
  } catch (e) {
    console.error("[simklOwned] failed:", e.message);
    return { movies: [], shows: [], total: 0 };
  }

  const movies = [];
  const shows = [];

  for (const item of moviesData.movies || []) {
    const memo = parseMemo(item);
    if (!memo.isPhysical) continue;

    const media = item.movie;
    if (!media) continue;

    movies.push({
      title: media?.title ?? "Untitled",
      year: media?.year ?? "",
      poster: poster(media?.poster),
      overview: await getTmdbOverview("movie", media?.ids?.tmdb),
      media_type: "movie",
      my_rating: toFiveStar(item?.user_rating),
      url: `https://simkl.com/movies/${media?.ids?.slug || media?.ids?.simkl}`,
    });
  }

  for (const item of showsData.shows || []) {
    const memo = parseMemo(item);
    if (!memo.isPhysical) continue;

    const media = item.show;
    if (!media) continue;

    const kind = memo.kind || "tv";

    if (kind === "movie") {
      movies.push({
        title: media?.title ?? "Untitled",
        year: media?.year ?? "",
        poster: poster(media?.poster),
        overview: await getTmdbOverview("movie", media?.ids?.tmdb),
        media_type: "movie",
        my_rating: toFiveStar(item?.user_rating),
        url: `https://simkl.com/tv/${media?.ids?.slug || media?.ids?.simkl}`,
      });
    } else {
      shows.push({
        title: media?.title ?? "Untitled",
        year: media?.year ?? "",
        poster: poster(media?.poster),
        overview: await getTmdbOverview("tv", media?.ids?.tmdb),
        media_type: "tv",
        my_rating: toFiveStar(item?.user_rating),
        seasons_owned: memo.seasonsOwned,
        url: `https://simkl.com/tv/${media?.ids?.slug || media?.ids?.simkl}`,
      });
    }
  }

  for (const item of animeData.anime || []) {
    const memo = parseMemo(item);
    if (!memo.isPhysical) continue;

    const media = item.show || item.anime;
    if (!media) continue;

    let kind = memo.kind;

    if (!kind) {
      kind = item?.anime_type === "movie" ? "movie" : "tv";
    }

    if (kind === "movie") {
      movies.push({
        title: media?.title ?? "Untitled",
        year: media?.year ?? "",
        poster: poster(media?.poster),
        overview: await getTmdbOverview("movie", media?.ids?.tmdb),
        media_type: "movie",
        my_rating: toFiveStar(item?.user_rating),
        url: `https://simkl.com/anime/${media?.ids?.slug || media?.ids?.simkl}`,
      });
    } else {
      shows.push({
        title: media?.title ?? "Untitled",
        year: media?.year ?? "",
        poster: poster(media?.poster),
        overview: await getTmdbOverview("tv", media?.ids?.tmdb),
        media_type: "tv",
        my_rating: toFiveStar(item?.user_rating),
        seasons_owned: memo.seasonsOwned,
        url: `https://simkl.com/anime/${media?.ids?.slug || media?.ids?.simkl}`,
      });
    }
  }

  movies.sort((a, b) => a.title.localeCompare(b.title));
  shows.sort((a, b) => a.title.localeCompare(b.title));

  return {
    movies,
    shows,
    total: movies.length + shows.length,
  };
}