document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".cd-card");

  cards.forEach(card => {
    const overlay = card.querySelector(".cd-hover-name");
    const containerWidth = overlay.offsetWidth;
    const textWidth = overlay.scrollWidth;

    // Scroll if text is wider than container
    if (textWidth > containerWidth) {
      const duration = textWidth / 50;
      overlay.style.animation = `scroll-text ${duration}s linear infinite`;
      overlay.style.animationPlayState = "running";

      overlay.addEventListener("mouseenter", () => {
        overlay.style.animationPlayState = "paused";
      });
      overlay.addEventListener("mouseleave", () => {
        overlay.style.animationPlayState = "running";
      });
    }

    // Toggle details on click
    card.addEventListener("click", () => {
      card.classList.toggle("active");
    });
  });
});

