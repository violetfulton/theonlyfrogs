import fs from "fs";

export default function () {
  try {
    const json = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(json);

    // ✅ Convert Firebase posts into proper Eleventy items
    return posts.map((post) => ({
      ...post,
      date: new Date(post.date),        // ensure real Date object
      tags: ["posts"],                  // allows collections filtering
      data: { title: post.title },
      url: `/blog/${post.slug}/`,       // URL for per-post pages
      templateContent: post.content,    // ⚡ Eleventy uses this for content rendering
      templateLanguage: "html",
    }));
  } catch (err) {
    console.warn("⚠️ Firebase posts.json not found or invalid:", err);
    return [];
  }
}

