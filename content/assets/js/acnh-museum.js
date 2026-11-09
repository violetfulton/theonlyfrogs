(() => {
  const root = 'https://raw.githubusercontent.com/alexislours/ACNHAPI/refs/heads/master';
  const categories = ['fish', 'bugs', 'sea', 'fossils', 'art'];
  const critters = new Set(['fish', 'bugs', 'sea']);
  const totals = { fish: 80, bugs: 80, sea: 40, fossils: 73, art: 43 };
  const labels = { fish: 'Fish', bugs: 'Bugs', sea: 'Sea life', fossils: 'Fossils', art: 'Art' };
  const icons = { fish: '🐟', bugs: '🦋', sea: '🫧', fossils: '🦴', art: '🖼️' };
  const $ = id => document.getElementById(id);
  const grid = $('museumGrid');
  if (!grid) return;
  const parse = id => { try { return JSON.parse($(id)?.textContent || '{}'); } catch { return {}; } };
  const progress = parse('acnh-museum-progress');
  const island = parse('acnh-island-settings');
  const hemisphere = String(island.hemisphere || 'northern').toLowerCase() === 'southern' ? 'southern' : 'northern';
  const now = new Date();
  const search = $('museumSearch');
  const status = $('museumStatus');
  const month = $('museumMonth');
  const hour = $('museumHour');
  const location = $('museumLocation');
  const availableButton = $('showAvailableNow');
  const leavingButton = $('showLeaving');
  const loadMoreButton = $('museumLoadMore');
  const initialPageSize = 12;
  let category = 'fish';
  let quick = '';
  let limit = initialPageSize;
  let data = Object.fromEntries(categories.map(key => [key, []]));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const filled = value => value === true || (typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && value > 0);
  const itemState = item => {
    const raw = progress?.[item.category]?.[item.slug];
    if (raw === true) return { found: true, donated: true };
    if (!raw || typeof raw !== 'object') return { found: false, donated: false };
    return { found: ['caught', 'found', 'owned', 'donated'].some(key => filled(raw[key])), donated: filled(raw.donated) };
  };
  const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  const normalize = (type, response) => Object.entries(response || {}).map(([key, item]) => {
    if (!item || typeof item !== 'object') return null;
    const slug = item['file-name'] || key;
    const availability = item.availability || {};
    const isCritter = critters.has(type);
    return {
      category: type, slug, id: item.id ?? null,
      name: item.name?.['name-USen'] || titleCase(slug),
      location: type === 'sea' ? 'Ocean diving' : availability.location || '',
      hours: isCritter ? availability['time-array'] || [] : [],
      months: isCritter ? availability[`month-array-${hemisphere}`] || [] : [],
      timeText: isCritter ? availability.time || 'All day' : '',
      shadow: item.shadow || '', speed: item.speed || '', partOf: item['part-of'] || '',
      price: item.price ?? item['sell-price'] ?? 0, fake: Boolean(item.hasFake),
      image: `${root}/${isCritter ? 'icons' : 'images'}/${type}/${slug}.png`
    };
  }).filter(Boolean).sort((a, b) => a.id !== null && b.id !== null ? a.id - b.id : a.name.localeCompare(b.name));
  const atMonth = item => !critters.has(item.category) || item.months.map(Number).includes(Number(month.value));
  const atHour = item => !critters.has(item.category) || item.hours.map(Number).includes(Number(hour.value));
  const leaving = item => {
    if (!critters.has(item.category)) return false;
    const current = Number(month.value);
    return item.months.map(Number).includes(current) && !item.months.map(Number).includes(current === 12 ? 1 : current + 1);
  };
  const filtersMatch = item => {
    const state = itemState(item);
    const query = search.value.toLocaleLowerCase().trim();
    if (query && !`${item.name} ${item.location} ${item.partOf}`.toLowerCase().includes(query)) return false;
    if (status.value === 'missing' && state.found) return false;
    if (status.value === 'found' && !state.found) return false;
    if (status.value === 'undonated' && (!state.found || state.donated)) return false;
    if (status.value === 'donated' && !state.donated) return false;
    if (location.value !== 'all' && item.location !== location.value) return false;
    if (quick === 'available' && (!atMonth(item) || !atHour(item))) return false;
    if (quick === 'leaving' && !leaving(item)) return false;
    return true;
  };
  function card(item) {
    const state = itemState(item);
    const extra = [item.location, item.timeText, item.shadow ? `${item.shadow} shadow` : '', item.speed,
      item.partOf && item.partOf.toLowerCase() !== item.name.toLowerCase() ? item.partOf : '',
      item.fake ? 'Fake version exists' : ''].filter(Boolean).join(' · ');
    const action = critters.has(item.category) ? 'Caught' : item.category === 'art' ? 'Owned' : 'Found';
    return `<article class="hs-museum-card ${state.donated ? 'hs-museum-card--donated' : state.found ? 'hs-museum-card--caught' : ''}">
      <div class="hs-museum-card__image"><img src="${escape(item.image)}" alt="${escape(item.name)}" loading="lazy"><span aria-hidden="true">${icons[item.category]}</span></div>
      <div class="hs-museum-card__body"><span class="hs-eyebrow">${labels[item.category]}</span><h3>${escape(item.name)}</h3>
      <p class="hs-museum-card__meta">${escape(extra || 'a little discovery')}</p>
      <div class="hs-museum-card__status"><span class="${state.found ? 'is-on' : ''}">✓ ${action}</span><span class="${state.donated ? 'is-donated' : ''}">♡ Donated</span></div></div></article>`;
  }
  const noMatch = (message) => `<div class="hs-museum-empty"><span aria-hidden="true">🌿</span>${escape(message)}</div>`;
  function updateNow() {
    const panel = $('acnhNowPanel');
    panel.hidden = !critters.has(category);
    if (panel.hidden) return;
    const items = data[category];
    const available = items.filter(item => atMonth(item) && atHour(item));
    const missing = available.filter(item => !itemState(item).found);
    const leave = items.filter(item => leaving(item) && !itemState(item).found);
    $('missingNowCount').textContent = missing.length;
    $('leavingCount').textContent = leave.length;
    const selectedMonth = month.options[month.selectedIndex]?.text || '';
    $('availableNowText').textContent = `${labels[category]} · ${selectedMonth} at ${String(hour.value).padStart(2, '0')}:00 · ${hemisphere} hemisphere`;
  }
  function render() {
    const list = data[category].filter(filtersMatch);
    $('museumResultsCount').textContent = list.length;
    grid.innerHTML = list.length ? list.slice(0, limit).map(card).join('') : noMatch('Nothing in this little corner just yet. Try another filter ♡');
    loadMoreButton.hidden = list.length <= limit;
    for (const img of grid.querySelectorAll('img')) {
      img.addEventListener('error', () => { img.hidden = true; const fallback = img.nextElementSibling; if (fallback) fallback.style.display = 'grid'; }, { once: true });
    }
    availableButton.classList.toggle('is-active', quick === 'available');
    leavingButton.classList.toggle('is-active', quick === 'leaving');
    updateNow();
  }
  function resetPage() { limit = initialPageSize; render(); }
  function populateLocations() {
    const values = [...new Set(data[category].map(item => item.location).filter(Boolean))].sort();
    location.innerHTML = `<option value="all">Anywhere</option>` + values.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join('');
  }
  function chooseCategory(next) {
    category = next; quick = ''; limit = initialPageSize;
    document.querySelectorAll('.hs-museum-tab').forEach(button => {
      const active = button.dataset.category === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const isCritter = critters.has(next);
    for (const element of [$('monthControl'), $('hourControl'), $('locationControl'), availableButton, leavingButton]) element.hidden = !isCritter;
    populateLocations();
    render();
  }
  function updateStats() {
    let donated = 0;
    categories.forEach(type => {
      const found = data[type].filter(item => itemState(item).found).length;
      donated += data[type].filter(item => itemState(item).donated).length;
      $('stat-' + type).textContent = `${found} / ${data[type].length || totals[type]} tracked`;
    });
    $('museumTotalDonated').textContent = `${donated} / 316`;
  }
  month.value = String(now.getMonth() + 1);
  hour.value = String(now.getHours());
  document.querySelectorAll('.hs-museum-tab').forEach(button => button.addEventListener('click', () => chooseCategory(button.dataset.category)));
  [search, status, month, hour, location].forEach(input => input.addEventListener(input === search ? 'input' : 'change', resetPage));
  availableButton.addEventListener('click', () => { quick = quick === 'available' ? '' : 'available'; resetPage(); });
  leavingButton.addEventListener('click', () => { quick = quick === 'leaving' ? '' : 'leaving'; resetPage(); });
  loadMoreButton.addEventListener('click', () => { limit += initialPageSize; render(); });
  $('resetMuseumFilters').addEventListener('click', () => {
    search.value = ''; status.value = 'all'; month.value = String(now.getMonth() + 1); hour.value = String(now.getHours());
    location.value = 'all'; quick = ''; resetPage();
  });
  Promise.all(categories.map(async type => {
    try {
      const response = await fetch(`${root}/${type}.json`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { type, items: normalize(type, await response.json()), error: null };
    } catch (error) { return { type, items: [], error }; }
  })).then(results => {
    const failed = [];
    for (const result of results) {
      data[result.type] = result.items;
      if (result.error || !result.items.length) failed.push(result.type);
    }
    $('museumLoading').textContent = failed.length ? `· couldn't load: ${failed.join(', ')}` : '';
    updateStats(); chooseCategory('fish');
    if (failed.includes('fish')) grid.innerHTML = noMatch('The catalogue is temporarily unavailable. Please try again later ♡');
  });
})();
