(() => {
  const calendarTitle = document.getElementById("calendarTitle");
  const todayInfo = document.getElementById("todayInfo");
  const calendarGrid = document.getElementById("calendarGrid");
  const entryDateLabel = document.getElementById("entryDateLabel");
  const eventPills = document.getElementById("eventPills");
  const entryMeta = document.getElementById("entryMeta");
  const entryChecks = document.getElementById("entryChecks");
  const entryBody = document.getElementById("entryBody");
  const monthEventsList = document.getElementById("monthEventsList");
  const goalsTitle = document.getElementById("goalsTitle");
  const goalsContent = document.getElementById("goalsContent");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const entryMoodGif = document.getElementById("entryMoodGif");

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

  const journalData =
    rawJournalData && typeof rawJournalData === "object" && rawJournalData.entries
      ? rawJournalData.entries
      : rawJournalData;

  const moodGifMap = {
    happy: "/assets/imgs/ac/moods/happy.gif",
    cozy: "/assets/imgs/ac/moods/cozy.gif",
    calm: "/assets/imgs/ac/moods/calm.gif",
    excited: "/assets/imgs/ac/moods/excited.gif",
    productive: "/assets/imgs/ac/moods/productive.gif",
    celebrating: "/assets/imgs/ac/moods/celebrating.gif",
    confident: "/assets/imgs/ac/moods/confident.gif",
    dancing: "/assets/imgs/ac/moods/dancing.gif",
    energetic: "/assets/imgs/ac/moods/energetic.gif",
    funny: "/assets/imgs/ac/moods/funny.gif",
    mischief: "/assets/imgs/ac/moods/mischief.gif",
    proud: "/assets/imgs/ac/moods/proud.gif",
    sad: "/assets/imgs/ac/moods/sad.gif",
    shocked: "/assets/imgs/ac/moods/shocked.gif",
    vibing: "/assets/imgs/ac/moods/vibing.gif",
    neutral: "/assets/imgs/ac/moods/neutral.gif",
    default: "/assets/imgs/ac/moods/vibing.gif"
  };

  const now = new Date();
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();
  let selectedDateKey = formatDateKey(now);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  const choreLabels = {
    moneyRock: "🪨 Money rock",
    fossils: "🕳️ Fossils",
    trees: "🌳 Shook trees",
    lostAndFound: "🚪 Lost & Found",
    recycling: "♻️ Recycling"
  };

  const activityLabels = {
    fishing: "🎣 Went fishing",
    bugHunting: "🐛 Bug hunting",
    shopping: "🛍️ Checked shops",
    villagers: "🐸 Talked to villagers",
    museum: "🏛️ Donated"
  };

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

  function previewText(text) {
    if (!text) return "";
    return text.length > 55 ? `${text.slice(0, 55).trim()}…` : text;
  }

  function getEntry(dateKey) {
    return journalData[dateKey] || null;
  }

  function getEventsForDateKey(dateKey) {
    return eventsData.filter((event) => event.date === dateKey);
  }

  function getMonthEvents(month, year) {
    return eventsData
      .filter((event) => {
        const date = parseDateKey(event.date);
        return date.getMonth() === month && date.getFullYear() === year;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
  }

  function getMoodForEntry(entry) {
    let mood = entry?.mood;
    if (Array.isArray(mood)) mood = mood[0];
    return mood ? String(mood).toLowerCase() : "";
  }

  function getMoodGif(mood) {
    return moodGifMap[mood] || moodGifMap.default;
  }

  function renderMoodGif(entry) {
    if (!entryMoodGif) return;
    const mood = getMoodForEntry(entry);
    entryMoodGif.src = getMoodGif(mood);
    entryMoodGif.alt = mood ? `Frog mood: ${mood}` : "Frog mood";
  }

  function getStats(entry) {
    return isObject(entry?.stats) ? entry.stats : {};
  }

  function getBellsSummary(entry) {
    const stats = getStats(entry);

    if (typeof stats.bellsEarned === "number") {
      return {
        label: "Bells earned",
        value: stats.bellsEarned
      };
    }

    if (typeof stats.bellsSpent === "number") {
      return {
        label: "Bells spent",
        value: stats.bellsSpent
      };
    }

    if (typeof stats.bells === "number") {
      return {
        label: "Bells",
        value: stats.bells
      };
    }

    if (typeof entry?.bellsMade === "number") {
      return {
        label: "Bells made",
        value: entry.bellsMade
      };
    }

    return null;
  }

  function getActivities(entry) {
    if (Array.isArray(entry?.activities)) {
      return entry.activities;
    }

    if (isObject(entry?.activities)) {
      return Object.entries(entry.activities)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    }

    return [
      entry?.wentFishing ? "fishing" : null,
      entry?.checkedShops ? "shopping" : null,
      entry?.talkedToVillagers ? "villagers" : null,
      entry?.donated ? "museum" : null
    ].filter(Boolean);
  }

  function getChores(entry) {
    const chores = entry?.chores;

    if (isObject(chores)) {
      const hasNewShape =
        Array.isArray(chores.completed) || Array.isArray(chores.missed);

      if (hasNewShape) {
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

  function getCatches(entry) {
    return {
      fish: Array.isArray(entry?.catches?.fish) ? entry.catches.fish : [],
      bugs: Array.isArray(entry?.catches?.bugs) ? entry.catches.bugs : []
    };
  }

  function getChoreCount(entry) {
    return getChores(entry).completed.length;
  }

  function getTurnipEvent(entry) {
    return isObject(entry?.events?.turnips) ? entry.events.turnips : null;
  }

  function hasTurnipSale(entry) {
    const turnips = getTurnipEvent(entry);
    return Boolean(turnips?.sale?.sold);
  }

  function renderMonthEventsSidebar() {
    const events = getMonthEvents(currentMonth, currentYear);
    monthEventsList.innerHTML = "";

    if (!events.length) {
      monthEventsList.innerHTML = "<li>No EU town notes added for this month yet.</li>";
      return;
    }

    events.forEach((event) => {
      const date = parseDateKey(event.date);
      const li = document.createElement("li");
      li.innerHTML = `<strong>${monthNames[date.getMonth()]} ${date.getDate()}</strong> — ${escapeHtml(event.label)}`;
      monthEventsList.appendChild(li);
    });
  }

  function renderCritterSection(title, items = []) {
    const section = document.createElement("section");
    section.className = "goal-section";

    if (!items.length) {
      section.innerHTML = `
        <h4>${title}</h4>
        <p class="goal-note">None this month.</p>
      `;
      goalsContent.appendChild(section);
      return;
    }

    section.innerHTML = `
      <h4>${title}</h4>
      <ul class="goal-list">
        ${items.map((item) => `
          <li>
            <strong>${escapeHtml(item.name)}</strong>
            ${item.time ? `<span class="goal-tag">${escapeHtml(item.time)}</span>` : ""}
            <br>
            <small>${escapeHtml(item.location || "")}</small>
          </li>
        `).join("")}
      </ul>
    `;
    goalsContent.appendChild(section);
  }

  function renderBestMoneySection(title, items = []) {
    const section = document.createElement("section");
    section.className = "goal-section";

    if (!items.length) {
      section.innerHTML = `
        <h4>${title}</h4>
        <p class="goal-note">None this month.</p>
      `;
      goalsContent.appendChild(section);
      return;
    }

    section.innerHTML = `
      <h4>${title}</h4>
      <ul class="goal-list">
        ${items.map((item) => `
          <li>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="goal-money">${Number(item.bells || 0).toLocaleString()} Bells</span>
            ${item.time ? `<span class="goal-tag">${escapeHtml(item.time)}</span>` : ""}
            <br>
            <small>${escapeHtml(item.location || "")}${item.notes ? ` — ${escapeHtml(item.notes)}` : ""}</small>
          </li>
        `).join("")}
      </ul>
    `;
    goalsContent.appendChild(section);
  }

  function renderGoalsSidebar() {
    const goals = critterGoals[String(currentMonth)];
    goalsTitle.textContent = goals?.title || `${monthNames[currentMonth]} Goals`;
    goalsContent.innerHTML = "";

    if (!goals) {
      goalsContent.innerHTML = `
        <div class="goal-section">
          <p class="goal-note">No critter data for this month yet.</p>
        </div>
      `;
      return;
    }

    if (goals.intro) {
      const intro = document.createElement("div");
      intro.className = "goal-section";
      intro.innerHTML = `<p class="goal-note">${escapeHtml(goals.intro)}</p>`;
      goalsContent.appendChild(intro);
    }

    renderCritterSection("🐟 Fish new this month", goals.fish?.newThisMonth || []);
    renderCritterSection("⏰ Fish leaving after this month", goals.fish?.leavingAfterMonth || []);
    renderBestMoneySection("💰 Top 3 fish this month", goals.fish?.bestMoney || []);

    renderCritterSection("🐛 Bugs new this month", goals.bugs?.newThisMonth || []);
    renderCritterSection("🍂 Bugs leaving after this month", goals.bugs?.leavingAfterMonth || []);
    renderBestMoneySection("💸 Top 3 bugs this month", goals.bugs?.bestMoney || []);

    if (goals.reminders?.length) {
      const section = document.createElement("section");
      section.className = "goal-section";
      section.innerHTML = `
        <h4>🐸 Lily says…</h4>
        <ul class="goal-list">
          ${goals.reminders.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      `;
      goalsContent.appendChild(section);
    }
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";
    calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayIndex = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const totalCells = 42;

    for (let i = 0; i < totalCells; i += 1) {
      let dayNumber;
      let cellDate;
      let isOtherMonth = false;

      if (i < startDayIndex) {
        dayNumber = prevMonthLastDay - startDayIndex + i + 1;
        cellDate = new Date(currentYear, currentMonth - 1, dayNumber);
        isOtherMonth = true;
      } else if (i >= startDayIndex + daysInMonth) {
        dayNumber = i - (startDayIndex + daysInMonth) + 1;
        cellDate = new Date(currentYear, currentMonth + 1, dayNumber);
        isOtherMonth = true;
      } else {
        dayNumber = i - startDayIndex + 1;
        cellDate = new Date(currentYear, currentMonth, dayNumber);
      }

      const dateKey = formatDateKey(cellDate);
      const entry = getEntry(dateKey);
      const events = getEventsForDateKey(dateKey);
      const isToday = dateKey === formatDateKey(now);
      const isSelected = dateKey === selectedDateKey;
      const mood = getMoodForEntry(entry);
      const moodGif = getMoodGif(mood);
      const choreCount = getChoreCount(entry);
      const turnips = getTurnipEvent(entry);
      const soldTurnips = hasTurnipSale(entry);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";

      if (isOtherMonth) button.classList.add("is-other-month");
      if (isToday) button.classList.add("is-today");
      if (isSelected) button.classList.add("is-selected");

      button.innerHTML = `
        <span class="day-number">${dayNumber}</span>
        ${entry ? '<span class="has-entry-dot"></span>' : ""}
        ${entry && mood ? `
          <img
            class="day-mood-thumb"
            src="${moodGif}"
            alt="${escapeHtml(mood)}"
            title="Mood: ${escapeHtml(mood)}"
          >
        ` : ""}
        ${entry && choreCount ? `<span class="day-chore-count" title="${choreCount} chores done">🧺 ${choreCount}</span>` : ""}
        ${turnips ? `<span class="day-turnips" title="Turnip data logged">💰</span>` : ""}
        ${soldTurnips ? `<span class="day-turnips-sold" title="Turnips sold">💸</span>` : ""}
        <div class="day-preview">${escapeHtml(previewText(entry?.content || entry?.title || ""))}</div>
        ${
          events.length
            ? `<div class="day-badges">
                ${events.slice(0, 2).map((event) => `<span class="day-badge">${escapeHtml(event.label)}</span>`).join("")}
              </div>`
            : ""
        }
      `;

      button.addEventListener("click", () => {
        currentMonth = cellDate.getMonth();
        currentYear = cellDate.getFullYear();
        selectedDateKey = dateKey;
        renderCalendar();
        loadSelectedEntry();
      });

      calendarGrid.appendChild(button);
    }

    renderMonthEventsSidebar();
    renderGoalsSidebar();
  }

  function renderEntryMeta(entry) {
    if (!entry) {
      entryMeta.innerHTML = "";
      return;
    }

    const items = [];
    const bells = getBellsSummary(entry);
    const catches = getCatches(entry);
    const turnips = getTurnipEvent(entry);
    const stats = getStats(entry);

    if (entry.title) {
      items.push(`<div class="entry-meta-item"><strong>Title:</strong> ${escapeHtml(entry.title)}</div>`);
    }

    if (entry.mood) {
      const moodText = Array.isArray(entry.mood) ? entry.mood.join(", ") : entry.mood;
      items.push(`<div class="entry-meta-item"><strong>Mood:</strong> ${escapeHtml(moodText)}</div>`);
    }

    if (typeof entry.energy === "number") {
      items.push(`<div class="entry-meta-item"><strong>Energy:</strong> ${entry.energy}/10</div>`);
    }

    if (bells) {
      items.push(
        `<div class="entry-meta-item"><strong>${escapeHtml(bells.label)}:</strong> ${Number(bells.value).toLocaleString()}</div>`
      );
    }

    if (typeof stats.turnipPrice === "number") {
      items.push(`<div class="entry-meta-item"><strong>Turnip price:</strong> ${stats.turnipPrice} bells</div>`);
    }

    if (typeof stats.turnipsOwned === "number") {
      items.push(`<div class="entry-meta-item"><strong>Turnips owned:</strong> ${stats.turnipsOwned.toLocaleString()}</div>`);
    }

    if (catches.fish.length) {
      items.push(`<div class="entry-meta-item"><strong>Fish caught:</strong> ${escapeHtml(catches.fish.join(", "))}</div>`);
    }

    if (catches.bugs.length) {
      items.push(`<div class="entry-meta-item"><strong>Bugs caught:</strong> ${escapeHtml(catches.bugs.join(", "))}</div>`);
    }

    if (turnips?.bought) {
      items.push(`<div class="entry-meta-item"><strong>Turnips bought:</strong> yes</div>`);
    }

    if (typeof turnips?.price === "number") {
      items.push(`<div class="entry-meta-item"><strong>Buy price:</strong> ${turnips.price} bells</div>`);
    }

    if (typeof turnips?.amount === "number") {
      items.push(`<div class="entry-meta-item"><strong>Amount bought:</strong> ${turnips.amount.toLocaleString()}</div>`);
    }

    if (typeof turnips?.prices?.am === "number") {
      items.push(`<div class="entry-meta-item"><strong>AM price:</strong> ${turnips.prices.am} bells</div>`);
    }

    if (typeof turnips?.prices?.pm === "number") {
      items.push(`<div class="entry-meta-item"><strong>PM price:</strong> ${turnips.prices.pm} bells</div>`);
    }

    if (turnips?.sale?.sold) {
      items.push(`<div class="entry-meta-item"><strong>Turnips sold:</strong> yes</div>`);
    }

    if (typeof turnips?.sale?.price === "number") {
      items.push(`<div class="entry-meta-item"><strong>Sold at:</strong> ${turnips.sale.price} bells</div>`);
    }

    if (typeof turnips?.sale?.amount === "number") {
      items.push(`<div class="entry-meta-item"><strong>Amount sold:</strong> ${turnips.sale.amount.toLocaleString()}</div>`);
    }

    if (turnips?.sale?.period) {
      items.push(`<div class="entry-meta-item"><strong>Sold in:</strong> ${escapeHtml(String(turnips.sale.period).toUpperCase())}</div>`);
    }

    if (entry.notes?.highlight) {
      items.push(`<div class="entry-meta-item"><strong>Highlight:</strong> ${escapeHtml(entry.notes.highlight)}</div>`);
    }

    if (entry.notes?.lowlight) {
      items.push(`<div class="entry-meta-item"><strong>Lowlight:</strong> ${escapeHtml(entry.notes.lowlight)}</div>`);
    }

    if (Array.isArray(entry.tags) && entry.tags.length) {
      items.push(`<div class="entry-meta-item"><strong>Tags:</strong> ${escapeHtml(entry.tags.join(", "))}</div>`);
    }

    entryMeta.innerHTML = items.join("");
  }

  function renderEntryChecks(entry) {
    if (!entry) {
      entryChecks.innerHTML = "";
      return;
    }

    const chips = [];
    const activities = getActivities(entry);
    const chores = getChores(entry);

    activities.forEach((key) => {
      if (activityLabels[key]) {
        chips.push(activityLabels[key]);
      }
    });

    chores.completed.forEach((key) => {
      if (choreLabels[key]) {
        chips.push(choreLabels[key]);
      }
    });

    if (!chips.length) {
      entryChecks.innerHTML = "";
      return;
    }

    entryChecks.innerHTML = chips
      .map((label) => `<span class="entry-check">${escapeHtml(label)}</span>`)
      .join("");
  }

  function loadSelectedEntry() {
    const selectedDate = parseDateKey(selectedDateKey);
    const entry = getEntry(selectedDateKey);
    const events = getEventsForDateKey(selectedDateKey);

    entryDateLabel.textContent = humanDate(selectedDate);

    eventPills.innerHTML = "";
    if (events.length) {
      events.forEach((event) => {
        const pill = document.createElement("span");
        pill.className = "event-pill";
        pill.textContent = event.label;
        if (event.notes) pill.title = event.notes;
        eventPills.appendChild(pill);
      });
    } else {
      const pill = document.createElement("span");
      pill.className = "event-pill";
      pill.textContent = "No preset event today";
      eventPills.appendChild(pill);
    }

    renderEntryMeta(entry);
    renderEntryChecks(entry);
    renderMoodGif(entry);

    if (entry?.content) {
      entryBody.innerHTML = `<p>${escapeHtml(entry.content).replace(/\n/g, "</p><p>")}</p>`;
    } else {
      entryBody.innerHTML = `<p class="entry-empty">No journal entry written for this day yet.</p>`;
    }
  }

  prevMonthBtn.addEventListener("click", () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }
    renderCalendar();
    loadSelectedEntry();
  });

  nextMonthBtn.addEventListener("click", () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
    renderCalendar();
    loadSelectedEntry();
  });

  todayInfo.textContent = `Today is ${humanDate(now)}`;
  renderCalendar();
  loadSelectedEntry();
})();