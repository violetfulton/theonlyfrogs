

import { DateTime } from "luxon";
import dotenv from "dotenv";
dotenv.config();

export default function (eleventyConfig) {

  // -------------------------
  // Collections
  // -------------------------

  // All blog posts (tagged "posts"), newest first
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
  });

  // Posts grouped by year, newest year first
  eleventyConfig.addCollection("postsByYear", (collectionApi) => {
    const posts = collectionApi.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
    const yearsMap = {};
    for (const post of posts) {
      const year = post.date.getFullYear();
      (yearsMap[year] ||= []).push(post);
    }
    return Object.fromEntries(
      Object.entries(yearsMap).sort((a, b) => b[0] - a[0])
    );
  });

  // Simple array of years (for archive links)
  eleventyConfig.addCollection("years", (collectionApi) => {
    const posts = collectionApi.getFilteredByTag("posts");
    return [...new Set(posts.map(p => p.date.getFullYear()))].sort((a, b) => b - a);
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
  // Filters
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
