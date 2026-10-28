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
  // (with the 3D view gone, its dialog says what's wrong: what breaks without it is no news)
  if (view3d.down) return;
  errBox.style.display = 'block';
  errMsg.textContent = m;
}

window.addEventListener('error', e => {
  const m = 'Something broke: ' + (e.message || e);
  note(m + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''));
  // another site's script failing (one the browser or an extension puts in the page): the browser hides
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

// ---------- the 3D view ----------
// A phone can refuse the game its 3D view, or take it back mid-game: it's low on memory, or its graphics chip has
// restarted, and after that Chrome may keep 3D off for the site until it's restarted itself. The world would just be
// blank behind the HUD; a dialog says so instead, with a way to reload (the game saves on the way out).
const glDialog = document.getElementById('glLost')!, glWhy = document.getElementById('glLostWhy')!;
/** What the dialog says: the 3D view couldn't start, or it stopped and didn't come back. */
export const GL_SAYS = { start: 'Restart your browser to bring back the 3D', lost: 'The 3D view stopped. Your game is saved.' };
/** Whether the 3D view's gone, and the dialog's up. */
export const view3d = { down: false };
glDialog.querySelector('button')!.addEventListener('click', () => page.reload());

/** The 3D view's gone: it couldn't start (`start`), or the browser took it back and hasn't given it back (`lost`). */
export function glGone(why: keyof typeof GL_SAYS, detail = '') {
  note(`3D view ${why === 'start' ? "didn't start" : 'lost'}${detail ? ': ' + detail : ''}`);
  view3d.down = true;
  errBox.style.display = 'none';
  glWhy.textContent = GL_SAYS[why];
  glDialog.hidden = false;
  glDialog.querySelector('button')!.focus(); // it's a dialog: keyboards and screen readers go there
}

/** The browser gave the 3D view back after all: the game carries on. */
export function glBack() {
  view3d.down = false;
  glDialog.hidden = true;
}
