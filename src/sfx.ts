// The sound effects, one function a sound, called from wherever the thing happens. They're built from the voices in
// audio.ts: soft blips that climb the scale for picking things up and coins, struck wood for the cleaver and the
// boards underfoot, little bells for money and news, and filtered noise for water, snow and swishing rice. Sounds out
// in the world (a customer paying, a driver's horn) are placed where they happen, and fade with distance.
import { bell, between, deg, every, marimba, noise, pluck, streak, tone } from './audio';
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

/** The stage-up: a flourish for the market done (1), then a drum and a strummed koto for the restaurant (2). */
export function fanfare(n: 1 | 2) {
  if (n === 1) {
    [0, 2, 3, 4, 5, 7, 9, 10].forEach((d, i) => marimba(deg(d, 1), { t: i * 0.055, v: 0.15 }));
    [0, 3, 5].forEach(d => bell(deg(d, 1), { t: 0.5, v: 0.06, d: 1.6 }));
  } else {
    tone({ f: 80, f2: 42, d: 0.5, v: 0.4 });
    noise({ f: 300, kind: 'lowpass', d: 0.25, v: 0.18 });
    [0, 3, 5, 7, 10].forEach((d, i) => pluck(deg(d), { t: 0.25 + i * 0.04, v: 0.1, d: 1.4 }));
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

/** Roulette: a shower of coins for a win, two falling notes for a loss. */
export function win() {
  for (let i = 0; i < 8; i++) tone({ t: i * 0.05, f: deg(i + 3, 1), type: 'triangle', d: 0.12, v: 0.06 });
  bell(deg(10, 1), { t: 0.4, v: 0.07 });
}
export function lose() {
  marimba(deg(3), { v: 0.08 });
  marimba(deg(1), { t: 0.15, v: 0.08, d: 0.6 });
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

/** A driver's horn: two short beeps, or one long one when they're cross. */
export function honk(at: XZ, cross = false) {
  const beep = (t: number, hold: number) => {
    tone({ at, t, f: 392, type: 'square', lp: 1400, a: 0.01, hold, d: 0.05, v: 0.05 });
    tone({ at, t, f: 494, type: 'square', lp: 1400, a: 0.01, hold, d: 0.05, v: 0.045 });
  };
  if (cross) beep(0, 0.5);
  else { beep(0, 0.07); beep(0.16, 0.07); }
}

/** A button pressed. */
export function click() {
  tone({ f: 1400, f2: 900, d: 0.025, v: 0.04 });
}
document.addEventListener('click', e => {
  if ((e.target as Element | null)?.closest?.('button')) click();
});
