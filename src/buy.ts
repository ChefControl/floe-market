// Buying an upgrade: stand on its tile and hold E. A touch screen has no E, so there a Buy button comes up while the
// player is on a tile, to hold instead. Stood on a tile for a few seconds without buying, a reminder says how.
import { isTouch } from './hint';
import { buyHeld, holdBuyButton } from './input';

const btn = document.getElementById('buy')!, reminder = document.getElementById('buyHint')!;
const prompts = document.getElementById('prompts')!;
const touch = isTouch();
reminder.innerHTML = touch ? 'Hold <b>Buy</b> to buy this' : 'Hold <kbd>E</kbd> to buy this';
// on a touch screen the reminder goes with the Buy button, at the side, rather than above the tip
if (touch) { reminder.classList.add('touch'); document.body.append(reminder); }

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
  stood = onTile && !buyHeld() ? stood + dt : 0;
  reminder.hidden = stood < REMIND;
}
