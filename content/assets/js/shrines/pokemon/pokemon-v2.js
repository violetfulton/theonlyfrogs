(() => {
  const search = document.querySelector("#pc-search");
  const slots = [...document.querySelectorAll(".pkmn-pc-slot")];

  if (search && slots.length) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      slots.forEach((slot) => {
        slot.hidden = query && !slot.dataset.search.toLowerCase().includes(query);
      });
    });
  }

  const dialog = document.querySelector("#pokemon-summary");
  if (dialog && slots.length) {
    const image = dialog.querySelector("[data-summary-image]");
    const dex = dialog.querySelector("[data-summary-dex]");
    const name = dialog.querySelector("[data-summary-name]");
    const species = dialog.querySelector("[data-summary-species]");
    const details = dialog.querySelector("[data-summary-details]");
    const notes = dialog.querySelector("[data-summary-notes]");

    const addDetail = (label, value) => {
      if (!value) return "";
      return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
    };

    slots.forEach((slot) => {
      slot.addEventListener("click", () => {
        image.src = slot.dataset.image || "";
        image.alt = slot.dataset.species ? `Shiny ${slot.dataset.species}` : "";
        dex.textContent = `No. ${slot.dataset.dex || "---"}`;
        name.textContent = slot.dataset.name || slot.dataset.species || "Pokémon";
        species.textContent = slot.dataset.name !== slot.dataset.species ? slot.dataset.species : "";
        details.innerHTML = [
          addDetail("Game", slot.dataset.game),
          addDetail("Method", slot.dataset.method),
          addDetail("Date", slot.dataset.date),
          addDetail("Ball", slot.dataset.ball),
          addDetail("Nature", slot.dataset.nature),
          addDetail("Gender", slot.dataset.gender),
          addDetail("Location", slot.dataset.location),
          addDetail("Odds", slot.dataset.odds),
          addDetail("Encounters", slot.dataset.encounters),
          addDetail("Mark / Ribbon", slot.dataset.mark),
        ].join("");
        notes.textContent = slot.dataset.notes || "";
        dialog.showModal();
      });
    });

    dialog.querySelector("[data-summary-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  const dexButtons = [...document.querySelectorAll("[data-dex-filter]")];
  const dexEntries = [...document.querySelectorAll("[data-dex-state]")];
  if (dexButtons.length && dexEntries.length) {
    const listFilters = new Set(["pink", "cute", "goth", "frog"]);

    const applyDexFilter = (filter) => {
      const selected = dexButtons.find((button) => button.dataset.dexFilter === filter) || dexButtons[0];
      const activeFilter = selected?.dataset.dexFilter || "all";

      dexButtons.forEach((button) => button.classList.toggle("is-active", button === selected));
      dexEntries.forEach((entry) => {
        const lists = (entry.dataset.dexLists || "").split(",").filter(Boolean);
        if (activeFilter === "all") entry.hidden = false;
        else if (listFilters.has(activeFilter)) entry.hidden = !lists.includes(activeFilter);
        else entry.hidden = entry.dataset.dexState !== activeFilter;
      });
    };

    dexButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.dexFilter || "all";
        applyDexFilter(filter);
        const url = new URL(window.location.href);
        if (listFilters.has(filter)) url.searchParams.set("list", filter);
        else url.searchParams.delete("list");
        window.history.replaceState({}, "", url);
      });
    });

    const requestedList = new URLSearchParams(window.location.search).get("list");
    applyDexFilter(listFilters.has(requestedList) ? requestedList : "all");
  }
})();
