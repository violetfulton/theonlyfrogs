/* /assets/js/ashnikko.js
   - Lightbox for [data-lightbox="ash"] (next/prev, Esc, arrows, swipe)
   - MySpace-ish music toggle
   - Lightbox glow pulses in time with the music (Web Audio Analyser -> CSS var)
*/

(function () {
  const shrineRoot =
    document.querySelector(".ash-shrine") || document.documentElement;

  /* ---------------------------
     MUSIC + AUDIO PULSE
  --------------------------- */
  const audio = document.getElementById("ash-audio");
  const toggle = document.querySelector(".music-toggle");

  // Web Audio analysis state
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let dataArray = null;
  let rafId = null;
  let smooth = 0;

  function setPulse(v) {
    // clamp 0..1
    const clamped = Math.max(0, Math.min(1, v));
    shrineRoot.style.setProperty("--ash-pulse", clamped.toFixed(3));
  }

  function stopPulseLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    smooth = 0;
    setPulse(0);
  }

  function ensureAudioAnalysis() {
    if (!audio) return;

    // Create context lazily (must be user-gesture-resumed)
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;

      // IMPORTANT: media element source can only be created once per <audio>
      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
  }

  function startPulseLoop() {
    if (!analyser || !dataArray) return;
    if (rafId) return;

    const loop = () => {
      analyser.getByteTimeDomainData(dataArray);

      // compute RMS (0..1-ish), then exaggerate
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const x = (dataArray[i] - 128) / 128; // -1..1
        sum += x * x;
      }
      const rms = Math.sqrt(sum / dataArray.length); // 0..~0.7 typical
      const raw = Math.min(1, rms * 3.0); // boost for drama

      // smooth it (MySpace glow feels nicer)
      smooth = smooth * 0.85 + raw * 0.15;

      // slight floor so it never looks dead when playing
      const pulse = audio && !audio.paused ? Math.max(0.05, smooth) : 0;

      setPulse(pulse);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
  }

  async function tryResumeAndAnalyse() {
    ensureAudioAnalysis();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch (e) {
        // ignore; user may need another gesture
      }
    }
    startPulseLoop();
  }

  if (audio && toggle) {
    const KEY = "ash_music_enabled";
    const KEY_VOL = "ash_music_vol";
    const defaultVol = 0.35;

    const savedEnabled = localStorage.getItem(KEY);
    const savedVol = parseFloat(localStorage.getItem(KEY_VOL) || "");
    audio.volume = Number.isFinite(savedVol) ? savedVol : defaultVol;

    function setToggleUI(isOn) {
      toggle.setAttribute("aria-pressed", String(isOn));
      toggle.textContent = isOn ? "⏸ pause music" : "▶ play music";
    }

    function armAutoplayOnce() {
      // If enabled, start on first user interaction.
      const start = async () => {
        try {
          await audio.play();
        } catch (e) {
          // still blocked; user can press the button
        }
        await tryResumeAndAnalyse();
        setToggleUI(!audio.paused);
      };

      window.addEventListener("pointerdown", start, { once: true });
      window.addEventListener("keydown", start, { once: true });
      window.addEventListener("touchstart", start, { once: true });
    }

    // init state
    if (savedEnabled === "true") {
      setToggleUI(true);
      armAutoplayOnce();
    } else {
      setToggleUI(false);
      setPulse(0);
    }

    toggle.addEventListener("click", async () => {
      const isOn = localStorage.getItem(KEY) === "true";

      if (!isOn) {
        localStorage.setItem(KEY, "true");
        setToggleUI(true);

        try {
          await audio.play();
        } catch (e) {
          armAutoplayOnce();
        }

        await tryResumeAndAnalyse();
      } else {
        localStorage.setItem(KEY, "false");
        audio.pause();
        setToggleUI(false);
        stopPulseLoop();
      }
    });

    // optional: volume wheel over the button
    toggle.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * -0.05;
        audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
        localStorage.setItem(KEY_VOL, String(audio.volume));
      },
      { passive: false }
    );

    // If audio ends (shouldn't, loop), reset pulse
    audio.addEventListener("pause", () => {
      // keep it soft-zero rather than hard cancel (looks nicer)
      stopPulseLoop();
    });

    audio.addEventListener("play", async () => {
      await tryResumeAndAnalyse();
    });
  }

  /* ---------------------------
     LIGHTBOX
  --------------------------- */
  const SELECTOR = 'a[data-lightbox="ash"]';
  const links = Array.from(document.querySelectorAll(SELECTOR));

  if (!links.length) return;

  const lb = document.createElement("div");
  lb.className = "ash-lightbox";
  lb.hidden = true;
  lb.innerHTML = `
    <div class="ash-lightbox__backdrop" data-lb-close></div>
    <div class="ash-lightbox__panel" role="dialog" aria-modal="true" aria-label="Media viewer">
      <button class="ash-lightbox__close" type="button" data-lb-close aria-label="Close">✖</button>

      <button class="ash-lightbox__nav ash-lightbox__prev" type="button" data-lb-prev aria-label="Previous">◀</button>
      <button class="ash-lightbox__nav ash-lightbox__next" type="button" data-lb-next aria-label="Next">▶</button>

      <figure class="ash-lightbox__figure">
        <img class="ash-lightbox__img" alt="">
        <figcaption class="ash-lightbox__cap"></figcaption>
      </figure>
    </div>
  `;
  document.body.appendChild(lb);

  const imgEl = lb.querySelector(".ash-lightbox__img");
  const capEl = lb.querySelector(".ash-lightbox__cap");
  const closeBtns = lb.querySelectorAll("[data-lb-close]");
  const prevBtn = lb.querySelector("[data-lb-prev]");
  const nextBtn = lb.querySelector("[data-lb-next]");

  let index = -1;
  let lastFocus = null;

  function getItem(i) {
    const a = links[i];
    return {
      href: a.getAttribute("href"),
      caption:
        a.getAttribute("data-caption") ||
        a.querySelector("img")?.alt ||
        "",
    };
  }

  function render(i) {
    index = (i + links.length) % links.length;
    const item = getItem(index);
    imgEl.src = item.href;
    capEl.textContent = item.caption;
  }

  async function openAt(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;

    // If music is playing, ensure analyser is running so pulse is live while lightbox is open
    if (audio && !audio.paused) {
      await tryResumeAndAnalyse();
    }

    render(i);
    lb.querySelector(".ash-lightbox__close").focus();
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function next() { render(index + 1); }
  function prev() { render(index - 1); }

  links.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openAt(i);
    });
  });

  closeBtns.forEach((btn) => btn.addEventListener("click", close));
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  window.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // swipe (touch)
  let sx = 0, sy = 0, touching = false;

  lb.addEventListener("touchstart", (e) => {
    if (lb.hidden) return;
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
    touching = true;
  });

  lb.addEventListener("touchend", (e) => {
    if (!touching || lb.hidden) return;
    touching = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < -40) next();
    if (dx > 40) prev();
  });

  // click image = next (chaos option)
  imgEl.addEventListener("click", () => {
    if (!lb.hidden) next();
  });
})();