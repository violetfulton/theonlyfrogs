(() => {
  const source = document.getElementById('acnh-progress-data');
  if (!source) return;
  let progress;
  try { progress = JSON.parse(source.textContent || '{}'); }
  catch { return; }
  const has = value => value === true || (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && value > 0);
  const state = value => {
    if (value === true) return true;
    return value && typeof value === 'object' && ['caught', 'found', 'owned', 'donated'].some(key => has(value[key]));
  };
  const count = category => Object.values(progress[category] || {}).filter(state).length;
  const fish = count('fish');
  const bugs = count('bugs');
  const sea = count('sea');
  const total = fish + bugs + sea;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
  set('acnhFishCaught', fish);
  set('acnhBugsCaught', bugs);
  set('acnhSeaCaught', sea);
  set('acnhTotalCaught', total);
  const bar = document.getElementById('acnhMuseumBar');
  if (bar) bar.style.width = `${Math.min(100, total / 200 * 100)}%`;
})();
