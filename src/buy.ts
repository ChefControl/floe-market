// Buying an upgrade: stand on its tile and hold E. A touch screen has no E, so there a Buy button comes up while the
// player is on a tile, to hold instead: on a phone or tablet from the start, and on a laptop with a touch screen from
// its first touch. Stood on a tile for a few seconds without buying, a reminder says how. Holding buy with no cash
// at all shakes the cash in the HUD, and the reminder says so straight away.
import { isTouch } from './hint';
import { buyHeld, holdBuyButton } from './input';
import { wallet } from './wallet';

const btn = document.getElementById('buy')!, reminder = document.getElementById('buyHint')!;
const prompts = document.getElementById('prompts')!, cash = document.getElementById('cash')!;
let touch = false;
/** What the reminder says: how to buy, or that there's no cash to buy with. */
const HOW = { keys: 'Hold <kbd>E</kbd> to buy this', touch: 'Hold <b>Buy</b> to buy this' };
const BROKE = 'Out of cash: earn some first';
let says = '';
function say(html: string) { if (html !== says) reminder.innerHTML = says = html; }
function useTouch() {
  touch = true;
  // on a touch screen the reminder goes with the Buy button, at the side, rather than above the tip
  reminder.classList.add('touch'); document.body.append(reminder);
}
if (isTouch()) useTouch();
else window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !touch && reminder.isConnected) useTouch(); }, { capture: true });

btn.addEventListener('pointerdown', e => {
  holdBuyButton(true);
  btn.classList.add('down');
  try { btn.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  btn.addEventListener(ev, () => { holdBuyButton(false); btn.classList.remove('down'); });
}
// a long press shouldn't bring up the browser's menu
btn.addEventListener('contextmenu', e => e.preventDefault());

/** Seconds stood on a tile without buying, and how long before the reminder. */
let stood = 0;
const REMIND = 2;

/** Call every frame with whether the player is standing on a tile that's for sale. */
export function updBuy(onTile: boolean, dt: number) {
  btn.hidden = !(touch && onTile);
  if (!btn.hidden) {
    // the button (and its reminder) sit above the tip, however tall the tip's description makes it
    const bottom = Math.max(100, innerHeight - prompts.getBoundingClientRect().top + 12);
    btn.style.bottom = bottom + 'px';
    reminder.style.bottom = bottom + 96 + 'px';
  }
  if (!onTile) { holdBuyButton(false); btn.classList.remove('down'); }
  const broke = onTile && buyHeld() && wallet.money <= 0;
  cash.classList.toggle('broke', broke);
  stood = onTile && !buyHeld() ? stood + dt : 0;
  say(broke ? BROKE : touch ? HOW.touch : HOW.keys);
  reminder.hidden = !broke && stood < REMIND;
}
