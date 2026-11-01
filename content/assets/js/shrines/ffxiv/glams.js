(() => {
  "use strict";
  const grid = document.querySelector("[data-glam-grid]");
  if (!grid) return;

  const cards = [...grid.querySelectorAll("[data-glam-card]")];
  const count = document.querySelector("[data-glam-count]");
  const empty = document.querySelector("[data-glam-empty]");
  const search = document.querySelector("[data-glam-search]");
  const sort = document.querySelector("[data-glam-sort]");
  const eraButtons = [...document.querySelectorAll("[data-glam-era]")];
  const categoryButtons = [...document.querySelectorAll("[data-glam-category]")];
  let era = "all";
  let category = "all";
  let query = "";

  const setActive = (buttons, active, key) => buttons.forEach((button) => {
    const selected = button.dataset[key] === active;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  function apply() {
    let visible = 0;
    cards.forEach((card) => {
      const matches = (era === "all" || card.dataset.glamEraValue === era)
        && (category === "all" || card.dataset.glamCategoryValue === category)
        && (!query || (card.dataset.glamSearchValue || "").includes(query));
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (count) count.textContent = String(visible);
    if (empty) empty.hidden = visible > 0;
    const order = sort?.value || "added";
    const arranged = [...cards].sort((a, b) => {
      if (order === "favourites") {
        const difference = Number(b.dataset.glamFavourite) - Number(a.dataset.glamFavourite);
        if (difference) return difference;
      } else if (order === "name") {
        return (a.querySelector("h3")?.textContent || "").localeCompare(b.querySelector("h3")?.textContent || "");
      }
      return Number(a.dataset.glamIndex) - Number(b.dataset.glamIndex);
    });
    arranged.forEach((card) => grid.appendChild(card));
  }

  eraButtons.forEach((button) => button.addEventListener("click", () => {
    era = button.dataset.glamEra;
    setActive(eraButtons, era, "glamEra");
    apply();
  }));
  categoryButtons.forEach((button) => button.addEventListener("click", () => {
    category = button.dataset.glamCategory;
    setActive(categoryButtons, category, "glamCategory");
    apply();
  }));
  search?.addEventListener("input", () => { query = search.value.trim().toLowerCase(); apply(); });
  sort?.addEventListener("change", apply);

  const dialogs = [...document.querySelectorAll(".ff-glam-dialog")];
  document.querySelectorAll("[data-glam-open]").forEach((button) => button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.glamOpen);
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }));
  dialogs.forEach((dialog) => {
    dialog.querySelector("[data-glam-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll("[data-glam-photo]").forEach((button) => button.addEventListener("click", () => {
      const img = dialog.querySelector("[data-glam-primary-image]");
      if (img) {
        img.src = button.dataset.glamPhoto;
        img.alt = button.dataset.glamPhotoAlt || img.alt;
      }
      dialog.querySelectorAll("[data-glam-photo]").forEach((thumb) => {
        const selected = thumb === button;
        thumb.classList.toggle("is-active", selected);
        thumb.setAttribute("aria-pressed", String(selected));
      });
    }));
  });

  document.querySelectorAll("[data-jump-era]").forEach((link) => link.addEventListener("click", () => {
    era = link.dataset.jumpEra;
    category = "all";
    query = "";
    if (search) search.value = "";
    setActive(eraButtons, era, "glamEra");
    setActive(categoryButtons, category, "glamCategory");
    apply();
  }));
  document.querySelectorAll("[data-jump-look]").forEach((link) => link.addEventListener("click", () => {
    const id = link.dataset.jumpLook;
    era = "all";
    category = "all";
    query = "";
    if (search) search.value = "";
    setActive(eraButtons, era, "glamEra");
    setActive(categoryButtons, category, "glamCategory");
    apply();
    const card = cards.find((item) => item.dataset.glamId === id);
    if (card) {
      setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    }
  }));
  apply();
})();
