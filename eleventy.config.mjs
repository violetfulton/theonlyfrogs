import { DateTime } from "luxon";
import dotenv from "dotenv";
import { execSync } from "child_process";
import fs from "fs";

dotenv.config();

// ------------------------------------
// PRE-BUILD FETCHES (Firebase + Discogs)
// ------------------------------------
(async () => {
  if (process.env.ELEVENTY_SKIP_FETCH) {
    console.log("⏩ Skipping all external fetches (ELEVENTY_SKIP_FETCH set).");
    return;
  }

  try {
    const discogsScript = "./content/_scripts/fetchDiscogsCache.js";
    if (fs.existsSync(discogsScript)) {
      console.log("💿 Fetching latest Discogs cache...");
      execSync(`node ${discogsScript}`, { stdio: "inherit", timeout: 20000 });
      console.log("🧊 Using cached Discogs data.");
    } else {
      console.warn("⚠️ fetchDiscogsCache.js not found — skipping Discogs fetch.");
    }
  } catch (err) {
    console.error("❌ Failed to fetch Discogs cache:", err.message);
  }

  console.log("✅ Pre-fetch complete — starting Eleventy build...");
})();

// ------------------------------------
// MAIN ELEVENTY CONFIG
// ------------------------------------
export default function (eleventyConfig) {




  // Ensure Eleventy recognizes .11ty.js templates
  eleventyConfig.addTemplateFormats("11ty.js");


  // -------------------------
  // Filters
  // -------------------------
  eleventyConfig.addFilter("uniq", arr => Array.from(new Set(arr)));
  eleventyConfig.addFilter("filter", (arr, key, val) => arr.filter(i => i[key] === val));
  eleventyConfig.addFilter("map", (arr, key) => Array.isArray(arr) ? arr.map(i => i?.[key]).filter(Boolean) : arr);
  eleventyConfig.addFilter("unique", arr => Array.isArray(arr) ? [...new Set(arr)] : arr);
  eleventyConfig.addFilter("reverse", arr => Array.isArray(arr) ? [...arr].reverse() : arr);
  eleventyConfig.addFilter("length", arr => Array.isArray(arr) ? arr.length : 0);
  eleventyConfig.addFilter("countPostsByYear", (posts, year) =>
    Array.isArray(posts) ? posts.filter(p => p.date.getFullYear() === year).length : 0
  );
  eleventyConfig.addFilter("startsWith", (val, prefix) =>
    typeof val === "string" && val.startsWith(prefix)
  );
  eleventyConfig.addFilter("readableDate", dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  });
  eleventyConfig.addFilter("daysOld", date => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return "";
    const diff = Date.now() - d.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  });
  eleventyConfig.addFilter("readableDateLuxon", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const dt = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(dt).toFormat(format);
  });

  // -------------------------
  // Passthrough Copy
  // -------------------------
  eleventyConfig.addPassthroughCopy("./content/imgs");
  eleventyConfig.addPassthroughCopy("./content/assets");
  eleventyConfig.addPassthroughCopy("./content/css");
  eleventyConfig.addPassthroughCopy("./content/js");
  eleventyConfig.addPassthroughCopy("./content/interests");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ "./content/secret": "secret" });

  eleventyConfig.ignores.add("content/assets/js/lastfm-nowplaying.js");

  // -------------------------
  // Server Options
  // -------------------------

  console.log("🚀 Eleventy config loaded successfully");

  // -------------------------
  // Directory Structure
  // -------------------------
  return {
    dir: {
      input: "content",
      includes: "_includes",   // expects layouts in content/_includes/
      data: "_data",
      output: "public",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "11ty.js"],
  };
}
