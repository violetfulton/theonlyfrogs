document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("dvd-modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalYear = document.getElementById("modal-year");
  const modalRatingStars = document.getElementById("modal-rating-stars");
  const modalStatus = document.getElementById("modal-status");
  const closeButton = document.querySelector(".modal-close");
  const cards = document.querySelectorAll(".movie-card");

  function showModal(card) {
    modalImg.src = card.dataset.img;
    modalTitle.textContent = card.dataset.title;
    modalYear.textContent = card.dataset.year || "Unknown";

    // Ratings (★/☆)
    const rating = parseInt(card.dataset.myRating) || 0;
    modalRatingStars.textContent =
      "★".repeat(rating) + "☆".repeat(5 - rating);

    // Status icons ✅ / 🎯
    modalStatus.textContent =
      card.dataset.status === "watched"
        ? "✅ Watched"
        : "🎯 Unwatched";

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  cards.forEach(card => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      showModal(card);
    });
  });

  closeButton.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // ✅ FILTERING + PROGRESS
  const filterButtons = document.querySelectorAll(".filter-btn");
  const movieCards = document.querySelectorAll(".movie-card");
  const progressFill = document.querySelector(".progress-fill");
  const progressText = document.getElementById("progress-text");

  function updateProgress() {
    const total = movieCards.length;
    const watchedCount = [...movieCards].filter(card => card.dataset.status === "watched").length;
    const percent = total ? Math.round((watchedCount / total) * 100) : 0;
    progressFill.style.width = percent + "%";
    progressText.textContent = `${watchedCount}/${total} watched (${percent}%)`;
  }

  function applyFilter(filter) {
    movieCards.forEach(card => {
      const status = card.dataset.status;
      card.style.display =
        filter === "all" || status === filter
          ? "block"
          : "none";
    });
    updateProgress();
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.dataset.filter);
    });
  });

  // ✅ Initial state
  applyFilter("all");
});
