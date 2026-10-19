import { codeKey } from './cards.mjs';

export function labelEvent(cards, codes, name, { clearName = false } = {}) {
  const event = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (!clearName && !/^[a-z][a-z\d_-]{0,31}$/.test(event)) throw new Error('Enter one event code, such as hal25 or mon26 (letters, numbers, hyphens or underscores).');
  const selected = new Set(codes.map(codeKey));
  const known = new Set(cards.map(card => codeKey(card.code)));
  let matched = 0; let renamed = 0;
  const result = cards.map(card => {
    if (!selected.has(codeKey(card.code))) return card;
    matched++;
    if (card.event && card.event.toLowerCase() !== event) renamed++;
    return clearName ? { ...card, event: '' } : { ...card, event, isEvent: true };
  });
  return { cards: result, event: clearName ? '' : event, matched, renamed, cleared: clearName, unknown: [...selected].filter(code => !known.has(code)) };
}
