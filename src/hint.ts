// The controls, shown once on a device: a small card below the player, with a finger dragging the joystick round on a
// phone or tablet, or W A S D being pressed on a computer (which it is comes from the browser's user agent), and how
// to buy (stand on a tile and hold E, or the Buy button). Once the player has walked a little it shrinks away into the
// settings gear, which is where "Controls" brings it back.
const SEEN = 'floe-market-hint';

/**
 * Whether a Buy button comes up on a tile for sale on a computer too, to hold with the mouse as well as E: on unless
 * the player turns it off under Controls in the settings, kept on the device. A touch screen always has it (buy.ts).
 */
const BUY_BUTTON = 'floe-market-buy-button';
export const buyButton = { on: true };
try { buyButton.on = localStorage.getItem(BUY_BUTTON) !== '0'; } catch { /* storage unavailable: on */ }
export function setBuyButton(on: boolean) {
  buyButton.on = on;
  try { localStorage.setItem(BUY_BUTTON, on ? '1' : '0'); } catch { /* storage unavailable: for this visit */ }
}

/**
 * Phones and tablets, from the user agent; iPads call themselves Macs, so a Mac with a touch screen counts too. So does
 * anything whose main pointer is a finger (`coarse`): a Windows tablet or a Chromebook without its keyboard.
 */
export function isTouch(
  ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0,
  coarse = typeof matchMedia === 'function' && !!matchMedia('(pointer: coarse)')?.matches,
) {
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1) || coarse;
}

const el = document.getElementById('hint')!, gear = document.getElementById('gear')!;
const art = el.querySelector('.art')!, text = el.querySelector('p')!;
/** Seconds the shrink into the gear takes (as in index.html's #hint transition). */
const GO = 0.65;

let state: 'off' | 'on' | 'going' = 'off';
/** Seconds the player has walked, and the hint has been up, since it was shown; brought back from the settings? */
let walked = 0, upFor = 0, again = false;
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The hint's transform when it's shrunk down over the gear. */
function overGear() {
  const g = gear.getBoundingClientRect(), h = el.getBoundingClientRect();
  const dx = g.left + g.width / 2 - (h.left + h.width / 2), dy = g.top + g.height / 2 - (h.top + h.height / 2);
  return `translate(calc(-50% + ${Math.round(dx)}px), ${Math.round(dy)}px) scale(0.1)`;
}

/** Shows the hint: at the start of a first game on this device, or `fromGear` when asked for in the settings. */
export function showHint(fromGear = false) {
  if (isTouch()) {
    art.innerHTML = '<span class="ring"></span><span class="stick"></span>';
    text.innerHTML = '<b>Drag anywhere to walk</b><small class="buyline">To buy, stand on a tile and hold Buy</small>';
  } else {
    art.innerHTML = '<span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>';
    text.innerHTML = '<b>Walk with WASD</b><small>or the arrow keys, or drag with the mouse</small><small class="buyline">To buy, stand on a tile and hold <kbd>E</kbd>'
      + (buyButton.on ? ' or Buy' : '') + '</small>';
  }
  state = 'on'; walked = 0; upFor = 0; again = fromGear;
  el.hidden = false;
  el.style.transition = el.style.transform = el.style.opacity = '';
  if (!fromGear || still()) return;
  // grows back out of the gear
  el.style.transition = 'none';
  el.style.transform = overGear(); el.style.opacity = '0';
  void el.offsetWidth;
  el.style.transition = 'transform .5s cubic-bezier(.25,1,.5,1), opacity .4s';
  el.style.transform = el.style.opacity = '';
}

/** Shrinks it away into the gear, which pulses to show where it went; it won't come up by itself again. */
function putAway() {
  state = 'going';
  try { localStorage.setItem(SEEN, '1'); } catch { /* storage unavailable: it may show again next time */ }
  if (!still()) el.style.transform = overGear();
  el.style.opacity = '0';
  setTimeout(() => {
    state = 'off';
    el.hidden = true;
    el.style.transition = el.style.transform = el.style.opacity = '';
    gear.classList.add('ping');
    setTimeout(() => gear.classList.remove('ping'), 1300);
  }, GO * 1000);
}

/** Seconds the hint stays up at least, to read the buying line too. */
const READ = 5;

/** Call every frame with whether the player is walking: once they've walked a little (and had time to read), it's done. */
export function updHint(dt: number, walking: boolean) {
  if (state !== 'on') return;
  upFor += dt;
  if (walking) walked += dt;
  // brought back from the settings, it also goes after a while, walking or not
  if ((walked > 1.2 && upFor > READ) || (again && upFor > 8)) putAway();
}

/** Shows the hint unless this device has seen it. */
export function initHint() {
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === '1'; } catch { /* storage unavailable: show it */ }
  if (!seen) showHint();
}
