// The sound effects, one function a sound, called from wherever the thing happens. They're built from the voices in
// audio.ts: soft blips that climb the scale for picking things up and coins, struck wood for the cleaver and the
// boards underfoot, little bells for money and news, and filtered noise for water, snow and swishing rice. Sounds out
// in the world (a customer paying, a driver's horn) are placed where they happen, and fade with distance.
import type { StageN } from './layout';
import { ac, bell, between, buses, deg, every, hushFor, marimba, noise, onAudio, onBroken, pluck, rnd, streak, tone } from './audio';
import type { Season } from './season';
import type { XZ } from './util';

/** A footstep on what's underfoot: boards (the deck, the dock, the restaurant), or the ground in its season. */
export function step(on: 'wood' | Season) {
  if (on === 'wood') {
    tone({ f: between(125, 155), f2: 85, type: 'triangle', d: 0.05, v: 0.04 });
    noise({ f: 1700, q: 1.4, d: 0.02, v: 0.025 });
  } else if (on === 'winter') {
    // crunch: two quick bites of noise, kept below the ear's sharpest band since they come with every step
    noise({ f: between(700, 1000), q: 0.8, d: 0.03, v: 0.07 });
    noise({ t: 0.025, f: between(1100, 1400), q: 0.8, d: 0.045, v: 0.045 });
  } else noise({ f: between(450, 650), kind: 'lowpass', q: 0.6, d: 0.06, v: on === 'fall' ? 0.07 : 0.045 });
}

/** A line whipping out to a fish: yours, or the auto harpoon firing (with a thunk). The net is silent. */
export function cast(from: XZ, src: 'player' | 'turret' | 'net') {
  if (src === 'net') return;
  if (src === 'turret') {
    tone({ at: from, f: 120, f2: 55, type: 'triangle', d: 0.16, v: 0.28 });
    noise({ at: from, f: 900, q: 1.2, d: 0.05, v: 0.1 });
  }
  noise({ at: from, f: 700, f2: 2600, q: 2.5, a: 0.03, d: 0.16, v: 0.1 });
}

/** A fish pulled out of the water. */
export function splash(at: XZ) {
  noise({ at, f: 2400, f2: 500, kind: 'lowpass', q: 0.8, d: 0.32, v: 0.2 });
  tone({ at, f: 420, f2: 160, d: 0.1, v: 0.1 });
}

/** A fish landing on the chopping board. */
export function flop(at: XZ) {
  tone({ at, f: 240, f2: 90, d: 0.09, v: 0.18 });
  noise({ at, f: 900, q: 1, d: 0.05, v: 0.07 });
}

/** The cleaver through the fish and into the board: the `i`-th of the three cuts, each a little higher. */
export function chop(at: XZ, i: number) {
  noise({ at, f: 2400 + i * 300, q: 1.6, d: 0.035, v: 0.15 });
  tone({ at, f: 190 + i * 25, f2: 95, type: 'triangle', d: 0.07, v: 0.2 });
}

/** Something picked up: a blip that climbs the scale through a run of them, round again past an octave and a bit. */
export function pick() {
  const n = streak('pick') % 6;
  tone({ f: deg(n, 1), d: 0.06, v: 0.06 });
  tone({ f: deg(n, 2), d: 0.03, v: 0.02 });
}

/** Things thrown in a bin, at `at`: a hollow clunk and a rattle as the lid drops. */
export function toss(at: XZ) {
  tone({ at, f: 120, f2: 70, a: 0.006, d: 0.22, v: 0.22, type: 'triangle' });
  noise({ at, f: 900, f2: 500, q: 1.2, a: 0.004, d: 0.12, v: 0.08 });
  noise({ at, t: 0.18, f: 1400, q: 2, a: 0.003, d: 0.06, v: 0.05 });
}

/** Something put down on a counter or a pad: a soft wooden tock, stepping down through a run. */
export function put() {
  const n = Math.min(streak('put'), 10);
  marimba(deg(7 - n), { d: 0.12, v: 0.065 });
}

/**
 * Cash into your pocket: a coin, then its fifth, pitched up through a run of them and round again within an octave
 * (about 0.8 to 1.6 kHz), so a big pile doesn't climb into the shrill.
 */
export function coin() {
  if (!every('coin', 0.045)) return;
  const f = deg(3 + streak('coin', 0.3) % 5, 1);
  tone({ f, type: 'triangle', d: 0.09, v: 0.055 });
  tone({ f: f * 1.5, t: 0.03, d: 0.14, v: 0.045 });
}

/** A customer paying at a counter or the register: bills fluttering down, and a bell. */
export function till(at: XZ) {
  if (!every('till', 0.1)) return;
  noise({ at, f: 3500, q: 0.7, a: 0.02, d: 0.12, v: 0.05 });
  bell(deg(9, 1), { at, v: 0.05, d: 0.4 });
}

/** A review: the more stars, the happier the little tune; one star is a sad bonk. */
export function review(stars: number, at: XZ) {
  if (!every('review', 0.12)) return;
  if (stars <= 1) tone({ at, f: 220, f2: 140, type: 'triangle', d: 0.28, v: 0.16 });
  else if (stars < 3) {
    marimba(deg(2), { at, v: 0.11 });
    marimba(deg(0), { at, t: 0.09, v: 0.11 });
  } else for (let i = 0; i < stars - 2; i++) marimba(deg(5 + i * 2), { at, t: i * 0.07, v: 0.11, d: 0.3 });
}

/** Money draining into an upgrade tile: ticks that climb as it fills (`k`, 0 to 1). */
export function pay(k: number) {
  if (!every('pay', 0.05)) return;
  tone({ f: deg(Math.floor(k * 5), 1), type: 'triangle', d: 0.04, v: 0.05 });
}

/** An upgrade bought: a run up the marimba, and a bell. */
export function unlock() {
  [0, 2, 4, 5, 7].forEach((n, i) => marimba(deg(n, 1), { t: i * 0.06, v: 0.15 }));
  bell(deg(10, 1), { t: 0.32, v: 0.08, d: 1 });
}

/** Something new popping into the world: a soft bubble. */
export function pop() {
  if (!every('pop', 0.05)) return;
  tone({ f: between(280, 340), f2: 700, d: 0.09, v: 0.07 });
}

/** Something new to look at: an upgrade for sale, a rating reached. */
export function chime() {
  if (!every('chime', 0.5)) return;
  bell(deg(7, 1), { v: 0.07, d: 0.6 });
  bell(deg(9, 1), { t: 0.12, v: 0.07, d: 0.8 });
}

/** A repeatable upgrade's next level: up a chord, and a shimmer. */
export function levelUp() {
  [0, 3, 5].forEach((n, i) => marimba(deg(n, 1), { t: i * 0.07, v: 0.14 }));
  tone({ f: deg(5, 2), t: 0.21, d: 0.5, v: 0.04, vib: [6, 8] });
}

/**
 * The stage-ups: a flourish for the market done (1), a drum and a strummed koto for the restaurant (2), and three
 * taiko and a low strum for the ring under the dock (3).
 */
export function fanfare(n: StageN) {
  if (n === 1) {
    [0, 2, 3, 4, 5, 7, 9, 10].forEach((d, i) => marimba(deg(d, 1), { t: i * 0.055, v: 0.15 }));
    [0, 3, 5].forEach(d => bell(deg(d, 1), { t: 0.5, v: 0.06, d: 1.6 }));
  } else if (n === 2) {
    tone({ f: 80, f2: 42, d: 0.5, v: 0.4 });
    noise({ f: 300, kind: 'lowpass', d: 0.25, v: 0.18 });
    [0, 3, 5, 7, 10].forEach((d, i) => pluck(deg(d), { t: 0.25 + i * 0.04, v: 0.1, d: 1.4 }));
  } else {
    // a soft taiko, like the gloop band's: low, barely bending, eased in
    for (const t of [0, 0.3, 0.6]) {
      tone({ t, f: 66, f2: 50, a: 0.015, d: 0.45, v: 0.4 });
      noise({ t, f: 320, kind: 'lowpass', a: 0.012, d: 0.08, v: 0.12 });
    }
    [0, 3, 5, 7].forEach((d, i) => pluck(deg(d - 5), { t: 0.9 + i * 0.05, v: 0.1, d: 1.2 }));
  }
}

/** A new season: a few notes in its own voice. */
export function seasonSting(s: Season) {
  if (s === 'winter') [9, 7, 5].forEach((n, i) => bell(deg(n, 1), { t: i * 0.14, v: 0.06, d: 1.2 }));
  else if (s === 'spring') {
    [0, 1].forEach(i => tone({ t: i * 0.11, f: 2700, f2: 3900, d: 0.06, v: 0.04 }));
    [0, 2, 4].forEach((n, i) => marimba(deg(n, 1), { t: 0.25 + i * 0.08, v: 0.1 }));
  } else if (s === 'summer') [0, 3, 5, 7].forEach(n => marimba(deg(n, 1), { v: 0.08, d: 0.7 }));
  else [5, 4, 2, 0].forEach((n, i) => marimba(deg(n), { t: i * 0.12, v: 0.12, d: 0.5 }));
}

/** The roulette ball clicking past a pocket. */
export function tick() {
  noise({ f: 2200, q: 2, d: 0.012, v: 0.04 });
}

/** The gong's hall: a long, dark tail (4.5 s of noise, low-passed, dying away), shared by every stroke. */
let hall: ConvolverNode | null = null;
function gongHall() {
  if (hall) return hall;
  const c = ac!, n = Math.floor(c.sampleRate * 4.5), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.2 * (rnd() * 2 - 1 - lp); d[i] = lp * (1 - i / n) ** 3; }
  }
  hall = c.createConvolver(); hall.buffer = ir; hall.connect(buses.cue);
  return hall;
}
onBroken(bus => { if (bus === 'cue' && hall) { hall.disconnect(); hall = null; } });
/** A gong's partials, out of tune with each other the way a big gong's are: [ratio to the lowest, volume, seconds
 *  ringing, seconds swelling]. The upper ones bloom a moment after the stroke, as a tam-tam's do. (All under
 *  500 Hz.) */
const GONG_PARTIALS = [[1, 0.16, 6.5, 0.01], [1.48, 0.1, 5.2, 0.01], [2.02, 0.08, 4.4, 0.04], [2.58, 0.06, 3.6, 0.12],
  [3.16, 0.045, 3, 0.25], [3.94, 0.035, 2.5, 0.35], [4.71, 0.025, 2.1, 0.45], [5.62, 0.018, 1.7, 0.5]] as const;
/** The gong in the cellar's arena (stage 3), struck to call a boss in: the mallet's deep thump, then a low bronze roar
 *  that blooms and rings on into its own long hall, everything else in the cellar falling silent under it for a second
 *  (hushFor), and coming back. `at` is down in the cellar: without its height it'd be up in the world, unheard down
 *  there. */
export function gong(at: XZ & { y: number }) {
  const sends: [AudioNode, number][] | undefined = ac ? [[gongHall(), 0.55]] : undefined, F0 = 73;
  for (const [k, v, d, a] of GONG_PARTIALS) {
    const f = F0 * k;
    // each partial a pair a hair apart, beating slowly against itself
    tone({ at, bus: 'cue', sends, f, f2: f * 0.988, a, d, v });
    tone({ at, bus: 'cue', sends, f, f2: f * 0.988, a: a + 0.02, d: d * 0.8, v: v * 0.6, detune: 7 });
  }
  tone({ at, bus: 'cue', f: 52, f2: 44, a: 0.01, d: 0.5, v: 0.3 });
  noise({ at, bus: 'cue', f: 260, kind: 'lowpass', a: 0.01, d: 0.16, v: 0.08 });
  noise({ at, bus: 'cue', sends, f: 1100, f2: 800, q: 1.4, a: 0.35, d: 2.4, v: 0.025 });
  hushFor(1.1);
}

/** Roulette: a shower of coins for a win, two falling notes for a loss. */
export function win() {
  for (let i = 0; i < 8; i++) tone({ t: i * 0.05, f: deg(i + 3, 1), type: 'triangle', d: 0.12, v: 0.06 });
  bell(deg(10, 1), { t: 0.4, v: 0.07 });
}
export function lose() {
  marimba(deg(3), { v: 0.08 });
  marimba(deg(1), { t: 0.15, v: 0.08, d: 0.6 });
}
/** Blackjack: a card turned over with a soft snap, and a push (your stake back): one even note. */
export function deal() {
  noise({ f: 1300, f2: 700, q: 0.9, a: 0.01, d: 0.06, v: 0.06 });
}
export function push() {
  marimba(deg(5), { v: 0.08, d: 0.5 });
}
/** A card drawn out of the blackjack shoe, paper sliding on paper, and coming to rest on the felt with a soft pat. */
export function cardSlide() {
  noise({ f: 1900, f2: 900, q: 0.8, a: 0.03, d: 0.13, v: 0.045 });
}
export function cardLand() {
  noise({ f: 650, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.04, v: 0.05 });
}
/** The slot machine: its reels clacking round, each one stopping with a thunk, and the jackpot. */
export function clack() {
  noise({ f: 1000, q: 1.6, a: 0.008, d: 0.02, v: 0.03 });
}
export function reelStop() {
  tone({ f: 190, f2: 130, type: 'triangle', a: 0.008, d: 0.09, v: 0.1 });
  noise({ f: 700, kind: 'lowpass', a: 0.008, d: 0.05, v: 0.05 });
}
export function jackpot() {
  for (let i = 0; i < 16; i++) tone({ t: i * 0.06, f: deg((i % 8) + 3, 1), type: 'triangle', a: 0.008, d: 0.12, v: 0.06 });
  [0, 3, 5].forEach((n, i) => bell(deg(n, 1), { t: 1.0 + i * 0.1, v: 0.06, d: 1.4 }));
}

/** Slick Eddie's coin at the gong (gong.ts): flicked up with a ping, a bright clink as it comes down on its edge, and a
 *  thunk as it drops flat. */
export function coinPing() {
  bell(deg(9, 1), { v: 0.07, d: 0.7 });
}
export function coinEdge() {
  tone({ f: 2400, d: 0.04, v: 0.035 });
  tone({ f: 3600, t: 0.01, d: 0.03, v: 0.02 });
}
export function coinDrop() {
  tone({ f: 210, f2: 140, type: 'triangle', a: 0.008, d: 0.12, v: 0.1 });
  noise({ f: 800, kind: 'lowpass', a: 0.008, d: 0.06, v: 0.05 });
}

/** A plate set down: on the belt, or at a garden table. */
export function clink(at: XZ) {
  if (!every('clink', 0.08)) return;
  tone({ at, f: 1900, d: 0.03, v: 0.04 });
  tone({ at, f: 2900, d: 0.02, v: 0.025 });
}

/** Rice cut at the terraces. */
export function swish(at: XZ) {
  noise({ at, f: 1400, f2: 500, q: 1.2, a: 0.02, d: 0.12, v: 0.05 });
}

/** A matkot paddle hitting the ball (beach.ts): a hollow wooden tock, the player's a little higher than his. */
export function tock(at: XZ, yours: boolean) {
  tone({ at, f: yours ? 540 : 450, f2: yours ? 380 : 320, type: 'triangle', a: 0.003, d: 0.07, v: 0.2 });
  noise({ at, f: 1500, q: 2, a: 0.002, d: 0.03, v: 0.07 });
}
/** The ball dropping in the sand. */
export function thud(at: XZ) {
  noise({ at, f: 500, kind: 'lowpass', q: 0.6, a: 0.004, d: 0.08, v: 0.08 });
}

/** A driver's horn: two short beeps, or one long one when they're cross. */
export function honk(at: XZ, cross = false) {
  const beep = (t: number, hold: number) => {
    tone({ at, t, f: 392, type: 'square', lp: 1400, a: 0.01, hold, d: 0.05, v: 0.05 });
    tone({ at, t, f: 494, type: 'square', lp: 1400, a: 0.01, hold, d: 0.05, v: 0.045 });
  };
  if (cross) beep(0, 0.5);
  else { beep(0, 0.07); beep(0.16, 0.07); }
}

/** A ship's horn (the voting boat's, votingBoat.ts), like a harbour ferry's: two notes a minor third apart in a brassy
 *  buzz (a soft sawtooth's first 14 harmonics) that scoops up onto its pitch, swells, holds and dies away, echoing off
 *  the water; a prolonged blast, or a short one. */
export function shipHorn(at: XZ, long = true) {
  if (!ac || !brass) return;
  const sends: [AudioNode, number][] = [[waterEcho(), 0.35]], hold = long ? 1.4 : 0.35;
  for (const [f, v] of [[110, 0.08], [130.8, 0.065]]) for (const detune of [-7, 7]) {
    tone({ at, sends, f, wave: brass, scoop: 0.95, detune, lp: 1000, q: 0.7, a: 0.09, hold, d: 0.6, v: v * 0.7 });
  }
}
let brass: PeriodicWave | null = null;
onAudio(() => {
  const n = 14, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = 1 / k ** 0.9;
  brass = ac!.createPeriodicWave(re, im);
});
/** The horn's echo off the water: a soft tail, with a slap back off the shore a third of a second on. */
let echo: ConvolverNode | null = null;
function waterEcho() {
  if (echo) return echo;
  const c = ac!, n = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), slap = Math.floor(c.sampleRate * (0.32 + ch * 0.03));
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.15 * (rnd() * 2 - 1 - lp); d[i] = lp * (1 - i / n) ** 3; }
    for (let i = 0; i < 2400; i++) d[slap + i] += 0.5 * (rnd() * 2 - 1) * (1 - i / 2400) ** 2;
  }
  echo = c.createConvolver(); echo.buffer = ir; echo.connect(buses.sfx);
  return echo;
}
onBroken(bus => { if (bus === 'sfx' && echo) { echo.disconnect(); echo = null; } });

/** A driver booping you off the road: a soft, rubbery boop that drops an octave, over a little thump. */
export function boop(at: XZ) {
  tone({ at, f: deg(4, 1), f2: deg(4), a: 0.012, d: 0.16, v: 0.16 });
  tone({ at, f: 160, f2: 110, type: 'triangle', a: 0.01, d: 0.1, v: 0.1 });
}

/** A button pressed. */
export function click() {
  tone({ f: 1400, f2: 900, d: 0.025, v: 0.04 });
}
document.addEventListener('click', e => {
  if ((e.target as Element | null)?.closest?.('button')) click();
});

// ---------- a win's finish (fight.ts's FINISH) ----------
/** The finish's scene cuts in: a low sweep, as if time's stood still. */
export function sceneIn() {
  tone({ f: 180, f2: 60, a: 0.06, d: 1.3, v: 0.14 });
  noise({ f: 480, q: 0.5, a: 0.08, d: 1.1, v: 0.045 });
}
/** A shove at the straw: a heavy smack of bodies. */
export function shoveSound() {
  tone({ f: 125, f2: 72, type: 'triangle', a: 0.008, d: 0.22, v: 0.26 });
  noise({ f: 1300, q: 1, a: 0.008, d: 0.06, v: 0.12 });
}
/** His finisher slows to a crawl: a low sweep, and a bright "shing" as it holds, the moment to slam him. */
export function slowSound() {
  tone({ f: 170, f2: 70, a: 0.06, d: 1.3, v: 0.12 });
  noise({ f: 600, f2: 1500, q: 0.9, a: 0.08, d: 1.3, v: 0.06 });
  tone({ t: 1.35, f: 1250, f2: 1650, type: 'triangle', a: 0.01, d: 0.3, v: 0.09 });
  tone({ t: 1.37, f: 1900, f2: 2200, a: 0.01, d: 0.22, v: 0.035 });
}
/** The flick down: a short whoosh, the slam on its way (its boom is as he hits). */
export function swooshSound() {
  noise({ f: 2200, f2: 500, q: 0.8, a: 0.02, d: 0.22, v: 0.1 });
  tone({ f: 260, f2: 120, a: 0.02, d: 0.2, v: 0.05 });
}
/** The slam: a boom (bigger for a perfect one). */
export function throwSound(q: number) {
  if (q === 0) {
    tone({ f: 105, f2: 70, type: 'triangle', a: 0.008, d: 0.18, v: 0.22 });
    noise({ f: 450, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.09, v: 0.1 });
    return;
  }
  tone({ f: 95, f2: 50, type: 'triangle', a: 0.01, d: q > 1 ? 0.7 : 0.5, v: q > 1 ? 0.4 : 0.32 });
  noise({ f: 900, q: 0.6, a: 0.01, d: q > 1 ? 0.3 : 0.2, v: q > 1 ? 0.2 : 0.14 });
}
