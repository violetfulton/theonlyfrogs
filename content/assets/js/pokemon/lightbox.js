// Frosted Lightbox Gallery (scoped per section)
// - Next/Prev arrows
// - Keyboard (Esc, ← →)
// - Swipe (left/right)
// - Navigation cycles ONLY within the section you opened from
(function () {
const SELECTOR = [
  "a.pm-card",
  ".pm-grid a",
  "a[data-lightbox]"
].join(",");

  let lb, imgEl, capEl, closeBtn, prevBtn, nextBtn, lastFocus;

  // Current gallery scope
  let items = [];
  let index = -1;

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  function build() {
    lb = document.createElement("div");
    lb.className = "pokelightbox";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");

    lb.innerHTML = `
      <div class="pokelightbox__backdrop" data-lb-close></div>
      <div class="pokelightbox__panel" role="document">
        <button class="pokelightbox__close" type="button" data-lb-close aria-label="Close">✕</button>

        <div class="pokelightbox__nav" aria-hidden="false">
          <button class="pokelightbox__arrow pokelightbox__arrow--prev" type="button" aria-label="Previous image">‹</button>
          <button class="pokelightbox__arrow pokelightbox__arrow--next" type="button" aria-label="Next image">›</button>
        </div>

        <div class="pokelightbox__imgwrap">
          <img class="pokelightbox__img" alt="">
        </div>

        <div class="pokelightbox__caption" aria-live="polite"></div>
      </div>
    `;

    document.body.appendChild(lb);

    imgEl = lb.querySelector(".pokelightbox__img");
    capEl = lb.querySelector(".pokelightbox__caption");
    closeBtn = lb.querySelector(".pokelightbox__close");
    prevBtn = lb.querySelector(".pokelightbox__arrow--prev");
    nextBtn = lb.querySelector(".pokelightbox__arrow--next");

    lb.addEventListener("click", (e) => {
      if (e.target && e.target.matches("[data-lb-close]")) close();
    });

    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));

    document.addEventListener("keydown", (e) => {
      if (!lb || lb.hidden) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "Tab") trapFocus(e);
    });

    const wrap = lb.querySelector(".pokelightbox__imgwrap");
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: true });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  function trapFocus(e) {
    const focusables = lb.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function getCaption(anchor) {
    const dataCap = anchor.getAttribute("data-caption");
    if (dataCap) return dataCap;

    const label = anchor.querySelector(".figure-label, .tcg-label, .game-title");
    if (label && label.textContent) return label.textContent.trim();

    const img = anchor.querySelector("img");
    if (img && img.alt) return img.alt;

    return "";
  }

  function isImageHref(a) {
    const href = a.getAttribute("href") || "";
    return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(href);
  }

  function findScopeRoot(anchor) {
      // ✅ NEW: scope within trainer photos strip
  const strip = anchor.closest(".trainer-strip");
  if (strip) return strip;

    // Scope within the nearest physical-section first
    const section = anchor.closest(".physical-section");
    if (section) return section;

    // Fallback: scope within the nearest grid container
    const grid = anchor.closest(".figure-grid, .game-grid, .tcg-grid, .misc-grid");
    if (grid) return grid;

    // Last resort: whole document
    return document;
  }

  function collectScopedItems(anchor) {
    const root = findScopeRoot(anchor);
    const all = Array.from(root.querySelectorAll(SELECTOR));
    items = all.filter(isImageHref);
  }

  function show(newIndex) {
    if (!items.length) return;

    // wrap-around within scope
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    index = newIndex;

    const a = items[index];
    const href = a.getAttribute("href");
    const thumb = a.querySelector("img");
    const alt = thumb?.alt || "";

    imgEl.src = href;
    imgEl.alt = alt;

    capEl.textContent = getCaption(a);

    // Always enabled because wrap-around
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  function open(anchor) {
    if (!lb) build();

    collectScopedItems(anchor);

    lastFocus = document.activeElement;

    const clickedIndex = items.indexOf(anchor);
    index = clickedIndex >= 0 ? clickedIndex : 0;

    lb.hidden = false;
    document.documentElement.style.overflow = "hidden";

    show(index);
    closeBtn.focus();
  }

  function close() {
    if (!lb) return;

    lb.hidden = true;
    imgEl.src = "";
    imgEl.alt = "";
    capEl.textContent = "";

    document.documentElement.style.overflow = "";

    // reset scope
    items = [];
    index = -1;

    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  // Touch swipe
  function onTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!touchActive || !e.touches || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (Math.abs(dy) > Math.abs(dx) + 10) {
      touchActive = false;
    }
  }

  function onTouchEnd(e) {
    if (!touchActive) return;
    touchActive = false;

    const touch = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    if (Math.abs(dx) < 40) return;

    if (dx < 0) show(index + 1);
    else show(index - 1);
  }

  // Intercept clicks
  document.addEventListener("click", (e) => {
    const a = e.target.closest(SELECTOR);
    if (!a) return;
    if (!isImageHref(a)) return;

    e.preventDefault();
    open(a);
  });
})();