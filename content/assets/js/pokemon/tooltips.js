// Global Pokémon tooltip init
// Works for sprites, cards, HOF teams, shinies, etc.

(function () {
  // Ensure data-caption works with this plugin (it reads `title`)
  document.querySelectorAll("[data-caption]").forEach(el => {
    if (!el.getAttribute("title")) {
      el.setAttribute("title", el.getAttribute("data-caption"));
    }
  });

  // Init plugin (jQuery required)
  if (window.jQuery && jQuery.fn.style_my_tooltips) {
    jQuery("[title]").style_my_tooltips({
      tip_follows_cursor: true,
      tip_delay_time: 80,
      tip_fade_speed: 200
    });
  }
})();