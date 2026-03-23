(() => {
  function readJsonScript(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;

    const raw = el.textContent.trim();
    if (!raw) return fallback;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(`Failed to parse JSON from #${id}`, error, raw);
      return fallback;
    }
  }

  const rawJournalData = readJsonScript("ac-journal-data", {});
  const eventsData = readJsonScript("ac-events-data", []);
  const critterGoals = readJsonScript("ac-critters-data", {});
  const raData = readJsonScript("ac-ra-data", null);

  const journalData =
    rawJournalData && typeof rawJournalData === "object" && rawJournalData.entries
      ? rawJournalData.entries
      : rawJournalData;

  const todayDateEl = document.getElementById("acHomeTodayDate");
  const todayEventsEl = document.getElementById("acHomeTodayEvents");
  const latestEntryEl = document.getElementById("acHomeLatestEntry");
  const goalsPreviewEl = document.getElementById("acHomeGoalsPreview");
  const statsEl = document.getElementById("acHomeStats");
  const turnipsEl = document.getElementById("acHomeTurnips");
  const raEl = document.getElementById("acHomeRA");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function humanDate(date) {
    return `${weekdayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function previewText(text, max = 110) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max).trim()}…` : text;
  }

  function getMonthEntries() {
    return Object.entries(journalData).filter(([key]) => {
      const date = parseDateKey(key);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }

  function getStats(entry) {
    return isObject(entry?.stats) ? entry.stats : {};
  }

  function getBellsValue(entry) {
    const stats = getStats(entry);

    if (typeof stats.bellsEarned === "number") return stats.bellsEarned;
    if (typeof stats.bellsSpent === "number") return stats.bellsSpent;
    if (typeof stats.bells === "number") return stats.bells;
    if (typeof entry?.bellsMade === "number") return entry.bellsMade;

    return 0;
  }

  function getCatches(entry) {
    return {
      fish: Array.isArray(entry?.catches?.fish) ? entry.catches.fish : [],
      bugs: Array.isArray(entry?.catches?.bugs) ? entry.catches.bugs : []
    };
  }

  function getChores(entry) {
    const chores = entry?.chores;

    if (isObject(chores)) {
      if (Array.isArray(chores.completed) || Array.isArray(chores.missed)) {
        return {
          completed: Array.isArray(chores.completed) ? chores.completed : [],
          missed: Array.isArray(chores.missed) ? chores.missed : []
        };
      }

      const completed = [];
      const missed = [];

      Object.entries(chores).forEach(([key, value]) => {
        if (value === true) completed.push(key);
        if (value === false) missed.push(key);
      });

      return { completed, missed };
    }

    return { completed: [], missed: [] };
  }

  function getTurnipEvent(entry) {
    return isObject(entry?.events?.turnips) ? entry.events.turnips : null;
  }

  function addDays(date, amount) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function startOfWeekSunday(date) {
    const copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy;
  }

  function getWeekKey(date) {
    return formatDateKey(startOfWeekSunday(date));
  }

  function getDayKey(dayIndex) {
    return [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ][dayIndex];
  }

  function createBlankWeek(weekStart) {
    return {
      weekStart,
      sunday: null,
      monday: { date: null, am: null, pm: null, sale: null },
      tuesday: { date: null, am: null, pm: null, sale: null },
      wednesday: { date: null, am: null, pm: null, sale: null },
      thursday: { date: null, am: null, pm: null, sale: null },
      friday: { date: null, am: null, pm: null, sale: null },
      saturday: { date: null, am: null, pm: null, sale: null }
    };
  }

  function buildWeeks(entries) {
    const weeks = new Map();

    Object.keys(entries)
      .sort()
      .forEach((dateKey) => {
        const entry = entries[dateKey];
        const turnips = getTurnipEvent(entry);
        if (!turnips) return;

        const date = parseDateKey(dateKey);
        const weekKey = getWeekKey(date);

        if (!weeks.has(weekKey)) {
          weeks.set(weekKey, createBlankWeek(weekKey));
        }

        const week = weeks.get(weekKey);
        const dayKey = getDayKey(date.getDay());

        if (dayKey === "sunday") {
          week.sunday = {
            date: dateKey,
            bought: Boolean(turnips.bought),
            price: typeof turnips.price === "number" ? turnips.price : null,
            amount: typeof turnips.amount === "number" ? turnips.amount : null
          };
          return;
        }

        week[dayKey] = {
          date: dateKey,
          am: typeof turnips?.prices?.am === "number" ? turnips.prices.am : null,
          pm: typeof turnips?.prices?.pm === "number" ? turnips.prices.pm : null,
          sale: turnips?.sale?.sold
            ? {
                sold: true,
                price: typeof turnips.sale.price === "number" ? turnips.sale.price : null,
                amount: typeof turnips.sale.amount === "number" ? turnips.sale.amount : null,
                period: turnips.sale.period || null
              }
            : null
        };
      });

    return Array.from(weeks.values()).sort((a, b) =>
      a.weekStart < b.weekStart ? 1 : -1
    );
  }

  function getBestSell(week) {
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    let best = null;

    dayKeys.forEach((dayKey) => {
      const day = week[dayKey];
      if (!day) return;

      ["am", "pm"].forEach((period) => {
        const price = day[period];
        if (typeof price !== "number") return;

        if (!best || price > best.price) {
          best = {
            date: day.date,
            period: period.toUpperCase(),
            price
          };
        }
      });
    });

    return best;
  }

  function getActualSale(week) {
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    for (const dayKey of dayKeys) {
      const day = week[dayKey];
      if (day?.sale?.sold) {
        return {
          date: day.date,
          price: day.sale.price,
          amount: day.sale.amount,
          period: day.sale.period ? String(day.sale.period).toUpperCase() : null
        };
      }
    }

    return null;
  }

  function calculateWeekSummary(week) {
    const buyPrice = week?.sunday?.price ?? null;
    const amount = week?.sunday?.amount ?? null;
    const best = getBestSell(week);
    const actualSale = getActualSale(week);

    const investment =
      typeof buyPrice === "number" && typeof amount === "number"
        ? buyPrice * amount
        : null;

    const gross =
      best && typeof amount === "number"
        ? best.price * amount
        : null;

    const profit =
      gross !== null && investment !== null
        ? gross - investment
        : null;

    const actualGross =
      actualSale &&
      typeof actualSale.price === "number" &&
      typeof actualSale.amount === "number"
        ? actualSale.price * actualSale.amount
        : null;

    const actualProfit =
      actualGross !== null && investment !== null
        ? actualGross - investment
        : null;

    return {
      buyPrice,
      amount,
      best,
      investment,
      gross,
      profit,
      actualSale,
      actualGross,
      actualProfit
    };
  }

  function renderToday() {
    if (!todayDateEl || !todayEventsEl) return;

    const todayKey = formatDateKey(now);
    const todaysEvents = eventsData.filter((event) => event.date === todayKey);

    todayDateEl.textContent = humanDate(now);
    todayEventsEl.innerHTML = "";

    if (!todaysEvents.length) {
      todayEventsEl.innerHTML = `<p class="ac-home-empty">No special event today.</p>`;
      return;
    }

    todaysEvents.forEach((event) => {
      const div = document.createElement("div");
      div.className = "ac-home-item";
      div.innerHTML = `
        <strong>${escapeHtml(event.label)}</strong>
        ${event.notes ? `<p>${escapeHtml(event.notes)}</p>` : ""}
      `;
      todayEventsEl.appendChild(div);
    });
  }

  function renderLatestEntry() {
    if (!latestEntryEl) return;

    const keys = Object.keys(journalData).sort((a, b) => b.localeCompare(a));
    latestEntryEl.innerHTML = "";

    if (!keys.length) {
      latestEntryEl.innerHTML = `<p class="ac-home-empty">No journal entries yet.</p>`;
      return;
    }

    const latestKey = keys[0];
    const latest = journalData[latestKey];
    const latestDate = parseDateKey(latestKey);
    const moods = Array.isArray(latest?.mood) ? latest.mood.join(", ") : latest?.mood || "";

    latestEntryEl.innerHTML = `
      <div class="ac-home-item">
        <strong>${escapeHtml(latest.title || humanDate(latestDate))}</strong>
        ${moods ? `<p><strong>Mood:</strong> ${escapeHtml(moods)}</p>` : ""}
        <p>${escapeHtml(previewText(latest.content || ""))}</p>
      </div>
    `;
  }

  function renderGoalsPreview() {
    if (!goalsPreviewEl) return;

    const goals = critterGoals[String(currentMonth)];
    goalsPreviewEl.innerHTML = "";

    if (!goals) {
      goalsPreviewEl.innerHTML = `<p class="ac-home-empty">No monthly goals available yet.</p>`;
      return;
    }

    const topFish = goals.fish?.bestMoney?.[0];
    const leavingFish = goals.fish?.leavingAfterMonth?.[0];
    const leavingBug = goals.bugs?.leavingAfterMonth?.[0];

    if (topFish) {
      const div = document.createElement("div");
      div.className = "ac-home-item";
      div.innerHTML = `
        <strong>Top fish this month</strong>
        <p>${escapeHtml(topFish.name)} — ${Number(topFish.bells || 0).toLocaleString()} Bells</p>
      `;
      goalsPreviewEl.appendChild(div);
    }

    if (leavingFish) {
      const div = document.createElement("div");
      div.className = "ac-home-item";
      div.innerHTML = `
        <strong>Fish leaving soon</strong>
        <p>${escapeHtml(leavingFish.name)}</p>
      `;
      goalsPreviewEl.appendChild(div);
    }

    if (leavingBug) {
      const div = document.createElement("div");
      div.className = "ac-home-item";
      div.innerHTML = `
        <strong>Bugs leaving soon</strong>
        <p>${escapeHtml(leavingBug.name)}</p>
      `;
      goalsPreviewEl.appendChild(div);
    }

    if (!goalsPreviewEl.children.length) {
      goalsPreviewEl.innerHTML = `<p class="ac-home-empty">No monthly goals available yet.</p>`;
    }
  }

  function renderStats() {
    if (!statsEl) return;

    const entries = getMonthEntries();

    if (!entries.length) {
      statsEl.innerHTML = `<p class="ac-home-empty">No monthly stats yet.</p>`;
      return;
    }

    const bells = entries.reduce((sum, [, entry]) => sum + getBellsValue(entry), 0);
    const fishCaught = entries.reduce((sum, [, entry]) => sum + getCatches(entry).fish.length, 0);
    const bugsCaught = entries.reduce((sum, [, entry]) => sum + getCatches(entry).bugs.length, 0);
    const choresDone = entries.reduce((sum, [, entry]) => sum + getChores(entry).completed.length, 0);

    statsEl.innerHTML = `
      <div class="ac-home-item"><strong>Bells this month</strong><p>${bells.toLocaleString()}</p></div>
      <div class="ac-home-item"><strong>Fish caught</strong><p>${fishCaught}</p></div>
      <div class="ac-home-item"><strong>Bugs caught</strong><p>${bugsCaught}</p></div>
      <div class="ac-home-item"><strong>Chores done</strong><p>${choresDone}</p></div>
    `;
  }

  function renderTurnips() {
    if (!turnipsEl) return;

    const weeks = buildWeeks(journalData);
    const currentKey = getWeekKey(now);
    const currentWeek = weeks.find((week) => week.weekStart === currentKey);

    if (!currentWeek) {
      turnipsEl.innerHTML = `<p class="ac-home-empty">No turnip data logged yet.</p>`;
      return;
    }

    const summary = calculateWeekSummary(currentWeek);
    const weekStart = parseDateKey(currentWeek.weekStart);
    const weekEnd = addDays(weekStart, 6);

    turnipsEl.innerHTML = `
      <div class="ac-home-item">
        <strong>${escapeHtml(
          `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`
        )}</strong>

        ${
          summary.actualSale
            ? `<p class="ac-home-turnip-banner">🐸 Sold! No more stalk stress this week.</p>`
            : ""
        }

        <p><strong>Buy:</strong> ${summary.buyPrice ?? "—"} bells</p>
        <p><strong>Best:</strong> ${summary.best ? `${summary.best.price} bells (${summary.best.period})` : "—"}</p>
        <p><strong>Best possible profit:</strong> ${
          summary.profit !== null ? summary.profit.toLocaleString() : "—"
        }</p>
        <p><strong>Actual sale:</strong> ${
          summary.actualSale
            ? `${summary.actualSale.price} bells${summary.actualSale.period ? ` (${summary.actualSale.period})` : ""}`
            : "—"
        }</p>
        <p><strong>Actual profit:</strong> ${
          summary.actualProfit !== null ? summary.actualProfit.toLocaleString() : "—"
        }</p>
      </div>
    `;
  }

  function renderRA() {
    if (!raEl) return;

    if (!raData || !raData.game || !Array.isArray(raData.achievements)) {
      raEl.innerHTML = `<p class="ac-home-empty">No achievement data yet.</p>`;
      return;
    }

    const total = Number(raData.game.achievementCount || 0);
    const earned = Number(raData.game.earnedCount || 0);
    const percent = total ? Math.round((earned / total) * 100) : 0;

    const latestEarned = [...raData.achievements]
      .filter((achievement) => achievement.earned && achievement.earnedDate)
      .sort((a, b) => String(b.earnedDate).localeCompare(String(a.earnedDate)))[0];

    raEl.innerHTML = `
      <div class="ac-home-item ac-home-ra-item">
        <strong>${earned} / ${total} earned</strong>
        <p>${percent}% complete</p>

        <div class="ac-home-ra-progress">
          <div class="ac-home-ra-progress__fill" style="width:${percent}%"></div>
        </div>

        ${
          latestEarned
            ? `
              <div class="ac-home-ra-latest">
                <img
                  src="${escapeHtml(latestEarned.badgeUnlocked || latestEarned.badgeLocked || "")}"
                  alt="${escapeHtml(latestEarned.title)}"
                  class="ac-home-ra-badge"
                >
                <div>
                  <p><strong>Latest:</strong> ${escapeHtml(latestEarned.title)}</p>
                  <p>${escapeHtml(latestEarned.earnedDate)}</p>
                </div>
              </div>
            `
            : `<p class="ac-home-empty">No earned achievements yet.</p>`
        }
      </div>
    `;
  }

  renderToday();
  renderLatestEntry();
  renderGoalsPreview();
  renderStats();
  renderTurnips();
  renderRA();
})();