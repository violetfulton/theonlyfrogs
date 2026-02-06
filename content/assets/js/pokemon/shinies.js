(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const searchEl = $("#shinySearch");
  const statusEl = $("#shinyStatus");
  const gameEl = $("#shinyGame");
  const methodEl = $("#shinyMethod");
  const sortEl = $("#shinySort");

  const cards = $$(".shiny-card");

  function norm(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function matches(card) {
    const q = norm(searchEl.value);
    const status = norm(statusEl.value);
    const game = norm(gameEl.value);
    const method = norm(methodEl.value);

    const hay = norm(card.dataset.search);
    if (q && !hay.includes(q)) return false;

    if (status && norm(card.dataset.status) !== status) return false;
    if (game && norm(card.dataset.game) !== game) return false;
    if (method && norm(card.dataset.method) !== method) return false;

    return true;
  }

  function updateCounts(visibleCards) {
    const owned = visibleCards.filter(c => norm(c.dataset.status) === "owned").length;
    const target = visibleCards.filter(c => norm(c.dataset.status) === "target").length;
    const failed = visibleCards.filter(c => norm(c.dataset.status) === "failed").length;

    $("#countTotal").textContent = visibleCards.length;
    $("#countOwned").textContent = owned;
    $("#countTarget").textContent = target;
    $("#countFailed").textContent = failed;
  }

  function applyFilters() {
    const visible = [];

    for (const card of cards) {
      const ok = matches(card);
      card.style.display = ok ? "" : "none";
      if (ok) visible.push(card);
    }

    $("#shinyEmpty").style.display = visible.length ? "none" : "";
    updateCounts(visible);

    return visible;
  }

  function sortCards(visible) {
    const grid = $("#shinyGrid");
    const sort = sortEl.value;

    visible.sort((a, b) => {
      const adex = Number(a.dataset.dex || 0);
      const bdex = Number(b.dataset.dex || 0);

      const aname = (a.dataset.name || "").toString();
      const bname = (b.dataset.name || "").toString();

      // allow future form sorting if added
      const aform = (a.dataset.form || "").toString();
      const bform = (b.dataset.form || "").toString();

      // normalize empty dates so they sort last
      const adate = a.dataset.date || "9999-99-99";
      const bdate = b.dataset.date || "9999-99-99";

      if (sort === "dex-asc") return adex - bdex;
      if (sort === "dex-desc") return bdex - adex;

      if (sort === "name-asc") {
        const n = aname.localeCompare(bname);
        return n !== 0 ? n : aform.localeCompare(bform);
      }

      if (sort === "name-desc") {
        const n = bname.localeCompare(aname);
        return n !== 0 ? n : bform.localeCompare(aform);
      }

      if (sort === "date-desc") return bdate.localeCompare(adate);
      if (sort === "date-asc") return adate.localeCompare(bdate);

      return 0;
    });

    for (const card of visible) grid.appendChild(card);
  }

  function runAll() {
    const visible = applyFilters();
    sortCards(visible);
  }

  [searchEl, statusEl, gameEl, methodEl, sortEl].forEach(el => {
    el.addEventListener("input", runAll);
    el.addEventListener("change", runAll);
  });

  runAll();
})();