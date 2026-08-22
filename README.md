# TheOnlyFrogs 🐸💗

> my little corner of the internet — collections, games, shrines, frogs, and whatever else i'm obsessed with

\

🌐 **[theonlyfrogs.com](https://theonlyfrogs.com)**

---

## 🌷 about

**TheOnlyFrogs** is my personal website.

It isn't a portfolio, a brand, or a product. It's closer to a digital bedroom / scrapbook / overgrown folder of things I love.

The site mixes old-web inspiration with way too much JavaScript and a collection of little systems I've built for tracking my hobbies.

Expect:

* 🐸 frogs
* 🎮 games and game collections
* ✨ Pokémon shiny hunting
* 🌱 Animal Crossing
* ⚔️ Final Fantasy XIV
* 💿 CDs and physical media
* 🎵 music
* 📺 anime, films and TV
* 🏆 achievements
* 📝 personal pages and logs
* 💗 pink things
* 🌐 classic personal-web nonsense

It changes constantly because that is half the fun.

---

## 🏡 main areas

### 🐸 Home

The main site is a messy little overview of whatever I'm currently doing, playing, watching or listening to.

Some of the data is pulled automatically from external services so the site can update without me manually editing everything.

---

### 🎮 Games

My game collection lives under `/games/`.

The collection covers modern and older platforms including things like:

* Nintendo Switch / Switch 2
* Nintendo 3DS
* Nintendo DS
* Game Boy Advance
* Wii
* PlayStation Vita
* PS3 / PS4 / PS5
* Xbox
* PC

Game data is maintained separately from presentation data, with cached metadata used where possible so builds aren't completely dependent on external APIs behaving themselves.

---

### ✨ Pokémon Shrine

`/shrines/pokemon/`

One of the largest parts of the site.

It includes things such as:

* shiny collection / diary
* shiny hunt data
* recent catches
* generation and game views
* Living Dex-style progress
* favourite shiny categories
* pink Pokémon
* cute Pokémon
* goth / witchy Pokémon
* frogs, obviously
* Hall of Fame
* Pokémon collection / Poké Shelf
* records and little achievements

A lot of the collection data is designed to live in one master dataset rather than being duplicated across individual pages.

---

### 🌱 Animal Crossing

`/shrines/animalcrossing/`

Home to my various Animal Crossing projects.

#### City Folk

Includes:

* journal
* chores
* turnip tracking
* fish and bug tracking
* availability tools
* RetroAchievements progress

#### New Leaf

A long-term **100% completion diary**, including museum progress, critters, tools, friendship and other goals.

---

### ⚔️ Final Fantasy XIV

`/shrines/finalfantasyxiv/`

My increasingly unreasonable FFXIV personal dashboard.

It includes things such as:

* character progress
* achievement tracking
* long-haul achievement hunts
* weekly / daily activities
* currencies
* gil goals
* glam hunts
* orchestrion tracking
* relic progress
* collection goals

Some FFXIV data is generated with local helper scripts before being displayed by Eleventy.

---

### 💿 Collections

The site is also home to various physical and digital collections.

These include:

* CDs via Discogs
* games
* physical films and TV
* anime
* Steam activity
* RetroAchievements

The goal isn't to create a perfect database.

I just like looking at all my stuff.

---

## 🎀 tech stack

### Core

* **[Eleventy](https://www.11ty.dev/)** — static site generator
* **Nunjucks** — templating
* **Node.js** — data fetching and build scripts
* **JavaScript**
* **CSS**
* **Markdown**
* **Neocities** — hosting
* **GitHub Actions** — automated builds and deployment

### Data & services

Different parts of the site use or have used services including:

| Thing           | Source                     |
| --------------- | -------------------------- |
| 🎵 Music        | Last.fm                    |
| 💿 CDs          | Discogs                    |
| 🎮 Games        | Google Sheets + TheGamesDB |
| 🎬 Movies & TV  | Simkl                      |
| 📚 Anime        | MyAnimeList                |
| 🏆 Achievements | RetroAchievements          |
| 🎮 PC activity  | Steam                      |
| ⚔️ FFXIV        | Local data / scripts       |

External data is generally fetched at build time or cached locally rather than loaded directly in the browser.

---

## 📁 project structure

```text
.
├── content/
│   ├── _data/              # Eleventy global data + API/data loaders
│   ├── _includes/          # layouts, templates and components
│   ├── _scripts/           # fetchers, exporters and utilities
│   ├── assets/             # CSS, JS, images and other assets
│   ├── blog/               # blog posts
│   ├── games/              # game collection pages
│   ├── interests/          # current interests / activity
│   ├── shrines/            # Pokémon, Animal Crossing, FFXIV, etc.
│   └── index.njk           # homepage
│
├── .cache/                 # selected cached external data
├── eleventy.config.mjs
├── package.json
└── README.md
```

Eleventy reads from:

```text
content/
```

and builds the finished site into:

```text
public/
```

---

## 🛠️ local setup

### Requirements

You'll need a recent version of:

* Node.js
* npm
* Git

Then:

```bash
git clone https://github.com/violetfulton/theonlyfrogs.git
cd theonlyfrogs

npm ci
```

Start the local Eleventy server:

```bash
npm start
```

The site will normally be available at:

```text
http://localhost:8080
```

---

## 🏗️ build

Create a production build with:

```bash
npm run build
```

The generated site is written to:

```text
public/
```

---

## 🐸 useful scripts

### Start the development server

```bash
npm start
```

### Build the site

```bash
npm run build
```

### Refresh Discogs data

```bash
npm run fetch:discogs
```

### Refresh Animal Crossing: City Folk RetroAchievements data

```bash
npm run fetch:accf-ra
```

---

## 🔐 environment variables

Some site features depend on API keys or account information stored in environment variables.

The exact variables depend on which data sources are currently enabled, but secrets belong in a local `.env` file and **must not be committed to Git**.

For example:

```env
DISCOGS_USERNAME=
DISCOGS_TOKEN=

STEAM_API_KEY=
STEAM_USER_ID=

MAL_CLIENT_ID=

RA_WEB_API_KEY=

THEGAMESDB_API_KEY=

NEOCITIES_API_KEY=
```

Some integrations may require additional variables.

Local credentials and service-account files are excluded from version control.

---

## 🧊 caching

Several external data sources are cached to make builds quicker and less fragile.

This is especially useful for APIs with:

* rate limits
* slow responses
* temporary outages
* large collections that rarely change

TheGamesDB data in particular is intentionally kept in its dedicated cache so the site can build without repeatedly requesting the entire game collection.

---

## 🚀 deployment

The site is deployed to **Neocities**.

GitHub Actions handles automated production builds and deployment, so changes pushed to the main repository can be built without manually uploading the generated `public/` directory.

Build output and local dependencies are ignored by Git.

---

## 🌐 why?

Because I miss websites that felt like they belonged to a person.

I like pages with too many graphics.

I like collections.

I like shrines dedicated to one extremely specific thing.

I like making unnecessary trackers for video games.

I like websites that grow sideways instead of being redesigned into a startup landing page.

And I really like frogs.

So this exists.

---

### 🐸 theonlyfrogs.com 🐸

**made with frogs, pink pixels, questionable amounts of JavaScript,**
**and an ever-increasing number of spreadsheets**

💗
