import fs from "fs";
import crypto from "crypto";

const newFile = "./firebasePosts.json"; // output of fetchFirebasePosts.js
const hashFile = "./.lastFirebaseHash";

if (!fs.existsSync(newFile)) {
  console.error("No firebasePosts.json found — skipping check.");
  process.exit(0);
}

const newData = fs.readFileSync(newFile);
const newHash = crypto.createHash("sha256").update(newData).digest("hex");

if (fs.existsSync(hashFile)) {
  const oldHash = fs.readFileSync(hashFile, "utf8").trim();
  if (newHash === oldHash) {
    console.log("🔹 No Firebase changes detected. Skipping rebuild.");
    process.exit(78); // special GitHub exit code for 'neutral' (no failure)
  }
}

fs.writeFileSync(hashFile, newHash);
console.log("🆕 Firebase data changed — continuing build.");
