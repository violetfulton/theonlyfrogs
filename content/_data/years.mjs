import fs from "fs";

export default function () {
  try {
    const data = fs.readFileSync("./content/_data/posts.json", "utf8");
    const posts = JSON.parse(data);

    const years = [
      ...new Set(
        posts.map((p) => new Date(p.createdAt || p.date).getFullYear())
      ),
    ].sort((a, b) => b - a);

    console.log("📅 Available years:", years);
    return years;
  } catch (err) {
    console.warn("⚠️ years.mjs: could not load posts.json:", err.message);
    return [];
  }
}
