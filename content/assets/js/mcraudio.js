const audioList = [{src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-mama-box.mp3", name: "Mama"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-disenchanted-box.mp3", name: "Disenchanted"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-helena-box.mp3", name: "Helena"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-blackparade-box.mp3", name: "Black Parade"}];

let audio = undefined;
let playButton = undefined;
let pauseButton = undefined;
let nextButton = undefined;
let backButton = undefined;
let audioNum = Math.floor(Math.random() * audioList.length);

window.onload = function() {
  audio = document.getElementById("audio");

  audio.src = audioList[audioNum].src;
  document.querySelector(".screen b").textContent = audioList[audioNum].name;
  audio.volume = 0.1; // Set volume to 10%
  audio.load()
  playButton = document.getElementById("playButton");
  playButton.addEventListener("click", function() {
    playMusic();
  });
  pauseButton = document.getElementById("pauseButton");
  pauseButton.addEventListener("click", function() {
    audio.pause();
  });
  nextButton = document.getElementById("nextButton");
  nextButton.addEventListener("click", function() {
    audioNum = (1+audioNum) % audioList.length;
    changeMusic(audioList[audioNum]);
  });
  backButton = document.getElementById("backButton");
  backButton.addEventListener("click", function() {
    audioNum = (audioNum - 1 + audioList.length) % audioList.length;
    changeMusic(audioList[audioNum]);
  });
}

function changeMusic(song) {
  audio.src = song.src;
  audio.load();
  playMusic();
  document.querySelector(".screen b").textContent = song.name;
}

/* const audio = new Audio();
 */
function playMusic() {
  audio.play()
}


// Countdown to MCR event
function startCountdown() {
  const countdownElement = document.getElementById("countdown-timer");

  // Target date in Scotland timezone
  const targetDate = new Date("2026-07-04T17:00:00+01:00"); // BST (UK summer time)

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      countdownElement.innerHTML = "🖤 It's show time! 🖤";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      (distance % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor(
      (distance % (1000 * 60)) / 1000
    );

    countdownElement.innerHTML =
      `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Run countdown when page loads
document.addEventListener("DOMContentLoaded", startCountdown);
