document.addEventListener("DOMContentLoaded", () => {
  const pages = Array.from(document.querySelectorAll(".diary-page"));
  if (!pages.length) return;

  const prevBtn = document.getElementById("diaryPrev");
  const nextBtn = document.getElementById("diaryNext");
  const currentSpan = document.getElementById("diaryCurrentPage");
  const totalSpan = document.getElementById("diaryTotalPages");

  const sidebarLinks = Array.from(
    document.querySelectorAll(".acnl-diary-sidebar a")
  );

  let currentIndex = 0;
  const totalPages = pages.length;

  if (totalSpan) {
    totalSpan.textContent = totalPages.toString();
  }

  function showPage(index) {
    if (index < 0 || index >= totalPages) return;

    // Toggle visible page
    pages.forEach((page, i) => {
      page.classList.toggle("is-active", i === index);
    });

    currentIndex = index;

    // Update page indicator
    if (currentSpan) {
      currentSpan.textContent = (currentIndex + 1).toString();
    }

    // Enable/disable buttons
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === totalPages - 1;

    // Highlight active sidebar link
    sidebarLinks.forEach(link => {
      const pageNum = parseInt(link.dataset.page, 10);
      if (pageNum === currentIndex) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }

  // Button handlers
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      showPage(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      showPage(currentIndex + 1);
    });
  }

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      showPage(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      showPage(currentIndex + 1);
    } else if (e.key === "Escape") {
      // close lightbox if open
      const lb = document.querySelector(".diary-lightbox.is-visible");
      if (lb) {
        lb.classList.remove("is-visible");
      }
    }
  });

  // Sidebar links -> jump to page
  sidebarLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageNum = parseInt(link.dataset.page, 10);
      showPage(pageNum);
    });
  });

    // Month expand/collapse in sidebar
  const monthToggles = document.querySelectorAll(".month-toggle");
  monthToggles.forEach(btn => {
    btn.addEventListener("click", () => {
      const daysList = btn.nextElementSibling;
      if (!daysList) return;
      daysList.classList.toggle("is-collapsed");
    });
  });


  // --- Lightbox for images ---

  // Create lightbox element once
  const lightbox = document.createElement("div");
  lightbox.className = "diary-lightbox";
  const lightboxImg = document.createElement("img");
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);

  // Open lightbox when clicking any image in a diary page
  const diaryImages = document.querySelectorAll(".diary-page img");
  diaryImages.forEach(img => {
    img.addEventListener("click", () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      lightbox.classList.add("is-visible");
    });
  });

  // Close lightbox when clicking overlay
  lightbox.addEventListener("click", () => {
    lightbox.classList.remove("is-visible");
  });

  // Start on first page
  showPage(0);
});

