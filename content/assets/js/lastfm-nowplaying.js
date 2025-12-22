const username = "onlyfrogs"; // your Last.fm username
const apiKey = "fa126e433d6a8d7f7173d63203d4f4be"; // your Last.fm API key
const updateInterval = 45000; // refresh every 45s
// -------------------------

// Last.fm Now Playing Widget
let lastTrackName = null;

async function fetchNowPlaying() {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=3`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const tracks = data.recenttracks.track;
    const nowPlayingDiv = document.getElementById("now-playing");

    if (!tracks || tracks.length === 0) {
      nowPlayingDiv.innerHTML = `<p>no recent tunes :(</p>`;
      return;
    }

    const current = tracks[0];
    const isNowPlaying = current["@attr"] && current["@attr"].nowplaying === "true";

    const trackName = current.name;
    const artist = current.artist["#text"];
    const album = current.album["#text"];
    const image = current.image.pop()["#text"] || "/assets/imgs/no-cover.png";

    // Detect track change for fade animation
    if (trackName !== lastTrackName) {
      lastTrackName = trackName;
      nowPlayingDiv.classList.add("fade-in");
      setTimeout(() => nowPlayingDiv.classList.remove("fade-in"), 1000);
    }

 // Build recent (always show last 2 after the current track)
let recentHTML = "";
const recentTracks = tracks.slice(1, 3); // next 2 after current

if (recentTracks.length) {
  recentHTML = `
    <div class="recent-tracks-side">
      <p class="recent-title">Recently played:</p>
      <ul>
        ${recentTracks
          .map((t) => {
            const img = (t.image?.[t.image.length - 1]?.["#text"]) || "/assets/imgs/no-cover.png";
            const name = t.name || "";
            const art = t.artist?.["#text"] || "";
            return `
              <li>
                <img src="${img}" alt="">
                <div class="recent-info">
                  <span class="recent-song">${name}</span><br>
                  <span class="recent-artist">${art}</span>
                </div>
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}
    // Build main box
    nowPlayingDiv.innerHTML = `
      <div class="nowplaying-wrapper ${isNowPlaying ? "active" : "idle"}">
        <div class="track-card ${isNowPlaying ? "playing" : "idle"}">
          <div class="album-art">
            <img src="${image}" alt="${album}">
            ${isNowPlaying ? '<div class="music-notes"></div>' : ""}
          </div>
          <div class="track-info">
            <p class="track-title">${trackName}</p>
            <p class="track-artist">${artist}</p>
            <p class="track-status">${
              isNowPlaying ? "🎧 Now Playing" : "💤 Not playing right now"
            }</p>
          </div>
        </div>
        ${recentHTML}
      </div>
    `;

    if (isNowPlaying) startMusicNotesAnimation();
  } catch (error) {
    console.error("Error fetching Last.fm data:", error);
    document.getElementById("now-playing").innerHTML = `<p>error loading tunes :(</p>`;
  }
}

// 🎵 Randomized floating notes animation
function startMusicNotesAnimation() {
  const container = document.querySelector(".music-notes");
  if (!container) return;

  if (container.dataset.interval) clearInterval(container.dataset.interval);

  const createNote = () => {
    const note = document.createElement("span");
    const notes = ["♪", "♫", "♬", "♩"];
    note.textContent = notes[Math.floor(Math.random() * notes.length)];
    note.style.left = `${Math.random() * 30}px`;
    note.style.fontSize = `${0.8 + Math.random() * 1.2}rem`;
    note.style.color = getRandomPinkShade();
    note.style.opacity = 0;
    note.style.position = "absolute";
    note.style.bottom = "0";
    note.style.textShadow = "0 0 8px rgba(255, 105, 180, 0.55)";
    note.style.animation = `floatNote ${3 + Math.random() * 3}s linear forwards`;

    container.appendChild(note);
    setTimeout(() => note.remove(), 6000);
  };

  const interval = setInterval(createNote, 800 + Math.random() * 800);
  container.dataset.interval = interval;
}

function getRandomPinkShade() {
  function getRandomPinkShade() {
  const shades = [
    "#ff4fa3", // hot pink
    "#ff77c8", // bubblegum
    "#ff9ad5", // pastel pink
    "#ff2d7a", // punchy pink-red
    "#ffb3e6", // soft candy
    "#ff5ad6", // neon orchid
  ];
  return shades[Math.floor(Math.random() * shades.length)];
}
}

fetchNowPlaying();
setInterval(fetchNowPlaying, updateInterval);