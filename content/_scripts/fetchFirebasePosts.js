import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import crypto from "crypto";

const serviceAccount = JSON.parse(readFileSync("serviceAccount.json", "utf-8"));
const projectId = serviceAccount.project_id;
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortHash(input) {
  // 🩸 creates a small stable hash (a1b2)
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 4);
}

(async () => {
  try {
    console.log("📡 Fetching posts from Firestore...");

    const res = await fetch(url);
    const data = await res.json();

    if (!data.documents) {
      console.error("❌ No posts found in Firestore.");
      return;
    }

    const posts = data.documents.map(doc => {
      const f = doc.fields;
      const title = f.title?.stringValue || "Untitled Post";
      const createdAt = f.createdAt?.timestampValue || new Date().toISOString();
      const year = new Date(createdAt).getFullYear();

      const baseSlug = slugify(title);
      const hash = shortHash(createdAt); // consistent + unique
      const uniqueSlug = `${baseSlug}-${hash}`;

      return {
        title,
        slug: uniqueSlug,
        content: f.content?.stringValue || "",
        createdAt,
        year,
        tags: ["posts"],
      };
    });

    // 🔮 Deduplicate
    const uniquePosts = [];
    const seen = new Set();

    for (const post of posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
      const key = `${post.title.toLowerCase()}-${post.createdAt}`;
      if (!seen.has(key)) {
        uniquePosts.push(post);
        seen.add(key);
      }
    }

    writeFileSync("./content/_data/posts.json", JSON.stringify(uniquePosts, null, 2));
    console.log(`✅ Saved ${uniquePosts.length} unique posts to posts.json`);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
  }
})();
// ------------------------------------