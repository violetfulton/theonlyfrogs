(() => {
  const grid = document.querySelector('#card-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.sofi-card')];
  const $ = selector => document.querySelector(selector);
  const gen = card => Number(card.dataset.gen) || Infinity;
  const tags = card => JSON.parse(card.dataset.tags || '[]');
  const series = [...new Set(cards.map(c => c.dataset.series).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  for (const name of series) { const option = document.createElement('option'); option.value = option.textContent = name; $('#series-filter').append(option); }
  const tagTabs = $('#tag-tabs');
  const hiddenTags = new Set(JSON.parse(tagTabs.dataset.hiddenTags || '[]').map(t => t.toLowerCase()));
  const counts = new Map();
  for (const c of cards) for (const name of new Set(tags(c))) counts.set(name, (counts.get(name) || 0) + 1);
  const configuredTags = new Set([...tagTabs.querySelectorAll('[data-tag]')].map(b => b.dataset.tag));
  for (const name of [...counts.keys()].sort()) {
    if (hiddenTags.has(name.toLowerCase()) || configuredTags.has(name)) continue;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'tab'; button.dataset.tag = name; button.setAttribute('aria-pressed', 'false'); tagTabs.append(button);
  }
  const tagButtons = [...tagTabs.querySelectorAll('[data-tag]')];
  for (const button of tagButtons) {
    const name = button.dataset.tag;
    button.textContent = name ? `${button.dataset.icon ? button.dataset.icon + ' ' : ''}${name} (${counts.get(name) || 0})` : `All cards (${cards.length})`;
  }
  function artworkFallback(image) { image.hidden = true; const placeholder = image.parentElement.querySelector('.card-placeholder'); if (placeholder) placeholder.hidden = false; }
  for (const image of grid.querySelectorAll('.card-art')) { image.addEventListener('error', () => artworkFallback(image)); }
  let chosenTag = ''; let lastTrigger = null; let pageNumber = 1; let matchingCards = [];
  function filter(resetPage = true) {
    if (resetPage) pageNumber = 1;
    const pageSize = $('#page-size').value === 'all' ? Math.max(cards.length, 1) : Number($('#page-size').value);
    const selection = $('#selection-filter').value;
    const query = $('#card-search').value.trim().toLowerCase();
    const chosenSeries = $('#series-filter').value;
    const type = $('#type-filter').value;
    const matches = new Set();
    for (const c of cards) {
      const d = c.dataset;
      const selected = selection === 'all' || (selection === 'low' && gen(c) <= 10) || (selection === 'favourites' && d.favourite === 'true') || (selection === 'event' && (d.isEvent === 'true' || d.event));
      const text = `${d.character} ${d.series} ${d.code} ${d.tags} ${d.note}`.toLowerCase();
      const excluded = !selected || !text.includes(query) || (chosenSeries && d.series !== chosenSeries) || (chosenTag && !tags(c).includes(chosenTag)) || (type && (type === 'unknown' ? Boolean(d.type) : d.type !== type));
      if (!excluded) matches.add(c);
    }
    const sortByGen = $('#card-sort').value === 'gen';
    const sorted = [...cards].sort((a,b) => (sortByGen ? gen(a) - gen(b) : 0) || a.dataset.character.localeCompare(b.dataset.character) || a.dataset.code.localeCompare(b.dataset.code));
    matchingCards = sorted.filter(c => matches.has(c));
    const pages = Math.max(1, Math.ceil(matchingCards.length / pageSize));
    pageNumber = Math.min(pageNumber, pages);
    const onPage = new Set(matchingCards.slice((pageNumber - 1) * pageSize, pageNumber * pageSize));
    for (const c of cards) {
      c.hidden = !onPage.has(c);
      const image = onPage.has(c) && c.querySelector('.card-art');
      if (image && !image.hasAttribute('src')) {
        image.src = image.dataset.src;
        image.hidden = false;
        c.querySelector('.card-placeholder').hidden = true;
      }
    }
    for (const c of sorted) grid.append(c);
    const count = matchingCards.length;
    $('#visible-count').textContent = count > pageSize ? `${(pageNumber - 1) * pageSize + 1}–${Math.min(pageNumber * pageSize,count)} of ${count} cards` : `${count} cards${count !== cards.length ? ` · ${cards.length} total` : ''}`;
    $('#gallery-page').textContent = `Page ${pageNumber} of ${pages}`;
    $('#gallery-pages').hidden = pages < 2;
    $('#gallery-prev').disabled = pageNumber <= 1;
    $('#gallery-next').disabled = pageNumber >= pages;
    $('#no-results').hidden = Boolean(count);
    $('#draw-card').disabled = !count;
  }
  tagButtons.forEach(button => button.addEventListener('click', () => {
    chosenTag = button.dataset.tag;
    $('#selection-filter').value = 'all';
    tagButtons.forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    filter();
  }));
  for (const id of ['#card-search', '#page-size', '#series-filter', '#type-filter', '#card-sort', '#selection-filter']) $(id).addEventListener(id === '#card-search' ? 'input' : 'change', () => filter());
  $('#gallery-prev').addEventListener('click', () => { if (pageNumber > 1) { pageNumber--; filter(false); } });
  $('#gallery-next').addEventListener('click', () => { pageNumber++; filter(false); });
  const dialog = $('#card-dialog'); let currentCard = null;
  function open(card, trigger) {
    currentCard = card; lastTrigger = trigger;
    const d = card.dataset;
    $('#dialog-name').textContent = d.character; $('#dialog-series').textContent = d.series;
    $('#dialog-art').replaceChildren();
    const original = card.querySelector('.card-art:not([hidden]), .card-art:not([src])') || card.querySelector('.card-placeholder');
    const artwork = original.cloneNode(true); artwork.hidden = false;
    if (artwork.tagName === 'IMG') { artwork.loading = 'eager'; artwork.addEventListener('error', () => { const placeholder = card.querySelector('.card-placeholder').cloneNode(true); placeholder.hidden = false; $('#dialog-art').replaceChildren(placeholder); }); artwork.src = artwork.dataset.src; }
    $('#dialog-art').append(artwork);
    const facts = [['Card code',d.code], ['Generation',d.gen], ['Type',d.type], ['Element',d.element], ['Event', d.event || (d.isEvent === 'true' ? 'Event card' : '')], ['Frame',d.frame], ['Glow',d.glow]];
    $('#dialog-facts').replaceChildren();
    for (const [label,value] of facts) { if (!value) continue; const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);$('#dialog-facts').append(row); }
    $('#dialog-note').textContent = d.note; $('#dialog-note').hidden = !d.note;
    $('#copy-status').textContent = ''; dialog.showModal();
  }
  grid.addEventListener('click', event => { const button=event.target.closest('[data-open]'); if (button) open(button.closest('.sofi-card'),button); });
  $('#draw-card').addEventListener('click', () => { if (matchingCards.length) open(matchingCards[Math.floor(Math.random()*matchingCards.length)],$('#draw-card')); });
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
  dialog.addEventListener('close',()=>lastTrigger?.focus());
  $('#copy-command').addEventListener('click', async () => { const command=`sv ${currentCard.dataset.code}`;try { await navigator.clipboard.writeText(command);$('#copy-status').textContent=`Copied ${command} ♡`; } catch { $('#copy-status').textContent=`Copy this: ${command}`; } });
  $('#sofi-controls').hidden=false; $('#draw-card').hidden=false; document.querySelectorAll('[data-open]').forEach(b=>b.hidden=false);
  filter();
})();
