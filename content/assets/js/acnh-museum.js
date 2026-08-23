(() => {
  const SOURCE_ROOT = "https://raw.githubusercontent.com/alexislours/ACNHAPI/refs/heads/master";
  const SOURCES = {
    fish: `${SOURCE_ROOT}/fish.json`,
    bugs: `${SOURCE_ROOT}/bugs.json`,
    sea: `${SOURCE_ROOT}/sea.json`,
    fossils: `${SOURCE_ROOT}/fossils.json`,
    art: `${SOURCE_ROOT}/art.json`,
  };

  const TOTALS = { fish: 80, bugs: 80, sea: 40, fossils: 73, art: 43 };
  const CRITTER_CATEGORIES = new Set(["fish", "bugs", "sea"]);
  const CATEGORY_LABELS = {
    fish: "Fish",
    bugs: "Bugs",
    sea: "Sea Creatures",
    fossils: "Fossils",
    art: "Art",
  };

  const CATEGORY_ICONS = {
    fish: "🐟",
    bugs: "🦋",
    sea: "🤿",
    fossils: "🦴",
    art: "🖼️",
  };

  const progressEl = document.querySelector("#acnh-museum-progress");
  const islandEl = document.querySelector("#acnh-island-settings");
  const grid = document.querySelector("#museumGrid");
  if (!progressEl || !islandEl || !grid) return;

  const progress = parseJson(progressEl.textContent, {});
  const island = parseJson(islandEl.textContent, {});
  const hemisphere = String(island.hemisphere || "northern").toLowerCase() === "southern"
    ? "southern"
    : "northern";

  const searchInput = document.querySelector("#museumSearch");
  const statusSelect = document.querySelector("#museumStatus");
  const monthSelect = document.querySelector("#museumMonth");
  const hourSelect = document.querySelector("#museumHour");
  const locationSelect = document.querySelector("#museumLocation");
  const monthControl = document.querySelector("#monthControl");
  const hourControl = document.querySelector("#hourControl");
  const locationControl = document.querySelector("#locationControl");
  const availableButton = document.querySelector("#showAvailableNow");
  const leavingButton = document.querySelector("#showLeaving");
  const resetButton = document.querySelector("#resetMuseumFilters");
  const resultCount = document.querySelector("#museumResultsCount");
  const loadingLabel = document.querySelector("#museumLoading");

  const now = new Date();
  monthSelect.value = String(now.getMonth() + 1);
  hourSelect.value = String(now.getHours());

  let catalogue = { fish: [], bugs: [], sea: [], fossils: [], art: [] };
  let currentCategory = "fish";
  let quickMode = "none";

  function parseJson(text, fallback) {
    try {
      return JSON.parse(text || "");
    } catch {
      return fallback;
    }
  }

  function hasValue(value) {
    if (value === true) return true;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return value > 0;
    return false;
  }

  function progressFor(category, slug) {
    const entry = progress?.[category]?.[slug];
    if (entry === true) return { caught: true, found: true, owned: true, donated: true };
    if (!entry || typeof entry !== "object") return {};
    return entry;
  }

  function stateFor(category, slug) {
    const entry = progressFor(category, slug);
    const isCritter = CRITTER_CATEGORIES.has(category);
    const found = isCritter
      ? hasValue(entry.caught) || hasValue(entry.donated)
      : hasValue(entry.found) || hasValue(entry.owned) || hasValue(entry.caught) || hasValue(entry.donated);
    const donated = hasValue(entry.donated);
    return { found, donated, entry };
  }

  function dateText(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function normalizeCategory(category, raw) {
    return Object.entries(raw || {})
      .map(([key, item]) => {
        const slug = item?.["file-name"] || key;
        const availability = item?.availability || {};
        const months = CRITTER_CATEGORIES.has(category)
          ? (availability[`month-array-${hemisphere}`] || [])
          : [];
        const hours = CRITTER_CATEGORIES.has(category)
          ? (availability["time-array"] || [])
          : [];

        return {
          category,
          slug,
          id: item?.id ?? null,
          name: item?.name?.["name-USen"] || titleCase(slug),
          price: item?.price ?? item?.["sell-price"] ?? 0,
          location: category === "sea" ? "Ocean diving" : (availability.location || ""),
          rarity: availability.rarity || "",
          months,
          hours,
          timeText: availability.time || (CRITTER_CATEGORIES.has(category) ? "All day" : ""),
          shadow: item?.shadow || "",
          speed: item?.speed || "",
          partOf: item?.["part-of"] || "",
          hasFake: Boolean(item?.hasFake),
          image: imageFor(category, slug),
        };
      })
      .sort((a, b) => {
        if (a.id !== null && b.id !== null) return a.id - b.id;
        return a.name.localeCompare(b.name);
      });
  }

  function imageFor(category, slug) {
    const type = CRITTER_CATEGORIES.has(category) ? "icons" : "images";
    return `${SOURCE_ROOT}/${type}/${category}/${slug}.png`;
  }

  function monthAvailable(item, month) {
    if (!CRITTER_CATEGORIES.has(item.category)) return true;
    return item.months.includes(Number(month));
  }

  function hourAvailable(item, hour) {
    if (!CRITTER_CATEGORIES.has(item.category)) return true;
    return item.hours.includes(Number(hour));
  }

  function isAvailable(item, month, hour) {
    return monthAvailable(item, month) && hourAvailable(item, hour);
  }

  function isLeaving(item, month) {
    if (!CRITTER_CATEGORIES.has(item.category)) return false;
    const current = Number(month);
    const next = current === 12 ? 1 : current + 1;
    return item.months.includes(current) && !item.months.includes(next);
  }

  function matchesStatus(item, status) {
    const state = stateFor(item.category, item.slug);
    if (status === "missing") return !state.found;
    if (status === "found") return state.found;
    if (status === "undonated") return state.found && !state.donated;
    if (status === "donated") return state.donated;
    return true;
  }

  function activeItems() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusSelect.value;
    const month = Number(monthSelect.value);
    const hour = Number(hourSelect.value);
    const location = locationSelect.value;

    return catalogue[currentCategory].filter(item => {
      if (search && !`${item.name} ${item.location} ${item.partOf}`.toLowerCase().includes(search)) return false;
      if (!matchesStatus(item, status)) return false;
      if (location !== "all" && item.location !== location) return false;
      if (quickMode === "available" && !isAvailable(item, month, hour)) return false;
      if (quickMode === "leaving" && !isLeaving(item, month)) return false;
      return true;
    });
  }

  function render() {
    const items = activeItems();
    resultCount.textContent = String(items.length);
    grid.innerHTML = items.length ? items.map(renderCard).join("") : `<div class="acnh-empty acnh-paper">Nothing matches these filters.</div>`;
    updateQuickButtons();
    updateNowPanel();
  }

  function renderCard(item) {
    const state = stateFor(item.category, item.slug);
    const isCritter = CRITTER_CATEGORIES.has(item.category);
    const foundLabel = isCritter ? "Caught" : (item.category === "art" ? "Owned" : "Found");
    const foundDate = dateText(state.entry.caught || state.entry.found || state.entry.owned);
    const donatedDate = dateText(state.entry.donated);
    const details = [];

    if (item.location) details.push(item.location);
    if (item.timeText) details.push(item.timeText);
    if (item.shadow) details.push(`${item.shadow} shadow`);
    if (item.speed) details.push(item.speed);
    if (item.partOf && item.partOf.toLowerCase() !== item.name.toLowerCase()) details.push(item.partOf);
    if (item.hasFake) details.push("Fake version exists");
    if (item.price) details.push(`${Number(item.price).toLocaleString()} Bells`);

    return `
      <article class="acnh-museum-card acnh-paper ${state.donated ? "is-donated" : state.found ? "is-found" : "is-missing"}">
        <div class="acnh-museum-card__image">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
          <span class="acnh-museum-card__fallback" style="display:none">${CATEGORY_ICONS[item.category]}</span>
        </div>
        <div class="acnh-museum-card__body">
          <div class="acnh-museum-card__top">
            <div>
              <p class="acnh-kicker">${CATEGORY_LABELS[item.category]}</p>
              <h3>${escapeHtml(titleCase(item.name))}</h3>
            </div>
            <span class="acnh-status-dot" title="${state.donated ? "Donated" : state.found ? foundLabel : "Missing"}"></span>
          </div>
          <p class="acnh-museum-meta">${details.map(escapeHtml).join(" · ") || "Museum collection"}</p>
          <div class="acnh-status-row">
            <span class="${state.found ? "is-on" : ""}">✓ ${foundLabel}${foundDate ? ` · ${escapeHtml(foundDate)}` : ""}</span>
            <span class="${state.donated ? "is-on" : ""}">🏛 Donated${donatedDate ? ` · ${escapeHtml(donatedDate)}` : ""}</span>
          </div>
        </div>
      </article>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setCategory(category) {
    currentCategory = category;
    quickMode = "none";
    document.querySelectorAll("[data-category]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.category === category);
    });

    const isCritter = CRITTER_CATEGORIES.has(category);
    monthControl.hidden = !isCritter;
    hourControl.hidden = !isCritter;
    locationControl.hidden = !isCritter;
    availableButton.hidden = !isCritter;
    leavingButton.hidden = !isCritter;
    populateLocations();
    render();
  }

  function populateLocations() {
    const locations = [...new Set(catalogue[currentCategory].map(item => item.location).filter(Boolean))].sort();
    locationSelect.innerHTML = `<option value="all">All locations</option>${locations.map(location => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`).join("")}`;
  }

  function updateStats() {
    let totalDonated = 0;
    let grandTotal = 0;

    Object.keys(TOTALS).forEach(category => {
      const items = catalogue[category];
      const total = items.length || TOTALS[category];
      const found = items.filter(item => stateFor(category, item.slug).found).length;
      const donated = items.filter(item => stateFor(category, item.slug).donated).length;
      totalDonated += donated;
      grandTotal += total;

      const label = CRITTER_CATEGORIES.has(category) ? "caught" : "found";
      const stat = document.querySelector(`#stat-${category}`);
      if (stat) stat.textContent = `${found} / ${total} ${label} · ${donated} donated`;
    });

    const totalText = document.querySelector("#museumTotalDonated");
    const totalBar = document.querySelector("#museumTotalBar");
    if (totalText) totalText.textContent = `${totalDonated} / ${grandTotal}`;
    if (totalBar) totalBar.style.width = `${grandTotal ? (totalDonated / grandTotal) * 100 : 0}%`;
  }

  function updateNowPanel() {
    const month = Number(monthSelect.value);
    const hour = Number(hourSelect.value);
    const critters = catalogue[currentCategory];
    const panel = document.querySelector("#acnhNowPanel");

    if (!CRITTER_CATEGORIES.has(currentCategory)) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    const available = critters.filter(item => isAvailable(item, month, hour));
    const missing = available.filter(item => !stateFor(currentCategory, item.slug).found);
    const leaving = critters.filter(item => isLeaving(item, month));
    const missingLeaving = leaving.filter(item => !stateFor(currentCategory, item.slug).found);

    document.querySelector("#availableNowCount").textContent = String(available.length);
    document.querySelector("#missingNowCount").textContent = String(missing.length);
    document.querySelector("#leavingCount").textContent = String(missingLeaving.length);
    document.querySelector("#availableNowText").textContent =
      `${CATEGORY_LABELS[currentCategory]} · ${hemisphere} hemisphere · month ${month} · ${String(hour).padStart(2, "0")}:00`;
  }

  function updateQuickButtons() {
    availableButton.classList.toggle("is-active", quickMode === "available");
    leavingButton.classList.toggle("is-active", quickMode === "leaving");
  }

  async function loadCatalogue() {
    const entries = await Promise.all(
      Object.entries(SOURCES).map(async ([category, url]) => {
        try {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          return [category, await response.json(), null];
        } catch (error) {
          return [category, {}, error];
        }
      })
    );

    const failures = [];
    entries.forEach(([category, raw, error]) => {
      catalogue[category] = normalizeCategory(category, raw);
      if (error || !catalogue[category].length) failures.push(category);
    });

    loadingLabel.textContent = failures.length
      ? `· catalogue unavailable: ${failures.join(", ")}`
      : "";

    updateStats();
    populateLocations();
    render();
  }

  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => setCategory(button.dataset.category));
  });

  [searchInput, statusSelect, monthSelect, hourSelect, locationSelect].forEach(control => {
    control.addEventListener(control === searchInput ? "input" : "change", render);
  });

  availableButton.addEventListener("click", () => {
    quickMode = quickMode === "available" ? "none" : "available";
    render();
  });

  leavingButton.addEventListener("click", () => {
    quickMode = quickMode === "leaving" ? "none" : "leaving";
    render();
  });

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    statusSelect.value = "all";
    monthSelect.value = String(now.getMonth() + 1);
    hourSelect.value = String(now.getHours());
    locationSelect.value = "all";
    quickMode = "none";
    render();
  });

  loadCatalogue();
})();
