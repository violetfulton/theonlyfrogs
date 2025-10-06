import { readFileSync } from "fs";

export default function () {
  try {
    const posts = JSON.parse(readFileSync("./content/_data/posts.json", "utf-8"));
    const yearsSet = new Set();

    posts.forEach(post => {
      const date = new Date(post.createdAt);
      if (!isNaN(date)) {
        yearsSet.add(date.getFullYear());
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  } catch (err) {
    console.error("⚠️ Error building years:", err);
    return [];
  }
}
