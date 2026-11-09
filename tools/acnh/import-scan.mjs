/**
 * Hopscotch scanner import.
 *
 *   node tools/acnh/import-scan.mjs critters tools/acnh/latest-scan.txt
 *   node tools/acnh/import-scan.mjs catalog  ~/Downloads/catalog.txt
 *   node tools/acnh/import-scan.mjs recipes  ~/Downloads/recipes.txt
 *   node tools/acnh/import-scan.mjs reactions ~/Downloads/reactions.txt
 *   node tools/acnh/import-scan.mjs music     ~/Downloads/songs.txt
 *
 * A scan is a plain-text file of names (one per line), copied from nook.lol.
 * Imports merge by default. Add --replace for a complete catalogue rescan.
 * This never marks a caught critter as donated; previously recorded donations are retained.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fish = new Set(`Bitterling|Pale chub|Crucian carp|Dace|Carp|Koi|Goldfish|Pop-eyed goldfish|Ranchu goldfish|Killifish|Crawfish|Soft-shelled turtle|Snapping turtle|Tadpole|Frog|Freshwater goby|Loach|Catfish|Giant snakehead|Bluegill|Yellow perch|Black bass|Tilapia|Pike|Pond smelt|Sweetfish|Cherry salmon|Char|Golden trout|Stringfish|Salmon|King salmon|Mitten crab|Guppy|Nibble fish|Angelfish|Betta|Neon tetra|Rainbowfish|Piranha|Arowana|Dorado|Gar|Arapaima|Saddled bichir|Sturgeon|Sea butterfly|Sea horse|Clown fish|Surgeonfish|Butterfly fish|Napoleonfish|Zebra turkeyfish|Blowfish|Puffer fish|Anchovy|Horse mackerel|Barred knifejaw|Sea bass|Red snapper|Dab|Olive flounder|Squid|Moray eel|Ribbon eel|Tuna|Blue marlin|Giant trevally|Mahi-mahi|Ocean sunfish|Ray|Saw shark|Hammerhead shark|Great white shark|Whale shark|Suckerfish|Football fish|Oarfish|Barreleye|Coelacanth`.toLowerCase().split('|'));
const sea = new Set(`Seaweed|Sea grapes|Sea cucumber|Sea pig|Sea star|Sea urchin|Slate pencil urchin|Sea anemone|Moon jellyfish|Sea slug|Pearl oyster|Mussel|Oyster|Scallop|Whelk|Turban shell|Abalone|Gigas giant clam|Chambered nautilus|Octopus|Umbrella octopus|Vampire squid|Firefly squid|Gazami crab|Dungeness crab|Snow crab|Red king crab|Acorn barnacle|Spider crab|Tiger prawn|Sweet shrimp|Mantis shrimp|Spiny lobster|Lobster|Giant isopod|Horseshoe crab|Sea pineapple|Spotted garden eel|Flatworm|Venus' flower basket`.toLowerCase().split('|'));
const bugs = new Set(`Common butterfly|Yellow butterfly|Tiger butterfly|Peacock butterfly|Common bluebottle|Paper kite butterfly|Great purple emperor|Monarch butterfly|Emperor butterfly|Agrias butterfly|Rajah Brooke's birdwing|Queen Alexandra's birdwing|Moth|Atlas moth|Madagascan sunset moth|Long locust|Migratory locust|Rice grasshopper|Grasshopper|Cricket|Bell cricket|Mantis|Orchid mantis|Honeybee|Wasp|Brown cicada|Robust cicada|Giant cicada|Walker cicada|Evening cicada|Cicada shell|Red dragonfly|Darner dragonfly|Banded dragonfly|Damselfly|Firefly|Mole cricket|Pondskater|Diving beetle|Giant water bug|Stinkbug|Man-faced stink bug|Ladybug|Tiger beetle|Jewel beetle|Violin beetle|Citrus long-horned beetle|Rosalia batesi beetle|Blue weevil beetle|Dung beetle|Earth-boring dung beetle|Scarab beetle|Drone beetle|Goliath beetle|Saw stag|Miyama stag|Giant stag|Rainbow stag|Cyclommatus stag|Golden stag|Giraffe stag|Horned dynastid|Horned atlas|Horned elephant|Horned hercules|Walking stick|Walking leaf|Bagworm|Ant|Hermit crab|Wharf roach|Fly|Mosquito|Flea|Snail|Pill bug|Centipede|Spider|Tarantula|Scorpion`.toLowerCase().split('|'));
const aliases = {"rajah brooke's birdwing": 'rajah_brookes_birdwing', "queen alexandra's birdwing": 'queen_alexandras_birdwing'};
const normalize = input => input.trim().toLowerCase().replace(/\u2019/g, "'").replace(/\s+/g, ' ');
const slug = input => aliases[normalize(input)] || normalize(input).replace(/[.'’]/g, '').replaceAll(' ', '_');

const args = process.argv.slice(2);
let mode = ['critters', 'catalog', 'recipes', 'reactions', 'music'].includes(args[0]) ? args.shift() : 'critters';
const replace = args.includes('--replace');
const filename = args.find(arg => !arg.startsWith('--')) || (mode === 'critters' ? 'tools/acnh/latest-scan.txt' : null);
if (!filename) throw new Error('Please supply a scan text file; see the usage comment above.');
const content = await readFile(resolve(filename), 'utf8');
const names = [...new Map(content.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => [normalize(s), s])).values()];
if (!names.length) throw new Error('Nothing found in the scan file.');

if (mode === 'critters') {
  const grouped = { fish: [], bugs: [], sea: [] };
  const unknown = [];
  for (const name of names) {
    const key = normalize(name);
    if (fish.has(key)) grouped.fish.push(name);
    else if (sea.has(key)) grouped.sea.push(name);
    else if (bugs.has(key)) grouped.bugs.push(name);
    else unknown.push(name);
  }
  if (unknown.length) {
    throw new Error(`Unknown critter names: ${unknown.join(', ')}. Please check the scan text before importing.`);
  }
  const target = resolve('content/_data/acnh/museumProgress.json');
  const progress = JSON.parse(await readFile(target, 'utf8'));
  for (const type of ['fish', 'bugs', 'sea']) {
    progress[type] ||= {};
    for (const name of grouped[type]) {
      const key = slug(name);
      const previous = progress[type][key];
      // The camera sees *caught*, not necessarily *donated*.
      const existing = previous && typeof previous === 'object' ? previous : previous === true ? { caught: true, donated: true } : {};
      progress[type][key] = { ...existing, caught: existing.caught || true };
    }
  }
  await writeFile(target, JSON.stringify(progress, null, 2) + '\n');
  console.log(`Imported ${names.length} caught: ${grouped.fish.length} fish, ${grouped.bugs.length} bugs, ${grouped.sea.length} sea creatures.`);
  console.log('Existing donation history, fossils and art were preserved.');
} else {
  const target = resolve('content/_data/acnh/collections.json');
  const collections = JSON.parse(await readFile(target, 'utf8'));
  collections[mode] ||= { label: mode, obtained: [], favourites: [], total: null, scanDate: '' };
  const old = collections[mode].obtained || [];
  // Merge multiple category scans without deleting earlier finds.
  const next = replace ? names : [...old, ...names];
  collections[mode].obtained = [...new Map(next.map(value => [normalize(value), value])).values()].sort((a, b) => a.localeCompare(b));
  collections[mode].scanDate = new Date().toISOString().slice(0, 10);
  await writeFile(target, JSON.stringify(collections, null, 2) + '\n');
  console.log(`Updated ${mode}: ${collections[mode].obtained.length} unique items tracked (${names.length} in this scan).`);
  console.log('Pinned favourites and optional category totals were preserved.');
}
