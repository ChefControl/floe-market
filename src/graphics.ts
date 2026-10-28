// Graphics, Auto, Potato, Low or High: how much detail the game is drawn in. High draws the world the way the people
// are drawn (characters.ts, kit.ts): low poly but rounded, with the small details, a rolling sea, cloud shadows,
// seasonal layers and effects. Low is everything as it was before those, with a lighter renderer, for phones that
// can't keep up. Potato is Low's look with the least the renderer can do (no shadows, one pixel a point, no smoothing
// of edges, 30 frames a second), and High isn't built at all, for phones that run short of memory. Auto, the default,
// lets the game pick: it starts on High and watches each two seconds' frames, and if four of the last five were slow
// or stuttered, it drops to Low; on Low it keeps watching, by a lower bar, and drops to Potato only if the phone's
// still struggling (or the browser takes the 3D view away again). It starts there on that device from then on. The
// player's choice is kept for the device. Before adding to the graphics, read docs/graphics.md.
export type Quality = 'potato' | 'low' | 'high';
/** What the player chose in the settings. */
export type Choice = Quality | 'auto';

const KEY = 'floe-market-graphics';
/** Set to 'low' or 'potato' once Auto has dropped there on this device, so it starts there next time. */
const AUTO_KEY = 'floe-market-graphics-auto';
const isQuality = (q: string | null): q is Quality => q === 'potato' || q === 'low' || q === 'high';
/**
 * The detail people are drawn in now, the player's choice (or Auto), and whether the choice they just made takes a
 * reload to finish: into Potato (to free High's memory) or out of it (to build High).
 */
export const gfx = { quality: 'high' as Quality, choice: 'auto' as Choice, picked: false, reload: false };
try {
  const q = localStorage.getItem(KEY), a = localStorage.getItem(AUTO_KEY);
  if (isQuality(q)) Object.assign(gfx, { quality: q, choice: q, picked: true });
  else if (a === 'low' || a === 'potato') gfx.quality = a;
} catch { /* storage blocked: Auto */ }
/** Whether High was built on this load. Potato never builds it, so leaving Potato for Low or High takes a reload. */
export const highBuilt = gfx.quality !== 'potato';

const listeners: (() => void)[] = [];
/** Calls `f` whenever the graphics, or the player's choice, change. */
export const onQuality = (f: () => void) => { listeners.push(f); };
export const isHigh = () => gfx.quality === 'high';
export const isPotato = () => gfx.quality === 'potato';
/** Frames a second lately, smoothed. */
export const frameRate = { fps: 0 };

/** Draws in `q`, or in Low if that's High and High wasn't built on this load (until the reload). */
function setQuality(q: Quality) {
  gfx.quality = q === 'potato' || highBuilt ? q : 'low';
  listeners.forEach(f => f());
}

/** The player's choice: Potato, Low or High from now on, or Auto, which starts again on High and watches the frame rate. */
export function choose(c: Choice) {
  Object.assign(gfx, { choice: c, picked: c !== 'auto', reload: (c === 'potato') === highBuilt });
  try {
    if (c === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
    localStorage.removeItem(AUTO_KEY);
  } catch { /* kept for this visit only */ }
  if (c === 'auto') watchAgain();
  setQuality(c === 'auto' ? 'high' : c);
}

/** Auto drops a step, to `q`, and starts there on this device from then on. */
function drop(q: 'low' | 'potato') {
  try { localStorage.setItem(AUTO_KEY, q); } catch { /* for this visit */ }
  watchAgain();
  setQuality(q);
}

/** The browser took the 3D view away (render.ts), most often as a phone ran low on graphics memory. On Auto, a step
 *  down from now on, as if it had been slow: Low needs half the memory, and if it's taken again on Low, Potato, which
 *  needs less still, so the view it gives back (or the next visit's) is likelier to last. A player's own pick stays. */
export function lowAfterLoss() {
  if (gfx.picked || gfx.quality === 'potato') return;
  drop(gfx.quality === 'high' ? 'low' : 'potato');
}

/** Seconds to let the game settle (loading, or coming back to the tab) before timing it; then how long each look lasts. */
const SETTLE = 3, SPAN = 2;
/** A look on High is a bad one if it ran under 50 frames a second, or it stuttered: one frame in 20 (its p95) slower
 *  than 25 ms, or one in 100 (its p99) slower than 50 ms. Four bad looks of the last five drop it to Low. On Low the
 *  bar is lower, kept for a phone that's struggling: under 25 frames a second, or its p95 slower than 50 ms. Four of
 *  those in five drop it to Potato. (Under 20 a second, the game itself slows down: main.ts.) */
const BAR = {
  high: { fps: 50, p95: 0.025, p99: 0.05 },
  low: { fps: 25, p95: 0.05, p99: Infinity },
};
const BAD = 4, OF = 5;
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
  if (gfx.picked || gfx.quality === 'potato') return;
  if (sec > 1 || document.hidden) { watchAgain(); return; }
  if (settle > 0) { settle -= sec; return; }
  span += sec; times.push(sec);
  if (span < SPAN) return;
  times.sort((a, b) => a - b);
  const bar = BAR[gfx.quality];
  looks.push(times.length / span < bar.fps || pct(times, 0.95) > bar.p95 || pct(times, 0.99) > bar.p99);
  if (looks.length > OF) looks.shift();
  span = 0; times.length = 0;
  if (looks.filter(Boolean).length < BAD) return;
  drop(gfx.quality === 'high' ? 'low' : 'potato');
}
