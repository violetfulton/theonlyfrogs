import fs from "fs";

export default function () {
  try {
    const raw = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(raw);

    // Convert fields for Eleventy
    return posts.map((post) => ({
      data: {
        title: post.title,
        content: post.content,
        createdAt: post.createdAt,
        year: post.year,
        slug: post.slug,
        date: new Date(post.createdAt),
        tags: ["posts"], // 👈 crucial for Eleventy collections
      },
      date: new Date(post.createdAt),
    }));
  } catch (err) {
    console.warn("⚠️ Unable to load posts.json:", err);
    return [];
  }
}
// ------------------------------------