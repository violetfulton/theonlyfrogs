const modal = document.getElementById("movie-modal");
const stars = document.querySelectorAll(".rating-stars span");
const cards = document.querySelectorAll(".movie-card");
const filterButtons = document.querySelectorAll(".filter-btn");

function updateStarUI(rating) {
  stars.forEach((star, index) => {
    star.classList.toggle("active", index < rating);
  });
}

function updateProgress() {
  const total = cards.length;
  const watched = [...cards].filter(c => c.dataset.status === "watched").length;
  const percent = Math.round((watched / total) * 100) || 0;

  document.querySelector(".progress-fill").style.width = percent + "%";
  document.getElementById("progress-text").textContent =
    `Watched ${watched} of ${total} — ${percent}%`;
}

function applyFilter(filter) {
  cards.forEach(card => {
    const status = card.dataset.status;
    const visible =
      filter === "all" ||
      (filter === "watched" && status === "watched") ||
      (filter === "unwatched" && status === "unwatched");

    card.style.display = visible ? "" : "none";
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

document.querySelectorAll(".movie-card").forEach(card => {
  card.addEventListener("click", () => {
    document.getElementById("modal-img").src = card.dataset.img;
    document.getElementById("modal-title").textContent = card.dataset.title;
    document.getElementById("modal-overview").textContent = card.dataset.overview || "";
    document.getElementById("modal-year").textContent = card.dataset.year || "Unknown";
    document.getElementById("modal-runtime").textContent = card.dataset.runtime || "??";
    document.getElementById("modal-genres").textContent = card.dataset.genres || "Unknown";

    updateStarUI(Number(card.dataset.myRating) || 0);

    document.getElementById("modal-status").textContent =
      card.dataset.status || "unwatched";

    modal.classList.remove("hidden");
  });
});

// close modal
document.querySelector(".modal-close").addEventListener("click", () =>
  modal.classList.add("hidden")
);

modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") modal.classList.add("hidden");
});

updateProgress();
applyFilter("all");
