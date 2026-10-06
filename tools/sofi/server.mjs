import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCollection, parseCodeList, applyTag, linkHostedImages, mergeCards, matchImages, validateCard, imageExtensions, codeKey } from './cards.mjs';
import { matchFrogPond, readFrogPond } from './frog-pond.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const dataFile = path.join(root, 'content/_data/sofiCards.json');
const imageDir = path.join(root, 'content/assets/imgs/sofi');
const token = randomBytes(24).toString('hex');
const port = Number(process.env.SOFI_IMPORT_PORT || 4178);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SOFI_IMPORT_PORT.');
const origin = `http://127.0.0.1:${port}`;
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
let saving = false;

async function readCards() {
  try {
    const data = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!Array.isArray(data)) throw new Error('sofiCards.json must be an array.');
    return data.map(validateCard);
  } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

function imagePayload(image, validCodes) {
  if (!image || typeof image.name !== 'string' || typeof image.base64 !== 'string') throw new Error('Invalid image upload.');
  const ext = path.extname(image.name).toLowerCase();
  const code = codeKey(path.basename(image.name, path.extname(image.name)));
  if (!imageExtensions.has(ext) || !validCodes.has(code) || !/^[a-z\d]+$/.test(code)) throw new Error(`${image.name}: name the image after a card code, e.g. adam.png.`);
  if (!/^[a-z\d+/]*={0,2}$/i.test(image.base64) || image.base64.length > 14_000_000) throw new Error(`${image.name}: invalid or oversized image (maximum 10 MB).`);
  const buffer = Buffer.from(image.base64, 'base64');
  if (!buffer.length || buffer.length > 10_000_000) throw new Error(`${image.name}: image must be between 1 byte and 10 MB.`);
  let valid = false;
  if (ext === '.png') valid = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (ext === '.jpg' || ext === '.jpeg') valid = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (ext === '.gif') valid = ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
  if (ext === '.webp') valid = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (ext === '.avif') valid = buffer.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(buffer.toString('ascii', 8, 32));
  if (!valid) throw new Error(`${image.name}: the file bytes do not match this image extension.`);
  return { name: `${code}${ext}`, code, buffer };
}

async function body(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 32_000_000) throw new Error('Import at most 32 MB per save. Split larger image batches into separate saves.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(res, status, value, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin' });
  res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 403, { error: 'Open the exact local URL printed in the terminal.' });
    const url = new URL(req.url, origin);
    if (req.method === 'GET' && url.pathname === '/') {
      const html = (await readFile(path.join(here, 'import.html'), 'utf8')).replace('__SOFI_TOKEN__', token);
      return send(res, 200, html, 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/cards') return send(res, 200, { cards: await matchImages(await readCards(), imageDir) });
    if (req.method === 'GET' && url.pathname.startsWith('/assets/imgs/sofi/')) {
      const name = url.pathname.slice('/assets/imgs/sofi/'.length);
      if (!/^[a-z\d]+\.(png|jpe?g|webp|gif|avif)$/i.test(name)) return send(res, 404, { error: 'Image not found.' });
      return send(res, 200, await readFile(path.join(imageDir, name)), mime[path.extname(name).toLowerCase()]);
    }
    if (req.method !== 'POST' || !['/api/preview', '/api/tags', '/api/images', '/api/pond-folders', '/api/pond-images', '/api/pond-export', '/api/save'].includes(url.pathname)) return send(res, 404, { error: 'Not found.' });
    if (req.headers.origin !== origin || req.headers['x-sofi-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return send(res, 403, { error: 'Use the local import screen to save.' });
    const input = await body(req);
    if (url.pathname === '/api/pond-folders') return send(res, 200, await readFrogPond(input, 'folders'));
    if (['/api/pond-images', '/api/pond-export'].includes(url.pathname)) {
      if (!Array.isArray(input.cards)) throw new Error('Load or import your cards first.');
      const listing = url.pathname === '/api/pond-images' ? await readFrogPond(input, 'images') : input.listing;
      return send(res, 200, matchFrogPond(input.cards.map(validateCard), listing, input.publicBase, { replace: input.replace === true }));
    }
    if (url.pathname === '/api/images') {
      if (!Array.isArray(input.cards)) throw new Error('Load or import your cards first.');
      return send(res, 200, linkHostedImages(input.cards.map(validateCard), input.text, input.base, input.extension));
    }
    if (url.pathname === '/api/tags') {
      if (!Array.isArray(input.cards)) throw new Error('Load or import your cards first.');
      const result = applyTag(input.cards.map(validateCard), parseCodeList(input.text), input.tag, { remove: input.remove === true });
      return send(res, 200, result);
    }
    if (url.pathname === '/api/preview') {
      const parsed = parseCollection(input.text);
      if (input.cards !== undefined && !Array.isArray(input.cards)) throw new Error('Invalid current collection.');
      const current = mergeCards(await readCards(), (input.cards ?? []).map(validateCard), { reviewed: true });
      const cards = await matchImages(mergeCards(current, parsed.cards), imageDir);
      return send(res, 200, { ...parsed, cards });
    }
    if (saving) return send(res, 409, { error: 'A save is in progress. Try again after it finishes.' });
    saving = true;
    try {
      if (!Array.isArray(input.cards) || !Array.isArray(input.images)) throw new Error('Invalid save.');
      const reviewed = input.cards.map(validateCard);
      let cards = mergeCards(await readCards(), reviewed, { reviewed: true });
      const codes = new Set(cards.map(c => c.code));
      const images = input.images.map(i => imagePayload(i, codes));
      if (new Set(images.map(i => i.code)).size !== images.length) throw new Error('Select one image per card code in each save.');
      await mkdir(imageDir, { recursive: true });
      await mkdir(path.dirname(dataFile), { recursive: true });
      const backup = path.join(here, 'backups', new Date().toISOString().replaceAll(':', '-'));
      await mkdir(backup, { recursive: true });
      try { await copyFile(dataFile, path.join(backup, 'sofiCards.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      for (const image of images) {
        const destination = path.join(imageDir, image.name);
        try { await copyFile(destination, path.join(backup, image.name)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
        const temporary = `${destination}.tmp-${token}`;
        await writeFile(temporary, image.buffer);
        await rename(temporary, destination);
        cards = cards.map(c => c.code === image.code ? { ...c, image: `/assets/imgs/sofi/${image.name}` } : c);
      }
      cards = await matchImages(cards, imageDir);
      const temporary = `${dataFile}.tmp-${token}`;
      await writeFile(temporary, `${JSON.stringify(cards, null, 2)}\n`);
      await rename(temporary, dataFile);
      return send(res, 200, { cards, imagesSaved: images.length, message: `Saved ${cards.length} cards and ${images.length} images. Rebuild the website to publish them.` });
    } finally { saving = false; }
  } catch (e) { send(res, e.code === 'ENOENT' ? 404 : 400, { error: e.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`🐸 Sofi importer: ${origin}\nPaste collection text, review cards, attach images and save.\nPress Ctrl+C when finished. The site still needs its usual build/deploy.`));
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy. Stop the other importer, or set SOFI_IMPORT_PORT to another port.` : e.message); process.exitCode = 1; });
