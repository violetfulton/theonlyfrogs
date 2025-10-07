import fs from "fs";

// ✅ Load the posts locally instead of from Eleventy's global cascade
const paginationSource = JSON.parse(fs.readFileSync("./content/_data/posts.json", "utf8"));

export const data = {
  // expose paginationSource so Eleventy can access it
  paginationSource,
  pagination: {
    data: "paginationSource",
    size: 1,
    alias: "post",
    before: (posts) => {
      const seen = new Set();
      return posts.filter((p) => {
        const key = `${p.slug}-${p.year}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return p.slug && p.year;
      });
    },
  },
  layout: "blogBase.njk",
  addToCollection: false,
  eleventyExcludeFromCollections: true,
  eleventyComputed: {
    permalink: (data) => {
      const p = data.post;
      if (!p?.slug || !p?.year) return false;
      return `/blog/${p.year}/${p.slug}/index.html`;
    },
    title: (data) => data.post?.title || "Untitled Post",
  },
};

export function render({ post }) {
  return `
<article class="blog-post">
  <header class="post-header">
    <h1>${post.title}
      <img src="/assets/imgs/graphics/syringe.gif" alt="Icon" class="heading-icon">
    </h1>
    <p class="post-meta">
      Posted on <span>${new Date(post.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })}</span>
      ${post.year ? ` · <a href="/blog/archive/${post.year}/">${post.year}</a>` : ""}
    </p>
  </header>

  <section class="post-content">
    ${post.content || "<p><em>No content available.</em></p>"}
  </section>

  <div class="archive-link-container">
    <a href="/blog/" class="archive-link">← Return to Blog</a>
    <div class="blood-drip"></div>
  </div>
</article>`;
}
