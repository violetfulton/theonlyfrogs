import crittersAll from "./critters-all.json" with { type: "json" };

function hasMonth(critter, monthNumber) {
  return Array.isArray(critter.months) && critter.months.includes(monthNumber);
}

function monthName(monthIndex) {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ][monthIndex];
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

function sortByBellsDesc(a, b) {
  if (b.bells !== a.bells) return b.bells - a.bells;
  return a.name.localeCompare(b.name);
}

function summarizeCategory(list, monthNumber) {
  const prevMonth = monthNumber === 1 ? 12 : monthNumber - 1;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  const current = list.filter((item) => hasMonth(item, monthNumber));
  const previous = list.filter((item) => hasMonth(item, prevMonth));
  const next = list.filter((item) => hasMonth(item, nextMonth));

  const previousIds = new Set(previous.map((item) => item.id));
  const nextIds = new Set(next.map((item) => item.id));

  const newThisMonth = current
    .filter((item) => !previousIds.has(item.id))
    .sort(sortByName);

  const leavingAfterMonth = current
    .filter((item) => !nextIds.has(item.id))
    .sort(sortByName);

  const bestMoney = [...current].sort(sortByBellsDesc).slice(0, 3);

  return {
    available: current.sort(sortByName),
    newThisMonth,
    leavingAfterMonth,
    bestMoney
  };
}

function buildReminders(monthNumber, fishSummary, bugSummary) {
  const reminders = [];

  const expensiveFish = fishSummary.bestMoney[0];
  const expensiveBug = bugSummary.bestMoney[0];

  if (expensiveFish) {
    reminders.push(
      `Top fish this month: ${expensiveFish.name} (${expensiveFish.bells.toLocaleString()} Bells).`
    );
  }

  if (expensiveBug) {
    reminders.push(
      `Top bug this month: ${expensiveBug.name} (${expensiveBug.bells.toLocaleString()} Bells).`
    );
  }

  if (fishSummary.leavingAfterMonth.length) {
    reminders.push(
      `Fish to catch before month-end: ${fishSummary.leavingAfterMonth
        .slice(0, 3)
        .map((item) => item.name)
        .join(", ")}${fishSummary.leavingAfterMonth.length > 3 ? "…" : ""}`
    );
  }

  if (bugSummary.leavingAfterMonth.length) {
    reminders.push(
      `Bugs to catch before month-end: ${bugSummary.leavingAfterMonth
        .slice(0, 3)
        .map((item) => item.name)
        .join(", ")}${bugSummary.leavingAfterMonth.length > 3 ? "…" : ""}`
    );
  }

  if (monthNumber === 3) {
    reminders.push("March tip: nighttime sea fishing is great for Bells.");
  }

  if (monthNumber === 7 || monthNumber === 8) {
    reminders.push("Summer tip: rare beetles and sharks are your big money makers.");
  }

  if (monthNumber === 11 || monthNumber === 12 || monthNumber === 1 || monthNumber === 2) {
    reminders.push("Winter tip: keep an eye on pier fish and evening spawns.");
  }

  return reminders;
}

export default (() => {
  const out = {};

  for (let month = 1; month <= 12; month += 1) {
    const fish = summarizeCategory(crittersAll.fish, month);
    const bugs = summarizeCategory(crittersAll.bugs, month);

    out[String(month - 1)] = {
      title: `${monthName(month - 1)} Critter Goals`,
      intro: `Auto-generated from the full City Folk critter database.`,
      fish,
      bugs,
      reminders: buildReminders(month, fish, bugs)
    };
  }

  return out;
})();