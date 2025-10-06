import { readFileSync } from "fs";

export default function () {
  try {
    const posts = JSON.parse(readFileSync("./content/_data/posts.json", "utf-8"));
    const grouped = {};

    // Group posts by their year
    posts.forEach(post => {
      const date = new Date(post.createdAt);
      if (isNaN(date)) return;

      const year = date.getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(post);
    });

    // Sort posts in each year (newest first)
    for (const year in grouped) {
      grouped[year].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return grouped;
  } catch (err) {
    console.error("⚠️ Error building postsByYear:", err);
    return {};
  }
}
