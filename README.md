# TheOnlyFrogs 🐸

> A personal website celebrating retro web culture, digital collections, and authentic self-expression

[![Built with Eleventy](https://img.shields.io/badge/built%20with-Eleventy-663399.svg?style=flat-square)](https://11ty.dev/)
[![Deployed on Neocities](https://img.shields.io/badge/deployed%20on-Neocities-FF6C6C.svg?style=flat-square)](https://neocities.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)

**🌐 Live Site:** [theonlyfrogs.com](https://theonlyfrogs.com)

---

## ✨ What is this?

A nostalgic personal website inspired by early 2000s web culture, featuring:

🎵 **Dynamic Music Collection** - Real-time CD collection via Discogs API
🎮 **Gaming Libraries** - Organized by console with reviews and ratings
✨ **Fan Shrines** - Dedicated pages for beloved franchises and artists
🎬 **DVD & Movie Catalog** - TMDb-powered movie collection display
📝 **Personal Blog** - Thoughts and life updates with markdown posts
🎨 **Retro Aesthetic** - Dark themes, pixel fonts, and Y2K vibes

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/violetfulton/theonlyfrogs.git
cd theonlyfrogs
npm install

# Start development server
npm start
# Visit http://localhost:8080

# Build for production
npm run build
```

## 🛠️ Tech Stack

- **[Eleventy](https://11ty.dev/)** v3.0.0 - Static site generator
- **Nunjucks** - Templating engine
- **Discogs API** - Music collection data
- **Luxon** - Date formatting
- **Neocities** - Hosting platform
- **TMDb API** - Movie collection data

## 📁 Project Structure

```
content/
├── _data/           # Global data files (Discogs cache, site data)
├── _includes/       # Nunjucks templates and layouts
├── _scripts/        # Data fetching scripts
├── assets/          # CSS, fonts, images, and JavaScript
├── blog/            # Blog system and markdown posts
├── interests/       # Collections and shrine pages
├── pages/           # Static pages
└── index.njk        # Homepage

eleventy.config.mjs  # Main configuration
package.json         # Dependencies and scripts
```

## 🎯 Key Features

### 📝 Static Blog System
- **Markdown Posts** - Simple, file-based blog posts
- **Automatic Generation** - Posts and archives generated from markdown files
- **Date Formatting** - Luxon-powered readable dates
- **Date Based URLs** - SEO-friendly post URLs

### 🎵 Dynamic Music Collection
- **Discogs API Integration** - Live music collection with ratings and detailed views
- **Smart Caching** - External data cached for faster builds and offline development
- **Interactive Grid Layout** - Visual browsing with detailed views
- **Pre-build Fetching** - Data fetched before site generation

### 🎮 Gaming Libraries & Fan Shrines
- **Console-Based Libraries** - Organized by console with reviews and ratings
- **Franchise Fan Shrines** - Dedicated pages for beloved franchises and artists

### 🎬 Movie Catalog
- **TMDb API Integration** - Live movie collection with ratings and detailed views
- **Smart Caching** - External data cached for faster builds and offline development
- **Interactive Grid Layout** - Visual browsing with detailed views
- **Pre-build Fetching** - Data fetched before site generation

### 🎨 Retro Web Aesthetic
- **Y2K Design Language** - Embracing early web aesthetics
- **Dark Theme Throughout** - Easy on the eyes, authentic feel
- **Pixel Fonts & Graphics** - Nostalgic typography and imagery
- **Personal Expression** - Authenticity over polish

### 🚀 Modern Performance
- **Static Site Generation** - Fast loading with dynamic-feeling content
- **Responsive Design** - Works on all devices
- **Optimized Assets** - Efficient CSS and image handling
- **Automated Deployment** - GitHub Actions to Neocities

## 🔧 Configuration

### Environment Variables

```bash
# Optional for development
DISCOGS_TOKEN=your_discogs_personal_access_token
DISCOGS_USERNAME=your_discogs_username

# Skip external API calls during development
ELEVENTY_SKIP_FETCH=true
```

### Available Scripts

```bash
npm start              # Development server with live reload
npm run build          # Production build
npm run fetch:discogs  # Manually fetch Discogs collection
npm run fetch:tmdb     # Manually fetch movie data
```

## 🌟 Inspiration & Philosophy

This project celebrates:

- **The Personal Web** - Individual expression over corporate uniformity
- **Digital Collections** - The joy of curating and sharing what we love
- **Authentic Blogging** - Real thoughts, real experiences
- **Retro Web Culture** - When the internet felt more human
- **Open Source Learning** - Sharing knowledge and techniques


## 🤝 Contributing

While this is a personal site, you're welcome to:

- 🌟 Star the repo if you find it inspiring
- 🐛 Report any bugs you notice
- 💡 Suggest improvements via issues
- 🎨 Share your own retro web projects
- 📚 Learn from the code and techniques used

## 🔗 Connect

- **Website:** [theonlyfrogs.com](https://theonlyfrogs.com)
- **GitHub:** [@violetfulton](https://github.com/violetfulton)

---

<div align="center">

**Made with 💚 and nostalgia**
*Bringing back the personal web, one frog at a time* 🐸

</div>
