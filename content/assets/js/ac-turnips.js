(() => {
  const currentWeekCard = document.getElementById("currentWeekCard");
  const turnipHistory = document.getElementById("turnipHistory");

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
  const journalData =
    rawJournalData && typeof rawJournalData === "object" && rawJournalData.entries
      ? rawJournalData.entries
      : rawJournalData;

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

  function getTurnipEvent(entry) {
    return isObject(entry?.events?.turnips) ? entry.events.turnips : null;
  }

  function weekLabel(weekStartKey) {
    const start = parseDateKey(weekStartKey);
    const end = addDays(start, 6);

    const startText = start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    const endText = end.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    return `${startText} – ${endText}`;
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
            dayKey,
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
          dayKey,
          price: day.sale.price,
          amount: day.sale.amount,
          period: day.sale.period ? String(day.sale.period).toUpperCase() : null
        };
      }
    }

    return null;
  }

  function calculateSummary(week) {
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

  function renderSoldBanner(summary) {
    if (!summary.actualSale) return "";

    return `
      <div class="turnip-sold-banner">
        🐸 Sold! No more stalk stress this week.
      </div>
    `;
  }

  function renderCurrentWeek(weeks) {
    if (!currentWeekCard) return;

    const currentKey = getWeekKey(new Date());
    const current = weeks.find((week) => week.weekStart === currentKey);

    if (!current) {
      currentWeekCard.innerHTML = `
        <h2>Current Week</h2>
        <p class="ac-muted">No turnip data logged for this week yet.</p>
      `;
      return;
    }

    const summary = calculateSummary(current);

    currentWeekCard.innerHTML = `
      <h2>Current Week</h2>
      <p class="ac-muted">${weekLabel(current.weekStart)}</p>
      ${renderSoldBanner(summary)}

      <div class="turnip-summary-grid">
        <div class="turnip-stat">
          <span>Buy Price</span>
          <strong>${summary.buyPrice ?? "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Amount</span>
          <strong>${summary.amount ?? "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Investment</span>
          <strong>${summary.investment !== null ? summary.investment.toLocaleString() : "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Best Sell</span>
          <strong>${summary.best ? `${summary.best.price} bells` : "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Best Possible Profit</span>
          <strong>${summary.profit !== null ? summary.profit.toLocaleString() : "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Actual Sale</span>
          <strong>${summary.actualSale ? `${summary.actualSale.price} bells` : "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Sold Slot</span>
          <strong>${summary.actualSale ? `${summary.actualSale.date} ${summary.actualSale.period || ""}`.trim() : "—"}</strong>
        </div>
        <div class="turnip-stat">
          <span>Actual Profit</span>
          <strong>${summary.actualProfit !== null ? summary.actualProfit.toLocaleString() : "—"}</strong>
        </div>
      </div>
    `;
  }

  function renderWeekCard(week) {
    const summary = calculateSummary(week);

    return `
      <article class="turnip-week-card">
        <div class="turnip-week-head">
          <div>
            <h3>${weekLabel(week.weekStart)}</h3>
            <p class="ac-muted">
              Sunday buy: ${summary.buyPrice ?? "—"} bells
              ${summary.amount ? ` • ${summary.amount.toLocaleString()} turnips` : ""}
            </p>
            ${summary.actualSale ? `
              <p class="turnip-sale-note">
                Sold at ${summary.actualSale.price} bells
                ${summary.actualSale.period ? `(${summary.actualSale.period})` : ""}
                on ${summary.actualSale.date}
              </p>
            ` : ""}
          </div>

          <div class="turnip-profit">
            <span>Actual profit</span>
            <strong>${summary.actualProfit !== null ? summary.actualProfit.toLocaleString() : "—"}</strong>
          </div>
        </div>

        ${renderSoldBanner(summary)}

        <div class="turnip-table-wrap">
          <table class="turnip-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>AM</th>
                <th>PM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sunday</td>
                <td colspan="2">
                  Buy: ${summary.buyPrice ?? "—"} bells
                  ${summary.amount ? `(${summary.amount.toLocaleString()})` : ""}
                </td>
              </tr>
              <tr>
                <td>Monday</td>
                <td>${week.monday?.am ?? "—"}</td>
                <td>${week.monday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Tuesday</td>
                <td>${week.tuesday?.am ?? "—"}</td>
                <td>${week.tuesday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Wednesday</td>
                <td>${week.wednesday?.am ?? "—"}</td>
                <td>${week.wednesday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Thursday</td>
                <td>${week.thursday?.am ?? "—"}</td>
                <td>${week.thursday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Friday</td>
                <td>${week.friday?.am ?? "—"}</td>
                <td>${week.friday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Saturday</td>
                <td>${week.saturday?.am ?? "—"}</td>
                <td>${week.saturday?.pm ?? "—"}</td>
              </tr>
              <tr>
                <td>Sale</td>
                <td colspan="2">
                  ${
                    summary.actualSale
                      ? `${summary.actualSale.price} bells ${summary.actualSale.period ? `(${summary.actualSale.period})` : ""} • ${summary.actualSale.amount ?? "—"} sold`
                      : "—"
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderHistory(weeks) {
    if (!turnipHistory) return;

    if (!weeks.length) {
      turnipHistory.innerHTML = `<p class="turnip-empty">No turnip weeks logged yet.</p>`;
      return;
    }

    turnipHistory.innerHTML = weeks.map(renderWeekCard).join("");
  }

  const weeks = buildWeeks(journalData);
  renderCurrentWeek(weeks);
  renderHistory(weeks);
})();