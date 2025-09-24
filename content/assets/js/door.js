var door = document.querySelector(".door");
var doorArea = document.querySelector(".doorArea");

door.addEventListener("click", function() {
  door.classList.add("doorOpen");
  doorArea.classList.add("open");
  setTimeout(function() {
    window.location.href = "https://theonlyfrogs.com/interests/shrines/index.html";
  }, 1200); // matches your door swing duration
});