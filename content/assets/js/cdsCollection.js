document.addEventListener("DOMContentLoaded", () => {
  const covers = document.querySelectorAll(".cd-cover");
  const detailsBoxes = document.querySelectorAll(".cd-details");
  const cards = document.querySelectorAll(".cd-card");
  const closeButtons = document.querySelectorAll(".cd-close");

  function closeAll() {
    detailsBoxes.forEach(d => d.classList.remove("visible"));
    cards.forEach(c => c.classList.remove("expanded"));
  }

  covers.forEach(cover => {
    cover.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = cover.closest(".cd-card");
      const id = cover.getAttribute("data-cd");
      const details = document.getElementById("details-" + id);
      const isOpen = details.classList.contains("visible");

      closeAll();

      if (!isOpen) {
        details.classList.add("visible");
        card.classList.add("expanded");

        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAll();
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".cd-card")) {
      closeAll();
    }
  });
});

