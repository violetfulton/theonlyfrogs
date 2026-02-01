# TheOnlyFrogs 🐸

> A personal website celebrating retro web culture, digital collections, and authentic self-expression

[![Built with Eleventy](https://img.shields.io/badge/built%20with-Eleventy-663399.svg?style=flat-square)](https://11ty.dev/)
[![Deployed on Neocities](https://img.shields.io/badge/deployed%20on-Neocities-FF6C6C.svg?style=flat-square)](https://neocities.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)

**🌐 Live Site:** https://theonlyfrogs.com

---

## ✨ What is this?

A nostalgic personal website inspired by early 2000s web culture, featuring:

🎵 **Live Music Widgets** – Now playing & recent tracks via Last.fm
🎮 **Game Collection** – Physical & owned games via RAWG API
🎬 **Movies & TV** – Physical collection & activity via Trakt + TMDb
📺 **Watching Now** – Current shows, seasons, and progress
🏆 **RetroAchievements** – Recently unlocked achievements
📚 **Anime Tracker** – MyAnimeList widget
📝 **Personal Blog** – Markdown-powered posts
🎨 **Retro Aesthetic** – Pixel fonts, frogs, glassy widgets, Y2K vibes

Basically: a digital scrapbook of everything I love.

---

## 🚀 Quick Start

```bash
git clone https://github.com/violetfulton/theonlyfrogs.git
cd theonlyfrogs
npm install

# Dev server
npm start
# http://localhost:8080

# Production build
npm run build
```

## 🛠️ Tech Stack

### Core
- **Eleventy (11ty)** – Static site generator (v3)
- **Nunjucks** – Templating
- **Node.js** – Data fetching & scripts
- **Neocities** – Hosting
- **GitHub Actions** – Auto deploy

### APIs & Services

| Purpose | Service |
|---------|---------|
| 🎵 Music tracking | Last.fm API |
| 💿 CD collection | Discogs API |
| 🎮 Game database | RAWG API |
| 🎬 Movies & TV | Trakt API |
| 🎥 Movie metadata | TMDb API |
| 🏆 Achievements | RetroAchievements API |
| 📚 Anime tracking | MyAnimeList API |
| 🎮 Steam widget | Steam Web API |
| 🎮 PlayStation | PSN API (unofficial) |
| 🎬 Diary | Letterboxd embed |

## 📁 Project Structure

```
content/
├── _data/           # API fetchers & caches
│   ├── discogs.js
│   ├── rawgOwned.js
│   ├── trakt.js
│   ├── malAnime.js
│   └── retroachievements.js
├── _scripts/        # One-off utilities (CSV → JSON, etc)
├── _includes/       # Layouts & components
├── assets/          # CSS, JS, fonts, images
├── blog/            # Markdown blog posts
├── interests/       # Games, movies, shrines
└── index.njk        # Homepage
```

## 🎯 Key Features

### 🎮 Game Collection (RAWG)
- Local `ownedGames.json` as source of truth
- Enriched via RAWG API at build time
- Grouped by platform (`/games/psvita/`)
- Automatic deduping by RAWG ID
- Cached per-game API calls

### 🎬 Movies & TV (Trakt)
Physical owned list synced from Trakt

**Modal UI with:**
- Poster
- Year
- Owned seasons
- Rating
- Trakt link

**"Watching now" widget with:**
- Current season + episode
- Last 3 movies watched

### 🏆 RetroAchievements
- Shows last 3 games played
- Only latest achievement per game

**Displays:**
- Game icon
- Achievement icon
- Console badge
- Hardcore badge
- "Unlocked 2 days ago"

### 🎵 Music Widgets
- Live now-playing via Last.fm
- Floating notes animation
- Recent tracks sidebar
- Steam-style visual layout

### 📚 Anime (MAL)
- Currently watching grid
- Episode progress pills
- Completed side column

## 🔧 Environment Variables

```bash
DISCOGS_TOKEN=
DISCOGS_USERNAME=

RAWG_API_KEY=

TRAKT_CLIENT_ID=
TRAKT_USER=

TMDB_API_KEY=

MAL_CLIENT_ID=
MAL_USERNAME=

RA_WEB_API_KEY=

STEAM_API_KEY=
STEAM_USER_ID=

NEOCITIES_API_KEY=
```

All APIs are fetched at build time and cached via `@11ty/eleventy-fetch`.

## 🧠 Design Philosophy

**This site is:**
- Not a portfolio
- Not a product
- Not optimised for growth

**It's:**
- A personal digital bedroom
- A living scrapbook
- A place where frogs, media collections, and nostalgia coexist

No algorithms. No feeds. Just vibes.

## 🔗 Links

- **Website:** https://theonlyfrogs.com
- **GitHub:** https://github.com/violetfulton

<div align="center">

Made with 💚, frogs, and way too many APIs
*Bringing back the personal web, one widget at a time* 🐸

</div>