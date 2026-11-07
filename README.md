# TheOnlyFrogs 🐸💗

> my little corner of the internet — collections, games, shrines, frogs, and whatever else i'm obsessed with

🌐 **[theonlyfrogs.com](https://theonlyfrogs.com)**

---

## 🌷 about

**TheOnlyFrogs** is my personal website: a digital bedroom / scrapbook / overgrown folder of things I love.

It mixes old-web inspiration, pink and green, little graphics, and an increasingly unreasonable collection of systems for tracking my hobbies.

Expect frogs, games, shiny Pokémon, Animal Crossing, Final Fantasy XIV, music, physical media, Sofi cards, achievements, and personal-web nonsense.

It changes constantly because that is half the fun.

## 🏡 around the pond

| Place | What's inside |
| --- | --- |
| [Home](https://theonlyfrogs.com/) | A little overview of me and whatever currently has my attention |
| [Currently](https://theonlyfrogs.com/interests/now/) | Playing, watching, listening, and other current interests |
| [Games](https://theonlyfrogs.com/games/) | Game library, platform pages, activity, and physical collection data |
| [Pokémon](https://theonlyfrogs.com/shrines/pokemon/) | Shinies, hunts, journeys, collection goals, and little victories |
| [Animal Crossing](https://theonlyfrogs.com/shrines/animalcrossing/) | City Folk, New Leaf, and New Horizons |
| [Final Fantasy XIV](https://theonlyfrogs.com/shrines/finalfantasyxiv/) | Aggro's achievements, wardrobe, trophy house, collections, and fishing |
| [Sofi](https://theonlyfrogs.com/sofi/) | My searchable card cabinet |
| [CDs](https://theonlyfrogs.com/cds/) | My Discogs collection |
| [Physical media](https://theonlyfrogs.com/dvds/) | Films, box sets, and seasons on my shelf |

## 🎮 games

My game pages bring together library information, play activity, platform views, and a separate physical collection.

Playnite exports provide library and activity data. Physical ownership is maintained separately through a CSV sheet: having something in Playnite doesn't automatically mean I own a physical copy.

Covers and metadata use local data and caches where available. There are Nintendo, PlayStation, PC, and older-platform corners to get lost in.

## ✨ Pokémon shrine

A home for shiny hunting and the very important business of collecting little creatures.

- Trainer profile and shiny diary
- Dex lists and collection progress
- Current hunts and game journeys
- Physical collection / Poké Shelf
- Records and little victories
- Favourite themes, including pink, cute, goth / witchy, and frogs

Collection data is kept together and reused across pages. Older Pokémon URLs redirect into the newer layout.

## 🌱 Animal Crossing

**City Folk:** a journal, chores, calendar, turnip tracker, critter tools, and RetroAchievements progress.

**New Leaf:** a long-term completion project and diary for all the tiny things that eventually add up to a whole town.

**New Horizons:** island pages, residents, museum progress, a diary, and an island-tour section.

## ⚔️ Final Fantasy XIV

My increasingly unreasonable personal dashboard for **Aggro Phobic**.

- Achievements and long-haul projects
- Daily and weekly checklists
- Mounts, minions, and orchestrion collections
- Gil goals and collectible shopping
- Aggro's Wardrobe, glamour hunts, and glam projects
- A trophy house museum, furniture goals, and aquariums
- Screenshots and memories
- **FroggyFish** 🎣

### 🐸 FroggyFish

[FroggyFish](https://theonlyfrogs.com/shrines/finalfantasyxiv/fishing/) tracks my big-fishing journey, with caught and missing totals, upcoming windows, search and filters, and a gallery of catches.

The page reads live data from a separate Cloudflare Worker API. In-game syncing and the companion Twitch / OBS integrations are separate parts of the FroggyFish project; running this website alone doesn't start them.

Fish windows are opportunities rather than guarantees. Bait, weather, and prerequisites still get the final say. Usually followed by a fish escaping.

## 🃏 Sofi card cabinet

My Sofi collection lives at `/sofi/`, with character, series, and code search, collection tags, event filters, sorting, and paginated browsing.

The page starts with a small HTML preview and loads the full collection from `/sofi/cards.json`. It renders a page of cards at a time so the browser doesn't have to hold the entire cabinet open at once.

Card data lives in `content/_data/sofiCards.json`; local import and collection tools live in `tools/sofi/`.

## 💿 collections and activity

CDs, physical films and TV, anime, music, and game activity all have a place here.

I just like looking at all my stuff.

## 🎀 tech stack

| Part | Tools |
| --- | --- |
| Site generation | [Eleventy](https://www.11ty.dev/) 3.x |
| Templates | Nunjucks and Markdown |
| Data and scripts | Node.js, JavaScript, JSON, and CSV |
| Browser | CSS and JavaScript |
| Hosting | Neocities |
| Builds and deployment | GitHub Actions |
| Live fishing data | Separate FroggyFish Cloudflare Worker API |

### Data sources

Integrations vary by page and configuration:

| Thing | Source |
| --- | --- |
| Music | Last.fm |
| CDs | Discogs |
| Game library and activity | Playnite exports and Steam |
| Physical games | CSV sheet, with cover / metadata helpers |
| Game metadata | TheGamesDB and local caches |
| Watching and physical-media data | Simkl loaders; TMDb metadata where configured |
| Anime | MyAnimeList |
| Retro achievements | RetroAchievements |
| Pokémon | CSV sheets and local collection data |
| FFXIV | Local exports, manual data, and data loaders |
| Big fishing | FroggyFish API and Sisipu forecasts |
| Sofi | Local card exports and hosted artwork |

Much of the site is generated at build time. Some widgets fetch data in the browser, including FroggyFish, so a static site build doesn't freeze every widget until the next deploy.

## 📁 where things live

Source paths and public URLs aren't always the same: templates use `permalink` to choose their published address.

| Path | Purpose |
| --- | --- |
| `content/_data/` | Global data, exports, collections, and API loaders |
| `content/_includes/` | Layouts, partials, and reusable components |
| `content/_scripts/` | Data fetchers and helper scripts |
| `content/assets/` | CSS, JavaScript, images, and other assets |
| `content/interests/games/` | Game pages |
| `content/interests/shrines/` | Pokémon, Animal Crossing, FFXIV, and other shrines |
| `content/interests/shrines/xiv/` | FFXIV page templates |
| `content/interests/sofi/` | Sofi pages and generated card-data endpoint |
| `content/pages/` | About, statuses, wishlist, and other personal pages |
| `content/index.njk` | Homepage |
| `tools/sofi/` | Local Sofi management tools |
| `.cache/` | Cached external responses |
| `.github/workflows/neocities.yml` | Production build and deployment |
| `.nvmrc` | Project Node.js version |
| `eleventy.config.mjs` | Eleventy configuration |
| `public/` | Generated site output |

Eleventy reads `content/` and writes `public/`. Assets are copied from `content/assets/` to `public/assets/`.

## 🛠️ local setup

You'll need Git, Node.js, and npm. Using **nvm** makes it easy to match the Node version in `.nvmrc`.

```bash
mkdir -p ~/Code
cd ~/Code
git clone https://github.com/violetfulton/theonlyfrogs.git
cd theonlyfrogs

nvm install
nvm use
npm ci
```

If you're restoring an existing project backup, put it in `~/Code/theonlyfrogs` and skip the clone.

Restore or configure your local `.env` before starting the site. Some loaders require credentials; a fresh clone isn't guaranteed to build with an empty environment. In particular, the current Simkl loader requires `SIMKL_CLIENT_ID` and `SIMKL_ACCESS_TOKEN`.

```bash
npm start
```

Open **[localhost:8080](http://localhost:8080/)**, or the address printed by Eleventy. Leave the terminal running while editing; **Control+C** stops the preview.

## 🐸 useful commands

Run these from the project folder:

| Command | What it does |
| --- | --- |
| `npm start` | Start Eleventy with a local preview server |
| `npm run dev` | Alias for the same development server |
| `npm run build` | Generate the site in `public/` |
| `npm run build:fresh` | Refresh Discogs, then build the site |
| `npm run fetch:discogs` | Refresh Discogs collection data |
| `npm run fetch:accf-ra` | Refresh City Folk RetroAchievements data |
| `npm run fetch:game-covers` | Run the game-cover helper |
| `npm audit` | Check installed dependencies for known vulnerabilities |

`build:fresh` refreshes **Discogs**, not every integration or cache.

## 🔐 configuration

Keep local credentials in a root-level `.env` file. **Never commit API tokens, passwords, or private service-account files.**

Examples of configuration used by the site and its helpers:

```env
DISCOGS_USERNAME=
DISCOGS_TOKEN=

STEAM_API_KEY=
STEAM_USER_ID=

MAL_CLIENT_ID=
MAL_USERNAME=

SIMKL_CLIENT_ID=
SIMKL_ACCESS_TOKEN=
TMDB_API_KEY=

RA_USERNAME=
RA_WEB_API_KEY=
RA_CITY_FOLK_GAME_ID=

GAMES_CSV_URL=
PHYSICAL_GAMES_CSV_URL=
THEGAMESDB_API_KEY=

POKEMON_CAPTURES_CSV_URL=
POKEMON_HUNTS_CSV_URL=
POKEMON_DEX_LISTS_CSV_URL=
POKEMON_JOURNEYS_CSV_URL=
POKEMON_RECORDS_CSV_URL=
POKEMON_COLLECTION_CSV_URL=
```

This is a reference list, not a promise that every loader needs every value. Check the relevant loader when configuring an integration.

Playnite defaults to `content/_data/playnite-library.json`; `PLAYNITE_LIBRARY_PATH` can point to another export.

Production credentials and settings are supplied through GitHub Actions secrets and variables. `NEOCITIES_API_KEY` is a deployment secret, not a requirement for viewing the site locally. Local `.env` values are not automatically available to GitHub Actions.

## 🧊 caching and updates

Caches and local exports help with rate limits, slow responses, and services having a bad day. They don't make every integration fully offline.

The ignore rules exclude most of `.cache/` while allowing `.cache/thegamesdb/`. The deployment workflow sets `THEGAMESDB_OFFLINE=1`.

When updating dependencies, keep `package.json` and `package-lock.json` together. Check `npm audit`, run a build, and preview the affected pages before publishing. Helper scripts may need their own checks even when the normal build passes.

## 🚀 deployment

GitHub Actions builds the site and deploys `public/` to **Neocities**:

- On pushes to `main`
- When the workflow is started manually
- Every Monday at **05:15 UTC**

The workflow reads Node from `.nvmrc`, installs dependencies with `npm ci`, attempts a Discogs refresh, and runs the Eleventy build before deployment.

Edit source files in `content/`; generated pages in `public/` are build output. The repository's ignore rules cover build output and local dependencies.

## 🌐 why?

Because I miss websites that felt like they belonged to a person.

I like pages with too many graphics. I like collections. I like shrines dedicated to one extremely specific thing. I like making unnecessary trackers for video games.

I like websites that grow sideways.

And I really like frogs.

So this exists.

---

**made with frogs, pink pixels, questionable amounts of JavaScript,**  
**and an ever-increasing number of spreadsheets**

💗
