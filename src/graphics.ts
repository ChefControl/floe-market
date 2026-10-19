// Graphics, Auto, Low or High: how much detail the game is drawn in. High draws the world the way the people are drawn
// (characters.ts, kit.ts): low poly but rounded, with the small details, a rolling sea, cloud shadows, seasonal
// layers and effects. Low is everything as it was before those, with a lighter renderer, for phones that can't keep
// up. Auto, the default, lets the game pick: it starts on High and watches each two seconds' frames, and if four of the
// last five were slow or stuttered, it drops to Low, and starts on Low on that device from then on. The player's
// choice is kept for the device. Before adding to the graphics, read docs/graphics.md.
export type Quality = 'low' | 'high';
/** What the player chose in the settings. */
export type Choice = Quality | 'auto';

const KEY = 'floe-market-graphics';
/** Set to 'low' once Auto has dropped to Low on this device, so it starts there next time. */
const AUTO_KEY = 'floe-market-graphics-auto';
/** The detail people are drawn in now, and whether the player chose it (rather than Auto). */
export const gfx = { quality: 'high' as Quality, picked: false };
try {
  const q = localStorage.getItem(KEY);
  if (q === 'low' || q === 'high') Object.assign(gfx, { quality: q, picked: true });
  else if (localStorage.getItem(AUTO_KEY) === 'low') gfx.quality = 'low';
} catch { /* storage blocked: Auto */ }

const listeners: (() => void)[] = [];
/** Calls `f` whenever the graphics, or the player's choice, change. */
export const onQuality = (f: () => void) => { listeners.push(f); };
export const isHigh = () => gfx.quality === 'high';
/** Frames a second lately, smoothed. */
export const frameRate = { fps: 0 };

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
    localStorage.removeItem(AUTO_KEY);
  } catch { /* kept for this visit only */ }
  if (c === 'auto') watchAgain();
  setQuality(c === 'auto' ? 'high' : c);
}

/** Seconds to let the game settle (loading, or coming back to the tab) before timing it; then how long each look lasts. */
const SETTLE = 3, SPAN = 2;
/** A look is a bad one if it ran under 50 frames a second, or it stuttered: one frame in 20 (its p95) slower than
 *  25 ms, or one in 100 (its p99) slower than 50 ms. Four bad looks of the last five drop it to Low. */
const MIN_FPS = 50, P95 = 0.025, P99 = 0.05, BAD = 4, OF = 5;
let settle = SETTLE, span = 0;
/** This look's frame times, and the last few looks (true for a bad one). */
const times: number[] = [], looks: boolean[] = [];
function watchAgain() { settle = SETTLE; span = 0; times.length = looks.length = 0; }
/** The frame time `p` of the look's (sorted) frames are quicker than. */
const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

/**
 * Times each frame drawn (`sec` since the last one, main.ts) while on Auto. A hitch counts as a slow frame; only a
 * gap of over a second is a pause (the tab hidden, the phone locked), and the game settles and starts watching again
 * after it.
 */
export function frameDrawn(sec: number) {
  // a smoothed frame rate, for bug reports (report.ts)
  if (sec > 0 && sec < 1) frameRate.fps += (1 / sec - frameRate.fps) * 0.05;
  if (gfx.picked || gfx.quality === 'low') return;
  if (sec > 1 || document.hidden) { watchAgain(); return; }
  if (settle > 0) { settle -= sec; return; }
  span += sec; times.push(sec);
  if (span < SPAN) return;
  times.sort((a, b) => a - b);
  looks.push(times.length / span < MIN_FPS || pct(times, 0.95) > P95 || pct(times, 0.99) > P99);
  if (looks.length > OF) looks.shift();
  span = 0; times.length = 0;
  if (looks.filter(Boolean).length < BAD) return;
  try { localStorage.setItem(AUTO_KEY, 'low'); } catch { /* Low for this visit */ }
  setQuality('low');
}
