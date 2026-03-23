function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset + (nth - 1) * 7);
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const last = new Date(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, last.getDate() - offset);
}

function calculateEaster(year) {
  // Gregorian computus
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function makeEvent(date, label, type, notes = "") {
  return {
    date: formatDate(date),
    label,
    type,
    notes
  };
}

function addIfDate(events, date, label, type, notes = "") {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    events.push(makeEvent(date, label, type, notes));
  }
}

function getEuFamilyEvents(year, euCountry) {
  const events = [];
  const easter = calculateEaster(year);

  switch (euCountry) {
    case "uk": {
      // Mothering Sunday = 4th Sunday of Lent = 3 weeks before Easter
      addIfDate(events, addDays(easter, -21), "Mother's Day", "holiday", "UK / Mothering Sunday");
      addIfDate(events, nthWeekdayOfMonth(year, 5, 0, 3), "Father's Day", "holiday", "UK");
      break;
    }
    case "fr": {
      addIfDate(events, lastWeekdayOfMonth(year, 4, 0), "Mother's Day", "holiday", "France");
      addIfDate(events, nthWeekdayOfMonth(year, 5, 0, 3), "Father's Day", "holiday", "France");
      break;
    }
    case "de": {
      addIfDate(events, nthWeekdayOfMonth(year, 4, 0, 2), "Mother's Day", "holiday", "Germany");
      addIfDate(events, addDays(easter, 39), "Father's Day", "holiday", "Germany / Ascension Day");
      break;
    }
    case "es": {
      addIfDate(events, nthWeekdayOfMonth(year, 4, 0, 1), "Mother's Day", "holiday", "Spain");
      addIfDate(events, new Date(year, 2, 19), "Father's Day", "holiday", "Spain");
      break;
    }
    case "it": {
      addIfDate(events, nthWeekdayOfMonth(year, 4, 0, 2), "Mother's Day", "holiday", "Italy");
      addIfDate(events, new Date(year, 2, 19), "Father's Day", "holiday", "Italy");
      break;
    }
    default:
      // Leave these out unless you want a specific EU country's calendar.
      break;
  }

  return events;
}

export default (() => {
  const YEAR = 2026;

  // Pick one if you want country-specific Mother's/Father's Day inside Europe:
  // "uk", "fr", "de", "es", "it", or "" to disable them.
  const EU_COUNTRY = "uk";

  const events = [];
  const easter = calculateEaster(YEAR);

  // Shared events on EU copies
  events.push(makeEvent(new Date(YEAR, 0, 1), "New Year's Day", "holiday"));
  events.push(makeEvent(new Date(YEAR, 1, 14), "Valentine's Day", "holiday"));
  events.push(makeEvent(addDays(easter, -47), "Festivale", "holiday"));
  events.push(makeEvent(easter, "Bunny Day", "holiday"));
  events.push(makeEvent(new Date(YEAR, 3, 1), "April Fool's Day", "holiday"));
  events.push(makeEvent(new Date(YEAR, 9, 31), "Halloween", "holiday"));
  events.push(makeEvent(nthWeekdayOfMonth(YEAR, 10, 4, 4), "Harvest Festival", "holiday"));
  events.push(makeEvent(new Date(YEAR, 11, 24), "Toy Day", "holiday"));
  events.push(makeEvent(new Date(YEAR, 11, 31), "Countdown", "holiday"));

  // Europe-exclusive City Folk events
  events.push(makeEvent(new Date(YEAR, 5, 21), "Midsummer's Day", "eu-exclusive"));
  events.push(makeEvent(new Date(YEAR, 11, 6), "Naughty-or-Nice Day", "eu-exclusive"));
  events.push(makeEvent(new Date(YEAR, 11, 21), "Midwinter's Day", "eu-exclusive"));

  // Optional country-specific EU family days
  events.push(...getEuFamilyEvents(YEAR, EU_COUNTRY));

  // Fishing Tourney
  // City Folk: 3rd Saturday of Jan, Mar, May, Nov; 2nd Saturday of Feb, Apr, Oct, Dec
  [0, 2, 4, 10].forEach((month) => {
    events.push(
      makeEvent(
        nthWeekdayOfMonth(YEAR, month, 6, 3),
        "Fishing Tourney",
        "contest"
      )
    );
  });

  [1, 3, 9, 11].forEach((month) => {
    events.push(
      makeEvent(
        nthWeekdayOfMonth(YEAR, month, 6, 2),
        "Fishing Tourney",
        "contest"
      )
    );
  });

  // Bug-Off: 3rd Saturday of June, July, August, September
  [5, 6, 7, 8].forEach((month) => {
    events.push(
      makeEvent(
        nthWeekdayOfMonth(YEAR, month, 6, 3),
        "Bug-Off",
        "contest"
      )
    );
  });

  // Flea Market: 4th Sunday of every month except August
  [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11].forEach((month) => {
    events.push(
      makeEvent(
        nthWeekdayOfMonth(YEAR, month, 0, 4),
        "Flea Market",
        "monthly"
      )
    );
  });

  // Fireworks Show: every Sunday of August
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(YEAR, 7, day);
    if (date.getMonth() === 7 && date.getDay() === 0) {
      events.push(makeEvent(date, "Fireworks Show", "seasonal"));
    }
  }

  return events.sort((a, b) => {
    return a.date.localeCompare(b.date) || a.label.localeCompare(b.label);
  });
})();