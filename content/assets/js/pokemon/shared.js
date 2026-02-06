(() => {
  const nav = document.querySelector(".pokenav");
  if (!nav) return;

  const btn = nav.querySelector(".pokenav__toggle");
  const panel = nav.querySelector(".pokenav__panel");
  const backdrop = document.querySelector(".pokenav__backdrop");

  function setOpen(isOpen) {
    nav.classList.toggle("open", isOpen);
    btn.setAttribute("aria-expanded", String(isOpen));
    if (backdrop) backdrop.hidden = !isOpen;
  }

  function toggle() {
    setOpen(!nav.classList.contains("open"));
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  // Close when clicking backdrop
  if (backdrop) {
    backdrop.addEventListener("click", () => setOpen(false));
  }

  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // Close when clicking a link (nice on mobile)
  panel.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) setOpen(false);
  });

  // Close when tapping outside the nav (desktop convenience)
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    const clickedInside = e.target.closest(".pokenav");
    if (!clickedInside) setOpen(false);
  });
})();