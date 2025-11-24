// content/_data/acnlDiary.js

export default [
  {
    id: "month-1",
    label: "Month 1",
    entries: [
      {
        id: "intro",
        sidebarLabel: "Intro",
        isIntro: true,
        title: "🌱 ACNL 100% Diary",
        meta: "Mayor: Violet · Town: Memory",
        paragraphs: [
          "Welcome to my 100% completion diary!",
          "This journal tracks upgrades, villagers, PWP, museum progress, catalog milestones and every little step.",
          "Use the arrows below to flip pages."
        ]
      },
      {
        id: "day-1",
        sidebarLabel: "Day 1 — Moving In",
        title: "Day 1 — Moving In",
        meta: "Start Date: 2025-11-22",
        paragraphs: [
          "Arrived in town, talked to Rover, picked my look, became mayor. Planted the town tree and chose a house spot near the river."
        ],
        bullets: [
          "Re-Tail close to station",
          "Need another bridge asap",
          "First villagers: Eunice, Dotty, Del, Chester and Baabara",
          "Luckily had 2 elegant mushrooms, so loan is paid!"
        ],
        note: "Got my favourite mush series item: a mush lamp!",
        images: [
          { src: "/assets/imgs/acnlDiary/memorybegins.jpg", alt: "The Start" },
          { src: "/assets/imgs/acnlDiary/tenkbells.jpg", alt: "First Loan" },
          { src: "/assets/imgs/acnlDiary/mushlamp.jpg", alt: "Mush Lamp" }
        ]
      },
      {
        id: "day-2",
        sidebarLabel: "Day 2 — Bell Grind",
        title: "Day 2 — Bell Grind",
        meta: "Date: 2025-11-23",
        paragraphs: [
          "Spent the whole day collecting fossils, fishing, and catching bugs. I managed to pay off the 40k bells loan!"
        ],
        bullets: [
          "Paid second house loan",
          "Started off at 27% approval rating. Wowza!",
          "Need to figure a way to track bugs and fish collected"
        ],
        note: "Got more mushrooms today which helped!",
        images: [
          { src: "/assets/imgs/acnlDiary/twentysevenpercent.jpg", alt: "27% approval rating" },
          { src: "/assets/imgs/acnlDiary/brokeonek.jpg", alt: "Bell Payment" },
          { src: "/assets/imgs/acnlDiary/homeloan.jpg", alt: "Home Loan" },
          { src: "/assets/imgs/acnlDiary/homebigger.jpg", alt: "Home Bigger" }
        ]
      },
      // add more days to Month 1 here
      {
        id: "day-3",
        sidebarLabel: "Day 3 — So many tunas",
        title: "Day 3 — So many tunas",
        meta: "Date: 2025-11-24",
        paragraphs: [
          "Desperate to pay off my 100k bell loan so I spent the day fishing for tuna. Along with the bell rock and a gold nugget I managed to pay it off! I think that's the first time I've ever paid off that loan so fast. Also spoke to Tortimer about the island, so tomorrow I will be spending hours bug catching there. Going to try for my first million bells!"
        ],
        bullets: [
          "New neighbour: Leonardo the jock tiger",
          "Paid 100k bell loan",
          "Approval rating up to 68%"
        ],
        note: "Can't wait to visit the island tomorrow!",
        images: [
          { src: "/assets/imgs/acnlDiary/100k.jpeg", alt: "100k Loan" },
          { src: "/assets/imgs/acnlDiary/sixtyeight.jpeg", alt: "Approval Rating 68%" },
          { src: "/assets/imgs/acnlDiary/tortimerisland.jpeg", alt: "Island Unlock" },
          { src: "/assets/imgs/acnlDiary/leonardo.jpeg", alt: "New neighbour" }

        ]
      }
    ]
  },
  {
    id: "month-2",
    label: "Month 2",
    entries: [
      // later: put Month 2 days here
    ]
  }
];
