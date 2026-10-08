// "Buy me a coffee" in the settings, for players who'd like to support the game on Ko-fi, and a one-time nudge towards
// it: after 20 minutes of play on this device, a toast says where it is and the gear pulses. Players who find it first
// never get the nudge. The minutes played are a per-device convenience, so they live outside the save.
// The settings row opens Ko-fi in a pop-up window of its own, so nobody is taken out of their game (a new tab where
// pop-ups are blocked, or on phones).
import { openSettings } from './settings';
import { toast } from './ui';

const KEY = 'floe-market-kofi';
/** Seconds of play before the nudge. */
export const NUDGE_AFTER = 20 * 60;
/** How big the Ko-fi window opens, where the browser makes pop-up windows. */
const WIN_W = 520, WIN_H = 760;

const gear = document.getElementById('gear')!, menu = document.getElementById('settings')!;
const bannerEl = document.getElementById('banner')!;

/** Seconds played so far, or -1 once the nudge is done with (shown, or the link was used). */
let played = 0;
try { played = Number(localStorage.getItem(KEY)) || 0; } catch { /* storage unavailable: count from now */ }
let unsaved = 0;

function store() {
  unsaved = 0;
  try { localStorage.setItem(KEY, String(played)); } catch { /* storage unavailable: it may count again next time */ }
}
function done() { played = -1; store(); }

const link = document.getElementById('kofi') as HTMLAnchorElement;
link.addEventListener('click', e => {
  done();
  openSettings(false);
  const left = window.screenX + (window.outerWidth - WIN_W) / 2, top = window.screenY + (window.outerHeight - WIN_H) / 2;
  const win = window.open(link.href, 'kofi', `popup=yes,width=${WIN_W},height=${WIN_H},left=${Math.round(left)},top=${Math.round(top)}`);
  if (win) {
    win.opener = null; // the Ko-fi page can't reach back into the game
    e.preventDefault();
  } // pop-ups blocked: the link opens it in a new tab instead
});

/** Call every frame: counts the time played, and nudges once it's long enough (not over a banner or the open menu). */
export function updKofi(dt: number) {
  if (played < 0) return;
  played += dt; unsaved += dt;
  if (played >= NUDGE_AFTER && menu.hidden && !bannerEl.classList.contains('on')) {
    done();
    toast('Enjoying the game? ☕ Buy me a coffee in ⚙️ Settings', undefined, 5000);
    gear.classList.add('ping');
    setTimeout(() => gear.classList.remove('ping'), 1300);
    return;
  }
  if (unsaved >= 10) store();
}
