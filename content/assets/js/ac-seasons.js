(() => {
  const spring = document.getElementById("seasonSpring");
  const summer = document.getElementById("seasonSummer");
  const autumn = document.getElementById("seasonAutumn");
  const winter = document.getElementById("seasonWinter");

  if (!spring || !summer || !autumn || !winter) return;

  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  function clearOverlays() {
    [spring, summer, autumn, winter].forEach((el) => {
      el.classList.remove("is-active", "is-maple-season", "is-cherry-season");
      el.innerHTML = "";
    });
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createPetals(container, count = 22, mode = "spring") {
    for (let i = 0; i < count; i += 1) {
      const petal = document.createElement("span");
      petal.className = mode === "cherry" ? "petal petal--cherry" : "petal";
      petal.style.left = `${randomBetween(0, 100)}%`;
      petal.style.animationDuration = `${randomBetween(10, 22)}s, ${randomBetween(4, 8)}s, ${randomBetween(6, 14)}s`;
      petal.style.animationDelay = `${randomBetween(-20, 0)}s, ${randomBetween(-8, 0)}s, ${randomBetween(-10, 0)}s`;
      petal.style.opacity = randomBetween(0.35, 0.95);
      petal.style.scale = randomBetween(0.7, 1.4);
      container.appendChild(petal);
    }
  }

  function createSummer(container, glows = 18) {
    for (let i = 0; i < glows; i += 1) {
      const glow = document.createElement("span");
      glow.className = "glow";
      glow.style.left = `${randomBetween(0, 100)}%`;
      glow.style.top = `${randomBetween(8, 92)}%`;
      glow.style.animationDelay = `${randomBetween(-10, 0)}s`;
      glow.style.animationDuration = `${randomBetween(7, 13)}s, ${randomBetween(1.6, 3.2)}s`;
      glow.style.opacity = randomBetween(0.25, 0.9);
      glow.style.scale = randomBetween(0.8, 1.5);
      container.appendChild(glow);
    }
  }

  function createLeaves(container, count = 24, mapleBoost = false) {
    const variants = ["", " leaf--gold", " leaf--red", " leaf--orange"];
    for (let i = 0; i < count; i += 1) {
      const leaf = document.createElement("span");
      const extra = mapleBoost ? " leaf--maple" : "";
      leaf.className = `leaf${variants[Math.floor(Math.random() * variants.length)]}${extra}`;
      leaf.style.left = `${randomBetween(0, 100)}%`;
      leaf.style.animationDuration = `${randomBetween(11, 24)}s, ${randomBetween(4, 8)}s, ${randomBetween(8, 14)}s`;
      leaf.style.animationDelay = `${randomBetween(-20, 0)}s, ${randomBetween(-8, 0)}s, ${randomBetween(-10, 0)}s`;
      leaf.style.opacity = randomBetween(0.45, 0.95);
      leaf.style.scale = randomBetween(0.75, 1.5);
      container.appendChild(leaf);
    }
  }

  function createSnow(container, count = 34, heavy = false) {
    const shapes = ["✦", "✧", "❄", "•"];
    const total = heavy ? count + 12 : count;

    for (let i = 0; i < total; i += 1) {
      const flake = document.createElement("span");
      flake.className = "snowflake";
      flake.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      flake.style.left = `${randomBetween(0, 100)}%`;
      flake.style.fontSize = `${randomBetween(10, 20)}px`;
      flake.style.animationDuration = `${randomBetween(8, 18)}s, ${randomBetween(3, 7)}s`;
      flake.style.animationDelay = `${randomBetween(-18, 0)}s, ${randomBetween(-7, 0)}s`;
      flake.style.opacity = randomBetween(0.35, 0.95);
      container.appendChild(flake);
    }
  }

  clearOverlays();

  // Cherry blossom season feel: March + April
  if (month === 2 || month === 3) {
    spring.classList.add("is-active", "is-cherry-season");
    createPetals(spring, 28, "cherry");
    return;
  }

  // Late spring / May
  if (month === 4) {
    spring.classList.add("is-active");
    createPetals(spring, 18, "spring");
    return;
  }

  // Summer: June-August
  if (month >= 5 && month <= 7) {
    summer.classList.add("is-active");
    createSummer(summer, month === 7 ? 24 : 18);
    return;
  }

  // Autumn: September-November
  if (month >= 8 && month <= 10) {
    const isMapleSeason = month === 10 && day >= 16 && day <= 25;
    autumn.classList.add("is-active");
    if (isMapleSeason) autumn.classList.add("is-maple-season");
    createLeaves(autumn, isMapleSeason ? 34 : 24, isMapleSeason);
    return;
  }

  // Winter: December-February
  winter.classList.add("is-active");
  createSnow(winter, 34, month === 11);
})();