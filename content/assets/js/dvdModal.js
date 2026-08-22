document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("dvd-modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalYear = document.getElementById("modal-year");
  const modalSeasons = document.getElementById("modal-seasons");
  const modalRatingStars = document.getElementById("modal-rating-stars");
  const modalOverview = document.getElementById("modal-overview");
  const modalSimklLink = document.getElementById("modal-simkl-link");
  const closeButton = document.querySelector(".modal-close");
  const cards = [...document.querySelectorAll(".movie-card")];
  const filterButtons = [...document.querySelectorAll(".filter-btn")];
  const search = document.getElementById("dvd-search");
  const visibleCount = document.getElementById("dvd-visible-count");

  if (!cards.length) return;

  let activeFilter = "all";
  let query = "";
  let lastFocusedCard = null;

  const modalReady = Boolean(
    modal && modalImg && modalTitle && modalYear && modalSeasons &&
    modalRatingStars && modalOverview && modalSimklLink && closeButton
  );

  function updateVisibleCards() {
    let shown = 0;

    cards.forEach((card) => {
      const type = (card.dataset.mediaType || "").toLowerCase();
      const haystack = `${card.dataset.title || ""} ${card.dataset.year || ""}`.toLowerCase();
      const matchesFilter = activeFilter === "all" || type === activeFilter;
      const matchesSearch = !query || haystack.includes(query);
      const visible = matchesFilter && matchesSearch;

      card.hidden = !visible;
      if (visible) shown += 1;
    });

    if (visibleCount) {
      visibleCount.textContent = `${shown} ${shown === 1 ? "title" : "titles"} on the shelf`;
    }
  }

  function showModal(card) {
    if (!modalReady) return;

    lastFocusedCard = card;
    modalImg.src = card.dataset.img || "/assets/imgs/frog-dvd-placeholder.png";
    modalImg.alt = `${card.dataset.title || "Untitled"} poster`;
    modalTitle.textContent = card.dataset.title || "Untitled";
    modalYear.textContent = card.dataset.year || "";
    modalOverview.textContent = card.dataset.overview || "No blurb saved for this one.";

    const rating = Math.max(0, Math.min(5, parseInt(card.dataset.myRating, 10) || 0));
    modalRatingStars.textContent = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "not rated";

    const mediaType = (card.dataset.mediaType || "").toLowerCase();
    const seasons = (card.dataset.seasons || "").trim();
    if (mediaType === "tv" && seasons) {
      modalSeasons.textContent = `Owned: ${seasons}`;
      modalSeasons.hidden = false;
    } else {
      modalSeasons.textContent = "";
      modalSeasons.hidden = true;
    }

    const url = (card.dataset.url || "").trim();
    if (url) {
      modalSimklLink.href = url;
      modalSimklLink.hidden = false;
    } else {
      modalSimklLink.href = "https://simkl.com";
      modalSimklLink.hidden = true;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("dvd-modal-open");
    closeButton.focus();
  }

  function closeModal() {
    if (!modalReady || !modal.classList.contains("active")) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("dvd-modal-open");
    lastFocusedCard?.focus();
  }

  cards.forEach((card) => card.addEventListener("click", () => showModal(card)));

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter || "all";
      filterButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      updateVisibleCards();
    });
  });

  search?.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    updateVisibleCards();
  });

  if (modalReady) {
    closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  filterButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.classList.contains("active"))));
  updateVisibleCards();
});
