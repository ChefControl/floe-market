// The stage-up: the moment the fish market becomes Floe Sushi. A banner and confetti, the camera pulls back over
// the whole map, the stage 1 counters and fences come down, the restaurant and the farm pop up piece by piece, and
// day turns to dusk with the lanterns lit. Loading a stage 2 save sets all of that up at once.
import { Color, type Group, type Object3D } from 'three';
import { C1, closeMarket, marketLeftovers, SLED } from './counters';
import { farmPieces, showFarm, springLamp } from './farm';
import { glowMats, hallPieces, lamps, showHall } from './hall';
import { korkiStatue, moveKorki } from './korki';
import { stage } from './layout';
import { marketLooks } from './looks';
import { fitRenderer, fog, hemi, scene, shadowSize, sky, sun, sunOff } from './render';
import { houseStage2 } from './rain';
import { mix, onBlend, type Swatch } from './season';
import { furniture, handOver, openRestaurant } from './restaurant';
import { plantPatch } from './rice';
import { retireRunners } from './runner';
import { fanfare } from './sfx';
import { banner, confetti, toast } from './ui';
import { V } from './util';
import { closeGap, stage1Only, stage2Only, swapDecks } from './world';

// ---------- light ----------
// The sky changes with the seasons too: each colour is given for winter, spring, summer and autumn (season.ts).
const DAY = {
  bg: [0xCFEAF5, 0xD2EEF0, 0xB4DFF6, 0xE4DECB] as Swatch, sky: [0xEAF7FF, 0xF2FBEF, 0xFFFBEA, 0xFFF1DC] as Swatch,
  grd: [0xA9BCCB, 0xA8C49C, 0xA2BE8A, 0xB8A585] as Swatch, sun: [0xFFFFFF, 0xFFFDF2, 0xFFF6DE, 0xFFEACB] as Swatch,
  hemi: 0.78, sunI: 0.62, off: V(-5, 14, 7), glow: 0.12,
};
const DUSK = {
  bg: [0xE6C3C6, 0xEBC5D2, 0xF0C8A6, 0xE2B6A2] as Swatch, sky: [0xFFE4CC, 0xFFE6DC, 0xFFE2BC, 0xFFDABE] as Swatch,
  grd: [0x9C9FCB, 0xA0A8BC, 0xA49E9C, 0xA2929C] as Swatch, sun: [0xFFBE86, 0xFFC69C, 0xFFB46E, 0xFFA864] as Swatch,
  hemi: 0.72, sunI: 0.6, off: V(-14, 11, 6), glow: 1.0,
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const dayC = new Color(), duskC = new Color();
/** Mixes a sky colour for the season and the time of day `k` into `out`. */
const tone = (day: Swatch, dusk: Swatch, k: number, out: Color) => out.lerpColors(mix(day, dayC), mix(dusk, duskC), k);
/** How far it is from day to dusk. */
let mood = 0;

/** Blends the light from day (0) to stage 2's dusk (1): warmer, lower sun, lanterns and lamps on. */
function setMood(k: number) {
  mood = k;
  // the clear-weather sky the rain at her house greys out from
  tone(DAY.bg, DUSK.bg, k, sky.bg);
  sky.hemi = lerp(DAY.hemi, DUSK.hemi, k) * Math.PI;
  sky.sun = lerp(DAY.sunI, DUSK.sunI, k) * Math.PI;
  (scene.background as Color).copy(sky.bg);
  fog.color.copy(sky.bg);
  tone(DAY.sky, DUSK.sky, k, hemi.color);
  tone(DAY.grd, DUSK.grd, k, hemi.groundColor);
  hemi.intensity = sky.hemi;
  tone(DAY.sun, DUSK.sun, k, sun.color);
  sun.intensity = sky.sun;
  sunOff.lerpVectors(DAY.off, DUSK.off, k);
  glowMats.forEach(m => { m.emissiveIntensity = lerp(DAY.glow, DUSK.glow, k); });
  [...lamps, springLamp].forEach(l => { l.intensity = 9 * k; });
}
onBlend(() => setMood(mood));

// ---------- camera ----------
/** How far the camera sits back (1 = stage 1), and how much it looks at `focus` instead of the player. */
export const view = { zoom: 1, k: 0, focus: V(-5, 0, 6) };
/** Stage 2's map is bigger, so the camera sits a little further back. */
export const STAGE2_ZOOM = 1.2;
/** How far back the camera pulls to show the whole map during the stage-up. */
const OVERVIEW = 2.6;

// ---------- timeline ----------
type Axis = 'all' | 'y' | 'x';
interface Anim { o: Object3D; t0: number; out: boolean; axis: Axis }
interface Cue { t: number; run: () => void }
let fx: { t: number; anims: Anim[]; cues: Cue[] } | null = null;
const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const back = (k: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const OUT_DUR = 0.45, IN_DUR = 0.55, END = 6.6;
/** The stage-up is playing. */
export const staging = () => fx !== null;

function setScale(o: Object3D, s: number, axis: Axis) {
  s = Math.max(0.001, s);
  if (axis === 'all') o.scale.setScalar(s);
  else if (axis === 'y') o.scale.y = s;
  else o.scale.x = s;
}

/** Advances the stage-up, if one is playing. */
export function updStage(dt: number) {
  if (!fx) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t = fx.t += reduce ? dt * 3 : dt;
  for (const a of fx.anims) {
    const k = clamp01((t - a.t0) / (a.out ? OUT_DUR : IN_DUR));
    setScale(a.o, a.out ? 1 - ease(k) : back(k), a.axis);
    if (a.out && k >= 1) a.o.visible = false;
  }
  for (const c of fx.cues) if (t >= c.t) c.run();
  fx.cues = fx.cues.filter(c => t < c.t);
  setMood(ease(clamp01((t - 1.4) / 2.6)));
  // pull back over the map, hold, then come back down to the player
  const pull = t < 4.4 ? ease(clamp01((t - 0.3) / 2.0)) : 1 - ease(clamp01((t - 4.4) / 2.0));
  view.k = pull;
  view.zoom = lerp(t < 2.2 ? 1 : STAGE2_ZOOM, OVERVIEW, pull);
  if (t >= END) { fx = null; view.k = 0; view.zoom = STAGE2_ZOOM; }
}

/** A wider, sharper shadow map for stage 2's bigger view. */
function widenShadows() {
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18 });
  sun.shadow.camera.updateProjectionMatrix();
  shadowSize.px = 2048;
  fitRenderer();
}

/**
 * The gold 'sushi' tile: stage 2. The stage 1 counters close (their customers pay up and go home), and the
 * restaurant and farm open, with a patch of rice planted. `silent` (loading a save) skips the show. `onMove` runs
 * when Korki's statue moves to its new spot.
 */
export function enterStage2(silent: boolean, onMove = () => {}) {
  stage.n = 2;
  closeMarket();
  showHall(); showFarm();
  widenShadows();
  const staff = openRestaurant(silent);
  const patch = plantPatch();
  // Korki's statue goes out with the old stage and comes back in its new spot.
  const movers = [korkiStatue()].filter((o): o is Group => o !== null);
  const move = () => { moveKorki(); onMove(); };
  // the restaurant keeps two of the market's runners; any more go with the market
  const retired = retireRunners();
  const outs: [Object3D, Axis][] = [
    ...retired.map((o): [Object3D, Axis] => [o, 'all']),
    ...[...C1.meshes, ...SLED.meshes].filter(m => m.visible).map((m): [Object3D, Axis] => [m, 'all']),
    [marketLooks, 'y'], [stage1Only.fence, 'y'], [stage1Only.road, 'x'], [stage1Only.trees, 'y'],
    ...movers.map((o): [Object3D, Axis] => [o, 'all']),
  ];
  const swap = () => { swapDecks(); closeGap(); houseStage2(); };
  stage2Only.road.visible = true; stage2Only.trees.visible = true;
  if (silent) {
    outs.forEach(([o]) => { o.visible = false; });
    movers.forEach(o => { o.visible = true; });
    swap(); move();
    handOver(marketLeftovers());
    setMood(1);
    view.zoom = STAGE2_ZOOM;
    return;
  }
  const anims: Anim[] = outs.map(([o, axis], i) => ({ o, t0: 0.6 + i * 0.06, out: true, axis }));
  // in order: the floor and furniture, the building round them, the staff and stools, the front, then the farm
  const [floor, ...shell] = hallPieces;
  const ins: [Object3D, Axis, number][] = [
    ...[floor, ...furniture, ...shell.slice(0, 3)].map((o): [Object3D, Axis, number] => [o, 'all', 0.12]),
    ...staff.map((o): [Object3D, Axis, number] => [o, 'all', 0.04]),
    ...shell.slice(3).map((o): [Object3D, Axis, number] => [o, 'all', 0.1]),
    [stage2Only.road, 'x', 0.1],
    ...farmPieces.map((o): [Object3D, Axis, number] => [o, 'all', 0.14]),
    ...patch.map((o): [Object3D, Axis, number] => [o, 'all', 0.05]),
    [stage2Only.trees, 'y', 0],
  ];
  let t0 = 1.5;
  for (const [o, axis, step] of ins) {
    setScale(o, 0, axis);
    anims.push({ o, t0, out: false, axis });
    t0 += step;
  }
  fx = {
    t: 0, anims,
    cues: [
      { t: 0, run: () => { banner('Stage 1 complete', 'Fish Market'); confetti(); fanfare(1); } },
      { t: 1.0, run: () => handOver(marketLeftovers()) },
      {
        t: 1.4, run: () => {
          swap(); move();
          fx!.anims = fx!.anims.filter(a => !(movers as Object3D[]).includes(a.o));
          for (const o of movers) { o.visible = true; setScale(o, 0, 'all'); fx!.anims.push({ o, t0: 3.2, out: false, axis: 'all' }); }
        },
      },
      { t: 1.7, run: () => banner(null) },
      { t: 2.2, run: () => { banner('Stage 2', 'Floe Sushi'); confetti(); fanfare(2); } },
      { t: 5.4, run: () => { banner(null); toast('Rice grows on the terrace, out the west door'); } },
    ],
  };
  updStage(0);
}
