// Get the button:
let mybutton = document.getElementById("myBtn");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

document.addEventListener("DOMContentLoaded", function() {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  document.body.appendChild(tooltip);

  document.querySelectorAll("[data-tooltip]").forEach(elem => {
    elem.addEventListener("mouseenter", function() {
      tooltip.textContent = this.dataset.tooltip;
      const rect = this.getBoundingClientRect();
      tooltip.style.left = rect.left + window.scrollX + "px";
      tooltip.style.top = rect.bottom + window.scrollY + "px";
      tooltip.style.display = "block";
    });

    elem.addEventListener("mouseleave", function() {
      tooltip.style.display = "none";
    });
  });
});
