document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("dvd-modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalYear = document.getElementById("modal-year");
  const modalSeasons = document.getElementById("modal-seasons");
  const modalRatingStars = document.getElementById("modal-rating-stars");
  const modalOverview = document.getElementById("modal-overview");
  const modalTraktLink = document.getElementById("modal-trakt-link");
  const closeButton = document.querySelector(".modal-close");

  const cards = [...document.querySelectorAll(".movie-card")];
  const filterButtons = [...document.querySelectorAll(".filter-btn")];

  if (!cards.length) return;

  // --- Collection split progress (Movies vs TV) ---
  const splitText = document.getElementById("collection-split-text");
  const moviesFill = document.getElementById("movies-fill");
  const tvFill = document.getElementById("tv-fill");

  function updateCollectionSplit() {
    const total = cards.length;
    if (!splitText || !moviesFill || !tvFill || total === 0) return;

    const movieCount = cards.filter(
      (c) => (c.dataset.mediaType || "").toLowerCase() === "movie"
    ).length;
    const tvCount = cards.filter(
      (c) => (c.dataset.mediaType || "").toLowerCase() === "tv"
    ).length;

    const moviePct = Math.round((movieCount / total) * 100);
    const tvPct = 100 - moviePct;

    moviesFill.style.width = `${moviePct}%`;
    tvFill.style.width = `${tvPct}%`;

    splitText.textContent = `Movies: ${movieCount} (${moviePct}%) · TV: ${tvCount} (${tvPct}%) · Total: ${total}`;
  }

  const modalReady =
    modal &&
    modalImg &&
    modalTitle &&
    modalYear &&
    modalSeasons &&
    modalRatingStars &&
    modalOverview &&
    closeButton &&
    modalTraktLink;

  if (!modalReady) {
    console.warn(
      "[dvdModal] Modal elements missing on this page. Modal clicks disabled."
    );
  }

  function showModal(card) {
    if (!modalReady) return;

    modalImg.src = card.dataset.img || "";
    modalImg.alt = card.dataset.title || "Poster";

    modalTitle.textContent = card.dataset.title || "Untitled";
    modalYear.textContent = card.dataset.year || "Unknown";
    modalOverview.textContent =
      card.dataset.overview || "No description available.";

    const rating = parseInt(card.dataset.myRating, 10) || 0;
    modalRatingStars.textContent =
      "★".repeat(rating) + "☆".repeat(5 - rating);

    const mediaType = (card.dataset.mediaType || "").toLowerCase();

    // Seasons badge line in modal (TV only)
    const seasons = (card.dataset.seasons || "").trim();
    if (mediaType === "tv" && seasons) {
      modalSeasons.textContent = `Owned seasons: ${seasons}`;
      modalSeasons.style.display = "block";
    } else {
      modalSeasons.textContent = "";
      modalSeasons.style.display = "none";
    }

    // Trakt link
    const traktId = card.dataset.trakt;
    if (traktId && mediaType) {
      const base =
        mediaType === "movie"
          ? "https://trakt.tv/movies/"
          : "https://trakt.tv/shows/";
      modalTraktLink.href = base + traktId;
      modalTraktLink.style.display = "inline-flex";
    } else {
      modalTraktLink.style.display = "none";
      modalTraktLink.href = "#";
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modalReady) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Card → modal
  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      showModal(card);
    });
  });

  // Close actions
  if (modalReady) {
    closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // Filters (movie/tv/all)
  function applyFilter(filter) {
    cards.forEach((card) => {
      const type = (card.dataset.mediaType || "").toLowerCase();
      const visible = filter === "all" || type === filter;
      card.style.display = visible ? "block" : "none";
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.dataset.filter);
    });
  });

  // Startup
  updateCollectionSplit();
  applyFilter("all");
});

