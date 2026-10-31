/* FroggyFish v0.6 • The same script powers the full page and homepage card.
   API v0.5 fields: windows[].{itemId,fishName,start,end,isFishEyes,location,bait}.
   No static build, secrets, or arbitrary HTML injection required. */
(() => {
  const API_FALLBACK = "https://froggyfish-live.theonlyfrogs.workers.dev/api/fish";
  const FISH_LINK = "/shrines/finalfantasyxiv/fishing/";
  const HOUR = 60 * 60 * 1000;
  const DAY = HOUR * 24;
  const london = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  function normaliseWindow(raw) {
    if (!raw || typeof raw !== "object") return null;
    const start = Date.parse(raw.start);
    const end = Date.parse(raw.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const name = (typeof raw.fishName === "string" && raw.fishName.trim()) ||
      (typeof raw.fishName?.en === "string" && raw.fishName.en.trim()) ||
      `Fish ${raw.itemId ?? raw.fishId ?? "?"}`;
    return {
      id: String(raw.itemId ?? raw.fishId ?? name), name,
      start, end, isFishEyes: raw.isFishEyes === true,
      location: typeof raw.location === "string" ? raw.location : "",
      bait: typeof raw.bait === "string" ? raw.bait : "",
    };
  }
  function normaliseWindows(list, now = Date.now()) {
    if (!Array.isArray(list)) return [];
    return list.map(normaliseWindow).filter(w => w && w.end > now).sort((a,b) => a.start - b.start);
  }
  function windowIsOpen(w, now = Date.now()) { return w.start <= now && w.end > now; }
  function duration(ms) {
    const m = Math.max(0, Math.ceil(ms / 60000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }
  function describeWindow(w, now = Date.now()) {
    return windowIsOpen(w,now) ? `closes in ${duration(w.end - now)}` :
      w.start > now ? `opens in ${duration(w.start - now)}` : "window ended";
  }
  function percent(caught, total) {
    const c = Number(caught), t = Number(total);
    return Number.isFinite(c) && Number.isFinite(t) && t > 0 ? Math.max(0, Math.min(100, (c / t) * 100)) : null;
  }
  function timeText(iso) {
    const date = new Date(iso || "");
    return Number.isFinite(date.getTime()) ? london.format(date) : "not yet";
  }
  function text(root, selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = String(value);
  }
  function setBar(root, fraction) {
    const bar = root.querySelector("[data-fish-bar]");
    const track = root.querySelector(".ff-fish__track");
    if (bar) bar.style.width = `${fraction ?? 0}%`;
    if (track) {
      track.setAttribute("aria-valuenow", String(Math.round(fraction ?? 0)));
      track.setAttribute("aria-valuetext", fraction == null ? "Progress not loaded" : `${fraction.toFixed(1)} percent caught`);
    }
  }
  function element(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = String(value);
    return el;
  }
  function pill(label, extra = "") { return element("span", `ff-fish__badge ${extra}`, label); }
  function renderCard(w, now) {
    const article = element("article", `ff-fish__item${windowIsOpen(w,now) ? " ff-fish__item--open" : ""}`);
    const heading = element("div", "ff-fish__item-head");
    heading.appendChild(element("h3", "", `🐟 ${w.name}`));
    if (windowIsOpen(w, now)) heading.appendChild(pill("🫧 OPEN", "ff-fish__badge--open"));
    article.appendChild(heading);
    const date = london.format(new Date(w.start));
    const end = clock.format(new Date(w.end));
    const dateLine = element("p", "ff-fish__time", `${date} – ${end}`);
    const timeEl = element("time", "ff-fish__item-sub", `${duration(w.end - w.start)} window · Scotland time`);
    timeEl.dateTime = new Date(w.start).toISOString();
    article.appendChild(dateLine); article.appendChild(timeEl);
    article.appendChild(element("p", "ff-fish__countdown", `✧ ${describeWindow(w,now)}`));
    if (w.location) article.appendChild(element("p", "ff-fish__item-sub", `⌖ ${w.location}`));
    if (w.bait) article.appendChild(element("p", "ff-fish__item-sub", `🎣 ${w.bait}`));
    const badges = element("div", "ff-fish__badges");
    if (w.isFishEyes) badges.appendChild(pill("✨ Fish Eyes", "ff-fish__badge--eyes"));
    badges.appendChild(pill(`#${w.id}`));
    article.appendChild(badges);
    return article;
  }
  function firstWindow(windows, now) {
    return windows.find(w => windowIsOpen(w,now)) || windows.find(w => w.start > now) || null;
  }
  function updateMini(root, data, windows, now) {
    const fraction = percent(data.caughtCount, data.totalBigFish);
    text(root, "[data-fish-caught]", data.totalBigFish == null ? "—" : data.caughtCount ?? "—");
    text(root, "[data-fish-total]", data.totalBigFish ?? "—");
    text(root, "[data-fish-percent]", fraction == null ? "waiting for Aggro…" : `${fraction.toFixed(1)}% completed · ${data.missingCount ?? "?"} remaining`);
    setBar(root, fraction);
    text(root, "[data-fish-sync]", data.lastSyncAt ? `Synced ${timeText(data.lastSyncAt)}` : "Waiting for first game sync…");
    const open = windows.filter(w => windowIsOpen(w,now));
    text(root, "[data-fish-mini-status]", open.length ? `${open.length} open now` : data.windowsAvailable ? "live windows ♡" : "syncing ♡");
    const next = firstWindow(windows, now);
    if (next) {
      text(root, "[data-fish-mini-label]", windowIsOpen(next,now) ? "🫧 catchable right now" : "🌙 next little adventure");
      text(root, "[data-fish-next-name]", next.name);
      text(root, "[data-fish-next-time]", `${describeWindow(next,now)} · ${london.format(new Date(next.start))}`);
    } else {
      text(root, "[data-fish-mini-label]", "🌙 next little adventure");
      text(root, "[data-fish-next-name]", data.windowsAvailable ? "No available fish right now" : "Forecasts are warming up…");
      text(root, "[data-fish-next-time]", data.windowsAvailable ? "Check back soon ♡" : `${data.forecastCheckedCount ?? 0} fish checked so far`);
    }
  }
  function updateFull(root, data, windows, now, filter, search) {
    const open = windows.filter(w => windowIsOpen(w,now));
    const fraction = percent(data.caughtCount,data.totalBigFish);
    text(root,"[data-fish-caught]",data.totalBigFish == null ? "—" : data.caughtCount ?? "—");
    text(root,"[data-fish-missing]",data.missingCount ?? "—");
    text(root,"[data-fish-open]",open.length);
    text(root,"[data-fish-checked]",data.forecastCheckedCount ?? 0);
    text(root,"[data-fish-checktotal]",data.forecastTotalCandidates == null ? "waiting to check" : `of ${data.forecastTotalCandidates} missing`);
    text(root,"[data-fish-percent]",fraction == null ? "—" : `${fraction.toFixed(1)}% caught`);
    text(root,"[data-fish-sync]",data.lastSyncAt ? `🐸 Last synced ${timeText(data.lastSyncAt)}` : "Waiting for first in-game sync…");
    text(root,"[data-fish-updated]",data.windowDataUpdatedAt ? `☁ Forecasts checked ${timeText(data.windowDataUpdatedAt)}` : "Forecasts warming up…");
    setBar(root, fraction);
    const status = root.querySelector("[data-fish-status]");
    if (status) {
      status.dataset.level = "ok";
      status.textContent = windows.length ? `✿ ${open.length} fish catchable now · ${windows.length} upcoming windows loaded ♡` :
        data.forecastCheckedCount > 0 ? `☁ The pond is warming up: ${data.forecastCheckedCount} fish checked. No future windows loaded yet.` :
        "☁ Waiting for the first Sisipu forecast run. Your caught-fish progress can still update live!";
    }
    root.querySelectorAll("[data-fish-filter]").forEach(b => b.setAttribute("aria-pressed",String(b.dataset.fishFilter === filter)));
    let shown = windows;
    if (filter === "now") shown = shown.filter(w => windowIsOpen(w,now));
    if (filter === "soon") shown = shown.filter(w => w.start > now && w.start <= now + DAY);
    if (filter === "eyes") shown = shown.filter(w => w.isFishEyes);
    if (search.trim()) shown = shown.filter(w => w.name.toLowerCase().includes(search.trim().toLowerCase()));
    text(root,"[data-fish-resultcount]",`${shown.length} matching window${shown.length===1?"":"s"}${shown.length > 36 ? " · showing first 36" : ""}`);
    const list=root.querySelector("[data-fish-list]"); if(!list)return;
    list.replaceChildren();
    if(!shown.length){list.appendChild(element("p","ff-fish__empty", windows.length ? "🐸 No fish match this filter right now ♡" : "🎣 No windows loaded yet — the scheduler is still checking fish ♡"));return;}
    for (const w of shown.slice(0,36)) list.appendChild(renderCard(w,now));
  }
  function initialise(root) {
    let data = null, windows = [], filter = "all", search = "", working = false;
    const mode = root.dataset.froggyfish;
    const api = root.dataset.api || API_FALLBACK;
    const paint = () => {
      if (!data) return;
      const now = Date.now();
      windows = windows.filter(w => w.end > now);
      if (mode === "mini") updateMini(root,data,windows,now);
      else updateFull(root,data,windows,now,filter,search);
    };
    async function load() {
      if (working) return;
      working = true;
      const refresh = root.querySelector("[data-fish-refresh]");
      if (refresh) refresh.disabled = true;
      try {
        const response = await fetch(api, {cache:"no-store", headers:{Accept:"application/json"}});
        if (!response.ok) throw new Error(`FroggyFish API HTTP ${response.status}`);
        const nextData = await response.json();
        if (!nextData || typeof nextData !== "object" || !Array.isArray(nextData.windows)) throw new Error("Invalid FroggyFish API response");
        data = nextData;
        windows = normaliseWindows(data.windows);
        paint();
      } catch(error) {
        console.warn("FroggyFish:", error);
        if (mode === "mini") {
          text(root,"[data-fish-mini-status]","offline");
          if (!data) text(root,"[data-fish-next-name]","Pond connection unavailable");
        } else {
          const status = root.querySelector("[data-fish-status]");
          if(status){status.dataset.level="error";status.textContent="💗 Couldn't refresh the fishing pond. Please try again in a moment.";}
        }
      } finally {
        working = false;
        if (refresh) refresh.disabled = false;
      }
    }
    root.querySelector("[data-fish-refresh]")?.addEventListener("click",load);
    root.querySelector("[data-fish-search]")?.addEventListener("input", e => {search=e.target.value;paint();});
    root.querySelectorAll("[data-fish-filter]").forEach(button => button.addEventListener("click",()=>{filter=button.dataset.fishFilter||"all";paint();}));
    load();
    window.setInterval(paint,30000); // countdowns stay accurate between API refreshes
    window.setInterval(load,5*60000); // no Eleventy rebuild needed
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { normaliseWindow,normaliseWindows,windowIsOpen,describeWindow,percent,firstWindow };
  if (typeof document !== "undefined") document.querySelectorAll("[data-froggyfish]").forEach(initialise);
})();
