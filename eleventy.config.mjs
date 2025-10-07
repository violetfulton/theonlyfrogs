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
    const firebaseScript = "./content/_scripts/fetchFirebasePosts.js";
    if (fs.existsSync(firebaseScript)) {
      console.log("🔥 Fetching latest posts from Firebase...");
      execSync(`node ${firebaseScript}`, { stdio: "inherit", timeout: 20000 });
      console.log("✅ Firebase sync complete.");
    } else {
      console.warn("⚠️ fetchFirebasePosts.js not found — skipping Firebase fetch.");
    }
  } catch (err) {
    console.error("❌ Failed to fetch Firebase posts:", err.message);
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

  // 🧽 Prevent .11ty.js generated pages from feeding into the firebasePosts list
eleventyConfig.addGlobalData("firebasePosts", () => {
  try {
    const raw = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(raw);

    const unique = [];
    const seen = new Set();

    for (const p of posts) {
      const key = `${p.slug}-${p.year}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          ...p,
          date: new Date(p.createdAt),
        });
      }
    }

    console.log(`🧩 Firebase unique posts after dedupe: ${unique.length}`);
    return unique;
  } catch (err) {
    console.warn("⚠️ No Firebase posts found:", err.message);
    return [];
  }
});


// ✅ unique by object key (e.g. slug)
eleventyConfig.addFilter("unique", (arr, key = null) => {
  if (!Array.isArray(arr)) return arr;
  if (!key) return [...new Set(arr)];
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
});


  // Ensure Eleventy recognizes .11ty.js templates
  eleventyConfig.addTemplateFormats("11ty.js");

  // -------------------------
  // Global Data: Firebase Posts
  // -------------------------
// ✅ Global posts data from Firebase cache (deduped)
eleventyConfig.addGlobalData("firebasePosts", () => {
  try {
    const raw = fs.readFileSync("./content/_data/posts.json", "utf8");
    let posts = JSON.parse(raw);

    // Remove undefined or malformed entries
    posts = posts.filter(p => p && p.slug && p.year);

    // Deduplicate by (year + slug)
    const seen = new Set();
    const unique = posts.filter(p => {
      const key = `${p.year}-${p.slug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`🧩 Firebase unique posts after dedupe: ${unique.length}`);
    return unique.map(p => ({
      ...p,
      date: new Date(p.createdAt),
    }));
  } catch (err) {
    console.warn("⚠️ No Firebase posts found:", err.message);
    return [];
  }
});


  // -------------------------
  // Global Data: Posts by Year
  // -------------------------
  eleventyConfig.addGlobalData("postsByYear", () => {
    try {
      const raw = fs.readFileSync("./content/_data/posts.json", "utf8");
      const posts = JSON.parse(raw).map(p => ({
        ...p,
        date: new Date(p.createdAt),
      }));

      const yearsMap = {};
      for (const post of posts) {
        const year = post.date.getFullYear();
        (yearsMap[year] ||= []).push(post);
      }

      return Object.fromEntries(Object.entries(yearsMap).sort((a, b) => b[0] - a[0]));
    } catch {
      return {};
    }
  });

  // -------------------------
  // Global Data: Year List (for Archives)
  // -------------------------
// ✅ Extract unique years for archive listings (deduped)
eleventyConfig.addGlobalData("years", () => {
  try {
    const raw = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(raw)
      .filter(p => p && p.year && p.slug) // ignore malformed
      .reduce((acc, cur) => {
        const key = `${cur.year}-${cur.slug}`;
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          acc.posts.push(cur);
        }
        return acc;
      }, { seen: new Set(), posts: [] }).posts;

    const uniqueYears = [...new Set(posts.map(p => Number(p.year)))];
    return uniqueYears.sort((a, b) => b - a);
  } catch {
    return [];
  }
});


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
  eleventyConfig.addPassthroughCopy({
    "./content/_scripts/fetchFirebasePosts.js": "_scripts/fetchFirebasePosts.js",
  });
  // Prevent Eleventy from treating pagination file as a "posts" data source
eleventyConfig.ignores.add("content/blog/post-page.njk");
eleventyConfig.ignores.add("content/blog/posts.njk");


  eleventyConfig.ignores.add("content/assets/js/lastfm-nowplaying.js");

  // -------------------------
  // Server Options
  // -------------------------
  eleventyConfig.setServerOptions({ allowFuture: true });

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
