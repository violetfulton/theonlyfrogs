document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("dvd-modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalYear = document.getElementById("modal-year");
  const modalRatingStars = document.getElementById("modal-rating-stars");
  const modalOverview = document.getElementById("modal-overview");
  const closeButton = document.querySelector(".modal-close");

  const cards = [...document.querySelectorAll(".movie-card")];
  const filterButtons = [...document.querySelectorAll(".filter-btn")];

  if (!cards.length) return;

  const modalReady =
    modal && modalImg && modalTitle && modalYear && modalRatingStars && modalOverview && closeButton;

  if (!modalReady) {
    console.warn("[dvdModal] Modal elements missing on this page. Modal clicks disabled.");
  }

  function showModal(card) {
    if (!modalReady) return;

    modalImg.src = card.dataset.img || "";
    modalTitle.textContent = card.dataset.title || "Untitled";
    modalYear.textContent = card.dataset.year || "Unknown";
    modalOverview.textContent = card.dataset.overview || "No description available.";

    const rating = parseInt(card.dataset.myRating, 10) || 0;
    modalRatingStars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);

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
  applyFilter("all");
});
