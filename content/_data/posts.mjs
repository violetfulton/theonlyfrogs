import fetch from "node-fetch";

export default async function () {
  const project = "theonlyfrogs-blog"; // change this
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/posts`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return (data.documents || []).map(doc => {
      const f = doc.fields;
      return {
        title: f.title.stringValue,
        content: f.content.stringValue,
        createdAt: f.createdAt?.timestampValue || null
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("Error fetching posts:", e);
    return [];
  }
}
