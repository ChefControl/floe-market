// Slick Eddie's fixed fights (stage 3, the Undertow): step up to his table and he'll keep some of the next boss's fans
// home, 10% to 50% of them, for 🐡 8 a fan (fight.ts's FIX_PER_FAN), paid up front, win or lose. The
// bigger the fix, the likelier the papers get wind of it: 5% for a small one, 70% for half the hall. Whether they do
// is rolled the moment it's paid for (outside the cellar's sim, which leaves nothing to chance, so the gong's forecast
// stays exact) and saved, and only comes out at the gong: if the fix holds, the boss walks in with that many fewer
// fans; if it's caught, he brings the lot, Eddie keeps the fee, and the same share of the player's own fans stay away
// for a bout or more after. The gong shows how both would go. One fix a boss, each time he's called in.
import { gamePad } from './casinoKit';
import { CY } from './cellar';
import { BOOTH_PADS, BOOTHS } from './cellarPlan';
import { CHIP, F, FIX, fixFee, fixOn, keptHome, nextBoss, setFix } from './fight';
import { apart, dice } from './kit';
import { found, level } from './layout';
import { met } from './meet';
import { save } from './save';
import { coin } from './sfx';
import { V } from './util';
import { wallet } from './wallet';

const $ = (id: string) => document.getElementById(id)!;
const panel = $('eddie'), msg = $('eddieMsg'), odds = $('eddieOdds'), shake = $('eddieFix') as HTMLButtonElement;
const cuts = [...panel.querySelectorAll<HTMLButtonElement>('[data-cut]')];
/** The size of fix picked, in tenths of the boss's crowd. */
let cut = 1;
const pct = (k: number) => `${Math.round(k * 100)}%`;
const n = (v: number) => v.toLocaleString('en-US');
/** Whether the player has the chips for a fix of `c` on the next boss. */
const afford = (c: number) => { const b = nextBoss(); return !!b && wallet.money >= fixFee(b, c) * CHIP; };

/** The risk of each size of fix, as a colour, green for the smallest to red for the biggest: five strong ones, each
 *  clear of the next and dark enough for white words on it. */
const RISK = ['#139A43', '#6B9E00', '#A66A00', '#E8590C', '#D61F2C'];
const riskColour = (c: number) => RISK[c - 1];

/** What the panel offers now: its headline, the size buttons, each its fee (the picked one in its risk's colour), and
 *  under them the one button saying the rest, the fans kept home and the chance the papers get it (his coin, at the
 *  gong; "caught" in the picked size's colour); all in one place, under the row the player's picking from. */
function refresh() {
  const b = nextBoss(), on = fixOn(), busy = !b || !!F.rush || !!on;
  msg.textContent = 'Fix a fight'; msg.hidden = false; odds.hidden = true;
  for (const el of cuts) {
    const c = Number(el.dataset.cut);
    el.setAttribute('aria-pressed', String(c === cut));
    el.disabled = busy;
    el.style.setProperty('--risk', riskColour(c));
    // (the chip over its fee, each on a line of its own)
    if (b) el.replaceChildren(Object.assign(document.createElement('span'), { className: 'chip', textContent: '🐡' }),
      Object.assign(document.createElement('span'), { className: 'fee', textContent: n(fixFee(b, c)) }));
  }
  if (!b) { odds.textContent = 'Nobody left to fix.'; odds.hidden = false; shake.hidden = true; return; }
  shake.hidden = false;
  if (F.rush) { shake.disabled = true; shake.textContent = 'Not during a fight'; return; }
  if (on) {
    odds.textContent = "You'll know at the gong."; odds.hidden = false;
    shake.disabled = true; shake.textContent = `Fixed 🤝 ${b.face} −${n(keptHome(b, on.cut))} fans`;
    return;
  }
  // (the risk in the picked size's colour, right on the button you shake on)
  const risk = document.createElement('b');
  risk.className = 'caught'; risk.textContent = `${pct(FIX.caught[cut - 1])} caught`;
  shake.style.setProperty('--risk', riskColour(cut));
  shake.disabled = !afford(cut);
  shake.replaceChildren(`Fix ${b.face} −${n(keptHome(b, cut))} fans · `, risk);
}
cuts.forEach(el => el.addEventListener('click', () => { cut = Number(el.dataset.cut); refresh(); }));

/** Something for Eddie to say in his bubble (undertow.ts sets it). */
let say: (text: string) => void = () => {};
export function eddieSays(f: (text: string) => void) { say = f; }

/** Pays Eddie for a fix of `c` tenths (the one picked, by default) on the next boss: the fee goes at once, whether
 *  he's caught is rolled now (`rng`), and it's saved, so a reload changes nothing. */
export function payEddie(c = cut, rng: () => number = Math.random) {
  const b = nextBoss();
  if (!b || F.rush || fixOn() || !afford(c)) return false;
  if (!setFix(c, rng() < FIX.caught[c - 1])) return false;
  wallet.money -= fixFee(b, c) * CHIP;
  coin();
  say('Done. We never talked.');
  refresh();
  save();
  return true;
}
shake.addEventListener('click', () => payEddie());
/** Picks the size of fix, in tenths of the boss's crowd (for tests, and the buttons). */
export function pickCut(c: number) { cut = Math.max(1, Math.min(5, Math.round(c))); refresh(); }
/** What he's saying in the panel now, and on its button, for tests. */
export const eddieMsg = () => `${msg.textContent} ${odds.textContent} ${shake.textContent}`;

// (on dice of its own: three.js names what it makes from Math.random, and made at load off the game's luck, it would
// change every throw after it)
const pad = apart(() => gamePad(BOOTH_PADS.eddie, '🤝', panel, {
  opened() { refresh(); },
  closed() {},
  greet() {},
  live: () => false,
  say: text => say(text),
  away: '',
}, {
  at: V(BOOTHS.eddie.x + 0.45, CY + 0.95, BOOTHS.eddie.z), from: V(0.8, 0.75, 0.25).normalize(), wide: 1.5, tall: 1.2,
}, () => level.down && found.den && met('eddie')), dice(0xED1E));
// (its marking's the Undertow's own, undertow.ts's: this one's never put down)
pad.enable();

/** What the panel was last drawn for, so it's only redrawn when that changes. */
let drawn = '';
/** Eddie's table, every frame (once the Undertow's found): his pad, and the panel kept up with the cellar. */
export function updEddie(dt: number) {
  if (!pad.upd(dt)) { drawn = ''; return; }
  const key = [F.beaten, !!F.rush, !!fixOn(), cut, afford(cut)].join('|');
  if (key !== drawn) { drawn = key; refresh(); }
}
