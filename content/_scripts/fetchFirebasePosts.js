import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";

const serviceAccount = JSON.parse(readFileSync("serviceAccount.json", "utf-8"));
const projectId = serviceAccount.project_id;
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;

(async () => {
  try {
    const res = await fetch(url);
    const data = await res.json();

    const posts = (data.documents || []).map(doc => {
      const f = doc.fields;
      return {
        title: f.title.stringValue,
        content: f.content.stringValue,
        createdAt: f.createdAt?.timestampValue || null
      };
    });

    writeFileSync("./content/_data/posts.json", JSON.stringify(posts, null, 2));
    console.log(`✅ Pulled ${posts.length} posts from Firebase`);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
  }
})();
