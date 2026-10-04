// Parse manually copied Sofi collection text, with or without Markdown.
// No network requests, Discord credentials, commands or button interactions.
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const elements = { earthw: 'Earth', metalw: 'Metal', iceew: 'Ice', woodw: 'Wood', firew: 'Fire', lightw: 'Light', windw: 'Wind', voidw: 'Void' };
export const codeKey = code => String(code).trim().toLowerCase();
const truncated = text => /(?:\.{3}|…)\s*$/.test(text);

export function parseCollection(text) {
  if (typeof text !== 'string' || text.length > 8_000_000) throw new Error('Paste up to 8 MB of collection text.');
  // Copying the rendered Discord embed loses the backticks and emphasis.
  // Keep emoji names and Unicode emoji; linked emoji become their labels.
  const token = '(?::[a-z\\d_]+:|[^\\s•·]+)';
  const rowStart = new RegExp(`${token}\\s*[•·]\\s*${token}\\s*[•·]\\s*[a-z\\d]{1,32}\\s+:[a-z\\d_]+:\\s+G\\s*[•·.:]`, 'giu');
  const plain = text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1')
    .replaceAll('`', '')
    .replace(/(?:\*\*)?SOFI:\s*COLLECTION\s*\([^)]*\)(?:\*\*)?/gi, '\n$&\n')
    .replace(/Page:\s*\d+\s*\/\s*\d+\s*\|\s*Total cards:\s*\d+/gi, '\n$&\n')
    .replace(rowStart, '\n$&');
  const pattern = new RegExp(`^(${token})\\s*[•·]\\s*(${token})\\s*[•·]\\s*([a-z\\d]{1,32})\\s+:([a-z\\d_]+):\\s+G\\s*[•·.:]\\s*([\\d,]+)\\s+(.+?)\\s*[•·]\\s*(.+)$`, 'iu');
  const cards = new Map();
  const warnings = [];
  let matched = 0;
  for (const raw of plain.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(?:\*\*)?SOFI:\s*COLLECTION\b/i.test(line) || /^Page:\s*\d+/i.test(line)) continue;
    const match = line.match(pattern);
    if (!match) {
      if (/G\s*[•·.:]/iu.test(line)) throw new Error(`Could not read a card row: ${line.slice(0, 160)}. Nothing was saved.`);
      continue;
    }
    matched++;
    // The first icon describes format/edition; the second is a tag/lock marker.
    const sourceIcon = match[1];
    let type = null;
    let isEvent = null;
    if (/standar[dt]2d/i.test(sourceIcon)) { type = '2D'; isEvent = false; }
    else if (/event3d/i.test(sourceIcon)) { type = '3D'; isEvent = true; }
    else if (/x3dver/i.test(sourceIcon)) { type = '3D'; }
    else if (/event2d/i.test(sourceIcon)) { type = '2D'; isEvent = true; }
    else if (/gif/i.test(sourceIcon)) { type = 'GIF'; }
    const element = elements[match[4].toLowerCase()] ?? '';
    const code = codeKey(match[3]);
    const gen = Number(match[5].replaceAll(',', ''));
    if (!Number.isSafeInteger(gen) || gen < 1) throw new Error(`Invalid generation for ${code}.`);
    const series = match[7].trim().replace(/^\*([\s\S]*)\*$/, '$1').trim();
    const character = match[6].trim().replace(/^\*\*([\s\S]*)\*\*$/, '$1').trim();
    const card = { code, character, series, gen, type, isEvent, element, sourceIcon, seriesNeedsReview: truncated(series) };
    if (cards.has(code)) warnings.push(`Repeated ${code}: keeping its last pasted occurrence.`);
    cards.set(code, card);
  }
  if (!matched) throw new Error('No cards found. Paste the collection rows as copied from Discord; plain text or Markdown both work.');
  const generationMarkers = [...plain.matchAll(/(?:^|\s)G\s*[•·.:]/giu)].length;
  if (generationMarkers !== matched) throw new Error(`Read ${matched} cards but found ${generationMarkers} generation markers. A row has a different format; nothing was saved.`);
  const footers = [...text.matchAll(/Page:\s*(\d+)\s*\/\s*(\d+)\s*\|\s*Total cards:\s*(\d+)/gi)].map(m => ({ page: +m[1], pages: +m[2], total: +m[3] }));
  const footer = footers.at(-1) ?? null;
  if (footer && footer.pages === 1 && cards.size < footer.total) warnings.push(`The footer reports ${footer.total} cards, but this paste contains ${cards.size}.`);
  for (const c of cards.values()) {
    if (c.seriesNeedsReview) warnings.push(`${c.code}: Sofi shortened the series name. You can fill it in; it has not been guessed.`);
    if (!c.type) warnings.push(`${c.code}: edition icon ${c.sourceIcon || '(missing)'} needs review; type is left unspecified.`);
  }
  return { cards: [...cards.values()], warnings, footer, matched };
}

export function parseCodeList(text) {
  if (typeof text !== 'string' || text.length > 8_000_000) throw new Error('Paste up to 8 MB of codes or collection rows.');
  // Full collection rows are parsed as rows, so character names/footer numbers
  // cannot accidentally become codes. Bare code lists accept common separators.
  const codes = /G\s*[•·.:]/iu.test(text)
    ? parseCollection(text).cards.map(c => c.code)
    : (text.match(/[a-z\d]+/gi) ?? []).filter(c => c.length <= 32).map(codeKey);
  if (!codes.length) throw new Error('Paste card codes, or the copied collection rows for this tag.');
  return [...new Set(codes)];
}

export function applyTag(cards, codes, name, { remove = false } = {}) {
  const tag = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (!tag || tag.length > 100 || tag.includes(',')) throw new Error('Enter one tag name, up to 100 characters, without commas.');
  const selected = new Set(codes.map(codeKey));
  const known = new Set(cards.map(c => codeKey(c.code)));
  let matched = 0;
  const result = cards.map(card => {
    if (!selected.has(codeKey(card.code))) return card;
    matched++;
    const tags = card.tags ?? [];
    return { ...card, tags: remove ? tags.filter(t => t.toLowerCase() !== tag) : [...new Set([...tags, tag])] };
  });
  return { cards: result, matched, unknown: [...selected].filter(c => !known.has(c)), tag };
}

function isImagePath(value) {
  if (/^\/assets\/imgs\/sofi\/[a-z\d]+\.(png|jpe?g|webp|gif|avif)$/i.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
}

export function linkHostedImages(cards, text, base, extension) {
  let url;
  try { url = new URL(String(base).trim()); } catch { throw new Error('Enter the public HTTPS image-folder URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS folder URL without login details, query parameters or a fragment.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  const ext = '.' + String(extension).replace(/^\./, '').toLowerCase();
  if (!imageExtensions.has(ext)) throw new Error('Choose PNG, JPG, JPEG, WebP, GIF or AVIF.');
  const codes = String(text ?? '').trim() ? parseCodeList(text) : cards.filter(c => !c.image).map(c => c.code);
  const selected = new Set(codes);
  const known = new Set(cards.map(c => c.code));
  let matched = 0;
  const result = cards.map(c => {
    if (!selected.has(c.code)) return c;
    matched++;
    return { ...c, image: new URL(`${c.code}${ext}`, url).href };
  });
  return { cards: result, matched, unknown: codes.filter(c => !known.has(c)), base: url.href };
}

export function validateCard(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid card record.');
  const code = codeKey(value.code);
  if (!/^[a-z\d]{1,32}$/.test(code)) throw new Error('Card codes must be 1–32 letters or numbers.');
  if (typeof value.character !== 'string' || !value.character.trim()) throw new Error(`${code}: a character name is required.`);
  if (value.gen !== null && (!Number.isSafeInteger(value.gen) || value.gen < 1)) throw new Error(`${code}: use a positive whole number for gen.`);
  if (value.type !== null && !['2D', '3D', 'GIF'].includes(value.type)) throw new Error(`${code}: unsupported card type.`);
  if (value.isEvent !== null && typeof value.isEvent !== 'boolean') throw new Error(`${code}: invalid event flag.`);
  const stringFields = ['series', 'element', 'sourceIcon', 'event', 'frame', 'glow', 'note', 'image'];
  for (const field of stringFields) if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > 20_000)) throw new Error(`${code}: invalid ${field}.`);
  if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.some(t => typeof t !== 'string' || t.length > 100))) throw new Error(`${code}: invalid tags.`);
  if (value.favourite !== undefined && typeof value.favourite !== 'boolean') throw new Error(`${code}: invalid favourite flag.`);
  if (value.image && !isImagePath(value.image)) throw new Error(`${code}: use a saved image in /assets/imgs/sofi/ or a public HTTPS image URL.`);
  return { code, character: value.character.trim(), series: value.series ?? '', gen: value.gen, type: value.type, isEvent: value.isEvent,
    element: value.element ?? '', sourceIcon: value.sourceIcon ?? '', seriesNeedsReview: truncated(value.series ?? ''),
    event: value.event ?? '', frame: value.frame ?? '', glow: value.glow ?? '', note: value.note ?? '', image: value.image ?? '',
    tags: [...new Set(value.tags ?? [])], favourite: value.favourite ?? false };
}

export function mergeCards(existing, incoming, { reviewed = false } = {}) {
  const map = new Map(existing.map(c => [codeKey(c.code), validateCard(c)]));
  for (const fresh of incoming) {
    const code = codeKey(fresh.code);
    const old = map.get(code);
    let combined = { ...old, ...fresh, code };
    if (old && !reviewed) {
      // A later collection paste does not erase corrected/curated details.
      if (truncated(fresh.series) && !old.seriesNeedsReview && old.series) combined.series = old.series;
      if (fresh.type === null) combined.type = old.type;
      if (fresh.isEvent === null) combined.isEvent = old.isEvent;
    }
    map.set(code, validateCard(combined));
  }
  return [...map.values()].sort((a, b) => a.character.localeCompare(b.character) || a.code.localeCompare(b.code));
}

export async function matchImages(cards, directory) {
  let files;
  try { files = await readdir(directory, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT') return cards; throw e; }
  const byCode = new Map();
  for (const f of files) {
    if (!f.isFile()) continue;
    const ext = path.extname(f.name).toLowerCase();
    const key = codeKey(path.basename(f.name, path.extname(f.name)));
    if (!imageExtensions.has(ext) || !/^[a-z\d]+$/.test(key)) continue;
    const list = byCode.get(key) ?? [];
    byCode.set(key, [...list, f.name]);
  }
  return cards.map(card => {
    // Explicit hosted artwork takes priority over old local files.
    if (/^https:\/\//i.test(card.image ?? '')) return card;
    const options = byCode.get(codeKey(card.code)) ?? [];
    const existingName = card.image?.split('/').at(-1);
    const name = options.includes(existingName) ? existingName : options.sort()[0];
    return name ? { ...card, image: `/assets/imgs/sofi/${name}` } : card;
  });
}
