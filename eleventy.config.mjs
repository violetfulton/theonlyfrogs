import dotenv from "dotenv";

dotenv.config();

export default function (eleventyConfig) {
  // ------------------------------------
  // PASSTHROUGH
  // ------------------------------------

  eleventyConfig.addPassthroughCopy({
    "content/assets": "assets",
  });

  // ------------------------------------
  // ELEVENTY
  // ------------------------------------

  return {
    dir: {
      input: "content",
      includes: "_includes",
      data: "_data",
      output: "public",
    },

    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "11ty.js"],
  };
}