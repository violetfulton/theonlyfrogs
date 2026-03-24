import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const TRAKT_USER = process.env.TRAKT_USER;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const TRAKT_REFRESH_TOKEN = process.env.TRAKT_REFRESH_TOKEN;
const TMDB_KEY = process.env.TMDB_API_KEY;

const TMDB_CACHE = "12h";

if (!TRAKT_USER) throw new Error("Missing TRAKT_USER in env");
if (!TRAKT_CLIENT_ID) throw new Error("Missing TRAKT_CLIENT_ID in env");
if (!TRAKT_CLIENT_SECRET) throw new Error("Missing TRAKT_CLIENT_SECRET in env");
if (!TRAKT_REFRESH_TOKEN) throw new Error("Missing TRAKT_REFRESH_TOKEN in env");
if (!TMDB_KEY) throw new Error("Missing TMDB_API_KEY in env");

let currentAccessToken = process.env.TRAKT_ACCESS_TOKEN || null;
let currentRefreshToken = TRAKT_REFRESH_TOKEN;

async function refreshTraktAccessToken() {
  const res = await fetch("https://api.trakt.tv/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: currentRefreshToken,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      grant_type: "refresh_token",
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Trakt token refresh failed (${res.status}): ${text}`);
  }

  const json = JSON.parse(text);

  currentAccessToken = json.access_token;
  if (json.refresh_token) currentRefreshToken = json.refresh_token;

  if (json.refresh_token && json.refresh_token !== TRAKT_REFRESH_TOKEN) {
    console.warn("[traktNow] Trakt returned a new refresh token. Update your GitHub secret TRAKT_REFRESH_TOKEN.");
  }

  return currentAccessToken;
}

async function traktAuthedGet(path, { retrying = false } = {}) {
  if (!currentAccessToken) {
    await refreshTraktAccessToken();
  }

  const url = `https://api.trakt.tv${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${currentAccessToken}`,
    },
  });

  if (res.status === 401 && !retrying) {
    console.warn(`[traktNow] Got 401 for ${path}, refreshing token and retrying...`);
    await refreshTraktAccessToken();
    return traktAuthedGet(path, { retrying: true });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Authenticated Trakt request failed (${res.status}) for ${path}: ${text}`);
  }

  return res.json();
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

  let moviesHist = [];
  let episodesHist = [];
  let movieRatings = [];
  let showRatings = [];

  try {
    [moviesHist, episodesHist, movieRatings, showRatings] = await Promise.all([
      traktAuthedGet(`/users/${TRAKT_USER}/history/movies?limit=10&extended=full`),
      traktAuthedGet(`/users/${TRAKT_USER}/history/episodes?limit=30&extended=full`),
      traktAuthedGet(`/users/${TRAKT_USER}/ratings/movies?limit=500`),
      traktAuthedGet(`/users/${TRAKT_USER}/ratings/shows?limit=500`),
    ]);
  } catch (error) {
    console.error("[traktNow] Authenticated Trakt fetch failed:", error.message);
    return { movies: [], show: null };
  }

  const movieRatingMap = new Map();
  for (const r of movieRatings || []) {
    if (r?.movie?.ids?.trakt) {
      movieRatingMap.set(r.movie.ids.trakt, toFiveStar(r.rating));
    }
  }

  const showRatingMap = new Map();
  for (const r of showRatings || []) {
    if (r?.show?.ids?.trakt) {
      showRatingMap.set(r.show.ids.trakt, toFiveStar(r.rating));
    }
  }

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