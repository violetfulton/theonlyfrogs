const projects = [
  {
    id: "hunt-trains",
    name: "Live on Hunt Trains for a While",
    category: "hunts",
    icon: "⚔",
    moods: ["social", "brain-off"],
    times: ["30", "60", "evening"],
    vibe: "background forever grind",
    description:
      "Chip away at the enormous A-rank hunt achievements, nuts, clusters, tomes, materia and whatever else piles up along the way.",
    tonight:
      "Join one hunt train. If another one lines up nicely afterwards, great; if not, you still moved the giant hunt numbers.",
    note:
      "This is deliberately not tracking kills here. Your achievement log already knows the ugly number."
  },
  {
    id: "s-ranks",
    name: "Become an S-Rank Goblin",
    category: "hunts",
    icon: "☄",
    moods: ["social", "opportunistic"],
    times: ["15", "30", "60"],
    vibe: "opportunistic",
    description:
      "Keep slowly feeding the truly unreasonable S-rank achievements whenever marks happen to pop.",
    tonight:
      "Keep an eye on calls while doing something else and detour for any S-ranks that are convenient.",
    note:
      "Much nicer as a background habit than as something you try to force."
  },
  {
    id: "fates",
    name: "Make a Dent in the FATE Mountain",
    category: "battle",
    icon: "✦",
    moods: ["brain-off", "active"],
    times: ["15", "30", "60", "evening"],
    vibe: "easy to stack",
    description:
      "Let the giant FATE completion achievements rise while also doing gemstones, relic steps, levelling, shared FATEs or event farming.",
    tonight:
      "Pick a zone where FATEs pay you twice: gemstones, levelling, relic progress or another reward you actually want.",
    note:
      "The best version of this grind is one where the achievement is almost incidental."
  },
  {
    id: "mentor",
    name: "Throw Yourself Into Mentor Roulette",
    category: "duties",
    icon: "♕",
    moods: ["active", "social"],
    times: ["30", "60", "evening"],
    vibe: "roulette chaos",
    description:
      "The Astrope grind is enormous, but Mentor Roulette is also a very good answer to 'I want to play, tell me what duty to do.'",
    tonight:
      "Do one Mentor Roulette. Keep going only if the roulette chaos is still entertaining.",
    note:
      "No counter here. In-game achievement progress is the source of truth."
  },
  {
    id: "deep-dungeon",
    name: "Disappear Into Deep Dungeon",
    category: "deep-dungeon",
    icon: "◇",
    moods: ["active", "focused"],
    times: ["60", "evening"],
    vibe: "proper session",
    description:
      "Work on hoards, clears, solo attempts, titles, weapons and whatever Deep Dungeon achievement rabbit hole currently appeals.",
    tonight:
      "Choose one Deep Dungeon and make the session itself the goal rather than staring at the lifetime counters.",
    note:
      "Palace, Heaven-on-High, Eureka Orthos or Pilgrim's Traverse can all live under this umbrella."
  },
  {
    id: "occult-crescent",
    name: "Lose an Evening in the Occult Crescent",
    category: "field-ops",
    icon: "☾",
    moods: ["active", "social"],
    times: ["60", "evening"],
    vibe: "many grinds at once",
    description:
      "Treat the Crescent as a bundle of long goals: coffers, field progress, encounters, rewards and whatever achievement chains you still have hanging around.",
    tonight:
      "Go into the Crescent with one small side goal and let all the hidden lifetime counters move around it.",
    note:
      "Good when you want something busy without deciding on one exact achievement."
  },
  {
    id: "frontline",
    name: "Do the Frontline Forever Grind",
    category: "pvp",
    icon: "⚑",
    moods: ["active", "social"],
    times: ["15", "30", "60"],
    vibe: "daily-friendly",
    description:
      "Wins, KOs and the various Frontline achievements all move together, so the daily roulette can quietly feed several horrible goals.",
    tonight:
      "Do your daily Frontline and consider that enough. Anything beyond that is bonus progress.",
    note:
      "This page does not care whether tonight gave you one win or none."
  },
  {
    id: "crystalline-conflict",
    name: "Chip Away at Crystalline Conflict",
    category: "pvp",
    icon: "♜",
    moods: ["active", "focused"],
    times: ["15", "30", "60"],
    vibe: "short burst",
    description:
      "Long-term PvP wins and KO achievements become much less grim when CC is treated as a few quick matches rather than an all-night obligation.",
    tonight:
      "Play a short set of matches and stop when it stops being fun.",
    note:
      "The in-game PvP profile and achievement log can handle the actual numbers."
  },
  {
    id: "tank-mounts",
    name: "Feed the Tank Mount Achievements",
    category: "duties",
    icon: "♢",
    moods: ["brain-off", "active"],
    times: ["15", "30", "60", "evening"],
    vibe: "stack with other farms",
    description:
      "Use PLD, WAR, DRK or GNB for qualifying duties whenever another farm gives you the excuse.",
    tonight:
      "Pick whichever tank mount still needs love and use that tank for the duties you were going to run anyway.",
    note:
      "Much better as a default-job habit than as a dedicated hundreds-of-runs marathon."
  },

  {
    id: "diadem",
    name: "Go Rot in the Diadem",
    category: "restoration",
    icon: "☁",
    moods: ["brain-off", "focused"],
    times: ["30", "60", "evening"],
    vibe: "second-monitor heaven",
    description:
      "Gather restoration materials, inspect piles, earn Skybuilders' scrips and slowly chew through the huge gathering-side Firmament achievements.",
    tonight:
      "Pick Miner, Botanist or Fisher, put something on the second monitor, and spend one comfortable session in the Diadem.",
    note:
      "The Diadem is still the gatherer half of Ishgardian Restoration and its materials feed Firmament crafting."
  },
  {
    id: "firmament-crafting",
    name: "Become a Firmament Crafting Cryptid",
    category: "restoration",
    icon: "⚒",
    moods: ["brain-off", "focused"],
    times: ["30", "60", "evening"],
    vibe: "batch craft",
    description:
      "Craft and turn in Ishgardian Restoration supplies, build Skyward-score style progress and hoover up Skybuilders' scrip rewards over time.",
    tonight:
      "Choose one crafter, make a manageable batch of restoration collectibles, hand them in, and stop there if that scratches the itch.",
    note:
      "The reconstruction is complete, but the Firmament still accepts restoration deliveries and awards scrips."
  },
  {
    id: "firmament-all-jobs",
    name: "Spread Firmament Suffering Across Every Crafter",
    category: "restoration",
    icon: "✧",
    moods: ["brain-off", "focused"],
    times: ["60", "evening"],
    vibe: "completionist project",
    description:
      "Instead of camping one crafting job forever, rotate through the restoration achievements and class-specific score goals across the whole crafting roster.",
    tonight:
      "Pick the crafting job you have neglected most recently and make that tonight's Firmament class.",
    note:
      "A nice long-term 'eventually all of them' project without displaying eight separate progress bars."
  },

  {
    id: "cosmic-moon",
    name: "Go Back to the Moon",
    category: "cosmic",
    icon: "☽",
    moods: ["brain-off", "active"],
    times: ["30", "60", "evening"],
    vibe: "cosmic grind",
    description:
      "Work through Sinus Ardorum stellar missions, successes, mission ratings, credits and lunar-era Cosmic Exploration achievements.",
    tonight:
      "Head to Sinus Ardorum, pick a crafter or gatherer you feel like using, and just run stellar missions for a while.",
    note:
      "This is the actual Moon portion of Cosmic Exploration, so it gets its own card rather than disappearing into a generic crafting bucket."
  },
  {
    id: "cosmic-tools",
    name: "Slowly Finish the Cosmic Tools",
    category: "cosmic",
    icon: "✦",
    moods: ["brain-off", "focused"],
    times: ["30", "60", "evening"],
    vibe: "tool project",
    description:
      "Let stellar missions feed research data into the Cosmic Tool upgrades across your crafting and gathering classes.",
    tonight:
      "Pick one class whose Cosmic Tool you want prettier or further upgraded and spend the session doing its stellar missions.",
    note:
      "Cosmic prototypes do not need to be equipped for research-data progress."
  },
  {
    id: "cosmic-stars",
    name: "Bounce Around Cosmic Exploration",
    category: "cosmic",
    icon: "★",
    moods: ["active", "social"],
    times: ["30", "60", "evening"],
    vibe: "many stars, one grind",
    description:
      "Treat Sinus Ardorum, Phaenna, Oizys, Auxesia and later Cosmic Exploration areas as one giant long-term crafter/gatherer playground.",
    tonight:
      "Go to whichever cosmic area still has missions, rewards or achievements you actually care about and stay until you fancy something else.",
    note:
      "The point is to avoid turning each star into yet another dashboard counter."
  },

  {
    id: "hq-crafting",
    name: "Feed the Giant Crafting Achievement Pile",
    category: "crafting",
    icon: "🪡",
    moods: ["brain-off"],
    times: ["15", "30", "60", "evening"],
    vibe: "passive crafting",
    description:
      "The huge class-by-class crafting achievements are perfect background goals while making raid supplies, housing items, glamour pieces or sale stock.",
    tonight:
      "Choose one crafter and make a useful batch of something rather than crafting junk purely for a number.",
    note:
      "Rotate jobs whenever one starts feeling stale."
  },
  {
    id: "gathering-achievements",
    name: "Go Gather Until Your Brain Is Smooth",
    category: "gathering",
    icon: "❀",
    moods: ["brain-off"],
    times: ["15", "30", "60", "evening"],
    vibe: "extremely chill",
    description:
      "Use normal gathering, Gatherer's Boon and expansion-specific gathering achievements as background progress while stocking useful materials.",
    tonight:
      "Pick one material route you actually need and gather it until the repetition stops being soothing.",
    note:
      "Works especially well when you are simultaneously stocking current crafting materials."
  },
  {
    id: "fishing",
    name: "Become Worse About Fishing",
    category: "gathering",
    icon: "♓",
    moods: ["brain-off", "focused"],
    times: ["30", "60", "evening"],
    vibe: "dangerous rabbit hole",
    description:
      "Big Fish, Ocean Fishing, fishing logs, rare windows and the assorted Fisher achievements can become a whole second game if you let them.",
    tonight:
      "Pick one fishing sub-goal: a window, an Ocean Fishing voyage, a log gap, or a zone you have been ignoring.",
    note:
      "Only choose this if you are prepared for the fish to win."
  },
  {
    id: "relics",
    name: "Pick a Relic Line and Suffer Productively",
    category: "collections",
    icon: "†",
    moods: ["brain-off", "active"],
    times: ["30", "60", "evening"],
    vibe: "classic long project",
    description:
      "Old relic weapons are excellent filler because almost every step gives you an obvious little task without demanding that you finish the whole weapon tonight.",
    tonight:
      "Choose one unfinished relic and do exactly one step, currency batch or duty loop.",
    note:
      "Bonus points if the relic also overlaps with FATEs, roulettes or another Long Haul card."
  },
  {
    id: "shared-fates",
    name: "Finish Shared FATE Zones",
    category: "collections",
    icon: "◇",
    moods: ["brain-off", "active"],
    times: ["30", "60", "evening"],
    vibe: "zone-by-zone",
    description:
      "Shared FATE ranks and gemstone rewards are a satisfying regional grind that also feeds the broader FATE achievements.",
    tonight:
      "Pick one incomplete zone and do FATEs there until you are bored.",
    note:
      "Simple, visible in-game, and stacks beautifully with the FATE mountain."
  },
  {
    id: "leve-gil",
    name: "Remember Levequest Achievements Exist",
    category: "misc",
    icon: "◈",
    moods: ["brain-off"],
    times: ["15", "30", "60"],
    vibe: "allowance sink",
    description:
      "Leve-related gil and completion achievements are the definition of 'do some occasionally and Future Me will be grateful.'",
    tonight:
      "Burn a sensible chunk of allowances on something efficient, then forget about the achievement again for a while.",
    note:
      "No need to expose the lifetime gil total on the website."
  },
  {
    id: "commendations",
    name: "Keep Feeding the Commendation Pile",
    category: "duties",
    icon: "♡",
    moods: ["social", "active"],
    times: ["15", "30", "60"],
    vibe: "passive social",
    description:
      "Player commendation achievements are best handled by simply being useful, pleasant and visible in normal group content for a very long time.",
    tonight:
      "Run roulettes or group content normally. There is nothing special to farm beyond giving people a reason to commend you.",
    note:
      "The vaguest grind on the page, exactly as intended."
  }
];

const categories = [
  { id: "all", label: "All" },
  { id: "hunts", label: "Hunts" },
  { id: "battle", label: "Battle" },
  { id: "duties", label: "Duties" },
  { id: "deep-dungeon", label: "Deep Dungeon" },
  { id: "field-ops", label: "Field Ops" },
  { id: "pvp", label: "PvP" },
  { id: "restoration", label: "Firmament / Diadem" },
  { id: "cosmic", label: "Cosmic" },
  { id: "crafting", label: "Crafting" },
  { id: "gathering", label: "Gathering" },
  { id: "collections", label: "Collections" },
  { id: "misc", label: "Other" }
];

const moodLabels = {
  all: "Any mood",
  "brain-off": "☁ Brain off",
  active: "⚔ Actually play",
  social: "♧ Social",
  focused: "✦ Focused",
  opportunistic: "⏰ Opportunistic"
};

const timeLabels = {
  all: "Any time",
  "15": "15 min",
  "30": "30 min",
  "60": "1 hour",
  evening: "All evening"
};

export default {
  projects,
  categories,
  moodLabels,
  timeLabels
};
