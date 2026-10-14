// Imported first by main.ts so it catches errors thrown while other modules build the scene. The last few go with a
// bug report (report.ts), whose Report this button sits in the box.
const errBox = document.getElementById('err')!, errMsg = document.getElementById('errMsg')!;

/** How many of the latest errors a report carries. */
const KEEP = 10;
/** The latest errors this visit, oldest first. */
export const recentErrors: string[] = [];
function note(m: string) {
  recentErrors.push(m.slice(0, 300));
  if (recentErrors.length > KEEP) recentErrors.shift();
}

export function showErr(m: string) {
  errBox.style.display = 'block';
  errMsg.textContent = m;
}

window.addEventListener('error', e => {
  const m = 'Something broke: ' + (e.message || e);
  note(m + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''));
  // another site's script failing (YouTube's player, or one the browser puts in the page itself): the browser hides
  // what went wrong and the game carries on, so a report keeps it, but there's no box (reports#8)
  if (e.message === 'Script error.' && !e.filename) return;
  showErr(m);
});
// a promise that failed with nothing to catch it: no box (the game carries on), but a report should know
window.addEventListener('unhandledrejection', e => { note('Unhandled: ' + String((e.reason as Error | undefined)?.message ?? e.reason)); });

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
