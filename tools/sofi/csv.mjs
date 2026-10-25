import { codeKey, mergeCards, validateCard } from './cards.mjs';

// Parse quoted commas, escaped quotes and embedded newlines without dependencies.
function records(source) {
  if (typeof source !== 'string' || source.length > 16_000_000) throw new Error('Choose a Sofi CSV export smaller than 16 MB.');
  source = source.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let field = ''; let quoted = false; let closed = false;
  const cell = () => { row.push(field); field = ''; closed = false; };
  const record = () => { cell(); if (row.some(value => value.trim())) rows.push(row); row = []; };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += c;
      continue;
    }
    if (c === ',') { cell(); continue; }
    if (c === '\r' || c === '\n') { record(); if (c === '\r' && source[i + 1] === '\n') i++; continue; }
    if (closed) {
      if (c === ' ' || c === '\t') continue;
      throw new Error(`CSV record ${rows.length + 1}: unexpected text after a quoted field.`);
    }
    if (c === '"') {
      if (field) throw new Error(`CSV record ${rows.length + 1}: quote inside an unquoted field.`);
      quoted = true;
    } else field += c;
  }
  if (quoted) throw new Error('CSV has an unfinished quoted field. Export the file again; nothing was saved.');
  if (field || row.length || closed) record();
  return rows;
}

const missing = value => !value || value.toLowerCase() === 'n/a';
const elementNames = new Map(['earth', 'fire', 'ice', 'light', 'metal', 'void', 'wind', 'wood'].map(name => [name, name[0].toUpperCase() + name.slice(1)]));
// Violet's collection groups identify the event format in this export.
const eventFormats = new Map([['event', '2D'], ['eventkeep', '2D'], ['ev3d', '3D']]);

export function parseSofiCSV(text) {
  const rows = records(text);
  if (rows.length < 2) throw new Error('Choose a Sofi collection CSV with a header and at least one card.');
  const headers = rows.shift().map(value => value.trim().toLowerCase());
  if (headers.some(name => !name) || new Set(headers).size !== headers.length) throw new Error('CSV column names must be present and unique.');
  for (const key of ['code', 'name', 'series', 'gen', 'element', 'tagname']) if (!headers.includes(key)) throw new Error(`CSV is missing the ${key} column. Use the Sofi collection export.`);
  const columns = new Map(headers.map((name, i) => [name, i]));
  const cards = []; const seen = new Set(); const dimensions = new Map(); const tagCounts = new Map();
  let unspecified = 0;
  for (const [index, row] of rows.entries()) {
    const label = `CSV record ${index + 2}`;
    if (row.length !== headers.length) throw new Error(`${label}: expected ${headers.length} columns but found ${row.length}. Nothing was saved.`);
    const value = name => columns.has(name) ? row[columns.get(name)].trim() : '';
    const code = codeKey(value('code'));
    if (!/^[a-z\d]{1,32}$/.test(code)) throw new Error(`${label}: invalid card code.`);
    if (seen.has(code)) throw new Error(`${label}: repeated card code ${code}. Resolve the duplicate before importing.`);
    seen.add(code);
    const character = value('name'), series = value('series');
    if (!character || !series) throw new Error(`${label} (${code}): character and series are required.`);
    const rawGen = value('gen');
    const gen = missing(rawGen) ? null : /^\d+$/.test(rawGen) ? Number(rawGen) : NaN;
    if (gen !== null && (!Number.isSafeInteger(gen) || gen < 1)) throw new Error(`${label} (${code}): generation must be a positive whole number or blank.`);
    if (gen === null) unspecified++;
    const rawElement = value('element').toLowerCase();
    if (!missing(rawElement) && !elementNames.has(rawElement)) throw new Error(`${label} (${code}): unknown element ${rawElement}.`);
    const tag = value('tagname');
    if (tag.length > 100 || tag.includes(',')) throw new Error(`${label} (${code}): expected one tag name, up to 100 characters.`);
    const tags = missing(tag) ? [] : [tag.toLowerCase()];
    for (const name of tags) tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
    const dimension = value('3d').toLowerCase();
    if (!missing(dimension)) {
      if (!['true', 'false'].includes(dimension)) throw new Error(`${label} (${code}): 3D must be true, false or blank.`);
      dimensions.set(code, dimension === 'true');
    }
    const eventType = eventFormats.get(tags[0]);
    const card = { code, character, series, gen, type: eventType ?? (dimension === 'true' ? '3D' : null), isEvent: Boolean(eventType), tags };
    if (elementNames.has(rawElement)) card.element = elementNames.get(rawElement);
    // A colour is usable as exported; numeric/custom frame IDs are not names.
    const glow = value('glow');
    if (!missing(glow)) {
      if (!/^#[a-f\d]{6}$/i.test(glow)) throw new Error(`${label} (${code}): expected a six-digit glow colour.`);
      card.glow = glow;
    }
    validateCard(card);
    cards.push(card);
  }
  const warnings = [];
  if (unspecified) warnings.push(`${unspecified} rows have no generation; saved generations are kept.`);
  if (cards.some(card => !card.isEvent && dimensions.get(card.code) === false)) warnings.push('Non-event cards with a false 3D flag do not distinguish 2D from GIF. Known 2D/GIF types are kept; others stay unspecified.');
  return { cards, matched: cards.length, warnings, dimensions, tagCounts: Object.fromEntries([...tagCounts].sort(([a], [b]) => a.localeCompare(b))) };
}

export function mergeSofiCSV(existing, parsed, { replaceTags = false } = {}) {
  const before = new Map(existing.map(card => [codeKey(card.code), validateCard(card)]));
  const imported = new Map(parsed.cards.map(card => [card.code, card]));
  const incoming = parsed.cards.map(card => {
    const old = before.get(card.code);
    const differentCharacter = Boolean(old && old.character.trim().toLowerCase() !== card.character.trim().toLowerCase());
    const result = { ...card, tags: differentCharacter || replaceTags ? card.tags : [...new Set([...(old?.tags ?? []), ...card.tags])],
      ...(differentCharacter ? { image: '', note: '', event: '', frame: '', glow: '', favourite: false, imageAutoMatch: false } : {}) };
    // Preserve personal descriptions of a glow rather than replacing with a hex.
    if (old?.glow && !differentCharacter) delete result.glow;
    return result;
  });
  const cards = mergeCards(existing, incoming).map(card => {
    const fresh = imported.get(card.code);
    if (fresh?.isEvent) return { ...card, type: fresh.type };
    if (!parsed.dimensions.has(card.code)) return card;
    if (parsed.dimensions.get(card.code)) return { ...card, type: '3D' };
    const oldType = before.get(card.code)?.type;
    return { ...card, type: ['2D', 'GIF'].includes(oldType) ? oldType : null };
  });
  const added = parsed.cards.filter(card => !before.has(card.code)).length;
  return { cards, added, updated: parsed.cards.length - added, retained: existing.filter(card => !imported.has(card.code)).length };
}
