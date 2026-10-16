// Hammerhead Harry's desk in the Undertow (stage 3): his loans (loan.ts) made across it. Standing on his pad brings the
// camera in over the desk and opens the controls: slide to how much you want (the slider's end is his limit, worked out
// as you walked in), the button saying what's borrowed and what's returned; with a loan out, the one button is to pay
// off what's left. Under either, the one rule the numbers can't show: his share of your sales. Whatever's owed shows in the HUD beside
// the stage chip (🦈), filling up as he takes his share of the stall's sales (ring.ts) till it's paid.
import { gamePad } from './casinoKit';
import { CY } from './cellar';
import { BOOTH_PADS, DESKS } from './cellarPlan';
import { apart, dice } from './kit';
import { CHIP } from './fight';
import { found, inUndertow, level, stage } from './layout';
import { borrow, canBorrow, freezeLimit, LOAN_FLOOR, LOAN_STEP, maxLoan, owed, owedAtFirst, payBack, repay, SHARE } from './loan';
import { player } from './player';
import { popText } from './ui';
import { V } from './util';
import { addMoney, wallet } from './wallet';

const $ = (id: string) => document.getElementById(id)!;
const panel = $('loans'), msg = $('loansMsg'), pick = $('loansPick'), amount = $('loansAmount') as HTMLInputElement;
const borrowBtn = $('loansBorrow') as HTMLButtonElement, repayBtn = $('loansRepay') as HTMLButtonElement;
/** Chips, as he counts them: whole ones, rounded up (what's owed can be part of one, once he's taken his share). */
const fmt = (c: number) => `🐡 ${Math.ceil(c - 1e-6).toLocaleString('en-US')}`;
/** His share of the sales, as he'd say it. */
const CUT = `${Math.round(SHARE * 100)}%`;

/** How much the slider's on, in chips. */
const wanted = () => Number(amount.value);
function refresh() {
  const out = owed() > 0, max = maxLoan();
  pick.hidden = borrowBtn.hidden = out;
  repayBtn.hidden = !out;
  if (amount.max !== String(max)) {
    // (a new limit: the slider goes up to it, and starts there)
    amount.min = String(LOAN_FLOOR); amount.step = String(LOAN_STEP); amount.max = String(max);
    amount.value = String(max);
  }
  borrowBtn.textContent = `Borrow ${fmt(wanted())} · Return ${fmt(payBack(wanted()))}`;
  repayBtn.textContent = `Pay off ${fmt(owed())}`;
  repayBtn.disabled = wallet.money < owed() * CHIP - 1e-6;
  msg.textContent = `${CUT} of your sales till it's paid`;
}
amount.addEventListener('input', () => refresh());

/** Borrows `n` chips (what's on the slider, if not given): the chips handed over, and his word on it. */
export function takeLoan(n = wanted()) {
  if (!canBorrow(n)) return false;
  const lent = borrow(n);
  addMoney(lent * CHIP);
  popText(`+${fmt(lent)}`, { x: DESKS.harry.x, y: CY + 1.4, z: DESKS.harry.z });
  say('Pleasure doing business, kid.');
  refresh();
  return true;
}
/** Pays off what's still owed, if there's enough, and his word on it. */
export function payLoan() {
  const paid = repay(wallet.money / CHIP);
  if (!paid) return false;
  wallet.money -= paid * CHIP;
  say('Paid in full. Always a pleasure.');
  refresh();
  return true;
}
borrowBtn.addEventListener('click', () => takeLoan());
repayBtn.addEventListener('click', () => payLoan());

/** Something for Harry to say in his bubble (undertow.ts sets it). */
let say: (text: string) => void = () => {};
export function harrySays(f: (text: string) => void) { say = f; }

const D = DESKS.harry;
// (built with dice of its own, so the game's luck, which three.js draws on to name what it makes, is where it was)
const pad = apart(() => gamePad(BOOTH_PADS.harry, '💰', panel, {
  opened() { refresh(); },
  closed() {},
  greet() {},
  live: () => false,
  say: text => say(text),
  away: '',
}, {
  at: V(D.x - 0.35, CY + 1.05, D.z), from: V(0.75, 0.6, 0).normalize(), wide: 1.7, tall: 1.2,
}, () => level.down && found.den), dice(0x4A221));
// (its marking's the Undertow's own, undertow.ts's: this one's never put down)
pad.enable();

// ---------- the IOU in the HUD ----------
const iou = $('iou'), iouN = $('iouN'), iouLeft = $('iouLeft'), iouBar = $('iouBar');
/** What the chip and the open panel last showed; whether the player was in the Undertow last frame; and what was owed. */
let shown = '', shownPanel = '', inside = false, wasOwed = 0;

/** Harry's desk, every frame (stage 3): his limit worked out as you walk in, his pad, the IOU chip, and a word when
 *  it's paid off. */
export function updLoans(dt: number) {
  const inNow = level.down && found.den && inUndertow(player.g.position);
  if (inNow && !inside) freezeLimit();
  inside = inNow;
  if (pad.upd(dt) && !panel.hidden) {
    // (what's owed goes down as he takes his share, and the wallet changes as the stall sells)
    const key = `${maxLoan()}|${Math.ceil(owed())}|${Math.floor(wallet.money / CHIP)}`;
    if (key !== shownPanel) { shownPanel = key; refresh(); }
  }
  const out = stage.n === 3 && owed() > 0;
  const key = out ? `${Math.ceil(owed())}|${owedAtFirst()}` : '';
  if (key !== shown) {
    shown = key;
    iou.hidden = !out;
    if (out) {
      iouN.textContent = fmt(owed());
      iouLeft.textContent = `${CUT} of sales`;
      iouBar.style.width = `${Math.round((1 - owed() / Math.max(1, owedAtFirst())) * 100)}%`;
    }
  }
  if (wasOwed > 0 && owed() <= 0 && stage.n === 3) {
    const at = player.g.position;
    popText("🦈 Harry's paid off", { x: at.x, y: at.y + 2.4, z: at.z });
  }
  wasOwed = owed();
}

/** What his controls say, for tests. */
export const loansMsg = () => msg.textContent ?? '';
