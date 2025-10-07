// === StatusCafe Feed Loader ===
const feedURL = 'https://status.cafe/users/frogs.atom'; // ✅ correct Atom feed URL
const feedContainers = document.querySelectorAll("[data-status-feed]");
const numToShow = 10; // how many to fetch total (list page can show them all)

if (feedContainers.length) {
  fetch(feedURL)
    .then(res => res.text())
    .then(str => new DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const entries = Array.from(data.querySelectorAll("entry"));
      if (!entries.length) return;

      feedContainers.forEach(container => {
        const mode = container.dataset.statusFeed; // "latest" or "all"
        let toShow = entries;
        if (mode === "latest") toShow = entries.slice(0, 1);

        let html = "";
        toShow.forEach(el => {
          const content = el.querySelector("content").textContent.trim();
          const date = el.querySelector("published").textContent.slice(0, 10);
          html += `
            <div class="status-bubble">
              <span class="status-date">${date}</span>
              <p class="status-text">${content}</p>
            </div>
          `;
        });

        container.innerHTML = html;
      });
    })
    .catch(err => {
      console.error(err);
      feedContainers.forEach(c =>
        (c.innerHTML = "<p>Couldn’t load statuses :(</p>")
      );
    });
}
// ================================