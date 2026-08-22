document.addEventListener("DOMContentLoaded", () => {
  const topButton = document.getElementById("myBtn");

  if (topButton) {
    const updateTopButton = () => {
      topButton.style.display = window.scrollY > 20 ? "block" : "none";
    };

    window.addEventListener("scroll", updateTopButton, { passive: true });
    updateTopButton();

    topButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const tooltipTargets = document.querySelectorAll("[data-tooltip]");
  if (!tooltipTargets.length) return;

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.setAttribute("role", "tooltip");
  document.body.appendChild(tooltip);

  tooltipTargets.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      tooltip.textContent = element.dataset.tooltip || "";
      const rect = element.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
      tooltip.style.display = "block";
    });
    element.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
});
