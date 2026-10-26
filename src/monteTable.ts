// Three-Card Tommy's table in the Undertow (stage 3): his monte (monte.ts) played with three real cards on his half-moon
// card table. Standing on his pad brings the camera in over the table and opens the controls: pick a stake and deal. He
// gathers the cards, shows the queen, turns her down and swaps them about, quicker the more is staked, then waits for
// you to tap where she went: your card turns over, then the other two. He plays 3 rounds a fight with you, the stake
// capped at his table's limit (the next boss's stake, stake.ts: about a minute of the stall's takings, held from when
// you walked in; the chips over it aren't on his table). The stake's taken as he deals and a win's paid the
// moment you pick, so a save mid-round never gets a stake back; walking off before picking leaves it on his table.
import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from 'three';
import { gamePad, type StakeRules, Stakes } from './casinoKit';
import { CY, parts } from './cellar';
import { BOOTH_PADS, BOOTHS, DESKS } from './cellarPlan';
import { QUEEN } from './family';
import { CHIP, F } from './fight';
import { found, level } from './layout';
import { met } from './meet';
import { type MonteRound, placesAfter, ROUNDS, START, startRound, SWAPS, WIN } from './monte';
import { canvasTex, FONT } from './render';
import { deal as dealSound, lose, win } from './sfx';
import { heldStake } from './stake';
import { popText } from './ui';
import { state } from './uiKit';
import { chips, V } from './util';
import { addMoney, wallet } from './wallet';

const C = DESKS.tommy, FACE = BOOTHS.tommy.face;
/** The middle of his table's top, and how far apart the cards lie on it. */
const TOP = { x: C.x, y: CY + C.h + 0.02, z: C.z }, GAP = 0.2;
const CARD = { w: 0.13, d: 0.19, h: 0.004 };
/** Seconds: gathering the cards up, showing the queen (turning her up, holding her, turning her down), turning one
 *  over, and a swap at the slowest and quickest. */
const T = { gather: 0.4, show: 1.6, flip: 0.25, swapSlow: 0.55, swapFast: 0.16, reveal: 1.4 };

// ---------- the cards ----------
const back = canvasTex(64, 96, (c, w, h) => {
  c.fillStyle = '#F5F0E2'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#8E2B26'; c.fillRect(4, 4, w - 8, h - 8);
  c.strokeStyle = 'rgba(245,240,226,.55)'; c.lineWidth = 2;
  for (let i = -h; i < w + h; i += 10) { c.beginPath(); c.moveTo(i, 4); c.lineTo(i + h, h - 4); c.moveTo(i + h, 4); c.lineTo(i, h - 4); c.stroke(); }
});
/** A black card: its rank in the corner and a big suit in the middle. */
const black = (rank: string, suit: string) => canvasTex(64, 90, (c, w, h) => {
  c.fillStyle = '#F5F0E2'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#1B1A1E'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 18px ${FONT}`; c.fillText(rank, 10, 13);
  c.font = '44px serif'; c.fillText(suit, w / 2, h / 2 + 4);
}).tex;
const edge = new MeshLambertMaterial({ color: 0xE8E0CC }), backMat = new MeshLambertMaterial({ map: back.tex });
const cardGeo = new BoxGeometry(CARD.w, CARD.h, CARD.d);
/** His table's top, turned as he sits (its x along his front, left to right as you see it; its z towards you). */
const top = new Group();
top.position.set(TOP.x, TOP.y, TOP.z); top.rotation.y = FACE;
parts.den.add(top);
/** The three cards, the queen in the middle: each a group on the table (where it is), its card inside (how it's turned). */
const cards = [black('8', '♠'), QUEEN, black('8', '♣')].map(face => {
  const g = new Group(), m = new Mesh(cardGeo, [edge, edge, backMat, new MeshLambertMaterial({ map: face }), edge, edge]);
  // its face is the underside: turned over, it shows the right way up to someone in front of the table
  m.rotation.y = Math.PI;
  g.add(m);
  top.add(g);
  return { g, m };
});
const QUEEN_CARD = START;

/** Puts card `c` at place `at` (0 to 2, fractions on the way), `lift` above the table, turned `up` (0 down, 1 face up). */
function lay(c: number, at: number, lift = 0, up = 0, dz = 0) {
  const { g, m } = cards[c];
  g.position.set((at - 1) * GAP, CARD.h / 2 + 0.002 + lift + Math.sin(Math.PI * up) * 0.06, dz);
  m.rotation.z = Math.PI * up;
}

// ---------- a round in play ----------
type Phase = 'gather' | 'show' | 'shuffle' | 'pick' | 'reveal';
interface Play { round: MonteRound; phase: Phase; t: number; dur: number; from: number[]; up: number[] }
let play: Play | null = null;
/** Where each card lies now, and how far turned up (for gathering them from wherever the last round left them). */
let lie = [0, 1, 2], upNow = [0, 0, 0];

const ease = (k: number) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const clamp01 = (k: number) => Math.max(0, Math.min(1, k));

/** Draws the cards for the round in play (or as the last one left them). */
function drawCards() {
  if (!play) { for (let c = 0; c < 3; c++) lay(c, lie[c], 0, upNow[c]); return; }
  const P = play, r = P.round;
  if (P.phase === 'gather') {
    const k = ease(clamp01(P.t / T.gather));
    for (let c = 0; c < 3; c++) lay(c, P.from[c] + (c - P.from[c]) * k, 0, P.up[c] * (1 - k));
  } else if (P.phase === 'show') {
    // the queen turns up, stays up a moment, and goes back down
    const up = clamp01(P.t / T.flip) - clamp01((P.t - (T.show - T.flip)) / T.flip);
    for (let c = 0; c < 3; c++) lay(c, c, 0, c === QUEEN_CARD ? up : 0);
  } else if (P.phase === 'shuffle') {
    const i = Math.min(r.swaps.length - 1, Math.floor(P.t / P.dur)), k = ease(clamp01(P.t / P.dur - i));
    const at = placesAfter(r.swaps, i), [a, b] = r.swaps[i];
    for (let c = 0; c < 3; c++) {
      if (at[c] !== a && at[c] !== b) { lay(c, at[c]); continue; }
      // the two being swapped pass each other, one in front and one behind
      const to = at[c] === a ? b : a, side = at[c] === a ? 1 : -1;
      lay(c, at[c] + (to - at[c]) * k, 0.01 * Math.sin(Math.PI * k), 0, side * 0.09 * Math.sin(Math.PI * k));
    }
  } else {
    const at = placesAfter(r.swaps, r.swaps.length);
    for (let c = 0; c < 3; c++) {
      const mine = at[c] === r.picked;
      // in a reveal, the one you picked turns first, then the other two
      const up = P.phase === 'reveal' ? clamp01((P.t - (mine ? 0 : 0.5)) / T.flip) : 0;
      lay(c, at[c], P.phase === 'pick' ? 0.004 : 0, up);
    }
  }
}

// ---------- panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('monte'), msg = $('monteMsg'), dealBtn = $('monteDeal') as HTMLButtonElement, picks = $('montePick');
/** Fugu Chips, as the cellar counts them: 1, 5, 25 and 100 chips. */
const RULES: StakeRules = {
  chips: () => [1, 5, 25, 100].map(n => n * CHIP),
  limit: () => limit(),
  chip: v => `🐡 ${(v / CHIP).toLocaleString('en-US')}`,
  label: v => `🐡 ${(v / CHIP).toLocaleString('en-US')}`,
  hideOver: true,
};
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, () => !!play, () => refresh(), RULES);

/** His table's limit now, in dollars. */
const limit = () => heldStake() * CHIP;
/** Rounds he'll still play this bout. */
export const roundsLeft = () => ROUNDS - (F.den.monte.bout === F.bout.n ? F.den.monte.played : 0);

function refresh() {
  stakes.refresh(!!play);
  const left = roundsLeft();
  state(dealBtn, play || left <= 0 ? 'busy' : stakes.play(false));
  dealBtn.textContent = play ? 'Watch the lady…' : left <= 0 ? 'Three rounds a fight' : `Deal · ${stakes.label}`;
  picks.hidden = play?.phase !== 'pick';
}
/** What he says between rounds: the game, or that he's done for the bout. */
function idleLine() {
  const left = roundsLeft();
  if (left <= 0) return "That's three. Next fight, kid.";
  if (wallet.money <= 0) return 'Come back with some chips, kid.';
  return `${left} round${left === 1 ? '' : 's'} left · limit ${chips(limit())}`;
}

/** Deals a round of the stake down: takes it, counts the round, and starts him gathering the cards. */
export function dealMonte(rng: () => number = Math.random) {
  if (play || roundsLeft() <= 0 || !stakes.ok) return false;
  const started = startRound(stakes.value, wallet.money, limit(), rng);
  if (!started) return false;
  wallet.money -= started.moves.take!;
  const m = F.den.monte;
  if (m.bout !== F.bout.n) { m.bout = F.bout.n; m.played = 0; }
  m.played++;
  const r = started.round;
  play = { round: r, phase: 'gather', t: 0, dur: T.swapSlow, from: [...lie], up: [...upNow] };
  // quicker the more swaps he makes: 4 slow ones, 10 in a blur
  play.dur = T.swapSlow + (T.swapFast - T.swapSlow) * (r.swaps.length - SWAPS.min) / (SWAPS.max - SWAPS.min);
  dealSound();
  msg.textContent = "Here's the lady…";
  refresh();
  return true;
}
dealBtn.addEventListener('click', () => dealMonte());

/** Picks place `i` for the round waiting on it: settles it at once, then turns the cards over. */
export function pickMonte(i: number) {
  if (play?.phase !== 'pick') return false;
  const paid = play.round.pick(i).pay ?? 0;
  if (paid > 0) addMoney(paid);
  play.phase = 'reveal'; play.t = 0;
  refresh();
  return true;
}
picks.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-card]');
  if (b) pickMonte(Number(b.dataset.card));
});

const PLACE = ['left', 'middle', 'right'];
/** The round's over: says how it went and leaves the cards as they lie. */
function done(walked = false) {
  const r = play!.round, at = placesAfter(r.swaps, r.swaps.length);
  lie = at; upNow = walked ? at.map((_, c) => (c === QUEEN_CARD ? 1 : 0)) : [1, 1, 1];
  play = null;
  if (walked) msg.textContent = idleLine();
  else if (r.won) {
    msg.textContent = `Sharp eyes! You win ${chips(r.stake * WIN)}.`;
    popText(`+${chips(r.stake * WIN)}`, { x: TOP.x, y: TOP.y + 0.6, z: TOP.z });
    win();
    say('Sharp eyes, kid.');
  } else {
    msg.textContent = `She was on the ${PLACE[r.queen]}.`;
    lose();
    say('Better luck next time.');
  }
  drawCards();
  refresh();
}

/** Something for Tommy to say in his bubble (undertow.ts sets it). */
let say: (text: string) => void = () => {};
export function tommySays(f: (text: string) => void) { say = f; }

const pad = gamePad(BOOTH_PADS.tommy, '🃏', panel, {
  opened() { msg.textContent = idleLine(); drawCards(); refresh(); },
  closed() {
    // walked off before picking: the stake stays on his table, and the queen's turned up for them to see
    if (play) { play.round.pick(-1); done(true); }
  },
  greet() {},
  live: () => !!play,
  say: text => say(text),
  away: "Hey! The lady's still on the table.",
  ask: $('monteAsk'),
}, {
  at: V(TOP.x, TOP.y, TOP.z), from: V(Math.sin(FACE) * 0.75, 0.95, Math.cos(FACE) * 0.75).normalize(), wide: 0.8, tall: 0.55,
}, () => level.down && found.den && met('tommy'));
// (its marking's the Undertow's own, undertow.ts's: this one's taken back out of the scene, or it'd lie on the deck up
// top, on every stage)
pad.enable();
pad.mark.removeFromParent();

/** Tommy's table, every frame (once the Undertow's found): his pad, and the round in play. */
export function updMonte(dt: number) {
  const open = pad.upd(dt);
  if (play) {
    const P = play;
    P.t += dt;
    if (P.phase === 'gather' && P.t >= T.gather) { P.phase = 'show'; P.t = 0; }
    else if (P.phase === 'show' && P.t >= T.show) { P.phase = 'shuffle'; P.t = 0; msg.textContent = 'Watch her now…'; }
    else if (P.phase === 'shuffle' && P.t >= P.dur * P.round.swaps.length) {
      P.phase = 'pick'; P.t = 0;
      msg.textContent = "Where'd she go? Pick a card.";
      refresh();
    } else if (P.phase === 'reveal' && P.t >= T.reveal) done();
  }
  if (open || play) drawCards();
}

/** The round in play, for tests: its phase and the round, or null. */
export const monteNow = () => (play ? { phase: play.phase, round: play.round } : null);
/** What his table's controls say, for tests. */
export const monteMsg = () => msg.textContent ?? '';
/** Puts down `chipsWanted` chips as the stake, for tests: the pile made up from the chips there are. */
export function stakeMonte(chipsWanted: number) {
  let left = chipsWanted;
  stakes.all = false;
  stakes.pile = [100, 25, 5, 1].map(n => { const k = Math.floor(left / n); left -= k * n; return k; }).reverse();
  refresh();
}

drawCards();
