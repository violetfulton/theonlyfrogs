import fs from "fs";

export default function () {
  const postsPath = "./content/_data/posts.json";
  if (!fs.existsSync(postsPath)) return [];

  const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

  // Collect unique years from post.createdAt
  const years = [...new Set(posts.map(p => new Date(p.createdAt).getFullYear()))];
  return years.sort((a, b) => b - a);
}
