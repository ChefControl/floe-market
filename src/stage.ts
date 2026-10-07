// The stage-up: the moment the fish market becomes Floe Sushi. A banner and confetti, the camera pulls back over
// the whole map, the stage 1 counters and fences come down, the restaurant and the farm pop up piece by piece, and
// day turns to dusk with the lanterns lit. Loading a stage 2 save sets all of that up at once.
import { Color, type Group, type Object3D } from 'three';
import { casinoTable, moveCasino } from './casino';
import { C1, closeMarket, marketLeftovers, SLED } from './counters';
import { farmPieces, showFarm, springLamp } from './farm';
import { glowMats, hallPieces, lamps, showHall } from './hall';
import { korkiStatue, moveKorki } from './korki';
import { stage } from './layout';
import { fog, hemi, scene, sun, sunOff } from './render';
import { furniture, handOver, openRestaurant } from './restaurant';
import { openStall } from './rice';
import { banner, confetti } from './ui';
import { V } from './util';
import { closeGap, stage1Only, stage2Only, swapDecks } from './world';

// ---------- light ----------
const DAY = {
  bg: new Color(0xCFEAF5), sky: new Color(0xEAF7FF), grd: new Color(0xA9BCCB), hemi: 0.78,
  sun: new Color(0xFFFFFF), sunI: 0.62, off: V(-5, 14, 7), glow: 0.12,
};
const DUSK = {
  bg: new Color(0xE6C3C6), sky: new Color(0xFFE4CC), grd: new Color(0x9C9FCB), hemi: 0.72,
  sun: new Color(0xFFBE86), sunI: 0.6, off: V(-14, 11, 6), glow: 1.0,
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Blends the light from day (0) to stage 2's dusk (1): warmer, lower sun, lanterns and lamps on. */
function setMood(k: number) {
  (scene.background as Color).lerpColors(DAY.bg, DUSK.bg, k);
  fog.color.lerpColors(DAY.bg, DUSK.bg, k);
  hemi.color.lerpColors(DAY.sky, DUSK.sky, k);
  hemi.groundColor.lerpColors(DAY.grd, DUSK.grd, k);
  hemi.intensity = lerp(DAY.hemi, DUSK.hemi, k) * Math.PI;
  sun.color.lerpColors(DAY.sun, DUSK.sun, k);
  sun.intensity = lerp(DAY.sunI, DUSK.sunI, k) * Math.PI;
  sunOff.lerpVectors(DAY.off, DUSK.off, k);
  glowMats.forEach(m => { m.emissiveIntensity = lerp(DAY.glow, DUSK.glow, k); });
  [...lamps, springLamp].forEach(l => { l.intensity = 9 * k; });
}

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
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
}

/**
 * The gold 'sushi' tile: stage 2. The stage 1 counters close (their customers pay up and go home), and the
 * restaurant, rice stall and farm open. `silent` (loading a save) skips the show. `onMove` runs
 * when the roulette table and Korki's statue move to their new spots.
 */
export function enterStage2(silent: boolean, onMove = () => {}) {
  stage.n = 2;
  closeMarket();
  showHall(); showFarm();
  widenShadows();
  const staff = openRestaurant(silent);
  const stall = openStall();
  // The roulette table and Korki's statue go out with the old stage and come back in their new spots.
  const movers = [casinoTable(), korkiStatue()].filter((o): o is Group => o !== null);
  const move = () => { moveCasino(-2.2); moveKorki(); onMove(); };
  const outs: [Object3D, Axis][] = [
    ...[...C1.meshes, ...SLED.meshes].filter(m => m.visible).map((m): [Object3D, Axis] => [m, 'all']),
    [stage1Only.fence, 'y'], [stage1Only.road, 'x'], [stage1Only.trees, 'y'],
    ...movers.map((o): [Object3D, Axis] => [o, 'all']),
  ];
  const swap = () => { swapDecks(); closeGap(); };
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
    ...[...shell.slice(3), stall].map((o): [Object3D, Axis, number] => [o, 'all', 0.1]),
    [stage2Only.road, 'x', 0.1],
    ...farmPieces.map((o): [Object3D, Axis, number] => [o, 'all', 0.14]),
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
      { t: 0, run: () => { banner('Stage 1 complete', 'Fish Market'); confetti(); } },
      { t: 1.0, run: () => handOver(marketLeftovers()) },
      {
        t: 1.4, run: () => {
          swap(); move();
          fx!.anims = fx!.anims.filter(a => !(movers as Object3D[]).includes(a.o));
          for (const o of movers) { o.visible = true; setScale(o, 0, 'all'); fx!.anims.push({ o, t0: 3.2, out: false, axis: 'all' }); }
        },
      },
      { t: 1.7, run: () => banner(null) },
      { t: 2.2, run: () => { banner('Stage 2', 'Floe Sushi'); confetti(); } },
      { t: 5.4, run: () => banner(null) },
    ],
  };
  updStage(0);
}
