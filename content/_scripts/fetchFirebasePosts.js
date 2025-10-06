import { readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

// Load service account credentials
const serviceAccount = JSON.parse(readFileSync("serviceAccount.json", "utf-8"));
const projectId = serviceAccount.project_id;

// Firestore REST endpoint
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;

// Create JWT for service account auth
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const jwtToken = jwt.sign(payload, serviceAccount.private_key, {
    algorithm: "RS256",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtToken,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get Firebase access token");
  }

  return data.access_token;
}

// Helper: slugify titles
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Main execution
(async () => {
  try {
    console.log("🔑 Authenticating with Firebase...");
    const accessToken = await getAccessToken();

    console.log("📡 Fetching posts from Firestore...");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Firestore responded with ${res.status}`);
    }

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
        year,
      };
    });

    // Sort newest → oldest
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Save to Eleventy data directory
    writeFileSync("./content/_data/posts.json", JSON.stringify(posts, null, 2));
    console.log(`✅ Pulled ${posts.length} posts from Firebase securely`);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
  }
})();
