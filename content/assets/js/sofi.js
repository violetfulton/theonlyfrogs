(() => {
  const grid = document.querySelector('#card-grid');
  if (!grid) return;

  const $ = selector => document.querySelector(selector);
  const ui = {
    count: $('#visible-count'),
    search: $('#card-search'),
    size: $('#page-size'),
    sort: $('#card-sort'),
    selection: $('#selection-filter'),
    series: $('#series-filter'),
    type: $('#type-filter'),
    event: $('#event-filter'),
    tabs: $('#tag-tabs'),
    previous: $('#gallery-prev'),
    next: $('#gallery-next'),
    pages: $('#gallery-pages'),
    pageLabel: $('#gallery-page'),
    empty: $('#no-results'),
    draw: $('#draw-card'),
    dialog: $('#card-dialog'),
  };

  const text = value => value == null ? '' : String(value);
  const gen = card => Number(card.gen) || Infinity;
  const isEvent = card => {
    if (card.isEvent === true || text(card.isEvent) === 'true') return true;
    if (card.isEvent === false || text(card.isEvent) === 'false') return false;
    return Boolean(card.event);
  };
  const eventName = card => text(card.event).trim();
  const eventCatalogue = new Map(JSON.parse(ui.event.dataset.catalogue || '[]')
    .map(event => [event.id, `${event.name} ${event.year}`]));
  const eventLabel = name => eventCatalogue.get(name) || name;
  const hiddenTags = new Set(JSON.parse(ui.tabs.dataset.hiddenTags || '[]')
    .map(tag => text(tag).toLowerCase()));
  const cardByElement = new WeakMap();
  const dialogArt = $('#dialog-art');
  const dialogFacts = $('#dialog-facts');
  const dialogNote = $('#dialog-note');
  let allCards = [];
  let orderedByName = [];
  let orderedByGen = [];
  let matchingCards = [];
  let pageNumber = 1;
  let chosenTag = '';
  let currentCard = null;
  let lastTrigger = null;

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = value;
    return element;
  }

  function placeholder(card) {
    const holder = node('div', 'card-placeholder');
    const flower = node('span', 'placeholder-flower', '✿');
    flower.setAttribute('aria-hidden', 'true');
    const name = node('span', 'placeholder-name', card.character);
    const code = node('span', 'placeholder-code', card.code);
    const bottom = node('span', 'placeholder-bottom', '♡');
    bottom.setAttribute('aria-hidden', 'true');
    holder.append(flower, name, code, bottom);
    return holder;
  }

  function artwork(card, holder) {
    const fallback = placeholder(card);
    if (!card.image) {
      holder.append(fallback);
      return;
    }
    const image = node('img', 'card-art');
    image.alt = `${card.character} Sofi card`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.hidden = false;
    }, { once: true });
    fallback.hidden = true;
    holder.append(image, fallback);
    image.src = card.image;
  }

  function createCard(card) {
    const article = node('article', 'sofi-card');
    article.dataset.code = card.code;
    cardByElement.set(article, card);

    const pocket = node('div', 'pocket');
    const badges = node('div', 'pocket-badges');
    if (card.type) badges.append(node('span', '', card.type));
    if (card.favourite) {
      const heart = node('span', 'heart-badge', '♡');
      heart.setAttribute('aria-label', 'Favourite');
      badges.append(heart);
    }
    if (isEvent(card)) {
      const name = eventName(card);
      const badge = node('span', '', name || 'event');
      badge.title = name ? eventLabel(name) : 'Event name unknown';
      badges.append(badge);
    }
    pocket.append(badges);
    artwork(card, pocket);

    const caption = node('div', 'card-caption');
    caption.append(node('p', 'card-series', card.series));
    caption.append(node('h3', '', card.character));
    const meta = node('div', 'card-meta');
    meta.append(node('span', 'gen-badge', card.gen ? `gen ${card.gen}` : 'gen ?'));
    meta.append(node('code', '', card.code));
    caption.append(meta);
    const button = node('button', 'card-open');
    button.type = 'button';
    button.dataset.open = card.code;
    button.setAttribute('aria-label', `View ${card.character}, card ${card.code}`);
    button.append(document.createTextNode('open pocket '));
    const arrow = node('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(arrow);
    caption.append(button);
    article.append(pocket, caption);
    return article;
  }

  function compareByName(a, b) {
    return a.character.localeCompare(b.character) || a.code.localeCompare(b.code);
  }

  function renderPage() {
    const size = Number(ui.size.value) || 30;
    const pages = Math.max(1, Math.ceil(matchingCards.length / size));
    pageNumber = Math.min(Math.max(1, pageNumber), pages);
    const start = (pageNumber - 1) * size;
    const shown = matchingCards.slice(start, start + size);
    const fragment = document.createDocumentFragment();
    for (const card of shown) fragment.append(createCard(card));
    // At most 60 cards enter the DOM, even when the inventory has 9,000+ items.
    grid.replaceChildren(fragment);

    const count = matchingCards.length;
    ui.count.textContent = count > size
      ? `${start + 1}–${Math.min(start + size, count)} of ${count} cards`
      : `${count} cards${count !== allCards.length ? ` · ${allCards.length} total` : ''}`;
    ui.pages.hidden = pages < 2;
    ui.pageLabel.textContent = `Page ${pageNumber} of ${pages}`;
    ui.previous.disabled = pageNumber <= 1;
    ui.next.disabled = pageNumber >= pages;
    ui.empty.hidden = count !== 0;
    ui.draw.disabled = count === 0;
  }

  function filter(resetPage = true) {
    if (resetPage) pageNumber = 1;
    const selection = ui.selection.value;
    const query = ui.search.value.trim().toLowerCase();
    const series = ui.series.value;
    const type = ui.type.value;
    const event = ui.event.value;
    const ordered = ui.sort.value === 'gen' ? orderedByGen : orderedByName;

    matchingCards = ordered.filter(card => {
      if (selection === 'low' && gen(card) > 10) return false;
      if (selection === 'favourites' && !card.favourite) return false;
      if (selection === 'event' && !isEvent(card)) return false;
      if (query && !card.searchText.includes(query)) return false;
      if (series && card.series !== series) return false;
      if (chosenTag && !card.tags.includes(chosenTag)) return false;
      if (type && (type === 'unknown' ? Boolean(card.type) : card.type !== type)) return false;
      if (event) {
        if (!isEvent(card)) return false;
        if (event === 'unlabelled' ? Boolean(eventName(card)) : eventName(card) !== event.slice(5)) return false;
      }
      return true;
    });
    renderPage();
  }

  function open(card, trigger) {
    if (!card) return;
    currentCard = card;
    lastTrigger = trigger;
    $('#dialog-name').textContent = card.character;
    $('#dialog-series').textContent = card.series;
    dialogArt.replaceChildren();
    if (card.image) {
      const image = node('img', '');
      image.alt = `${card.character} Sofi card`;
      image.decoding = 'async';
      image.addEventListener('error', () => dialogArt.replaceChildren(placeholder(card)), { once: true });
      dialogArt.append(image);
      image.src = card.image;
    } else {
      dialogArt.append(placeholder(card));
    }

    const facts = [
      ['Card code', card.code],
      ['Generation', card.gen || 'Unspecified'],
      ['Type', card.type],
      ['Element', card.element],
      ['Event', isEvent(card) ? (eventLabel(eventName(card)) || 'Event card') : ''],
      ['Frame', card.frame],
      ['Glow', card.glow],
    ];
    const fragment = document.createDocumentFragment();
    for (const [label, value] of facts) {
      if (!value) continue;
      const row = node('div');
      row.append(node('dt', '', label), node('dd', '', text(value)));
      fragment.append(row);
    }
    dialogFacts.replaceChildren(fragment);
    dialogNote.textContent = card.note;
    dialogNote.hidden = !card.note;
    $('#copy-status').textContent = '';
    ui.dialog.showModal();
  }

  function buildControls() {
    for (const series of [...new Set(allCards.map(card => card.series).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))) {
      const option = node('option', '', series);
      option.value = series;
      ui.series.append(option);
    }

    const eventCounts = new Map();
    let unlabelledEvents = 0;
    for (const card of allCards) {
      if (!isEvent(card)) continue;
      const name = eventName(card);
      if (name) eventCounts.set(name, (eventCounts.get(name) || 0) + 1);
      else unlabelledEvents++;
    }
    ui.event.querySelector('option[value="unlabelled"]').textContent = `Event name unknown (${unlabelledEvents})`;
    for (const [name, count] of [...eventCounts].sort(([a], [b]) => a.localeCompare(b))) {
      const option = node('option', '', `${eventLabel(name)} (${count})`);
      option.value = `name:${name}`;
      ui.event.append(option);
    }

    const counts = new Map();
    for (const card of allCards) {
      for (const tag of new Set(card.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    const configured = new Set([...ui.tabs.querySelectorAll('[data-tag]')].map(button => button.dataset.tag));
    for (const tag of [...counts.keys()].sort()) {
      if (hiddenTags.has(tag.toLowerCase()) || configured.has(tag)) continue;
      const button = node('button', 'tab');
      button.type = 'button';
      button.dataset.tag = tag;
      button.setAttribute('aria-pressed', 'false');
      ui.tabs.append(button);
    }
    const buttons = [...ui.tabs.querySelectorAll('[data-tag]')];
    for (const button of buttons) {
      const tag = button.dataset.tag;
      button.textContent = tag
        ? `${button.dataset.icon ? `${button.dataset.icon} ` : ''}${tag} (${counts.get(tag) || 0})`
        : `All cards (${allCards.length})`;
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      chosenTag = button.dataset.tag;
      ui.selection.value = 'all';
      buttons.forEach(tab => {
        tab.classList.toggle('active', tab === button);
        tab.setAttribute('aria-pressed', String(tab === button));
      });
      filter();
    }));
  }

  function wireEvents() {
    let searchTimer;
    ui.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => filter(), 120);
    });
    for (const control of [ui.size, ui.sort, ui.selection, ui.series, ui.type, ui.event]) {
      control.addEventListener('change', () => filter());
    }
    ui.previous.addEventListener('click', () => {
      if (pageNumber > 1) { pageNumber--; renderPage(); }
    });
    ui.next.addEventListener('click', () => {
      pageNumber++;
      renderPage();
    });
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-open]');
      if (!button || !grid.contains(button)) return;
      open(cardByElement.get(button.closest('.sofi-card')), button);
    });
    ui.draw.addEventListener('click', () => {
      if (matchingCards.length) open(matchingCards[Math.floor(Math.random() * matchingCards.length)], ui.draw);
    });
    $('.dialog-close').addEventListener('click', () => ui.dialog.close());
    ui.dialog.addEventListener('click', event => {
      const r = ui.dialog.getBoundingClientRect();
      if (event.target === ui.dialog &&
        (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) ui.dialog.close();
    });
    ui.dialog.addEventListener('close', () => {
      if (lastTrigger?.isConnected) lastTrigger.focus();
      else ui.draw.focus();
    });
    $('#copy-command').addEventListener('click', async () => {
      if (!currentCard) return;
      const command = `sv ${currentCard.code}`;
      try {
        await navigator.clipboard.writeText(command);
        $('#copy-status').textContent = `Copied ${command} ♡`;
      } catch {
        $('#copy-status').textContent = `Copy this: ${command}`;
      }
    });
  }

  async function start() {
    grid.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(grid.dataset.cardsUrl || '/sofi/cards.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = await response.json();
      if (!Array.isArray(source)) throw new Error('Unexpected Sofi collection format');
      allCards = source.map(raw => {
        const card = {
          ...raw,
          code: text(raw.code),
          character: text(raw.character),
          series: text(raw.series),
          type: text(raw.type),
          event: text(raw.event),
          note: text(raw.note),
          image: text(raw.image),
          tags: Array.isArray(raw.tags) ? raw.tags.map(text) : [],
          favourite: raw.favourite === true || text(raw.favourite) === 'true',
        };
        card.searchText = `${card.character} ${card.series} ${card.code} ${card.tags.join(' ')} ${card.note} ${isEvent(card) ? `${eventName(card)} ${eventLabel(eventName(card))}` : ''}`.toLowerCase();
        return card;
      });
      orderedByName = [...allCards].sort(compareByName);
      orderedByGen = [...allCards].sort((a, b) => gen(a) - gen(b) || compareByName(a, b));
      buildControls();
      wireEvents();
      $('#sofi-controls').hidden = false;
      ui.draw.hidden = false;
      filter();
    } catch (error) {
      console.error('Unable to load Sofi collection:', error);
      ui.count.textContent = 'Showing a preview — the full collection is temporarily unavailable.';
      const errorMessage = $('#sofi-load-error');
      if (errorMessage) errorMessage.hidden = false;
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  start();
})();
