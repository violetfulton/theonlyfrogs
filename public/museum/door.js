var doorLink = document.querySelector(".door-link");
var door = document.querySelector(".door");

doorLink.addEventListener("click", function(e) {
  e.preventDefault(); // Prevent immediate navigation
  door.classList.add("doorOpen");
  setTimeout(function() {
    window.location.href = doorLink.href;
  }, 1200); // Match the swing duration (1.2s)
});