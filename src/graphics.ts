// Graphics, Auto, Low or High: how much detail the game is drawn in. High draws the world the way the people are drawn
// (characters.ts, kit.ts): low poly but rounded, with the small details, a rolling sea, cloud shadows, seasonal
// layers and effects. Low is everything as it was before those, with a lighter renderer, for phones that can't keep
// up. Auto, the default, lets the game pick: it starts each visit on High and watches the frame rate, and if that stays
// under 45 a second for six seconds, it drops to Low for the rest of the visit. The player's choice is kept for the
// device. Before adding to the graphics, read docs/graphics.md.
export type Quality = 'low' | 'high';
/** What the player chose in the settings. */
export type Choice = Quality | 'auto';

const KEY = 'floe-market-graphics';
/** The detail people are drawn in now, and whether the player chose it (rather than Auto). */
export const gfx = { quality: 'high' as Quality, picked: false };
try {
  const q = localStorage.getItem(KEY);
  if (q === 'low' || q === 'high') Object.assign(gfx, { quality: q, picked: true });
} catch { /* storage blocked: Auto */ }

const listeners: (() => void)[] = [];
/** Calls `f` whenever the graphics, or the player's choice, change. */
export const onQuality = (f: () => void) => { listeners.push(f); };
export const isHigh = () => gfx.quality === 'high';

function setQuality(q: Quality) {
  gfx.quality = q;
  listeners.forEach(f => f());
}

/** The player's choice: Low or High from now on, or Auto, which starts again on High and watches the frame rate. */
export function choose(c: Choice) {
  gfx.picked = c !== 'auto';
  try {
    if (c === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
  } catch { /* kept for this visit only */ }
  if (c === 'auto') watchAgain();
  setQuality(c === 'auto' ? 'high' : c);
}

/** Seconds to let the game settle (loading, or coming back to the tab) before timing it; then how long each look lasts. */
const SETTLE = 3, SPAN = 2;
/** Frames a second it needs on High, and how many spans in a row under that before dropping to Low. */
const MIN_FPS = 45, STRIKES = 3;
let settle = SETTLE, span = 0, frames = 0, strikes = 0;
function watchAgain() { settle = SETTLE; span = frames = strikes = 0; }

/**
 * Times each frame drawn (`sec` since the last one, main.ts) while on Auto. A long gap is a pause (the tab hidden, the
 * phone locked), not a slow frame, and the game settles again after it.
 */
export function frameDrawn(sec: number) {
  if (gfx.picked || gfx.quality === 'low') return;
  if (sec > 0.25 || document.hidden) { watchAgain(); return; }
  if (settle > 0) { settle -= sec; return; }
  span += sec; frames++;
  if (span < SPAN) return;
  strikes = frames / span < MIN_FPS ? strikes + 1 : 0;
  span = frames = 0;
  if (strikes >= STRIKES) setQuality('low');
}
