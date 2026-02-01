// _scripts/rawg-find.mjs
const q = process.argv.slice(2).join(" ").trim();
if (!q) {
  console.log('Usage: node _scripts/rawg-find.mjs "Game Name"');
  process.exit(1);
}

const key = process.env.RAWG_API_KEY;
if (!key) {
  console.error("Missing RAWG_API_KEY in env.");
  console.error("Put it in .env or export it first.");
  process.exit(1);
}

const url =
  `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}` +
  `&search=${encodeURIComponent(q)}` +
  `&page_size=10`;

const res = await fetch(url);
if (!res.ok) {
  console.error("RAWG error:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const results = data?.results || [];

for (const g of results) {
  const platforms = (g.platforms || [])
    .map((p) => p.platform?.name)
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");

  console.log(
    `#${g.id}  ${g.name} (${g.released ? g.released.slice(0, 4) : "????"})  [${platforms}]`
  );
}
