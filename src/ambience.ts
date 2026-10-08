// The world's own sound, quietly under everything else: the sea, with gulls over it; the wind, strongest in winter;
// birdsong by day, cicadas in summer and crickets at stage 2's dusk; the rain at her house; and in the restaurant,
// the murmur of its diners. The steady ones are loops of filtered noise whose levels follow the player and the season;
// the calls come now and then, from somewhere near.
//
// Sea, wind and diners are brown noise (the low rumble of the real thing, not white noise's hiss), and they move:
// the sea comes in as waves with calm between, the wind in gusts. Steady hiss, even quiet, wears on the ear.
import { bed, between, clock, ear, glide, onAudio, prefs, rnd, tone } from './audio';
import { stage } from './layout';
import { rainK } from './rain';
import { sushi } from './restaurant';
import { current, type Season } from './season';
import type { XZ } from './util';

type Bed = ReturnType<typeof bed>;
let beds: Record<'sea' | 'wash' | 'wind' | 'rain' | 'crowd' | 'cicadas', Bed> | null = null;
onAudio(() => {
  beds = {
    sea: bed({ kind: 'lowpass', f: 420, q: 0.5, soft: true, smooth: 800 }),
    wash: bed({ kind: 'bandpass', f: 800, q: 0.5, soft: true, smooth: 1600 }),
    wind: bed({ kind: 'bandpass', f: 450, q: 0.8, soft: true, smooth: 1200 }),
    rain: bed({ kind: 'bandpass', f: 2200, q: 0.4, smooth: 3500 }),
    crowd: bed({ kind: 'bandpass', f: 500, q: 1.2, soft: true, smooth: 1200, am: [3.3, 0.5] }),
    cicadas: bed({ kind: 'bandpass', f: 4200, q: 10, am: [15, 0.9] }),
  };
});

/** How hard the wind blows in each season. */
const WIND: Record<Season, number> = { winter: 0.27, spring: 0.1, summer: 0.04, fall: 0.19 };
const ease = (k: number) => k * k * (3 - 2 * k);
/** A wave, `p` (0 to 1) of the way through: it rises, breaks, and runs back out. */
const wave = (p: number) => (p < 0.3 ? ease(p / 0.3) : (1 - (p - 0.3) / 0.7) ** 2);
/** How big the sea is now: waves of two lengths, rolling in out of step, with calm between them. */
const swell = () => 0.2 + 0.8 * Math.max(wave((clock / 7.3) % 1), 0.7 * wave((clock / 11.1 + 0.4) % 1));
/** How hard the wind is gusting now, 0 to 1, rising and falling over a quarter of a minute or so. */
const gust = () => (0.5 + 0.5 * Math.sin(clock * 0.21) * Math.sin(clock * 0.083 + 2)) ** 2;
/** Where the restaurant's diners are heard from: the middle of the bar. */
const BAR = { x: 0, z: 10 };

/** How close the player is to the sea, 1 on the dock fading to 0 inland. The bay is north of z -6.6, west of x 7.5. */
function nearSea() {
  const off = Math.max(0, ear.z + 6.6) + Math.max(0, ear.x - 7.5);
  return Math.max(0, 1 - off / 26);
}

// ---------- calls ----------
/** A gull or two over the water, "kee-ow". */
function gulls() {
  const at = { x: ear.x + between(-10, 10), z: -14 };
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    tone({ at, bus: 'amb', t: i * 0.34, f: between(1500, 1800), f2: 1000, type: 'triangle', a: 0.04, d: 0.28, v: 0.08, vib: [11, 30] });
  }
}
/** A small bird in the trees: a few quick chirps. */
function chirps(at: XZ) {
  const n = 2 + Math.floor(rnd() * 3), f = between(2600, 3400);
  for (let i = 0; i < n; i++) tone({ at, bus: 'amb', t: i * 0.09, f, f2: f * 1.4, d: 0.05, v: 0.05 });
}
/** A cricket: a short trill. */
function cricket(at: XZ) {
  for (let i = 0; i < 3; i++) tone({ at, bus: 'amb', t: i * 0.05, f: 4400, a: 0.005, d: 0.025, v: 0.03 });
}
const nearby = () => ({ x: ear.x + between(-12, 12), z: ear.z + between(-9, 9) });

const next = { gull: 4, bird: 3, cricket: 2 };

export function updAmbience() {
  if (!beds || prefs.mute.amb) return;
  const s = current(), dusk = stage.n === 2, dry = 1 - rainK;
  // the sea, wave after wave, and a soft wash as each one breaks
  const sea = nearSea(), w = swell(), g = gust();
  glide(beds.sea.g.gain, 0.22 * sea * w, 0.25);
  glide(beds.wash.g.gain, 0.3 * sea * Math.max(0, w - 0.75), 0.2);
  // the wind, in gusts, a little higher as it blows harder
  glide(beds.wind.g.gain, WIND[s] * dry * (0.3 + 0.7 * g), 0.8);
  glide(beds.wind.f.frequency, 320 + 380 * g, 0.8);
  glide(beds.rain.g.gain, 0.5 * rainK, 0.5);
  // the diners: louder with more of them, and closer
  const near = Math.max(0, 1 - Math.hypot(ear.x - BAR.x, ear.z - BAR.z) / 20);
  glide(beds.crowd.g.gain, dusk ? 0.19 * Math.min(1, sushi.diners.length / 14) * near : 0, 0.6);
  glide(beds.cicadas.g.gain, s === 'summer' ? 0.03 * dry : 0, 1.5);

  if (clock > next.gull) {
    next.gull = clock + between(7, 18);
    if (sea > 0.3 && dry > 0.5) gulls();
  }
  if (clock > next.bird) {
    next.bird = clock + between(2.5, 7);
    if (!dusk && (s === 'spring' || s === 'summer') && dry > 0.5) chirps(nearby());
  }
  if (clock > next.cricket) {
    next.cricket = clock + between(1.2, 3);
    if (dusk && (s === 'summer' || s === 'fall') && dry > 0.5) cricket(nearby());
  }
}
