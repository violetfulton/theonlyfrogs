// content/_data/traktNow.js
import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const TRAKT_USER = process.env.TRAKT_USER; // "onlyfrogs"
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TMDB_KEY = process.env.TMDB_API_KEY;

const TRAKT_CACHE = "30m";
const TMDB_CACHE = "12h";

if (!TRAKT_USER) throw new Error("Missing TRAKT_USER in .env");
if (!TRAKT_CLIENT_ID) throw new Error("Missing TRAKT_CLIENT_ID in .env");
if (!TMDB_KEY) throw new Error("Missing TMDB_API_KEY in .env (TMDb v3 key)");

async function traktGet(path) {
  const url = `https://api.trakt.tv${path}`;
  return EleventyFetch(url, {
    duration: TRAKT_CACHE,
    type: "json",
    fetchOptions: {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID,
      },
    },
  });
}

async function tmdbGet(path) {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  return EleventyFetch(url, { duration: TMDB_CACHE, type: "json" });
}

let tmdbImageBase = null;
async function getTmdbPosterBase() {
  if (tmdbImageBase) return tmdbImageBase;
  const cfg = await tmdbGet(`/configuration`);
  const base = cfg.images.secure_base_url;
  const size = cfg.images.poster_sizes.includes("w342") ? "w342" : cfg.images.poster_sizes.at(-1);
  tmdbImageBase = { base, size };
  return tmdbImageBase;
}

function toFiveStar(traktTen) {
  const n = Number(traktTen);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(5, Math.round(n / 2)));
}

function stars(n) {
  const r = Number(n) || 0;
  return "★".repeat(r) + "☆".repeat(5 - r);
}

async function tmdbPosterFor(kind, tmdbId, { base, size }) {
  if (!tmdbId) return null;
  const path = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const d = await tmdbGet(path);
  return d?.poster_path ? `${base}${size}${d.poster_path}` : null;
}

export default async function () {
  const { base, size } = await getTmdbPosterBase();

  // Fetch: last movies + episode history (to infer "what season I'm on")
  const [moviesHist, episodesHist, movieRatings, showRatings] = await Promise.all([
    traktGet(`/users/${TRAKT_USER}/history/movies?limit=10&extended=full`),
    traktGet(`/users/${TRAKT_USER}/history/episodes?limit=30&extended=full`),
    traktGet(`/users/${TRAKT_USER}/ratings/movies?limit=500`),
    traktGet(`/users/${TRAKT_USER}/ratings/shows?limit=500`),
  ]);

  // Ratings maps
  const movieRatingMap = new Map();
  for (const r of movieRatings || []) movieRatingMap.set(r.movie?.ids?.trakt, toFiveStar(r.rating));

  const showRatingMap = new Map();
  for (const r of showRatings || []) showRatingMap.set(r.show?.ids?.trakt, toFiveStar(r.rating));

  // --- Last 3 movies ---
  const last3MoviesRaw = (moviesHist || [])
    .filter((x) => x?.movie?.ids?.trakt)
    .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at))
    .slice(0, 3);

  const last3Movies = await Promise.all(
    last3MoviesRaw.map(async (x) => {
      const m = x.movie;
      const traktId = m?.ids?.trakt ?? null;
      const poster = await tmdbPosterFor("movie", m?.ids?.tmdb ?? null, { base, size });

      return {
        kind: "movie",
        watched_at: x.watched_at,
        title: m?.title ?? "Untitled",
        year: m?.year ?? "",
        trakt: traktId,
        tmdb: m?.ids?.tmdb ?? null,
        url: m?.ids?.slug ? `https://trakt.tv/movies/${m.ids.slug}` : (traktId ? `https://trakt.tv/movies/${traktId}` : null),
        my_rating: movieRatingMap.get(traktId) ?? 0,
        stars: stars(movieRatingMap.get(traktId) ?? 0),
        poster: poster || "/assets/imgs/frog-dvd-placeholder.png",
        pill: "",
        subtitle: "",
      };
    })
  );

  // --- 1 show item (most recent episode watched) ---
  const lastEpisode = (episodesHist || [])
    .filter((x) => x?.show?.ids?.trakt && x?.episode)
    .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at))[0];

  let currentShow = null;

  if (lastEpisode) {
    const show = lastEpisode.show;
    const ep = lastEpisode.episode;

    const showTrakt = show?.ids?.trakt ?? null;
    const seasonNum = Number(ep?.season);
    const epNum = Number(ep?.number);

    const pill =
      Number.isFinite(seasonNum) && Number.isFinite(epNum)
        ? `S${seasonNum}E${epNum}`
        : "";

    const poster = await tmdbPosterFor("tv", show?.ids?.tmdb ?? null, { base, size });

    currentShow = {
      kind: "tv",
      watched_at: lastEpisode.watched_at,
      title: show?.title ?? "Untitled",
      year: show?.year ?? "",
      trakt: showTrakt,
      tmdb: show?.ids?.tmdb ?? null,
      url: show?.ids?.slug ? `https://trakt.tv/shows/${show.ids.slug}` : (showTrakt ? `https://trakt.tv/shows/${showTrakt}` : null),
      my_rating: showRatingMap.get(showTrakt) ?? 0,
      stars: stars(showRatingMap.get(showTrakt) ?? 0),
      poster: poster || "/assets/imgs/frog-dvd-placeholder.png",
      pill,
      subtitle: ep?.title ? `Last watched: ${ep.title}` : "",
    };
  }

  return {
    movies: last3Movies,
    show: currentShow,
  };
}
