// The seasons: winter, spring, summer and autumn, five minutes of play each, round and round. A new season blends
// the scenery's colours over a few seconds (snow melts into grass, the pines' snow turns to blossom, leaves or gold,
// the ice floes melt and come back), changes what falls from the sky (snow, petals, leaves), and changes what
// everyone wears (characters.ts). The sky's colours for each season are with the rest of the light, in stage.ts.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, MeshLambertMaterial, NormalBlending, Points, PointsMaterial,
} from 'three';
import { camera, canvasTex, scene } from './render';
import { FY, type XZ } from './util';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';
export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'fall'];
/** Seconds of play a season lasts, and how long the scenery takes to change into the next one. */
export const SEASON_LEN = 300, BLEND = 6;

/** Which season it is (an index into SEASONS), how far into it, and how far the scenery has blended into it. */
export const season = { i: 0, t: 0, k: 1, from: 0 };
export const current = () => SEASONS[season.i];

/** What each season is called, its icon, and the message when it comes round. */
export const SEASON_INFO: Record<Season, { name: string; icon: string; news: string }> = {
  winter: { name: 'Winter', icon: '❄️', news: '❄️ Winter: snow on the ground, parkas on' },
  spring: { name: 'Spring', icon: '🌸', news: '🌸 Spring: the snow melts and the blossoms are out' },
  summer: { name: 'Summer', icon: '☀️', news: '☀️ Summer: T-shirts, shorts and sunglasses' },
  fall: { name: 'Autumn', icon: '🍂', news: '🍂 Autumn: the leaves turn, out come the woolly hats' },
};

/** A colour for each season, in SEASONS' order. */
export type Swatch = [winter: number, spring: number, summer: number, fall: number];
/** The scenery's seasonal colours. */
export const PAL = {
  /** Open ground: snow, fresh grass, summer grass, dry autumn grass. */
  ground: [0xF3F8FB, 0xA9D88B, 0x93C96E, 0xB3AE6E],
  /** Lawns a little apart from the ground (her yard, the hillside over the terraces). */
  lawn: [0xEEF3F6, 0x9CD07E, 0x86C262, 0xA9A564],
  /** Paths: packed snow, then earth. */
  path: [0xE2EAF0, 0xD9CBA6, 0xD6C7A0, 0xC8B288],
  /** Snow on the trees: blossom in spring, fresh leaves in summer, gold in autumn. */
  drift: [0xFFFFFF, 0xFFB7D3, 0x7CC45A, 0xF2B640],
  /** Snow mounds, which are bushes the rest of the year. */
  bush: [0xFFFFFF, 0x6DBA55, 0x579E45, 0xB8642C],
  /** The pines' two shades of needles, which turn red and orange in autumn. */
  pine: [0x2E6E5E, 0x3C8E50, 0x2F7D3A, 0xC2562B],
  pine2: [0x3B8270, 0x5AAA62, 0x46A04A, 0xE08A2E],
} satisfies Record<string, Swatch>;

const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
/** How far the scenery is from the last season's colours to this one's (eased). */
export const blendK = () => ease(season.k);

// ---------- what changes with the season ----------
const looks: { m: MeshLambertMaterial; c: Swatch }[] = [];
const hooks: (() => void)[] = [];
const swaps: (() => void)[] = [];
/** A material whose colour changes with the seasons. */
export function seasonal(c: Swatch) {
  const m = new MeshLambertMaterial({ color: c[season.i] });
  looks.push({ m, c });
  return m;
}
/** Runs `f` whenever the seasons' blend moves on, to recolour or rescale things. */
export const onBlend = (f: () => void) => { hooks.push(f); };
/** Runs `f` the moment a new season starts (everyone changes clothes). */
export const onSeason = (f: () => void) => { swaps.push(f); };

const a = new Color(), b = new Color();
/** Mixes a swatch for the current blend into `out`. */
export function mix(c: Swatch, out: Color) {
  return out.lerpColors(a.setHex(c[season.from]), b.setHex(c[season.i]), blendK());
}
/** Mixes a number given for each season (in SEASONS' order) for the current blend. */
export const amount = (v: Swatch) => v[season.from] + (v[season.i] - v[season.from]) * blendK();
function paint() {
  for (const l of looks) mix(l.c, l.m.color);
  hooks.forEach(f => f());
}

// ---------- what falls from the sky ----------
/**
 * Flakes fill a box this many metres either side of the player, up to TOP high. They stay put in the world as the
 * player walks (only falling and drifting): a flake that ends up more than SPREAD behind comes back in ahead.
 */
const SPREAD = 16, TOP = 10, FLAKES = 900;
/** Per season: how many of the flakes fall, their colour, size, how fast they fall and how much they drift. */
const SKY: Record<Season, { n: number; c: number; size: number; fall: number; sway: number }> = {
  winter: { n: 900, c: 0xFFFFFF, size: 0.16, fall: 1.4, sway: 0.5 },
  spring: { n: 160, c: 0xFFB7D3, size: 0.17, fall: 0.9, sway: 1.2 },
  summer: { n: 0, c: 0xFFFFFF, size: 0.1, fall: 1, sway: 0 },
  fall: { n: 180, c: 0xE0812E, size: 0.2, fall: 1.1, sway: 1.4 },
};
const flakes = new Float32Array(FLAKES * 3);
// Spread evenly with a low-discrepancy sequence: no Math.random, so the rest of the game's randomness is untouched.
for (let i = 0; i < FLAKES; i++) {
  flakes[i * 3] = ((i * 0.7548776662) % 1 * 2 - 1) * SPREAD;
  flakes[i * 3 + 1] = (i * 0.5698402910) % 1 * TOP;
  flakes[i * 3 + 2] = ((i * 0.6180339887) % 1 * 2 - 1) * SPREAD;
}
const flakePos = new Float32Array(FLAKES * 3);
const flakeGeo = new BufferGeometry();
flakeGeo.setAttribute('position', new BufferAttribute(flakePos, 3));
const dot = canvasTex(32, 32, (c, w, h) => {
  const g = c.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const flakeMat = new PointsMaterial({ map: dot.tex, transparent: true, depthWrite: false, opacity: 0, blending: NormalBlending });
export const weather = new Points(flakeGeo, flakeMat);
weather.frustumCulled = false;
scene.add(weather);
let time = 0;
/** Wraps an offset from the player into the box round them. */
const wrap = (v: number) => v - 2 * SPREAD * Math.floor((v + SPREAD) / (2 * SPREAD));

// ---------- shelter ----------
/** A building's footprint, nothing falling inside it below `top`, while `on` (it's built). */
export interface Shelter { x0: number; x1: number; z0: number; z1: number; top: number; on: () => boolean }
const shelters: Shelter[] = [];
/** Keeps snow, petals and leaves out of a building: they stop at its roof. */
export const shelter = (s: Shelter) => { shelters.push(s); };
const over = (r: Shelter, x: number, z: number) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

/**
 * Moves what's falling round the player (`at`), keeping it out of buildings. Through a change of season the old season's flakes thin out, then
 * the new one's come in. `clear` (0–1) takes them away, for the rain at her house.
 */
function updWeather(dt: number, at: XZ, clear: number) {
  time += dt;
  const half = season.k < 0.5, s = SKY[SEASONS[half ? season.from : season.i]];
  const k = (half ? 1 - season.k * 2 : season.k * 2 - 1) * (1 - clear);
  flakeMat.opacity = 0.9 * k;
  weather.visible = s.n > 0 && k > 0.01;
  if (!weather.visible) return;
  flakeMat.color.setHex(s.c);
  flakeMat.size = s.size;
  flakeMat.blending = s.c === 0xFFFFFF ? AdditiveBlending : NormalBlending;
  const roofs = shelters.filter(r => r.on());
  // With the player indoors, the camera looks in through the faded roof: flakes in the air between it and the floor
  // would look like they're falling inside, so those go too.
  const indoors = roofs.find(r => over(r, at.x, at.z)), c = camera.position;
  flakeGeo.setDrawRange(0, s.n);
  for (let i = 0; i < s.n; i++) {
    let y = flakes[i * 3 + 1] - s.fall * dt * (0.7 + (i % 7) * 0.08);
    if (y < 0) y += TOP;
    flakes[i * 3 + 1] = y;
    const ph = time * 1.3 + i;
    const x = at.x + wrap(flakes[i * 3] + Math.sin(ph) * s.sway - at.x);
    const z = at.z + wrap(flakes[i * 3 + 2] + Math.cos(ph * 0.8) * s.sway * 0.6 - at.z);
    // under a roof: down out of sight, below the ground
    let inside = roofs.some(r => y < r.top && over(r, x, z));
    if (indoors && !inside && c.y > y) {
      const t = (c.y - FY) / (c.y - y); // where the camera's line of sight through the flake meets the floor
      inside = over(indoors, c.x + (x - c.x) * t, c.z + (z - c.z) * t);
    }
    flakePos[i * 3] = x;
    flakePos[i * 3 + 1] = inside ? -5 : y;
    flakePos[i * 3 + 2] = z;
  }
  flakeGeo.attributes.position.needsUpdate = true;
}

// ---------- the HUD chip ----------
const chip = document.getElementById('season')!, chipIc = document.getElementById('seasonIc')!;
const chipName = document.getElementById('seasonName')!, chipBar = document.getElementById('seasonBar')!;
let shownPct = -1;
function showChip() {
  const s = SEASON_INFO[current()];
  chip.dataset.season = current();
  chipIc.textContent = s.icon;
  chipName.textContent = s.name;
  shownPct = -1;
}

// ---------- the clock ----------
/** Starts season `i`, `t` seconds in. `silent` (loading a save) skips the blend. */
export function setSeason(i: number, t = 0, silent = false) {
  season.from = silent ? i : season.i;
  season.i = i;
  season.t = t;
  season.k = silent ? 1 : 0;
  showChip();
  swaps.forEach(f => f());
  paint();
}

/**
 * Moves the seasons on by `dt` of play; `at` is where the player is, `clear` how much the rain clears the sky.
 * Returns true when a new season starts.
 */
export function updSeason(dt: number, at: XZ, clear: number) {
  season.t += dt;
  const turn = season.t >= SEASON_LEN;
  if (turn) setSeason((season.i + 1) % SEASONS.length, season.t - SEASON_LEN);
  if (season.k < 1) {
    season.k = Math.min(1, season.k + dt / BLEND);
    paint();
  }
  const pct = Math.floor(season.t / SEASON_LEN * 100);
  if (pct !== shownPct) { shownPct = pct; chipBar.style.width = pct + '%'; }
  updWeather(dt, at, clear);
  return turn;
}

showChip();
