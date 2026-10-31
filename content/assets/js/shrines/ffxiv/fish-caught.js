/* FroggyFish ♡ My Catches v0.8
   One game sync: IDs come exclusively from the existing /api/fish response.
   Names, game descriptions and item art come from XIVAPI v2, with a local
   catalogue and browser cache. No changes to the Worker or forecast scheduler.
*/
(() => {
  const root = document.querySelector('.ff-fish--full[data-froggyfish="full"]');
  if (!root) return;

  const $ = selector => root.querySelector(selector);
  const windowsPanel = $('[data-fish-windows]');
  const caughtPanel = $('[data-fish-caught-panel]');
  const grid = $('[data-fish-caught-grid]');
  const count = $('[data-fish-caught-resultcount]');
  const search = $('[data-fish-caught-search]');
  const expansion = $('[data-fish-caught-expansion]');
  const sort = $('[data-fish-caught-sort]');
  const meta = $('[data-fish-caught-meta]');
  const retry = $('[data-fish-caught-retry]');
  if (!windowsPanel || !caughtPanel || !grid || !count || !search || !expansion || !meta) return;

  const CATALOGUE = '/assets/data/ffxiv/froggyfish-catalogue.json';
  const CACHE_KEY = 'froggyfish-item-metadata-v07'; // reuse the existing cache on upgrades
  const CACHE_MAX_AGE = 45 * 86400 * 1000;
  const API = 'https://v2.xivapi.com/api/sheet/Item';
  const byId = new Map();
  const retryAfter = new Map();
  let caught = [];
  let progressCount = null;
  let receivedIds = false;
  let view = 'windows';
  let fetching = false;
  let lastLookupError = false;
  let catalogueReady = false;

  const str = x => x == null ? '' : String(x).trim();
  const validId = x => { const n = Number(x); return Number.isSafeInteger(n) && n > 0 && n < 1000000 ? n : null; };
  const tidy = x => str(x).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').slice(0, 500);
  function el(tag, cls, value) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (value != null) e.textContent = String(value);
    return e;
  }
  function normalise(data) {
    const list = Array.isArray(data.caughtFishIds) ? data.caughtFishIds :
      Array.isArray(data.caughtFish) ? data.caughtFish :
      Array.isArray(data.caughtIds) ? data.caughtIds : null;
    if (!list) return null;
    const unique = new Map();
    for (const raw of list) {
      const o = raw && typeof raw === 'object' ? raw : { itemId: raw };
      const id = validId(o.itemId ?? o.id ?? o.fishId);
      if (id) unique.set(id, {
        id, name: tidy(o.fishName ?? o.name), description: tidy(o.description),
        icon: str(o.icon).startsWith('https://') ? str(o.icon) : '',
        location: tidy(o.location), bait: tidy(o.bait),
        patch: tidy(o.patch), expansion: tidy(o.expansion),
      });
    }
    return [...unique.values()];
  }
  // XIVAPI v2 returns the game's real item icon texture paths. Prefer the
  // high-resolution texture, but keep the standard texture as a fallback.
  function assetUrl(path) {
    return /^ui\/icon\/[0-9]{6}\/[0-9]{6}(_hr1)?\.tex$/i.test(str(path)) ?
      `https://v2.xivapi.com/api/asset?path=${encodeURIComponent(path)}&format=png` : '';
  }
  function fromXivapi(row) {
    const id = validId(row?.row_id);
    if (!id || !tidy(row.fields?.Name)) return null;
    const iconInfo = row.fields?.Icon || {};
    const standard = assetUrl(iconInfo.path);
    const high = assetUrl(iconInfo.path_hr1);
    return {id, name: tidy(row.fields.Name), description: tidy(row.fields.Description),
      icon: high || standard, iconFallback: high && standard && high !== standard ? standard : ''};
  }
  function record(value, id) {
    if (!value || typeof value !== 'object') return null;
    const name = tidy(value.name);
    if (!name || name.startsWith('Fish #')) return null;
    const goodUrl = url => /^https:\/\/v2\.xivapi\.com\/api\/asset\?/.test(str(url)) ? str(url) : '';
    return {id, name, description: tidy(value.description),
      icon: goodUrl(value.icon), iconFallback: goodUrl(value.iconFallback),
      location: tidy(value.location), bait: tidy(value.bait),
      patch: tidy(value.patch), expansion: tidy(value.expansion)};
  }
  function saveCache() {
    try {
      const items = {};
      for (const [id, item] of byId) items[id] = item;
      localStorage.setItem(CACHE_KEY, JSON.stringify({date: Date.now(), items}));
    } catch { /* cache is optional; private browsing can disable it */ }
  }
  function fillCatalogue(payload, overwrite = false) {
    const items = payload?.items;
    if (!items || typeof items !== 'object') return;
    for (const [key, value] of Object.entries(items)) {
      const id = validId(key);
      const next = id && record(value, id);
      if (next) {
        const prior = byId.get(id) || {};
        if (overwrite || !byId.has(id)) byId.set(id, { ...prior, ...next, icon: next.icon || prior.icon || '', iconFallback: next.iconFallback || prior.iconFallback || '' });
      }
    }
  }
  async function loadCatalogue() {
    try {
      const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (stored && Date.now() - Number(stored.date) < CACHE_MAX_AGE) fillCatalogue(stored);
    } catch { /* no saved cache */ }
    try {
      const response = await fetch(CATALOGUE, {cache: 'no-cache'});
      if (response.ok) fillCatalogue(await response.json(), true);
    } catch (e) { console.info('FroggyFish: local metadata catalogue unavailable', e); }
    catalogueReady = true;
    refreshExpansionOptions();
    render();
    lookup();
  }
  function detailFor(raw) {
    const cached = byId.get(raw.id) || {};
    return {id:raw.id, ...cached,
      name: raw.name || cached.name || `Fish #${raw.id}`,
      description: raw.description || cached.description || '',
      icon: raw.icon || cached.icon || '',
      iconFallback: cached.iconFallback || '',
      location: raw.location || cached.location || '',
      bait: raw.bait || cached.bait || '',
      patch: raw.patch || cached.patch || '',
      expansion: raw.expansion || cached.expansion || ''};
  }
  function refreshExpansionOptions() {
    const available = [...new Set(caught.map(f => detailFor(f).expansion).filter(Boolean))].sort();
    const selected = expansion.value;
    expansion.replaceChildren();
    const all = el('option', '', 'Every expansion'); all.value = ''; expansion.append(all);
    for (const name of available) { const opt = el('option', '', name); opt.value = name; expansion.append(opt); }
    expansion.value = available.includes(selected) ? selected : '';
    expansion.hidden = !available.length;
  }
  function render() {
    if (view !== 'caught') return;
    const q = search.value.trim().toLocaleLowerCase('en');
    const ex = expansion.value;
    const mode = sort?.value || 'name';
    let list = caught.map(detailFor);
    if (q) list = list.filter(f => [f.name,f.id,f.description,f.location,f.bait,f.patch,f.expansion]
      .some(value => String(value || '').toLocaleLowerCase('en').includes(q)));
    if (ex) list = list.filter(f => f.expansion === ex);
    list.sort((a,b) => mode === 'id' ? a.id - b.id : mode === 'reverse' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
    count.textContent = `${list.length} of ${caught.length} caught fish ♡`;
    grid.replaceChildren();
    if (!receivedIds) {
      grid.append(el('p','ff-fish__empty',progressCount > 0 ?
        '🐸 Your Worker has a caught count, but has not shared the item IDs yet.' :
        '🐸 Waiting for Aggro’s fishing sync ♡'));
      return;
    }
    if (!list.length) {
      grid.append(el('p','ff-fish__empty',caught.length ? 'No fish match those filters ♡' : 'Your first big fish will appear here ♡'));
      return;
    }
    const frag = document.createDocumentFragment();
    for (const fish of list) {
      const article = el('article','ff-fish__catch');
      article.title = `FFXIV item ID ${fish.id}`;
      const art = el('div','ff-fish__catch-art','🐟');
      if (fish.icon) {
        const img = el('img'); img.loading = 'lazy'; img.decoding = 'async';
        img.alt = `${fish.name} icon`;
        // Some items do not have an _hr1 texture: use the standard game icon.
        img.addEventListener('error', () => {
          if (fish.iconFallback && img.src !== fish.iconFallback) img.src = fish.iconFallback;
          else img.remove();
        });
        img.src = fish.icon; art.append(img);
      }
      const details = el('div','ff-fish__catch-details');
      details.append(el('span','ff-fish__catch-kicker','♡ a little victory'));
      details.append(el('h3','',fish.name));
      if (fish.description) details.append(el('p','ff-fish__catch-description',fish.description));
      const facts = el('div','ff-fish__catch-facts');
      if (fish.location) facts.append(el('span','',`⌖ ${fish.location}`));
      if (fish.bait) facts.append(el('span','',`🎣 ${fish.bait}`));
      if (fish.patch) facts.append(el('span','',`Patch ${fish.patch}`));
      if (facts.childNodes.length) details.append(facts);
      const bottom = el('div','ff-fish__catch-bottom');
      bottom.append(el('span','ff-fish__badge',fish.expansion || '✦ Big fish'));
      bottom.append(el('small','','synced from Aggro ♡'));
      details.append(bottom);
      article.append(art,details); frag.append(article);
    }
    grid.append(frag);
  }
  async function lookup(force = false) {
    if (fetching || !catalogueReady || !receivedIds) return;
    const now = Date.now();
    const ids = caught.filter(x => (!byId.has(x.id) || !byId.get(x.id).icon) &&
      (force || (retryAfter.get(x.id) || 0) <= now)).map(x => x.id);
    if (!ids.length) {
      if (view === 'caught') meta.textContent = '♡ Real in-game fish icons & names from XIVAPI v2 · catches from Aggro';
      return;
    }
    fetching = true;
    lastLookupError = false;
    meta.textContent = `🌸 Looking up ${ids.length} fish…`;
    try {
      for (let pos = 0; pos < ids.length; pos += 40) {
        const batch = ids.slice(pos,pos+40);
        const url = `${API}?fields=Name,Description,Icon&rows=${batch.join(',')}&language=en`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let response;
        try { response = await fetch(url,{signal:controller.signal}); }
        finally { clearTimeout(timeout); }
        if (!response.ok) throw new Error(`XIVAPI HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.rows)) throw new Error('XIVAPI did not return item rows');
        const resolved = new Set();
        for (const row of payload.rows) {
          const item = fromXivapi(row);
          if (item && batch.includes(item.id)) {
            const old = byId.get(item.id) || {};
            byId.set(item.id, {...old,...item});
            if (!item.icon) retryAfter.set(item.id, Date.now()+30*60000);
            resolved.add(item.id);
          }
        }
        // Absent or unnamed rows are retried later, rather than permanently hidden.
        for (const id of batch) if (!resolved.has(id)) retryAfter.set(id,Date.now()+10*60000);
        saveCache();
        refreshExpansionOptions();
        render();
      }
      meta.textContent = '♡ Real in-game fish icons & names from XIVAPI v2 · catches from Aggro';
    } catch (error) {
      lastLookupError = true;
      console.warn('FroggyFish metadata lookup:',error);
      for (const id of ids) if (!byId.has(id)) retryAfter.set(id,Date.now()+2*60000);
      meta.textContent = '♡ Fish details temporarily unavailable — tap Retry details';
    } finally {
      fetching = false;
      render();
    }
  }
  root.querySelectorAll('[data-fish-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.fishView;
    root.querySelectorAll('[data-fish-view]').forEach(tab => tab.setAttribute('aria-pressed',String(tab === button)));
    windowsPanel.hidden = view !== 'windows';
    caughtPanel.hidden = view !== 'caught';
    if (view === 'caught') {render();lookup();}
  }));
  search.addEventListener('input',render);
  expansion.addEventListener('change',render);
  sort?.addEventListener('change',render);
  retry?.addEventListener('click',() => {retryAfter.clear();lookup(true);});
  root.addEventListener('froggyfish:update',event => {
    const data = event.detail?.data;
    if (!data) return;
    progressCount = Number.isFinite(Number(data.caughtCount)) ? Number(data.caughtCount) : null;
    const list = normalise(data);
    receivedIds = list !== null;
    caught = list || [];
    refreshExpansionOptions();
    render();
    if (view === 'caught') lookup();
  });
  loadCatalogue();
})();
