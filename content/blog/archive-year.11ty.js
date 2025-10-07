// content/blog/archive-year.11ty.js
export const data = {
  pagination: {
    data: "firebasePosts",
    alias: "yearData",
    size: 1,
    before: (posts) => {
      // Clean invalid or duplicate posts
      const seen = new Set();
      const clean = posts.filter((p) => {
        if (!p || !p.slug || !p.year) return false;
        const key = `${p.year}-${p.slug}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Build a simple year → posts array
      const grouped = {};
      for (const post of clean) {
        (grouped[post.year] ||= []).push(post);
      }

      // Return one item per year for pagination
      return Object.entries(grouped)
        .sort(([a], [b]) => b - a)
        .map(([year, posts]) => ({ year, posts }));
    },
  },

  eleventyComputed: {
    permalink: (data) => {
      const { year } = data.pagination.items[0] || {};
      return year ? `/blog/archive/${year}/index.html` : false;
    },
    title: (data) => `Archive: ${data.pagination.items[0]?.year ?? ""}`,
    layout: "blogBase.njk",
  },
};

export function render({ pagination }) {
  const { year, posts } = pagination.items[0] || {};
  if (!posts?.length) {
    return `<p>No posts found for ${year}.</p>`;
  }

  const postList = posts
    .map(
      (post) => `
      <li class="blog-item">
        <a href="/blog/${post.year}/${post.slug}/" class="blog-link">${post.title}</a>
        <small class="blog-date">${new Date(post.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}</small>
      </li>`
    )
    .join("");

  return `
    <h1>Archive: ${year}
      <img src="/assets/imgs/graphics/syringe.gif" alt="Icon" class="heading-icon">
    </h1>
    <ul class="blog-list">${postList}</ul>

    <hr style="margin:2rem 0;">
    <div class="archive-link-container">
      <a href="/blog/archive/" class="archive-link">← Back to Archives</a>
      <div class="blood-drip"></div>
    </div>
  `;
}
