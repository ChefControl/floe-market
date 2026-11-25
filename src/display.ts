// The display settings (#163), under Graphics in the settings, in the desktop app only: the screen fullscreen or a
// window (F11 and Alt+Enter switch it too, desktop/main.mjs), the resolution the 3D view draws at, and a cap on the
// frames a second. Kept on this device (the page's own storage, and the program's display.json for the window), never
// in the save, so Steam Cloud never carries them to another computer.
import { desktop } from './desktop';

const KEY = 'floe-display';
/** How much of the screen's resolution the 3D view draws at. */
export const SCALES = [1, 0.75, 0.5] as const;
/** Frames a second at most; 0: as many as the screen shows. */
export const CAPS = [0, 60, 30] as const;

export const display = { scale: 1 as number, cap: 0 as number };
try {
  const kept = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<typeof display>;
  if ((SCALES as readonly number[]).includes(kept.scale!)) display.scale = kept.scale!;
  if ((CAPS as readonly number[]).includes(kept.cap!)) display.cap = kept.cap!;
} catch { /* storage unavailable or spoilt: as it comes */ }

const listeners: (() => void)[] = [];
/** Calls `f` whenever the resolution or the cap changes. */
export const onDisplay = (f: () => void) => { listeners.push(f); };

export function setDisplay(change: Partial<typeof display>) {
  Object.assign(display, change);
  try { localStorage.setItem(KEY, JSON.stringify(display)); } catch { /* for this visit */ }
  for (const f of listeners) f();
  show();
}

/** The shortest time between two frames, in ms (0: every frame the screen shows). A frame comes a little early now
 *  and then, so it allows a couple of milliseconds. */
export const frameGap = () => display.cap ? 1000 / display.cap - 2 : 0;

// ---------- the settings ----------
const rows = document.getElementById('display');
const buttons = (k: string) => [...(rows?.querySelectorAll<HTMLButtonElement>(`button[data-${k}]`) ?? [])];
let fullscreen = false;

function show() {
  for (const b of buttons('screen')) b.setAttribute('aria-pressed', String((b.dataset.screen === 'full') === fullscreen));
  for (const b of buttons('scale')) b.setAttribute('aria-pressed', String(Number(b.dataset.scale) === display.scale));
  for (const b of buttons('cap')) b.setAttribute('aria-pressed', String(Number(b.dataset.cap) === display.cap));
}

const app = desktop();
if (app && rows) {
  rows.hidden = false;
  fullscreen = app.display.get().fullscreen;
  app.display.onChange(d => { fullscreen = d.fullscreen; show(); });
  for (const b of buttons('screen')) b.addEventListener('click', () => app.display.fullscreen(b.dataset.screen === 'full'));
  for (const b of buttons('scale')) b.addEventListener('click', () => setDisplay({ scale: Number(b.dataset.scale) }));
  for (const b of buttons('cap')) b.addEventListener('click', () => setDisplay({ cap: Number(b.dataset.cap) }));
  show();
}
