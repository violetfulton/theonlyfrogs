# TheOnlyFrogs 🐸

A personal website featuring shrines, collections, and blog posts built with Eleventy (11ty). Welcome to my digital space where I share my passions, collections, and thoughts!

## 🌟 About

This is my personal website showcasing my interests and collections. It's a nostalgic, retro-inspired site featuring:

- **🎵 Music Collection** - My CD collection with detailed views and ratings (powered by Discogs API)
- **🎮 Gaming** - Organized by console (PS Vita, Nintendo Switch, etc.)
- **✨ Shrines** - Dedicated fan pages for things I love (MCR, Ashnikko, Final Fantasy, Animal Crossing)
- **📚 Collections** - Physical media including CDs, DVDs, and games
- **📝 Blog** - Personal posts, life updates, and thoughts (powered by Firebase)
- **🎨 Retro Aesthetic** - Dark themes, pixel fonts, and early 2000s web vibes

## 🛠️ Tech Stack

- **[Eleventy (11ty)](https://www.11ty.dev/)** v3.0.0 - Static site generator
- **Nunjucks** - Templating engine
- **Firebase** - Blog post storage and management
- **Discogs API** - Dynamic CD collection data
- **Luxon** - Date formatting and manipulation
- **GitHub Actions** - Automated deployment to Neocities
- **HTML/CSS/JavaScript** - Frontend technologies

## 🚀 Getting Started

### Prerequisites

- Node.js (version 20 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/violetfulton/theonlyfrogs.git
   cd theonlyfrogs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional for development):
   ```bash
   cp .env.example .env
   # Add your Firebase and Discogs API keys
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:8080`

### Available Scripts

- `npm start` - Start development server with live reload
- `npm run build` - Build the site for production
- `npm run fetch:firebase` - Manually fetch blog posts from Firebase
- `npm run fetch:discogs` - Manually fetch CD collection from Discogs

## 📁 Project Structure

```
theonlyfrogs/
├── content/
│   ├── _data/              # Global data files
│   │   ├── posts.json      # Blog posts cache from Firebase
│   │   ├── discogsCache.json # CD collection cache
│   │   └── releases.mjs    # CD collection data processor
│   ├── _includes/          # Layout templates
│   │   ├── base.njk        # Main site layout
│   │   ├── cdsBase.njk     # CD collection layout
│   │   └── ...
│   ├── _scripts/           # Data fetching scripts
│   │   ├── fetchFirebasePosts.js
│   │   └── fetchDiscogsCache.js
│   ├── assets/             # Static assets
│   │   ├── css/            # Stylesheets
│   │   ├── images/         # Images and graphics
│   │   └── fonts/          # Custom fonts
│   ├── blog/               # Blog system
│   │   ├── archive.njk     # Blog archive page
│   │   ├── archive-year.11ty.js # Yearly archive generator
│   │   ├── index.njk       # Blog homepage
│   │   └── posts.11ty.js   # Individual post generator
│   ├── interests/          # Shrines and collections
│   │   ├── cds/            # CD collection pages
│   │   ├── games/          # Gaming content
│   │   └── shrines/        # Fan pages
│   ├── pages/              # Static pages
│   └── index.njk           # Homepage
├── public/                 # Built site (auto-generated)
├── eleventy.config.mjs     # Eleventy configuration
└── package.json            # Project dependencies
```

## ✨ Features

### 📝 Dynamic Blog System
- **Firebase Integration** - Blog posts stored in Firebase for easy management
- **Automatic Generation** - Posts and archives generated from Firebase data
- **Yearly Archives** - Organized by year with post counts
- **Deduplication** - Smart handling of duplicate posts
- **Date Formatting** - Luxon-powered readable dates
- **Live Updates** - Automatic fetching and caching of new posts

### 🎵 Dynamic CD Collection
- **Discogs API Integration** - Real-time collection data
- **Smart Caching** - Cached data for performance and offline development
- **Interactive Grid Layout** - Visual browsing with detailed views
- **Retro-Styled Interface** - Nostalgic design aesthetic

### 🎮 Gaming Sections
- Organized by gaming console
- Collection tracking and wishlists
- Game reviews and ratings

### 📱 Responsive Design
- Mobile-friendly layouts
- Retro aesthetic with modern functionality
- Dark theme throughout

### 🚀 Performance & Automation
- **Pre-build Data Fetching** - External APIs fetched before build
- **Smart Caching** - Cached external data for faster builds
- **Environment Controls** - Skip external fetches for development
- **Static Generation** - Fast loading with Eleventy
- **Automated Deployment** - GitHub Actions to Neocities

## 🔧 Configuration

### Environment Variables

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id

# Discogs API
DISCOGS_TOKEN=your_discogs_token
DISCOGS_USERNAME=your_username

# Development
ELEVENTY_SKIP_FETCH=true  # Skip external API calls during development
```

### Eleventy Features

- **Template Formats**: `.njk`, `.md`, `.11ty.js`
- **Custom Filters**: Date formatting, array manipulation, deduplication
- **Global Data**: Firebase posts, Discogs releases, yearly archives
- **Dynamic Generation**: Automatic post and archive page creation

## 🌐 Deployment

This site automatically deploys to [Neocities](https://neocities.org) via GitHub Actions when changes are pushed to the `main` branch.

**Live Site:** [theonlyfrogs.com](https://theonlyfrogs.com)

### Build Process

1. **Pre-build**: Fetch latest data from Firebase and Discogs
2. **Generate**: Create static pages from templates and data
3. **Deploy**: Push to Neocities via GitHub Actions

## 🎨 Design Philosophy

Inspired by early 2000s personal websites and GeoCities, this site embraces:
- Nostalgic web aesthetics
- Personal expression over corporate polish
- Community and sharing interests
- The joy of curating digital collections
- Authentic personal blogging and storytelling
- Dynamic content with static site benefits

## 🤝 Contributing

This is a personal website, but feel free to:
- Look around and take inspiration
- Suggest improvements via issues
- Share your own retro web projects!
- Learn from the Firebase + Eleventy integration

## 📝 License

ISC License - see the [LICENSE](LICENSE) file for details.

## 💚 Connect

- **Website:** [theonlyfrogs.com](https://theonlyfrogs.com)
- **GitHub:** [@violetfulton](https://github.com/violetfulton)

---

Made with 💚 and nostalgia by TheOnlyFrogs
*Bringing back the personal web, one frog at a time* 🐸
