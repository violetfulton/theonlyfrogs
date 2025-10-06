import { DateTime } from "luxon";
import dotenv from "dotenv";
dotenv.config();
import { execSync } from "child_process";
import fs from "fs";

// Auto-fetch posts from Firebase before build
try {
  const scriptPath = "./content/_scripts/fetchFirebasePosts.js";
  if (fs.existsSync(scriptPath)) {
    console.log("🔥 Fetching latest posts from Firebase...");
    execSync(`node ${scriptPath}`, { stdio: "inherit" });
  } else {
    console.warn("⚠️ fetchFirebasePosts.js not found — skipping Firebase fetch.");
  }
} catch (err) {
  console.error("❌ Failed to fetch Firebase posts:", err);
}

export default function (eleventyConfig) {

  // -------------------------
  // Collections
  // -------------------------

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("postsByYear", (collectionApi) => {
    const posts = collectionApi.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
    const yearsMap = {};
    for (const post of posts) {
      const year = post.date.getFullYear();
      (yearsMap[year] ||= []).push(post);
    }
    return Object.fromEntries(Object.entries(yearsMap).sort((a, b) => b[0] - a[0]));
  });

  eleventyConfig.addCollection("years", (collectionApi) => {
    const posts = collectionApi.getFilteredByTag("posts");
    return [...new Set(posts.map(p => p.date.getFullYear()))].sort((a, b) => b - a);
  });

  // ------------------------------
  // Fix missing filters for Nunjucks
  // ------------------------------

  // Map filter
  eleventyConfig.addFilter("map", (arr, key) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map(item => item?.[key]).filter(v => v !== undefined);
  });

  // Unique filter
  eleventyConfig.addFilter("unique", arr => {
    if (!Array.isArray(arr)) return arr;
    return [...new Set(arr)];
  });

  // Reverse filter
  eleventyConfig.addFilter("reverse", arr => {
    if (!Array.isArray(arr)) return arr;
    return [...arr].reverse();
  });

  // Selectattr filter (mimics Liquid)
  eleventyConfig.addFilter("selectattr", (arr, attr, op, value) => {
    if (!Array.isArray(arr)) return [];
    if (op === "equalto") return arr.filter(i => i?.[attr] === value);
    return arr;
  });

  // Length filter (safe count)
  eleventyConfig.addFilter("length", arr => (Array.isArray(arr) ? arr.length : 0));

  // Post count per year (for archive)
  eleventyConfig.addFilter("countPostsByYear", (posts, year) => {
    if (!Array.isArray(posts)) return 0;
    return posts.filter(p => p.date.getFullYear() === year).length;
  });

  // Startswith filter
eleventyConfig.addFilter("startsWith", function (value, prefix) {
  if (typeof value !== "string") return false;
  return value.startsWith(prefix);
});

  // -------------------------
  // Passthrough files
  // -------------------------
  eleventyConfig.addPassthroughCopy("./content/imgs");
  eleventyConfig.addPassthroughCopy("./content/assets");
  eleventyConfig.addPassthroughCopy("./content/css");
  eleventyConfig.addPassthroughCopy("./content/js");
  eleventyConfig.addPassthroughCopy("./content/interests");
  eleventyConfig.addPassthroughCopy("./content/_scripts");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ "./content/secret": "secret" });

  eleventyConfig.ignores.add("content/assets/js/lastfm-nowplaying.js");

  // -------------------------
  // Date filters
  // -------------------------
  eleventyConfig.addNunjucksFilter("readableDate", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const dt = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(dt).toFormat(format);
  });

  eleventyConfig.addNunjucksFilter("daysOld", function (date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d)) return '';
    const diff = Date.now() - d.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  });

  // Same readableDate for other engines
  eleventyConfig.addLiquidFilter("readableDate", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const dt = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(dt).toFormat(format);
  });

  eleventyConfig.addJavaScriptFunction("readableDate", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const dt = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(dt).toFormat(format);
  });

  // -------------------------
  // Options
  // -------------------------
  eleventyConfig.setServerOptions({ allowFuture: true });

  return {
    dir: {
      input: "content",
      includes: "_includes",
      data: "_data",
      output: "public",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"],
  };
}
