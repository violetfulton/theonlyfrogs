// content/_data/traktOwned.js
import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from "dotenv";
dotenv.config();

const TRAKT_USER = process.env.TRAKT_USER;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_ACCESS_TOKEN = process.env.TRAKT_ACCESS_TOKEN;
const TMDB_KEY = process.env.TMDB_API_KEY;

const LIST_SLUG = "physical-media-owned";
const TRAKT_CACHE = "6h";
const TMDB_CACHE = "12h";

if (!TRAKT_USER) throw new Error("Missing TRAKT_USER in env");
if (!TRAKT_CLIENT_ID) throw new Error("Missing TRAKT_CLIENT_ID in env");
if (!TMDB_KEY) throw new Error("Missing TMDB_API_KEY in env (TMDb v3 key)");

async function traktGet(path, { auth = false } = {}) {
  const url = `https://api.trakt.tv${path}`;

  const headers = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": TRAKT_CLIENT_ID,
  };

  if (auth && TRAKT_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TRAKT_ACCESS_TOKEN}`;
  }

  return EleventyFetch(url, {
    duration: TRAKT_CACHE,
    type: "json",
    fetchOptions: { headers },
  });
}

async function traktGetAllPages(path, { limit = 100, maxPages = 50, auth = false } = {}) {
  let page = 1;
  let out = [];

  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const pagedPath = `${path}${sep}page=${page}&limit=${limit}`;

    const batch = await traktGet(pagedPath, { auth });

    if (!Array.isArray(batch) || batch.length === 0) break;

    out = out.concat(batch);

    if (batch.length < limit) break;

    page += 1;
    if (page > maxPages) break;
  }

  return out;
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

function formatSeasonsLabel(setOfNums) {
  if (!setOfNums || setOfNums.size === 0) return "";

  const nums = Array.from(setOfNums).sort((a, b) => a - b);
  const hasSpecials = nums.length > 0 && nums[0] === 0;
  const filtered = hasSpecials ? nums.slice(1) : nums;

  function labelRange(list) {
    if (list.length === 0) return "";
    const isContinuous = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
    if (isContinuous) {
      if (list.length === 1) return `S${list[0]}`;
      return `S${list[0]}–${list[list.length - 1]}`;
    }
    const short = list.slice(0, 4).join(",");
    return list.length > 4 ? `S${short},…` : `S${short}`;
  }

  const main = labelRange(filtered);
  if (hasSpecials && main) return `Sp + ${main}`;
  if (hasSpecials && !main) return `Sp`;
  return main;
}

export default async function () {
  let movieItems = [];
  let showItems = [];
  let episodeItems = [];
  let seasonItems = [];

  try {
    [movieItems, showItems, episodeItems, seasonItems] = await Promise.all([
      traktGetAllPages(`/users/${TRAKT_USER}/lists/${LIST_SLUG}/items/movies?extended=full`, { limit: 100, auth: true }),
      traktGetAllPages(`/users/${TRAKT_USER}/lists/${LIST_SLUG}/items/shows?extended=full`, { limit: 100, auth: true }),
      traktGetAllPages(`/users/${TRAKT_USER}/lists/${LIST_SLUG}/items/episodes?extended=full`, { limit: 100, auth: true }),
      traktGetAllPages(`/users/${TRAKT_USER}/lists/${LIST_SLUG}/items/seasons?extended=full`, { limit: 100, auth: true }),
    ]);
  } catch (error) {
    console.warn("[traktOwned] List fetch failed, continuing with empty data:", error.message);
    return { movies: [], shows: [], total: 0 };
  }

  let movieRatings = [];
  let showRatings = [];

  try {
    [movieRatings, showRatings] = await Promise.all([
      traktGet(`/users/${TRAKT_USER}/ratings/movies?limit=500`, { auth: true }),
      traktGet(`/users/${TRAKT_USER}/ratings/shows?limit=500`, { auth: true }),
    ]);
  } catch (error) {
    console.warn("[traktOwned] Ratings fetch failed, continuing without ratings:", error.message);
  }

  const ratingMap = new Map();
  for (const r of movieRatings) {
    if (r?.movie?.ids?.trakt) ratingMap.set(`movie:${r.movie.ids.trakt}`, toFiveStar(r.rating));
  }
  for (const r of showRatings) {
    if (r?.show?.ids?.trakt) ratingMap.set(`tv:${r.show.ids.trakt}`, toFiveStar(r.rating));
  }

  const { base, size } = await getTmdbPosterBase();

  async function movieFromTmdb(tmdbId) {
    if (!tmdbId) return { poster: null, overview: "" };
    const d = await tmdbGet(`/movie/${tmdbId}`);
    return {
      poster: d?.poster_path ? `${base}${size}${d.poster_path}` : null,
      overview: d?.overview ?? "",
    };
  }

  async function showFromTmdb(tmdbId) {
    if (!tmdbId) return { poster: null, overview: "" };
    const d = await tmdbGet(`/tv/${tmdbId}`);
    return {
      poster: d?.poster_path ? `${base}${size}${d.poster_path}` : null,
      overview: d?.overview ?? "",
    };
  }

  const movies = await Promise.all(
    movieItems.map(async (x) => {
      const tmdb = x.movie?.ids?.tmdb ?? null;
      const trakt = x.movie?.ids?.trakt ?? null;
      const extra = await movieFromTmdb(tmdb);

      return {
        title: x.movie?.title ?? "Untitled",
        year: x.movie?.year ?? "",
        trakt,
        tmdb,
        poster: extra.poster,
        overview: extra.overview,
        my_rating: ratingMap.get(`movie:${trakt}`) ?? 0,
        media_type: "movie",
      };
    })
  );

  const ownedSeasonsByShow = new Map();

  function addOwnedSeason(showTrakt, seasonNumRaw) {
    if (!showTrakt) return;
    const seasonNum = Number(seasonNumRaw);
    if (!Number.isFinite(seasonNum) || seasonNum < 0) return;
    if (!ownedSeasonsByShow.has(showTrakt)) ownedSeasonsByShow.set(showTrakt, new Set());
    ownedSeasonsByShow.get(showTrakt).add(seasonNum);
  }

  for (const sItem of seasonItems) addOwnedSeason(sItem.show?.ids?.trakt, sItem.season?.number);
  for (const eItem of episodeItems) addOwnedSeason(eItem.show?.ids?.trakt, eItem.episode?.season);

  const directShows = showItems.map((x) => ({
    title: x.show?.title ?? "Untitled",
    year: x.show?.year ?? "",
    trakt: x.show?.ids?.trakt ?? null,
    tmdb: x.show?.ids?.tmdb ?? null,
    overview: x.show?.overview ?? "",
    media_type: "tv",
  }));

  const showByTrakt = new Map();
  for (const s of directShows) {
    if (s.trakt) showByTrakt.set(s.trakt, s);
  }

  for (const e of episodeItems) {
    const s = e.show;
    if (!s?.ids?.trakt || showByTrakt.has(s.ids.trakt)) continue;
    showByTrakt.set(s.ids.trakt, {
      title: s.title ?? "Untitled",
      year: s.year ?? "",
      trakt: s.ids.trakt,
      tmdb: s.ids.tmdb ?? null,
      overview: s.overview ?? "",
      media_type: "tv",
    });
  }

  for (const sItem of seasonItems) {
    const s = sItem.show;
    if (!s?.ids?.trakt || showByTrakt.has(s.ids.trakt)) continue;
    showByTrakt.set(s.ids.trakt, {
      title: s.title ?? "Untitled",
      year: s.year ?? "",
      trakt: s.ids.trakt,
      tmdb: s.ids.tmdb ?? null,
      overview: s.overview ?? "",
      media_type: "tv",
    });
  }

  const shows = await Promise.all(
    Array.from(showByTrakt.values()).map(async (s) => {
      const extra = await showFromTmdb(s.tmdb);
      const traktId = s.trakt;
      const seasonsSet = ownedSeasonsByShow.get(traktId);
      const seasonsLabel = formatSeasonsLabel(seasonsSet);

      return {
        ...s,
        poster: extra.poster,
        overview: extra.overview || s.overview || "",
        my_rating: ratingMap.get(`tv:${traktId}`) ?? 0,
        seasons_owned: seasonsLabel,
      };
    })
  );

  return { movies, shows, total: movies.length + shows.length };
}