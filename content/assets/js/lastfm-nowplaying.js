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
    const image = current.image.pop()["#text"] || "/assets/img/no-cover.png";

    // Detect track change for fade animation
    if (trackName !== lastTrackName) {
      lastTrackName = trackName;
      nowPlayingDiv.classList.add("fade-in");
      setTimeout(() => nowPlayingDiv.classList.remove("fade-in"), 1000);
    }

    // Build recent (only when not playing)
    let recentHTML = "";
    if (!isNowPlaying && tracks.length > 1) {
      const recentTracks = tracks.slice(1, 3); // only last 2
      recentHTML = `
        <div class="recent-tracks-side">
          <p class="recent-title">Recently played:</p>
          <ul>
            ${recentTracks
              .map(
                (t) => `
              <li>
                <img src="${t.image.pop()["#text"] || "/assets/img/no-cover.png"}" alt="">
                <div class="recent-info">
                  <span class="recent-song">${t.name}</span><br>
                  <span class="recent-artist">${t.artist["#text"]}</span>
                </div>
              </li>`
              )
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
    note.style.color = getRandomGreenShade();
    note.style.opacity = 0;
    note.style.position = "absolute";
    note.style.bottom = "0";
    note.style.textShadow = "0 0 6px rgba(76,175,80,0.4)";
    note.style.animation = `floatNote ${3 + Math.random() * 3}s linear forwards`;

    container.appendChild(note);
    setTimeout(() => note.remove(), 6000);
  };

  const interval = setInterval(createNote, 800 + Math.random() * 800);
  container.dataset.interval = interval;
}

function getRandomGreenShade() {
  const shades = ["#4caf50", "#81c784", "#66bb6a", "#a5d6a7"];
  return shades[Math.floor(Math.random() * shades.length)];
}

fetchNowPlaying();
setInterval(fetchNowPlaying, updateInterval);