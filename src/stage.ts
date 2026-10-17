// The stage-ups. Stage 2: the moment the fish market becomes Floe Sushi. A banner and confetti, the camera pulls back
// over the whole map, the stage 1 counters and fences come down, the restaurant and the farm pop up piece by piece,
// and day turns to dusk with the lanterns lit. Stage 3: the player follows Mr. Fugu down the hatch, the screen goes
// dark, and comes up in the cellar under the dock, the crowd roaring round the ring. Loading a save sets it all up at
// once. This is also where the light is kept (day, dusk, and the cellar's own), and the ladder between the levels.
import { Color, type Group, type Object3D } from 'three';
import { boss, CELLAR_SKY, cellarLights, LADDER_FOOT, LADDER_PAD, showCellar } from './cellar';
import { stowCarried } from './cellarHands';
import { C1, closeMarket, marketLeftovers, SLED } from './counters';
import { farmPieces, showFarm, springLamp } from './farm';
import { front } from './front';
import { glowMats, hallPieces, lamps, showHall } from './hall';
import { nightSky } from './horizon';
import { kindOf } from './items';
import { korkiStatue, moveKorki } from './korki';
import { HATCH_AT, level, stage } from './layout';
import { marketLooks } from './looks';
import { player } from './player';
import { fitRenderer, fog, hemi, scene, shadowSize, sky, sun, sunOff } from './render';
import { buyOut } from './fight';
import { openCellar } from './ring';
import { react } from './ringSound';
import { houseStage2 } from './rain';
import { mix, onBlend, type Swatch } from './season';
import { furniture, handOver, openRestaurant } from './restaurant';
import { fieldStack, plantPatch } from './rice';
import { retireRunners } from './runner';
import { fanfare } from './sfx';
import { pile } from './stations';
import { cellarKnown } from './tutorial';
import { banner, confetti, fade, toast } from './ui';
import { d2xz, FY, V } from './util';
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
/** Night, for Mr. Fugu's meeting (offer.ts): moonlight from high over the sea, a dark sky, the lanterns lit. The same
 *  whatever the season. */
const NIGHT = { bg: 0x0B1426, sky: 0x4A5A86, grd: 0x14161F, sun: 0xA8BCFF, hemi: 0.4, sunI: 0.36, off: V(-4, 15, -9), glow: 1.0 };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const dayC = new Color(), duskC = new Color(), nightC = new Color();
/** Mixes a sky colour for the season and the time of day `k` into `out`. */
const tone = (day: Swatch, dusk: Swatch, k: number, out: Color) => out.lerpColors(mix(day, dayC), mix(dusk, duskC), k);
/** How far it is from day to dusk, and how far night has fallen over that (0 none, 1 full night). */
let mood = 0, night = 0;

/** Blends the light from day (0) to stage 2's dusk (1): warmer, lower sun, lanterns and lamps on. Down in the cellar,
 *  its own light instead (the dusk waits for the player to come back up). */
function setMood(k: number) {
  mood = k;
  if (level.down) { cellarSky(); return; }
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
  if (night > 0) {
    const n = night;
    for (const [c, hex] of [[sky.bg, NIGHT.bg], [hemi.color, NIGHT.sky], [hemi.groundColor, NIGHT.grd], [sun.color, NIGHT.sun]] as const) c.lerp(nightC.setHex(hex), n);
    sky.hemi = lerp(sky.hemi, NIGHT.hemi * Math.PI, n);
    sky.sun = lerp(sky.sun, NIGHT.sunI * Math.PI, n);
    (scene.background as Color).copy(sky.bg);
    fog.color.copy(sky.bg);
    hemi.intensity = sky.hemi;
    sun.intensity = sky.sun;
    sunOff.lerp(NIGHT.off, n);
  }
  const lit = Math.max(k, night);
  glowMats.forEach(m => { m.emissiveIntensity = lerp(DAY.glow, DUSK.glow, lit); });
  [...lamps, springLamp].forEach(l => { l.intensity = 9 * lit; });
  nightSky(night);
}

/** Lets night fall (`k` up to 1) or lift (back to 0) over the day or dusk: for Mr. Fugu's meeting (offer.ts). */
export function setNight(k: number) {
  night = Math.max(0, Math.min(1, k));
  setMood(mood);
}
export const nightK = () => night;
onBlend(() => setMood(mood));

/** The cellar's light: near-black, the lanterns' warm glow, and no sky. */
function cellarSky() {
  nightSky(0);
  sky.bg.copy(CELLAR_SKY.bg);
  (scene.background as Color).copy(CELLAR_SKY.bg);
  fog.color.copy(CELLAR_SKY.bg);
  hemi.color.setHex(CELLAR_SKY.sky); hemi.groundColor.setHex(CELLAR_SKY.grd);
  hemi.intensity = sky.hemi = CELLAR_SKY.hemi * Math.PI;
  sun.color.setHex(CELLAR_SKY.sun);
  sun.intensity = sky.sun = CELLAR_SKY.sunI * Math.PI;
  sunOff.copy(DAY.off);
}

// ---------- the levels ----------
/** The camera's distance down in the cellar, which is smaller than the restaurant's map. */
export const CELLAR_ZOOM = 1.1;
/** Puts the player on a level: the cellar (stage 3) or the world above, with its light, lamps and camera. */
export function setLevel(down: boolean) {
  level.down = down;
  // (the seasons don't reach the cellar, and it's hot down there: the player changes into summer clothes on the way
  // down, and dresses for the day again back up top)
  player.g.season = down ? 'summer' : null;
  player.g.wear();
  cellarLights(down);
  // the lamps above are off down here (every light costs every material in the scene)
  [...lamps, springLamp].forEach(l => { l.visible = !down; });
  setMood(mood);
  view.zoom = down ? CELLAR_ZOOM : stage.n >= 2 ? STAGE2_ZOOM : 1;
  view.snap = true;
}

/** Where the player comes out: at the foot of the ladder, or beside the hatch on the dock. */
const FOOT = LADDER_FOOT, DOCK = V(HATCH_AT.x, FY, HATCH_AT.z + 1.2);
/** Puts the player straight down in the cellar, at the foot of the ladder (a save made down there). */
export function goBelow() {
  player.g.position.copy(FOOT);
  setLevel(true);
  armed = false;
}
/** How close to stand to the hatch to go down, and seconds of standing there (or at the ladder) before going. */
const HATCH_R = 0.55, LINGER = 0.4;
let hop: { t: number; down: boolean; moved: boolean } | null = null, linger = 0, armed = true;
/** Climbs the ladder: dark, across, and light again. */
function climb(down: boolean) {
  hop = { t: 0, down, moved: false };
  player.held = true; player.moving = false;
  fade(true);
}
/** The ladder between the dock and the cellar (stage 3): stand at the foot of it, or on the open hatch, to climb. */
export function updLadder(dt: number) {
  if (hop) {
    hop.t += dt;
    // across while the screen's dark
    if (hop.t >= 0.35 && !hop.moved) {
      hop.moved = true;
      // what's in their arms stays on the level they're leaving
      if (hop.down) emptyArms(); else stowCarried();
      player.g.position.copy(hop.down ? FOOT : DOCK);
      player.h = hop.down ? 0 : Math.PI; player.g.rotation.y = player.h;
      setLevel(hop.down);
      fade(false);
    }
    if (hop.t >= 0.6) { hop = null; player.held = false; armed = false; }
    return;
  }
  if (stage.n !== 3 || staging() || player.held) return;
  const p = player.g.position;
  const on = level.down ? d2xz(p, LADDER_PAD) < LADDER_PAD.r ** 2 : d2xz(p, HATCH_AT) < HATCH_R ** 2;
  // once off the ladder (or out from under the hatch), stepping back on climbs again
  if (!on) { armed = true; linger = 0; return; }
  if (!armed) return;
  linger += dt;
  if (linger >= LINGER) { linger = 0; climb(!level.down); }
}
// ---------- camera ----------
/**
 * How far the camera sits back (1 = stage 1), and how much it looks at `focus` instead of the player; `close` brings it
 * in for a moment over a new upgrade (spotlight.ts); `snap` has it go straight to the player (up or down the ladder);
 * `shake` shakes it, for a big hit in the ring seen from the watch spot (gong.ts).
 */
export const view = { zoom: 1, k: 0, focus: V(-5, 0, 6), close: 1, snap: false, shake: 0 };
/** Stage 2's map is bigger, so the camera sits a little further back. */
export const STAGE2_ZOOM = 1.2;
/** How far back the camera pulls to show the whole map during the stage-up. */
const OVERVIEW = 2.6;

// ---------- timeline ----------
type Axis = 'all' | 'y' | 'x';
interface Anim { o: Object3D; t0: number; out: boolean; axis: Axis }
interface Cue { t: number; run: () => void }
let fx: { t: number; anims: Anim[]; cues: Cue[]; kind: 2 | 3 } | null = null;
const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const back = (k: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const OUT_DUR = 0.45, IN_DUR = 0.55, END = 6.6, END3 = 6.2;
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
  const cues = fx.cues.filter(c => t >= c.t);
  fx.cues = fx.cues.filter(c => t < c.t);
  for (const c of cues) c.run();
  if (fx.kind === 3) {
    if (t >= END3) fx = null;
    return;
  }
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
    t: 0, anims, kind: 2,
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

/**
 * The gold 'dohyo' tile (paid at Mr. Fugu's hatch): stage 3. The cellar under the dock opens: the ring with its referee,
 * its champion and its crowd, the hearth room, and the prep hall with a rack and a barrel. The player goes down the
 * hatch with the show; `silent` (loading a save) leaves them where they are, and the save puts the cellar back as it was.
 */
export function enterStage3(silent: boolean) {
  stage.n = 3;
  showCellar();
  if (silent) return;
  openCellar();
  player.held = true; player.moving = false;
  fx = {
    t: 0, anims: [], kind: 3,
    cues: [
      { t: 0, run: () => { banner('Stage 2 complete', 'Floe Sushi'); confetti(); fanfare(2); } },
      { t: 1.2, run: () => fade(true) },
      {
        t: 1.7, run: () => {
          banner(null);
          emptyArms();
          player.g.position.copy(FOOT); player.h = 0; player.g.rotation.y = 0;
          setLevel(true);
          armed = false;
        },
      },
      { t: 2.0, run: () => fade(false, true) },
      { t: 2.6, run: () => { banner('Stage 3', 'The Dohyo Below'); confetti(); fanfare(3); react('upset'); } },
      {
        t: 5.6, run: () => {
          banner(null); player.held = false;
          // (a player who's not been down here before has the tutorial to show them round instead)
          if (cellarKnown()) toast('Rack the rice, salt the fish, then the pot');
        },
      },
    ],
  };
  updStage(0);
}

/** What the player had in their arms upstairs goes back where it came from (fish to the pile, rice to the terraces'
 *  stack): going down, they start the cellar with empty hands. */
function emptyArms() {
  for (const m of player.back.items.splice(0)) {
    const to = kindOf(m) === 'rice' ? fieldStack : pile;
    if (to.hasRoom()) to.put(m); else scene.remove(m);
  }
}

/**
 * The gold 'buyout' tile: Mr. Fugu takes his chips and goes, up the ladder and away, and the ring is the player's: his
 * 30% of every bowl ends and the restaurant's till comes back. He leaves something behind that points to the next job.
 */
export function finishStage3(silent: boolean) {
  buyOut();
  front.boughtOut = true;
  boss.visible = false;
  if (silent) return;
  fx = {
    t: 0, anims: [], kind: 3,
    cues: [
      { t: 0, run: () => { banner('Stage 3 complete', 'The Dohyo Below'); confetti(); fanfare(3); react('upset'); } },
      { t: 3.0, run: () => { banner(null); toast("Mr. Fugu's gone. The ring is yours."); } },
      { t: 5.5, run: () => toast('He left a matchbook behind. Stage 4 soon.') },
    ],
  };
  updStage(0);
}
