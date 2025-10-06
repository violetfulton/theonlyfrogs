import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";

const serviceAccount = JSON.parse(readFileSync("serviceAccount.json", "utf-8"));
const projectId = serviceAccount.project_id;
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

(async () => {
  try {
    const res = await fetch(url);
    const data = await res.json();

    const posts = (data.documents || []).map(doc => {
      const f = doc.fields;
      const title = f.title.stringValue;
      const createdAt = f.createdAt?.timestampValue || new Date().toISOString();
      const year = new Date(createdAt).getFullYear();

      return {
        title,
        slug: slugify(title),
        content: f.content.stringValue,
        createdAt,
        year
      };
    });

    writeFileSync("./content/_data/posts.json", JSON.stringify(posts, null, 2));
    console.log(`✅ Pulled ${posts.length} posts from Firebase`);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
  }
})();
