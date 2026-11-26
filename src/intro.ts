// The studio's intro, as the Steam build opens: only the plate at first; the rice ball drops onto it with the
// magnifier in hand, the salmon drops onto its head with its band's ends blowing in the wind, it lifts its arms into
// the logo's pose, the lens glints, it winks, and "ChefControl Studio" comes up under it. It plays over the loading
// screen while the game loads (index.html's head hides that from the first paint), then fades to whatever's ready: the
// loading screen or the main menu (title.ts). Once a run of the app: a reload skips it. Any key or click skips it, and
// goes no further. The drawing is brand/chefcontrol.svg; its moves are index.html's #intro styles.
import logo from '../brand/chefcontrol.svg?raw';
import { steamOn } from './flags';

/** This run of the app has had its intro (sessionStorage: kept through a reload, gone when the app closes). */
const PLAYED = 'floe-intro';
/** Seconds it plays before it fades out (index.html: the name's up by 3.6 s). */
export const LENGTH = 4.6;
/** Seconds it takes to fade out, and when skipped. */
const FADE = 0.5, SKIP_FADE = 0.25;
/** The lens's glint: a four-pointed sparkle, drawn over the logo for the intro only. */
const SPARK = '<path class="spark" d="M938 222 L946 244 L968 252 L946 260 L938 282 L930 260 L908 252 L930 244 Z" fill="#fff"/>';

let shown: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Plays the intro, if this is the Steam build and this run hasn't had it yet; says whether it did. */
export function playIntro() {
  const root = document.documentElement;
  let played = false;
  try {
    played = sessionStorage.getItem(PLAYED) === '1';
    sessionStorage.setItem(PLAYED, '1');
  } catch { /* storage unavailable: it plays */ }
  if (!steamOn() || played) { root.classList.remove('intro'); return false; }
  root.classList.add('intro');
  const el = document.createElement('div');
  el.id = 'intro';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'ChefControl Studio');
  el.innerHTML = logo.replace('</svg>', `${SPARK}</svg>`) + '<p class="name">ChefControl</p><p class="kind">Studio</p>';
  document.body.append(el);
  shown = el;
  timer = setTimeout(() => endIntro(), LENGTH * 1000);
  window.addEventListener('keydown', skip, true);
  window.addEventListener('pointerdown', skip, true);
  return true;
}

/** A key or a click: the intro's over, and the game doesn't hear it. */
function skip(e: Event) {
  // (the program's own keys, F11 and Alt+Enter, still switch fullscreen: desktop/main.mjs)
  e.preventDefault();
  e.stopImmediatePropagation();
  endIntro(true);
}

/** Fades the intro out to the loading screen or the main menu under it. */
export function endIntro(skipped = false) {
  const el = shown;
  if (!el) return;
  shown = null;
  clearTimeout(timer);
  window.removeEventListener('keydown', skip, true);
  window.removeEventListener('pointerdown', skip, true);
  el.classList.add('out');
  if (skipped) el.classList.add('fast');
  document.documentElement.classList.remove('intro');
  setTimeout(() => el.remove(), (skipped ? SKIP_FADE : FADE) * 1000);
}

/** Whether the intro's playing. */
export const introOn = () => !!shown;
