module.exports = function (eleventyConfig) {

  // This will stop the default behaviour of foo.html being turned into foo/index.html
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

  eleventyConfig.addPassthroughCopy("./content/imgs");
  eleventyConfig.addPassthroughCopy("./content/assets");
  eleventyConfig.addPassthroughCopy("./content/css");
  eleventyConfig.addPassthroughCopy("./content/js");
  return {
    dir: {
      input: "content",
      output: "public",
    },
  };
};