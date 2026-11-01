/* Local screenshot scrapbook — no additional API, no tracking, no secrets. */
(() => {
  const root = document.querySelector('[data-housing-museum]');
  if (!root) return;

  const search = root.querySelector('[data-museum-search]');
  const room = root.querySelector('[data-museum-room]');
  const cards = [...root.querySelectorAll('[data-museum-exhibit]')];
  const count = root.querySelector('[data-museum-count]');
  const empty = root.querySelector('[data-museum-empty]');
  function filter() {
    const query = (search?.value || '').toLocaleLowerCase().trim();
    const selected = room?.value || 'all';
    let visible = 0;
    for (const card of cards) {
      const matches = (!query || (card.dataset.search || '').includes(query)) &&
        (selected === 'all' || card.dataset.room === selected);
      card.hidden = !matches;
      if (matches) visible++;
    }
    if (count) count.textContent = `${visible} photographed treasure${visible === 1 ? '' : 's'}`;
    if (empty) empty.hidden = visible !== 0;
  }
  search?.addEventListener('input', filter);
  room?.addEventListener('change', filter);

  const dialog = document.querySelector('[data-museum-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const main = dialog.querySelector('[data-museum-dialog-image]');
  const title = dialog.querySelector('[data-museum-dialog-title]');
  const note = dialog.querySelector('[data-museum-dialog-note]');
  const counter = dialog.querySelector('[data-museum-dialog-counter]');
  const previous = dialog.querySelector('[data-museum-prev]');
  const next = dialog.querySelector('[data-museum-next]');
  const close = dialog.querySelector('[data-museum-dialog-close]');
  let photos = [], index = 0;
  let restoreFocus = null;
  function paint() {
    const photo = photos[index];
    if (!photo) return;
    main.src = photo.image;
    main.alt = `${title.textContent} — photograph ${index + 1}`;
    note.textContent = photo.caption || '';
    counter.textContent = photos.length > 1 ? `${index + 1} / ${photos.length}` : '';
    previous.hidden = next.hidden = photos.length < 2;
  }
  root.querySelectorAll('[data-museum-photo]').forEach(button => {
    button.addEventListener('click', () => {
      const src = button.dataset.photoMain;
      if (!src) return;
      let extras = [];
      try {
        const input = JSON.parse(button.dataset.photoImages || '[]');
        if (Array.isArray(input)) extras = input.filter(v => v && typeof v.image === 'string' && v.image);
      } catch { /* A broken optional gallery must not hide its main image. */ }
      photos = [{ image:src, caption:button.dataset.photoNote || '' }, ...extras];
      index = 0;
      title.textContent = button.dataset.photoTitle || 'A little memory';
      restoreFocus = button;
      paint();
      dialog.showModal();
    });
  });
  previous.addEventListener('click', () => { index = (index + photos.length - 1) % photos.length; paint(); });
  next.addEventListener('click', () => { index = (index + 1) % photos.length; paint(); });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (photos.length < 2) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); previous.click(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); next.click(); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    main.removeAttribute('src');
    if (restoreFocus?.isConnected) restoreFocus.focus();
  });
})();
