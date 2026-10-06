import { imageExtensions, codeKey } from './cards.mjs';

function httpsBase(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Enter a complete HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS URL without credentials, query parameters or a fragment.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function filenameCode(value) {
  const name = String(value ?? '').trim().replace(/\.(png|jpe?g|webp|gif|avif)$/i, '');
  return /^[a-z\d]{1,32}$/i.test(name) ? codeKey(name) : '';
}

// This only changes image fields. Image listings cannot create card metadata.
export function matchFrogPond(cards, listing, publicBase, { replace = false } = {}) {
  if (typeof listing === 'string') {
    if (listing.length > 24_000_000) throw new Error('Use an image listing smaller than 24 MB.');
    try { listing = JSON.parse(listing); } catch { throw new Error('Paste the JSON response from GET /api/images, or choose its saved JSON file.'); }
  }
  const images = Array.isArray(listing) ? listing : listing?.images;
  if (!Array.isArray(images)) throw new Error('Expected a Frog Pond JSON object containing an images array.');
  const base = httpsBase(publicBase);
  const known = new Set(cards.map(c => codeKey(c.code)));
  const candidates = new Map();
  const unknown = new Set(); const conflicts = new Set(); const warnings = [];
  let unlabelled = 0;
  for (const image of images) {
    if (!image || typeof image !== 'object') { warnings.push('Skipped an invalid image record.'); continue; }
    const filename = filenameCode(image.original_name);
    const title = filenameCode(image.title);
    if (filename && title && filename !== title && known.has(filename) && known.has(title)) {
      conflicts.add(filename); conflicts.add(title);
      warnings.push(`Filename ${filename} and title ${title} identify different cards; neither was linked.`);
      continue;
    }
    // The original filename remains authoritative when titles are renamed.
    const code = known.has(filename) ? filename : known.has(title) ? title : filename || title;
    if (!code) { unlabelled++; continue; }
    if (!known.has(code)) { unknown.add(code); continue; }
    const id = typeof image.id === 'string' ? image.id : '';
    const ext = '.' + String(image.ext ?? '').replace(/^\./, '').toLowerCase();
    if (!/^[a-z\d_-]{1,200}$/i.test(id) || !imageExtensions.has(ext)) {
      warnings.push(`${code}: skipped an invalid image ID or unsupported extension.`); continue;
    }
    // The supplied OpenAPI specifies /i/<id>.<ext>. Never use its storage path.
    const url = new URL(`i/${id}${ext}`, base).href;
    const urls = candidates.get(code) ?? new Set(); urls.add(url); candidates.set(code, urls);
  }
  for (const [code, urls] of candidates) if (urls.size > 1) conflicts.add(code);
  let matched = 0; let kept = 0;
  const result = cards.map(card => {
    const code = codeKey(card.code), urls = candidates.get(code);
    if (!urls || conflicts.has(code)) return card;
    if (card.image && !replace) { kept++; return card; }
    matched++;
    return { ...card, image: [...urls][0] };
  });
  return { cards: result, matched, kept, total: images.length, unknown: [...unknown], conflicts: [...conflicts], unlabelled, warnings, base: base.href };
}

export async function readFrogPond(input, resource, fetcher = fetch) {
  const base = httpsBase(input.base);
  if (!['folders', 'images'].includes(resource)) throw new Error('Unknown Frog Pond read operation.');
  const url = new URL(`api/${resource}`, base);
  if (resource === 'images') {
    const folder = String(input.folder ?? 'all');
    if (!/^(all|root|\d+)$/.test(folder)) throw new Error('Choose a Frog Pond folder.');
    url.searchParams.set('folder', folder);
  }
  const headers = { Accept: 'application/json' };
  if (input.username || input.password) {
    if (typeof input.username !== 'string' || typeof input.password !== 'string' || input.username.includes(':') || input.username.length > 1000 || input.password.length > 1000) throw new Error('Enter a valid Frog Pond username and password.');
    headers.Authorization = `Basic ${Buffer.from(`${input.username}:${input.password}`).toString('base64')}`;
  }
  let response;
  try { response = await fetcher(url, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(20_000) }); }
  catch { throw new Error('Cannot reach Frog Pond. Run the importer on a computer that can open it, or import a saved JSON listing. Check the address, including /frog-pond/.'); }
  if (response.status === 401 || response.status === 403) throw new Error('Frog Pond refused access. Check your local username/password and network access.');
  if (!response.ok) throw new Error(`Frog Pond returned HTTP ${response.status}. Check its address, including /frog-pond/.`);
  // Bound a streaming response, rather than downloading arbitrary image bytes.
  let text = ''; let bytes = 0;
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 24_000_000) { await reader.cancel(); throw new Error('Frog Pond listing exceeds 24 MB. Select a smaller folder.'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (e) {
    if (bytes > 24_000_000) throw e;
    throw new Error('The Frog Pond listing could not be downloaded. Try the JSON export option.');
  } finally { reader.releaseLock(); }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Frog Pond did not return JSON. Check the API address.'); }
  if (resource === 'folders') {
    if (!Array.isArray(data.folders) || data.folders.some(f => !Number.isSafeInteger(f.id) || f.id < 0 || typeof f.name !== 'string')) throw new Error('Frog Pond returned an invalid folder list.');
    return { folders: data.folders.map(f => ({ id: f.id, name: f.name, image_count: f.image_count ?? 0 })) };
  }
  if (!Array.isArray(data.images)) throw new Error('Frog Pond returned an invalid image listing.');
  return data;
}
