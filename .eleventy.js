module.exports = function (eleventyConfig) {

  // This will stop the default behaviour of foo.html being turned into foo/index.html
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

  eleventyConfig.addPassthroughCopy("./content/imgs");
  eleventyConfig.addPassthroughCopy("./content/assets");
  eleventyConfig.addPassthroughCopy("./content/css");
  eleventyConfig.addPassthroughCopy("./content/js");
  eleventyConfig.addPassthroughCopy("./content/interests");

  // Add a custom collection
  eleventyConfig.addCollection("releaseYears", collectionApi => {
    const musicData = collectionApi.getFilteredByGlob("**/musicCollection.json")[0]?.data;
    if (!musicData || !musicData.releases) return [];

    const parseDate = dateStr => {
      if (!dateStr) return null;
      const parts = dateStr.split("-");
      if (parts.length === 1) return new Date(parts[0], 0, 1);
      if (parts.length === 2) return new Date(parts[0], parts[1] - 1, 1);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const years = [...new Set(
      musicData.releases
        .map(r => {
          const d = parseDate(r.first_released || r.released);
          return d ? d.getFullYear() : null;
        })
        .filter(y => y !== null)
    )].sort((a, b) => a - b);

    return years.map(year => ({
      year,
      releases: musicData.releases.filter(r => {
        const d = parseDate(r.first_released || r.released);
        return d && d.getFullYear() === year;
      })
    }));
  });

  return {
    dir: {
      input: "content",
      includes: "_includes",
      data: "_data",
      output: "public",
    },
  };
};