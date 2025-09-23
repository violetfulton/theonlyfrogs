const audioList = [{src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-mama-box.mp3", name: "Mama"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-disenchanted-box.mp3", name: "Disenchanted"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-helena-box.mp3", name: "Helena"}, {src: "https://file.garden/Z-MKjN_jtlFpOvgR/mcr-blackparade-box.mp3", name: "Black Parade"}];

let audio = undefined;
let playButton = undefined;
let pauseButton = undefined;
let nextButton = undefined;
let backButton = undefined;
let audioNum = Math.floor(Math.random() * audioList.length);

window.onload = function() {
  audio = document.getElementById("myAudio");

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


