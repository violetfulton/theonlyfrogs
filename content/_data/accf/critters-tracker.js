import fs from "node:fs";
import path from "node:path";

const crittersAllPath = path.resolve("content/_data/accf/critters-all.json");
const crittersProgressPath = path.resolve("content/_data/accf/critters-progress.json");

const rawCrittersAll = JSON.parse(fs.readFileSync(crittersAllPath, "utf8"));
const crittersProgress = JSON.parse(fs.readFileSync(crittersProgressPath, "utf8"));

function getMasterLists(data) {
  if (Array.isArray(data)) {
    return {
      fish: data.filter((item) => item.category === "fish"),
      bugs: data.filter((item) => item.category === "bug")
    };
  }

  if (data?.fish || data?.bugs) {
    return {
      fish: Array.isArray(data.fish) ? data.fish : [],
      bugs: Array.isArray(data.bugs) ? data.bugs : []
    };
  }

  if (data?.crittersAll?.fish || data?.crittersAll?.bugs) {
    return {
      fish: Array.isArray(data.crittersAll.fish) ? data.crittersAll.fish : [],
      bugs: Array.isArray(data.crittersAll.bugs) ? data.crittersAll.bugs : []
    };
  }

  if (data?.default?.fish || data?.default?.bugs) {
    return {
      fish: Array.isArray(data.default.fish) ? data.default.fish : [],
      bugs: Array.isArray(data.default.bugs) ? data.default.bugs : []
    };
  }

  return {
    fish: [],
    bugs: []
  };
}

const { fish: masterFish, bugs: masterBugs } = getMasterLists(rawCrittersAll);

function normalizeWeather(weather) {
  if (!weather) return ["any"];
  if (Array.isArray(weather)) return weather;
  return [weather];
}

function normalizeTime(item) {
  if (Array.isArray(item.time)) return item.time;
  if (typeof item.time === "string" && item.time.trim()) return [item.time];
  return ["All day"];
}

function getProgress(category, id) {
  const progressKey = category === "bug" ? "bugs" : "fish";
  const group = crittersProgress?.[progressKey] || {};
  return group[id] || { caught: false, donated: false };
}

function enrichCritter(item) {
  const progress = getProgress(item.category, item.id);

  return {
    ...item,
    weather: normalizeWeather(item.weather),
    timeSlots: normalizeTime(item),
    caught: Boolean(progress.caught),
    donated: Boolean(progress.donated)
  };
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

const fish = masterFish.map(enrichCritter).sort(sortByName);
const bugs = masterBugs.map(enrichCritter).sort(sortByName);
const all = [...fish, ...bugs].sort(sortByName);

function buildStats(list) {
  const total = list.length;
  const caught = list.filter((item) => item.caught).length;
  const donated = list.filter((item) => item.donated).length;
  const missing = total - caught;

  return { total, caught, donated, missing };
}

export default {
  fish,
  bugs,
  all,
  stats: {
    fish: buildStats(fish),
    bugs: buildStats(bugs),
    all: buildStats(all)
  }
};