// Imported first by main.ts so it catches errors thrown while other modules build the scene.
const errBox = document.getElementById('err')!;

export function showErr(m: string) {
  errBox.style.display = 'block';
  errBox.textContent = m;
}

window.addEventListener('error', e => showErr('Something broke: ' + (e.message || e)));

/** When this tab last reloaded to catch up with a deploy (index.html's inline script uses it too). */
export const RELOAD_KEY = 'floe-market-reload';
export const page = { reload: () => location.reload() };

/** Reloads the page, unless it already did in the last minute (the site may be down, not just redeployed). */
export function reloadOnce() {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOAD_KEY)) < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { return false; }
  page.reload();
  return true;
}

// A deploy removes the last one's files, so a tab open from before it can't fetch Firebase (loaded on demand) any more.
// Reloading gets the new page; the game saves on the way out. Otherwise cloud saves just show as offline.
window.addEventListener('vite:preloadError', e => { if (reloadOnce()) e.preventDefault(); });
