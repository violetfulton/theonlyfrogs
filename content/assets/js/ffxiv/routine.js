(() => {
  const root = document.querySelector('#frog-routine');
  if (!root) return;
  const zone = 'Europe/London';
  // Daily reset is 15:00 UTC, weekly reset Tuesday 08:00 UTC.
  // All displayed dates are converted to the viewer's chosen site timezone.
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:zone,weekday:'long',day:'numeric',month:'long'}).format(now);
  const nextReset = (weekday, hour) => {
    const d = new Date();
    const utcDay = d.getUTCDay();
    let days = (weekday - utcDay + 7) % 7;
    const candidate = Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+days,hour);
    if (candidate <= d.getTime()) days += 7;
    return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+days,hour));
  };
  const clock = new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  document.querySelector('#routine-day').textContent = `Today in Scotland: ${parts}`;
  const weekly = nextReset(2,8);
  document.querySelector('#routine-week').textContent = `Next weekly reset: ${clock.format(weekly)}`;
  document.querySelector('#routine-weekly-reset').textContent = `Next: ${clock.format(weekly)}`;

  const cards = [...root.querySelectorAll('.frog-routine__card')];
  const buttons = [...root.querySelectorAll('[data-routine-filter]')];
  const favouriteOnly = root.querySelector('#routine-focus-only');
  const storageKey = 'theonlyfrogs.ffxiv.routine.favourites.v1';
  let favourites = [];
  try { const v = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(v)) favourites = v.filter(x => typeof x === 'string'); } catch (_) {}
  let filter = 'all';
  const render = () => {
    cards.forEach(card => {
      const id = card.dataset.id;
      const faved = favourites.includes(id);
      const heart = card.querySelector('.frog-routine__heart');
      heart.textContent = faved ? '♥' : '♡';
      heart.setAttribute('aria-pressed', String(faved));
      card.hidden = (filter !== 'all' && card.dataset.routine !== filter) || (favouriteOnly.checked && !faved);
    });
    root.querySelectorAll('.frog-routine__group').forEach(group => {
      group.hidden = ![...group.querySelectorAll('.frog-routine__card')].some(c => !c.hidden);
    });
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.routineFilter === filter)));
  };
  cards.forEach(card => card.querySelector('.frog-routine__heart').addEventListener('click', () => {
    const id = card.dataset.id;
    favourites = favourites.includes(id) ? favourites.filter(x=>x!==id) : [...favourites,id];
    try { localStorage.setItem(storageKey, JSON.stringify(favourites)); } catch (_) {}
    render();
  }));
  buttons.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.routineFilter;render();}));
  favouriteOnly.addEventListener('change',render);
  root.querySelector('#routine-pick').addEventListener('click',()=>{
    const available=cards.filter(card=>!card.hidden);
    const picked=root.querySelector('#routine-picked');
    if(!available.length){picked.textContent='No favourites in this view yet. Try All ideas ♡';return;}
    const card=available[Math.floor(Math.random()*available.length)];
    picked.textContent=`✧ ${card.querySelector('h3').textContent} — ${card.querySelector('p').textContent}`;
  });
  render();
})();
