(() => {
  const el = document.querySelector("#acnh-progress-data");
  if (!el) return;

  let progress = {};
  try { progress = JSON.parse(el.textContent || "{}"); } catch { progress = {}; }

  const totals = { fish: 80, bugs: 80, sea: 40, fossils: 73, art: 43 };
  const categories = Object.keys(totals);

  const hasValue = value => value === true || (typeof value === "string" && value.trim().length > 0);
  const state = entry => {
    if (entry === true) return { found: true, donated: true };
    if (!entry || typeof entry !== "object") return { found: false, donated: false };
    return {
      found: hasValue(entry.caught) || hasValue(entry.found) || hasValue(entry.owned) || hasValue(entry.donated),
      donated: hasValue(entry.donated),
    };
  };

  const count = (category, key) => Object.values(progress[category] || {}).filter(entry => state(entry)[key]).length;

  const fishCaught = count("fish", "found");
  const bugsCaught = count("bugs", "found");
  const seaCaught = count("sea", "found");
  const donated = categories.reduce((sum, category) => sum + count(category, "donated"), 0);
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  setText("#acnhFishCaught", fishCaught);
  setText("#acnhBugsCaught", bugsCaught);
  setText("#acnhSeaCaught", seaCaught);
  setText("#acnhMuseumDonated", `${donated} / ${total}`);

  const bar = document.querySelector("#acnhMuseumBar");
  if (bar) bar.style.width = `${total ? donated / total * 100 : 0}%`;
})();
