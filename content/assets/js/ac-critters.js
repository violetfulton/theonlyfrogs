document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("critters-grid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".critter-card"));

  const typeSelect = document.getElementById("filter-type");
  const monthSelect = document.getElementById("filter-month");
  const weatherSelect = document.getElementById("filter-weather");
  const timeInput = document.getElementById("filter-time");
  const statusSelect = document.getElementById("filter-status");
  const hourSelect = document.getElementById("filter-hour");

  const resultsCount = document.getElementById("results-count");
  const quickButtons = Array.from(document.querySelectorAll(".filter-chip"));

  const nowAvailableCount = document.getElementById("now-available-count");
  const nowMissingCount = document.getElementById("now-missing-count");
  const nowBestBells = document.getElementById("now-best-bells");
  const nowMissingList = document.getElementById("now-missing-list");

  const leavingCount = document.getElementById("leaving-count");
  const leavingMissingCount = document.getElementById("leaving-missing-count");
  const leavingBest = document.getElementById("leaving-best");
  const leavingMissingList = document.getElementById("leaving-missing-list");

  const currentDate = new Date();
  const currentMonth = String(currentDate.getMonth() + 1);
  const currentHour = String(currentDate.getHours());

  function parseList(value) {
    return (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function includesMonth(card, month) {
    if (month === "all") return true;
    return parseList(card.dataset.months).includes(month);
  }

  function includesWeather(card, weather) {
    if (weather === "all") return true;

    const cardWeather = parseList((card.dataset.weather || "").toLowerCase());

    if (weather === "any") {
      return cardWeather.includes("any");
    }

    return cardWeather.includes("any") || cardWeather.includes(weather);
  }

  function includesTimeText(card, query) {
    if (!query) return true;
    const haystack = (card.dataset.time || "").toLowerCase();
    return haystack.includes(query.toLowerCase().trim());
  }

  function includesType(card, type) {
    if (type === "all") return true;
    return card.dataset.type === type;
  }

  function includesStatus(card, status) {
    if (status === "all") return true;
    return card.dataset.status === status;
  }

  function parseHourToken(token, meridiem) {
    let hour = Number.parseInt(token, 10);
    if (Number.isNaN(hour)) return null;

    if (meridiem === "AM") {
      if (hour === 12) hour = 0;
      return hour;
    }

    if (meridiem === "PM") {
      if (hour !== 12) hour += 12;
      return hour;
    }

    return hour;
  }

  function normalizeRange(rangeText) {
    const clean = rangeText.trim().replace(/\s+/g, " ");

    if (!clean || clean.toLowerCase() === "all day") {
      return [{ start: 0, end: 24 }];
    }

    const match = clean.match(
      /^(\d{1,2})(?::\d{2})?\s*(AM|PM)\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i
    );

    if (!match) return [];

    const start = parseHourToken(match[1], match[2].toUpperCase());
    const end = parseHourToken(match[3], match[4].toUpperCase());

    if (start === null || end === null) return [];

    return [{ start, end }];
  }

  function parseTimeRanges(raw) {
    if (!raw) return [{ start: 0, end: 24 }];

    return raw
      .split("|")
      .flatMap((part) => normalizeRange(part))
      .filter(Boolean);
  }

  function hourInRange(hour, start, end) {
    if (start === end) return true;
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end;
  }

  function isAvailableAtHour(card, hourValue) {
    if (hourValue === "all") return true;

    const hour = Number.parseInt(hourValue, 10);
    if (Number.isNaN(hour)) return true;

    const raw = card.dataset.timeRaw || card.dataset.time || "";
    const ranges = parseTimeRanges(raw);

    if (!ranges.length) return true;

    return ranges.some((range) => hourInRange(hour, range.start, range.end));
  }

  function getNextMonth(monthValue) {
    const month = Number.parseInt(monthValue, 10);
    if (Number.isNaN(month)) return null;
    return month === 12 ? 1 : month + 1;
  }

  function isLeavingAfterSelectedMonth(card, monthValue) {
    if (monthValue === "all") return false;

    const month = String(monthValue);
    const nextMonth = getNextMonth(monthValue);

    if (!nextMonth) return false;

    const months = parseList(card.dataset.months);

    return months.includes(month) && !months.includes(String(nextMonth));
  }

  function updateLeavingCardStates() {
    const month = monthSelect.value;

    cards.forEach((card) => {
      const isLeaving = isLeavingAfterSelectedMonth(card, month);
      card.classList.toggle("is-leaving-soon", isLeaving);
    });
  }

  function cardMatchesFilters(card) {
    const type = typeSelect.value;
    const month = monthSelect.value;
    const weather = weatherSelect.value;
    const timeText = timeInput.value;
    const status = statusSelect.value;

    return (
      includesType(card, type) &&
      includesMonth(card, month) &&
      includesWeather(card, weather) &&
      includesTimeText(card, timeText) &&
      includesStatus(card, status)
    );
  }

  function updateNowPanel() {
    if (!nowAvailableCount || !nowMissingCount || !nowBestBells || !nowMissingList) return;

    const month = monthSelect.value;
    const weather = weatherSelect.value;
    const hour = hourSelect ? hourSelect.value : "all";
    const type = typeSelect.value;

    const nowMatches = cards.filter((card) => {
      return (
        includesType(card, type) &&
        includesMonth(card, month) &&
        includesWeather(card, weather) &&
        isAvailableAtHour(card, hour)
      );
    });

    const missing = nowMatches.filter((card) => card.dataset.status === "missing");

    let best = null;
    nowMatches.forEach((card) => {
      const bells = Number.parseInt(card.dataset.bells || "0", 10);
      if (!best || bells > best.bells) {
        best = {
          bells,
          name: card.dataset.name || "—"
        };
      }
    });

    nowAvailableCount.textContent = String(nowMatches.length);
    nowMissingCount.textContent = String(missing.length);
    nowBestBells.textContent = best ? `${best.name} (${best.bells.toLocaleString()} Bells)` : "—";

    if (!missing.length) {
      nowMissingList.textContent = "None 🎉";
      return;
    }

    const names = missing
      .map((card) => ({
        name: card.dataset.name || "",
        bells: Number.parseInt(card.dataset.bells || "0", 10)
      }))
      .sort((a, b) => b.bells - a.bells || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((item) => item.name);

    nowMissingList.textContent = names.join(", ");
  }

  function updateLeavingPanel() {
    if (!leavingCount || !leavingMissingCount || !leavingBest || !leavingMissingList) return;

    const month = monthSelect.value;
    const type = typeSelect.value;

    if (month === "all") {
      leavingCount.textContent = "0";
      leavingMissingCount.textContent = "0";
      leavingBest.textContent = "Select a month";
      leavingMissingList.textContent = "Choose a specific month to see what disappears next month.";
      return;
    }

    const leaving = cards.filter((card) => {
      return includesType(card, type) && isLeavingAfterSelectedMonth(card, month);
    });

    const missing = leaving.filter((card) => card.dataset.status === "missing");

    let best = null;
    leaving.forEach((card) => {
      const bells = Number.parseInt(card.dataset.bells || "0", 10);
      if (!best || bells > best.bells) {
        best = {
          bells,
          name: card.dataset.name || "—"
        };
      }
    });

    leavingCount.textContent = String(leaving.length);
    leavingMissingCount.textContent = String(missing.length);
    leavingBest.textContent = best ? `${best.name} (${best.bells.toLocaleString()} Bells)` : "—";

    if (!missing.length) {
      leavingMissingList.textContent = "None 🎉";
      return;
    }

    const names = missing
      .map((card) => ({
        name: card.dataset.name || "",
        bells: Number.parseInt(card.dataset.bells || "0", 10)
      }))
      .sort((a, b) => b.bells - a.bells || a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((item) => item.name);

    leavingMissingList.textContent = names.join(", ");
  }

  function clearQuickButtons() {
    quickButtons.forEach((btn) => {
      btn.classList.remove("is-active");
    });
  }

  function applyFilters() {
    let visible = 0;

    cards.forEach((card) => {
      const show = cardMatchesFilters(card);
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (resultsCount) {
      resultsCount.textContent = String(visible);
    }

    updateLeavingCardStates();
    updateNowPanel();
    updateLeavingPanel();
  }

  function setQuickFilter(mode) {
    quickButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.quick === mode);
    });

    if (mode === "all") {
      typeSelect.value = "all";
      monthSelect.value = "all";
      weatherSelect.value = "all";
      timeInput.value = "";
      statusSelect.value = "all";
      if (hourSelect) hourSelect.value = "all";
    }

    if (mode === "missing") {
      statusSelect.value = "missing";
    }

    if (mode === "caught") {
      statusSelect.value = "caught";
    }

    if (mode === "available-now") {
      monthSelect.value = currentMonth;
      weatherSelect.value = "all";
      if (hourSelect) hourSelect.value = currentHour;
    }

    applyFilters();
  }

  [typeSelect, monthSelect, weatherSelect, timeInput, statusSelect, hourSelect]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("input", () => {
        clearQuickButtons();
        applyFilters();
      });
      el.addEventListener("change", () => {
        clearQuickButtons();
        applyFilters();
      });
    });

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => setQuickFilter(btn.dataset.quick));
  });

  setQuickFilter("all");
});