// A long press or a long drag on a phone is play (the walking stick, holding Buy, stirring the pot), never the browser's
// own menus: no text gets selected, so no "Copy / Find in Page / Search with..." bar pops up over the game, and no
// "Save image" sheet or right-click menu either. index.html's CSS makes nothing selectable; this covers what CSS
// can't: iOS still runs its long-press and loupe gestures on a touch that starts on the play surface, and a browser
// may start a selection or a menu anyway. Text fields, links and the few texts meant to be copied keep theirs.

/** Where the browser's own selecting and menus still belong: what's typed, links, and text meant to be copied. */
export const FREE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), a[href], #korki .memo, #kitShow';
/** Surfaces a finger drags on for a while: the game, turning the south door's find, the pot's game, drawing on a
 *  report's picture. */
const SURFACES = '#game, #wayLook, #showPlay, #drawCanvas';
/** Controls inside those surfaces, which still get their taps (clicks). */
const CONTROLS = 'button, a, input, textarea, select, label';

const el = (t: EventTarget | null) => (t instanceof Element ? t : t instanceof Node ? t.parentElement : null);
const free = (t: EventTarget | null) => !!el(t)?.closest(FREE);

document.addEventListener('contextmenu', e => { if (!free(e.target)) e.preventDefault(); });
document.addEventListener('selectstart', e => { if (!free(e.target)) e.preventDefault(); });
// A touch that starts on a play surface is the game's: taking its default stops iOS's long-press, loupe and menu
// there. The game reads pointer events, which still come; only the click after a tap doesn't, and nothing on these
// surfaces but their buttons wants one.
document.addEventListener('touchstart', e => {
  const t = el(e.target);
  if (t?.closest(SURFACES) && !t.closest(CONTROLS)) e.preventDefault();
}, { passive: false });
// and should a selection start anyway, it's let go at once, so no menu has anything to show
document.addEventListener('selectionchange', () => {
  const s = document.getSelection();
  if (!s || s.isCollapsed || free(s.anchorNode) || free(document.activeElement)) return;
  s.removeAllRanges();
});
