import fs from "fs";

export default function () {
  try {
    const data = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(data);

    // Ensure valid dates
    posts.forEach((p) => {
      p.date = new Date(p.createdAt || p.date || new Date());
    });

    // Group by year
    const grouped = {};
    for (const post of posts) {
      const year = post.date.getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(post);
    }

    // Sort posts newest → oldest within each year
    for (const year of Object.keys(grouped)) {
      grouped[year].sort((a, b) => b.date - a.date);
    }

    console.log("🗂 Grouped posts by year:", Object.keys(grouped).join(", "));
    return grouped;
  } catch (err) {
    console.warn("⚠️ postsByYear: could not load posts.json:", err.message);
    return {};
  }
}
