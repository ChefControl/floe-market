// Cooking at the pot (stage 3): standing at the pot, the player presses Cook; the game holds still (game.ts) and the
// camera comes in close on the real pot, framed by a hinoki cutting board (the scoreboard of the four steps along its top,
// what to do along its foot). The four steps are played on a little set built at the hearth from the game's own things:
// a block of tuna is cut on a prep board (tap as each gold line lights up under the knife), every piece it's cut into, a
// mushroom and a handful of dried rice are thrown in (drag up and let go: the nearer the pot's middle the better), salt,
// soy and miso are poured to a line (hold, let go in the band), and the stew is stirred round in the boil band (press
// the soup to take the ladle, then it follows the mouse or finger). Each step gives up to 3 stars; the 12 buy the pot a
// bonus for a while (fight.ts' showResult): bigger batches, and the cook's 70% of them. It's a bonus game and nothing
// more: it takes nothing off the ledge and cooks no batch, and the pot goes on cooking from the ledge as it always does.
// Left half way (✕), it's kept as it was (F.show, saved with the game): Cook carries it on at the same step, with the
// stars already won, so a bad start can't be thrown away and played again. Press Cook for a new one once the bonus has
// run out. A crew member or anything else standing between the camera and the set is put away until it's over. (In
// the code it's "the show".)
import { Box3, CylinderGeometry, Group, type Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, Plane, Ray, Raycaster, SphereGeometry, Vector2, Vector3 } from 'three';
import { cellar, CY, lights, POT_TOP, potMesh } from './cellar';
import { POT, POT_PAD } from './cellarPlan';
import { batchBowls, BONUS_S, BONUS_TIERS, canShow, cookBowls, F, growOpen, showResult, type ShowRun } from './fight';
import { chipsFx, pourFx, splashFx, steamFx, updFx } from './fx';
import { keyHeld } from './input';
import { newMushroom } from './items';
import { rbox } from './kit';
import { level, stage } from './layout';
import { player } from './player';
import { camera, canvasTex, G, mesh } from './render';
import { V } from './util';

// ---------- the numbers ----------
/** Seconds of each step's moving parts: the fillet's slide under the knife, and the stirring. */
const CUT_S = 4.2, STIR_S = 5, STIR_GRACE = 0.6;
/** How far off the band's middle the boil can be and still count. */
const STIR_BAND = 0.15;
/** The stew's top during the show (just under the pot's rim), and how far from the pot's middle the stew reaches. */
const STEW_Y = CY + POT_TOP - 0.06, STEW_R = 0.78;
/** The prep board's middle, in front of the hearth's ledge. */
const BOARD = V(POT.x, CY + 0.92, POT.z + 1.3);
/** How far apart a cut's ends must be from the knife (metres along the board) for a clean cut, a good one, a ragged one. */
const CLEAN = 0.024, GOOD = 0.05, RAGGED = 0.075;
/** Where the fillet's middle is from the knife as it slides under it (from, to): slow, a line about every 0.9 s. */
const CUT_FROM = 0.42, CUT_TO = -0.3;

const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- the show's camera (main.ts eases to it like the doorman's) ----------
/** How far in the show's camera is (0: the game's, 1: the show's), and where it is and looks. */
export const showCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };
type Shot = { eye: [number, number, number]; at: [number, number, number] };
/** Each step's camera, from the pot's foot (it cuts from one to the next). */
const SHOTS: Record<'wide' | 'cut' | 'throw' | 'season' | 'stir', Shot> = {
  wide: { eye: [0.3, 2.9, 3.7], at: [0, 1.0, 0.75] },
  cut: { eye: [0.32, 2.05, 2.45], at: [0, 0.86, 1.3] },
  throw: { eye: [0.15, 2.7, 3.5], at: [0, 1.1, 0.6] },
  season: { eye: [0.35, 2.95, 2.2], at: [0, 1.35, 0.15] },
  stir: { eye: [0.2, 3.4, 1.55], at: [0, 1.32, 0.02] },
};
/** Points the show's camera along `shot`; a tall, narrow screen (a phone held upright) has it stand further back. */
function aim(shot: Shot) {
  const asp = innerWidth / Math.max(1, innerHeight), back = asp < 1.25 ? 1 + (1.25 - asp) * 0.95 : 1;
  showCam.look.set(POT.x + shot.at[0], CY + shot.at[1], POT.z + shot.at[2]);
  showCam.pos.set(POT.x + shot.eye[0], CY + shot.eye[1], POT.z + shot.eye[2]).sub(showCam.look).multiplyScalar(back).add(showCam.look);
  if (S) clearShot();
}

// ---------- keeping the shot clear ----------
/** What's been put away for the show because it stood in the shot (a picker's straw hat over the board), and goes
 *  back when it's over. */
const cleared: Object3D[] = [];
/** The biggest thing (metres, any way) that's put away: people and props, never the room. */
const CLEAR_MAX = 2.6;
const bb = new Box3(), sight = new Ray(), hit = V(0, 0, 0), size = V(0, 0, 0);
/** What the shots are of: the prep board's top, the stew across the pot, and where the seasonings hang. */
const subject = () => [
  ...[-0.5, 0, 0.5].flatMap(x => [-0.18, 0.18].map(z => V(BOARD.x + x, BOARD.y + 0.05, BOARD.z + z))),
  ...[[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].map(([x, z]) => V(POT.x + x, STEW_Y + 0.05, POT.z + z)),
  V(POT.x + 0.12, CY + 1.95, POT.z + 0.2),
];
/** Puts away whatever's in the cellar between the show's camera and its set (the crew, a prop): the game holds
 *  still meanwhile, so it stays put away until gone() puts it back. */
function clearShot() {
  const eye = showCam.pos, marks = subject();
  for (const o of cellar.children) {
    if (!o.visible || o === set?.g || o === potMesh || o.name === 'potFlight' || o.name === 'potSteam') continue;
    bb.setFromObject(o);
    if (bb.isEmpty() || Math.max(...bb.getSize(size).toArray()) > CLEAR_MAX || marks.some(m => bb.containsPoint(m))) continue;
    const blocks = marks.some(m => {
      sight.set(eye, m.clone().sub(eye).normalize());
      return !!sight.intersectBox(bb, hit) && hit.distanceTo(eye) < m.distanceTo(eye) - 0.05;
    });
    if (blocks) { o.visible = false; cleared.push(o); }
  }
}

// ---------- the set ----------
/** The top of a block of bluefin tuna (items.ts' fillet face, along a loin): the dark blue skin down the far edge with
 *  its silver line and fat under it, then the red flesh with white fat in chevrons pointing along it. */
function sakuFace(c: CanvasRenderingContext2D, w: number, h: number) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#B81F3D'); g.addColorStop(0.55, '#E23A57'); g.addColorStop(1, '#C42745');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,226,232,.8)'; c.lineWidth = 2.5; c.lineCap = 'round';
  for (let x = -20; x < w + 20; x += 16) {
    c.beginPath(); c.moveTo(x, h * 0.24); c.quadraticCurveTo(x + 8, h * 0.5, x + 13, h * 0.62); c.quadraticCurveTo(x + 6, h * 0.8, x - 2, h); c.stroke();
  }
  c.fillStyle = 'rgba(255,240,242,.85)'; c.fillRect(0, h * 0.15, w, h * 0.06);
  c.fillStyle = '#6F8CB8'; c.fillRect(0, h * 0.12, w, h * 0.035);
  c.fillStyle = '#16203A'; c.fillRect(0, 0, w, h * 0.125);
}
const unlit = (c: number) => new MeshBasicMaterial({ color: c });
const STEEL = new MeshLambertMaterial({ color: 0xD6DCE1 });
/** Scales `o` to `w` × `h` × `d` (its own size measured once), lying along x. */
function fit(o: Object3D, w: number, h: number, d: number) {
  const s = new Box3().setFromObject(o).getSize(V(0, 0, 0));
  if (s.z > s.x) { o.rotation.y = Math.PI / 2; [s.x, s.z] = [s.z, s.x]; }
  o.scale.set(w / s.x, h / s.y, d / s.z);
  return o;
}
const heap = new SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), grain = new SphereGeometry(1, 6, 4);
/** A handful of rice off the drying racks: a little white heap (the racks' own mound, dried), its grains lying over it
 *  in two creams, laid round in a spiral (the same every time). */
function driedRice() {
  const g = new Group();
  add(g, mesh(heap, 0xEFE5CC, 0, 0, 0, true)).scale.set(0.09, 0.05, 0.08);
  const N = 34;
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt((i + 0.5) / N) * 0.92, a = i * 2.39996;
    const x = Math.cos(a) * r * 0.09, z = Math.sin(a) * r * 0.08, y = 0.05 * Math.sqrt(1 - r * r);
    const m = add(g, mesh(grain, i % 3 ? 0xFFFBEF : 0xF3EAD6, x, y, z));
    m.scale.set(0.014, 0.0055, 0.0065);
    m.rotation.set(0, a * 1.7, -x / 0.09 * 0.6);
  }
  return g;
}
interface Set {
  g: Group; knife: Group; fillet: Group; pieces: Object3D[]; guides: Group[];
  target: Group; shakers: Group[]; ladle: Group; bubbles: Mesh[]; floats: Object3D[]; mush: Object3D; rice: Object3D;
  /** The fillet as it's been cut, each run of pieces still joined held together, to be thrown in one at a time. */
  chunks: Group[];
}
let set: Set | null = null;
/** The set, built the first time the show's on: the prep board on its block, the knife, a fillet in four, the
 *  bubbling spot, the seasonings and a ladle. */
function build(): Set {
  const g = add(cellar, new Group());
  // the prep block and its hinoki board, standing in front of the ledge
  add(g, mesh(rbox(1.0, 0.86, 0.38, 0.04), 0x5E3B2C, BOARD.x, BOARD.y - 0.46, BOARD.z, true));
  add(g, mesh(rbox(1.16, 0.06, 0.46, 0.025), 0xBF9A64, BOARD.x, BOARD.y - 0.0, BOARD.z, true));
  add(g, mesh(rbox(1.0, 0.012, 0.03, 0.005), 0xC9AE7A, BOARD.x, BOARD.y + 0.031, BOARD.z + 0.19));
  // a red line across the board under the knife: where a gold line on the fillet wants to be when you tap
  const mark = add(g, mesh(G.box, unlit(0xD9342B), BOARD.x, BOARD.y + 0.032, BOARD.z)); mark.scale.set(0.01, 0.002, 0.44);
  // the knife: a long steel blade along the board's depth, its wooden handle towards the camera
  const knife = add(g, new Group());
  add(knife, mesh(rbox(0.022, 0.13, 0.34, 0.008), STEEL, 0, 0.065, -0.04, true));
  add(knife, mesh(rbox(0.024, 0.014, 0.34, 0.004), 0x9AA4AC, 0, 0.13, -0.04));
  add(knife, mesh(rbox(0.03, 0.04, 0.03, 0.008), 0x3E3E44, 0, 0.075, 0.145));
  add(knife, mesh(rbox(0.034, 0.046, 0.17, 0.016), 0x5B3424, 0, 0.075, 0.245, true));
  // the fillet, laid flat in four pieces end to end, and a gold line over each place to cut
  const fillet = add(g, new Group());
  // (a block off the loin, in the market fillet's colours: four pieces whose top picture runs on from one to the next)
  const { tex } = canvasTex(256, 64, sakuFace), side = new MeshLambertMaterial({ color: 0xC62F48 }), front = new MeshLambertMaterial({ color: 0xD8344F });
  const pieces = [0, 1, 2, 3].map(i => {
    const t = tex.clone(); t.repeat.set(0.25, 1); t.offset.set(i * 0.25, 0); t.needsUpdate = true;
    const m = add(fillet, mesh(rbox(0.15, 0.07, 0.17, 0.012), [side, side, new MeshLambertMaterial({ map: t }), side, front, side], (i - 1.5) * 0.15, 0.066, 0, true));
    m.userData.sc = m.scale.clone(); m.userData.ry = 0;
    return m as Object3D;
  });
  const guides = [1, 2, 3].map(j => {
    const l = add(fillet, new Group()); l.position.set((j - 2) * 0.15, 0.104, 0);
    // (each line its own paint: it lights up while it's under the knife)
    const paint = unlit(0xE8B84A);
    for (const z of [-0.07, 0, 0.07]) add(l, mesh(G.box, paint, 0, 0, z)).scale.set(0.012, 0.004, 0.045);
    l.userData.paint = paint;
    return l;
  });
  // where a throw's going to land, while it's aimed: a shadow on the stew
  const target = add(g, new Group());
  add(target, mesh(new CylinderGeometry(0.11, 0.11, 0.004, 20), new MeshBasicMaterial({ color: 0x2A1810, transparent: true, opacity: 0.35, depthWrite: false })));
  // the seasonings: a salt shaker, a bottle of soy, a tub of miso with its paddle
  const salt = new Group();
  add(salt, mesh(new CylinderGeometry(0.055, 0.06, 0.17, 12), 0xF4F1EA, 0, 0, 0, true));
  add(salt, mesh(new CylinderGeometry(0.058, 0.058, 0.04, 12), 0x8A99A6, 0, 0.1, 0));
  const soy = new Group();
  add(soy, mesh(new CylinderGeometry(0.055, 0.06, 0.2, 12), 0x3A1E14, 0, 0, 0, true));
  add(soy, mesh(new CylinderGeometry(0.025, 0.045, 0.06, 10), 0x3A1E14, 0, 0.13, 0));
  add(soy, mesh(new CylinderGeometry(0.03, 0.03, 0.04, 10), 0xC0392B, 0, 0.18, 0));
  add(soy, mesh(new CylinderGeometry(0.0565, 0.0605, 0.08, 12), 0xF4EEDF, 0, 0.0, 0));
  const miso = new Group();
  add(miso, mesh(new CylinderGeometry(0.1, 0.09, 0.09, 14), 0xB5844A, 0, 0, 0, true));
  add(miso, mesh(new CylinderGeometry(0.092, 0.092, 0.01, 14), 0xC98A3C, 0, 0.04, 0));
  add(miso, mesh(rbox(0.03, 0.2, 0.012, 0.005), 0x8A5A3B, 0.03, 0.1, 0)).rotation.z = -0.3;
  const shakers = [salt, soy, miso].map(s => add(g, s));
  // a ladle of its own, to stir with (the pot's own one is put away while the show's on)
  const ladle = add(g, new Group());
  add(ladle, mesh(G.sphere, 0x9AA4AC, 0, 0, 0)).scale.set(0.13, 0.06, 0.13);
  const handle = add(ladle, mesh(G.rope, 0x8A5A3B, 0, 0.45, 0)); handle.scale.set(1.3, 0.95, 1.3);
  // bubbles on the stew, more of them the harder it boils
  const bubbles = Array.from({ length: 12 }, () => { const b = add(g, mesh(G.sphere, 0xF6E2BE, 0, 0, 0)); b.visible = false; b.userData.t = Math.random(); return b; });
  // the mushroom and the handful of dried rice that are thrown in after the fish
  const mush = add(g, fit(newMushroom(), 0.2, 0.17, 0.2)), rice = add(g, driedRice());
  for (const o of [mush, rice]) { o.visible = false; o.userData.sc = o.scale.clone(); o.userData.ry = o.rotation.y; }
  g.visible = false;
  return { g, knife, fillet, pieces, guides, target, shakers, ladle, bubbles, floats: [], mush, rice, chunks: [] };
}

// ---------- the steps ----------
interface Step {
  name: string; kanji: string; cap: string; shot: keyof typeof SHOTS;
  stars: number; done: boolean;
  /** Holds started while the step's name is up carry on into it. */
  hold?: boolean;
  start(): void; update(dt: number): void;
  down?(x: number, y: number): void; move?(x: number, y: number): void; up?(x: number, y: number): void;
  /** Space or E (instead of the pointer). */
  key?(): void;
  /** The show's left half way: what's under way is settled as it stands (a throw in the air lands, a pour stops), so
   *  carrying on later can't play it again. */
  leave?(): void;
}
/** Each step's stars, from what it's scored (ShowRun's got): the cuts' and the pours' scores added up, the throws'
 *  averaged (however many pieces the fillet was cut into, it's three stars for all of them in the middle), and the
 *  stir's share of its seconds in the band. */
const STARS = [
  (got: number[]) => Math.round(got.reduce((a, x) => a + Math.max(0, x), 0)),
  (got: number[]) => (got.length ? Math.round(got.reduce((a, x) => a + x, 0) / got.length * 3) : 0),
  (got: number[]) => Math.round(got.reduce((a, x) => a + x, 0)),
  (got: number[]) => { const f = (got[1] ?? 0) / STIR_S; return f >= 0.75 ? 3 : f >= 0.5 ? 2 : f >= 0.25 ? 1 : 0; },
];
/** A word from the show at `at` in the world (Clean! Bullseye! Too much!): gold for a hit, red for a miss. */
function callout(text: string, at: Vector3, score: number, big = false) {
  const el = document.createElement('div');
  el.className = `shPop${score >= 1 ? ' top' : score > 0 ? '' : ' miss'}${big ? ' big' : ''}`;
  el.textContent = text;
  const p = at.clone().project(camera);
  el.style.left = `${(p.x + 1) / 2 * 100}%`; el.style.top = `${(1 - p.y) / 2 * 100}%`;
  ui.pops.append(el);
  setTimeout(() => el.remove(), 1000);
}
const shake = { t: 0 };

/** Where the fillet's pieces lie once `got`'s cuts are made: each cut opens it a little, pushing what's past it on. */
const pieceX = (got: number[], i: number) => (i - 1.5) * 0.15 - 0.03 * got.filter((g, j) => g > 0 && j >= i).length;
/** The cut: three lines, each cut or missed once (`got`: their scores, -1 for one still to come, kept by the run). Left
 *  half way, what's cut stays cut and what's missed stays missed; the fillet comes back along for the lines still to
 *  come. */
function cutStep(s: Set, got: number[]): Step {
  const cuts = [0, 1, 2].map(j => ({ done: got[j] >= 0, cut: got[j] > 0, score: Math.max(0, got[j]) }));
  const mark = (j: number, score: number) => { const c = cuts[j]; c.done = true; c.cut = score > 0; c.score = score; got[j] = score; };
  let t = 0, chop = 0, end = 0;
  const knifeX = BOARD.x;
  const filletX = () => BOARD.x + lerp(CUT_FROM, CUT_TO, clamp(t / CUT_S, 0, 1));
  const lineX = (j: number) => filletX() + (j - 1) * 0.15;
  function tap() {
    if (chop > 0.4) return;
    chop = 1;
    const open = cuts.map((c, j) => ({ c, j })).filter(x => !x.c.done);
    if (!open.length) return;
    let best = open[0], err = Infinity;
    for (const o of open) { const e = Math.abs(lineX(o.j) - knifeX); if (e < err) { err = e; best = o; } }
    const at = V(knifeX, BOARD.y + 0.1, BOARD.z);
    if (err >= RAGGED) { callout('Miss', at, 0); return; }
    const c = best.c;
    mark(best.j, err < CLEAN ? 1 : err < GOOD ? 0.6 : 0.2);
    callout(c.score === 1 ? 'Clean!' : c.score > 0.5 ? 'Good' : 'Ragged', at, c.score, c.score === 1);
    chipsFx(at);
    shake.t = 0.12;
    s.guides[best.j].visible = false;
  }
  return {
    name: 'Cut', kanji: '切', cap: 'Tap when a gold line lights up', shot: 'cut', stars: 0, done: false,
    start() {
      s.fillet.visible = s.knife.visible = true;
      s.pieces.forEach((p, i) => { p.visible = true; p.position.set((i - 1.5) * 0.15, 0.066, 0); p.rotation.set(0, 0, 0); });
      s.guides.forEach((l, j) => { l.visible = !cuts[j].done; });
      s.fillet.position.set(filletX(), BOARD.y, BOARD.z);
      s.knife.position.set(knifeX, BOARD.y + 0.2, BOARD.z);
    },
    update(dt) {
      t += dt; chop = Math.max(0, chop - dt * 5.5);
      s.fillet.position.x = filletX();
      // (a cut opens the fillet there: the slice that's through the knife is pushed on away from it, and what's still to
      // cut stays put, so the next line comes up to the knife just as it was going to)
      s.pieces.forEach((p, i) => { p.position.x = pieceX(got, i); });
      // the knife comes down and goes back up
      s.knife.position.y = BOARD.y + 0.035 + 0.17 * (1 - Math.sin((1 - chop) * Math.PI) * (chop > 0 ? 1 : 0));
      cuts.forEach((c, j) => { if (!c.done && lineX(j) < knifeX - RAGGED) { mark(j, 0); callout('Missed', V(knifeX, BOARD.y + 0.1, BOARD.z), 0); } });
      // a line under the knife, near enough for a good cut, lights up and stands out: tap now
      s.guides.forEach((l, j) => {
        const lit = !cuts[j].done && Math.abs(lineX(j) - knifeX) < GOOD;
        (l.userData.paint as MeshBasicMaterial).color.setHex(lit ? 0xFFF8DC : 0xE8B84A);
        l.scale.set(lit ? 1.8 : 1, lit ? 2.5 : 1, 1);
      });
      if (cuts.every(c => c.done)) { if ((end += dt) > 0.5) this.done = true; }
      else if (t > CUT_S + 0.3) { cuts.forEach((c, j) => { if (!c.done) mark(j, 0); }); this.done = true; }
      if (this.done) this.stars = STARS[0](got);
    },
    down: tap,
  };
}

/** The fillet in the pieces `cut` cut it into (a missed line leaves its two pieces joined, thrown as one), each run held
 *  together where it lies on the board, left of the knife. */
function chunksOf(s: Set, cut: number[]) {
  s.chunks.forEach(c => c.removeFromParent());
  s.fillet.visible = true;
  s.fillet.position.set(BOARD.x, BOARD.y, BOARD.z);
  const runs: number[][] = [[0]];
  for (let i = 1; i < 4; i++) { if (cut[i - 1] > 0) runs.push([i]); else runs[runs.length - 1].push(i); }
  // (laid out from the board's left end, a hand's width apart, so it's plain how many there are)
  let at = -0.55;
  s.chunks = runs.map(run => {
    const c = add(s.fillet, new Group()), len = run.length * 0.15;
    c.position.set(at + len / 2, 0, 0); at += len + 0.05;
    run.forEach((i, k) => { const p = s.pieces[i]; c.add(p); p.visible = true; p.position.set((k - (run.length - 1) / 2) * 0.15, 0.066, 0); p.rotation.set(0, p.userData.ry, 0); });
    c.userData.len = len;
    return c;
  });
  return s.chunks;
}
/** The throw: every piece the fillet was cut into, then a mushroom (once the grow room's open) and a handful of dried
 *  rice, one after another (`got`: each one's score, kept by the run, so carrying on starts at the next one). */
function throwStep(s: Set, cut: number[], got: number[]): Step {
  let items: Object3D[] = [];
  let i = got.length, t = 0, wait = 0;
  let st: 'ready' | 'fly' | 'wait' = 'ready';
  let drag: { x: number; y: number } | null = null, fly: { a: Vector3; b: Vector3; t: number } | null = null;
  /** Where each one waits to be thrown: right of the fillet, on the board (a long piece a little further in). */
  const rest = (o: Object3D) => V(BOARD.x + Math.min(0.3, 0.55 - (o.userData.len ?? 0.15) / 2), BOARD.y + 0.07, BOARD.z + 0.05);
  const put = (o: Object3D) => {
    // (out of the fillet's group and onto the set where it is, so it can fly)
    const w = o.getWorldPosition(V(0, 0, 0));
    s.g.add(o); o.position.copy(w); o.visible = true;
  };
  /** Floats `o` on the stew at `at`, bobbing. */
  const afloat = (o: Object3D, at: { x: number; z: number }) => {
    if (o.parent !== s.g) put(o);
    o.position.set(at.x, STEW_Y + 0.02, at.z); o.rotation.set(0, Math.random() * 6, 0);
    s.floats.push(o);
  };
  function next() {
    if (i >= items.length) { this_.stars = STARS[1](got); this_.done = true; return; }
    const o = items[i];
    put(o);
    o.position.copy(rest(o));
    st = 'ready';
  }
  /** The one in the air comes down where it was aimed: in the pot, and the nearer its middle the better. */
  function land() {
    if (!fly) return;
    const o = items[i], d = Math.hypot(fly.b.x - POT.x, fly.b.z - POT.z) / STEW_R, inPot = d < 1;
    const sc = !inPot ? 0 : d < 0.35 ? 1 : 0.6;
    got.push(sc);
    callout(sc === 1 ? 'Bullseye!' : sc ? 'In!' : 'Splash!', fly.b.clone().setY(STEW_Y + 0.25), sc, sc === 1);
    if (inPot) { splashFx({ x: fly.b.x, z: fly.b.z }, STEW_Y); afloat(o, fly.b); } else o.visible = false;
    fly = null;
    st = 'wait'; wait = 0.45;
  }
  const this_: Step = {
    name: 'Throw', kanji: '投', cap: 'Drag up, let go into the pot', shot: 'throw', stars: 0, done: false,
    start() {
      s.target.visible = false; s.knife.visible = false;
      items = [...chunksOf(s, cut), ...(growOpen() ? [s.mush] : []), s.rice];
      // (carrying on: what's in already floats on the stew, what splashed is gone)
      items.slice(0, i).forEach((o, j) => {
        if (got[j] > 0) { const a = Math.random() * 6, r = Math.random() * 0.4; afloat(o, { x: POT.x + Math.cos(a) * r, z: POT.z + Math.sin(a) * r }); } else o.visible = false;
      });
      next();
    },
    update(dt) {
      t += dt;
      const o = items[Math.min(i, items.length - 1)];
      if (st === 'fly' && fly) {
        fly.t = Math.min(1, fly.t + dt / 0.55);
        const k = fly.t;
        o.position.lerpVectors(fly.a, fly.b, k); o.position.y += Math.sin(k * Math.PI) * 0.55;
        o.rotation.x += dt * 9; o.rotation.z += dt * 5;
        if (k >= 1) land();
      } else if (st === 'wait' && (wait -= dt) <= 0) { i++; next(); }
      else if (st === 'ready' && !drag) o.position.y = rest(o).y + Math.abs(Math.sin(t * 5)) * 0.03;
      // what's floating bobs on the stew
      s.floats.forEach((f, j) => { f.position.y = STEW_Y + 0.02 + Math.sin(t * 2 + j) * 0.01; });
    },
    down(x, y) { if (st === 'ready') drag = { x, y }; },
    move(x, y) {
      if (!drag || st !== 'ready') return;
      // (the piece follows the finger a little, up off the board, and its shadow shows where it'd land)
      const o = items[i], r = rest(o), dy = clamp((drag.y - y) / innerHeight, 0, 0.2);
      o.position.set(r.x + clamp((x - drag.x) / innerWidth, -0.15, 0.15) * 0.8, r.y + dy * 0.6, r.z - dy * 0.4);
      const b = y < drag.y - 14 ? onStew(drag.x + (x - drag.x) * 2.7, drag.y + (y - drag.y) * 2.7) : null;
      s.target.visible = !!b && Math.hypot(b.x - POT.x, b.z - POT.z) < STEW_R;
      if (b) s.target.position.set(b.x, STEW_Y + 0.012, b.z);
    },
    up(x, y) {
      if (!drag || st !== 'ready') { drag = null; return; }
      const dx = x - drag.x, dy = y - drag.y, from = drag, r = rest(items[i]);
      drag = null; s.target.visible = false;
      // where the drag points, carried on 2.7 times as far
      if (dy > -14) { items[i].position.copy(r); callout('Drag it up', r.setY(r.y + 0.2), 0.5); return; }
      const b = onStew(from.x + dx * 2.7, from.y + dy * 2.7);
      if (!b) return;
      fly = { a: items[i].position.clone(), b, t: 0 };
      st = 'fly';
    },
    leave() {
      land();
      if (got.length >= items.length) { this_.stars = STARS[1](got); this_.done = true; }
    },
  };
  return this_;
}

interface Season { name: string; color: number; size: number; c: number; level: number; score: number | null }
/** The seasoning: salt, soy and miso, each poured to its line once (`got`: their scores; `lines`: where the lines are,
 *  rolled once a show, both kept by the run). */
function seasonStep(s: Set, got: number[], lines: number[]): Step {
  for (let j = lines.length; j < 3; j++) lines.push(rnd(0.42, 0.78));
  const kinds: Season[] = [['Salt', 0xFFFFFF, 0.014], ['Soy', 0x3A1E14, 0.02], ['Miso', 0xB8772F, 0.03]].map(([name, color, size], j) =>
    ({ name: name as string, color: color as number, size: size as number, c: lines[j], level: 0, score: got[j] ?? null }));
  let i = got.length, held = 0, wait = 0, tilt = 0;
  let st: 'ready' | 'pour' | 'wait' = 'ready';
  const HANG = V(POT.x + 0.12, CY + 1.95, POT.z + 0.2);
  const show = () => { s.shakers.forEach((m, j) => { m.visible = j === i; m.position.copy(HANG); m.rotation.set(0, 0, 0); }); meter(kinds[i]); };
  function stop() {
    if (st !== 'pour') return;
    const k = kinds[i], d = Math.abs(k.level - k.c);
    k.score = d < 0.025 ? 1 : d < 0.07 ? 0.6 : d < 0.13 ? 0.2 : 0;
    got.push(k.score);
    callout(k.score === 1 ? 'Perfect!' : k.score > 0.5 ? 'Good' : k.score > 0 ? 'A bit off' : k.level > k.c ? 'Too much!' : 'Too little',
      V(POT.x, STEW_Y + 0.35, POT.z), k.score, k.score === 1);
    st = 'wait'; wait = 0.6;
  }
  return {
    name: 'Season', kanji: '味', cap: 'Hold to pour, let go in the band', shot: 'season', stars: 0, done: false, hold: true,
    start() { s.target.visible = false; show(); },
    update(dt) {
      const k = kinds[i], m = s.shakers[i];
      tilt = lerp(tilt, st === 'pour' ? 1 : 0, Math.min(1, dt * 12));
      m.rotation.z = tilt * 2.3; m.position.y = HANG.y + tilt * 0.08;
      if (st === 'pour') {
        held += dt;
        k.level = Math.min(1, k.level + (0.16 + 0.6 * held) * dt);
        const mouth = V(0, 0.13, 0).applyEuler(m.rotation).add(m.position);
        pourFx(mouth, k.color, k.name === 'Salt' ? 3 : 2, k.size);
        if (k.level >= 1) stop();
      } else if (st === 'wait' && (wait -= dt) <= 0) {
        i++; held = 0; tilt = 0;
        if (i >= kinds.length) { this.stars = STARS[2](got); this.done = true; meter(null); s.shakers.forEach(x => { x.visible = false; }); }
        else { st = 'ready'; show(); }
      }
      if (!this.done) meter(kinds[i]);
    },
    down() { if (st === 'ready') { st = 'pour'; held = 0; } },
    up: stop,
    leave() {
      stop();
      if (got.length >= kinds.length) { this.stars = STARS[2](got); this.done = true; }
    },
  };
}

/** The stir: five seconds of circling in the band, from the first press on the soup (`got`: the seconds stirred and the
 *  seconds of them in the band, kept by the run: carrying on, the ladle's taken up again and the clock goes on). */
function stirStep(s: Set, got: number[]): Step {
  if (got.length < 2) got.splice(0, got.length, 0, 0);
  let acc = 0, speed = 0, last: number | null = null, ang = -Math.PI / 2, on = false, swirl = 0, puff = 0, idle = 0, spin = 0;
  const fill = potMesh.getObjectByName('potFill')!;
  const toScreen = (x: number, z: number) => { const p = V(x, STEW_Y, z).project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; };
  const centre = () => toScreen(POT.x, POT.z);
  // (the band drifts a little and slowly, and it's wide: a finger's circles are never even)
  const band = () => 0.5 + Math.sin(got[0] * 0.8) * 0.08;
  const this_: Step = {
    name: 'Stir', kanji: '混', cap: 'Press the soup, then circle round', shot: 'stir', stars: 0, done: false,
    start() { s.ladle.visible = true; boil(0, band(), ''); },
    update(dt) {
      idle += dt;
      // (nothing counts till the ladle's been taken up, on the soup)
      if (on) got[0] += dt;
      const t = got[0];
      const inst = acc / Math.max(dt, 1e-3); acc = 0;
      // (smoothed over about half a second, so an uneven circle or a frame without a move doesn't jolt the boil)
      speed += (inst - speed) * Math.min(1, dt * 2);
      speed *= Math.exp(-dt * 0.3);
      // (full boil at 1.6 turns a second: the band's middle, under one, is a pace a mouse keeps up too)
      const lv = clamp(speed / (Math.PI * 2 * 1.6), 0, 1.15), c = band(), ok = Math.abs(lv - c) < STIR_BAND;
      if (on && t > STIR_GRACE && t <= STIR_GRACE + STIR_S && ok) got[1] += dt;
      boil(lv, c, !on ? '' : t > STIR_GRACE ? (ok ? 'Nice simmer' : lv < c ? 'Faster!' : 'Boiling over!') : '');
      // the ladle goes round with the finger, the stew turns with it, and it bubbles and steams the harder it boils (and
      // till it's taken up, it bobs where it lies, asking to be)
      if (last == null) ang += speed * dt;
      swirl += speed * dt * 0.35;
      fill.rotation.y = -swirl;
      s.ladle.position.set(POT.x + Math.cos(ang) * 0.42, STEW_Y + 0.02 + (on ? 0 : Math.abs(Math.sin(idle * 4)) * 0.05), POT.z + Math.sin(ang) * 0.42);
      s.ladle.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5);
      s.bubbles.forEach((b, j) => {
        b.userData.t += dt * (0.6 + lv * 2.5);
        const k = b.userData.t % 1, a = j * 2.4 + Math.floor(b.userData.t) * 1.7, r = 0.15 + ((j * 0.37 + Math.floor(b.userData.t) * 0.23) % 0.55);
        b.visible = j < 3 + lv * 9;
        b.position.set(POT.x + Math.cos(a) * r, STEW_Y + 0.01, POT.z + Math.sin(a) * r);
        b.scale.setScalar(0.035 * Math.sin(k * Math.PI));
      });
      if ((puff -= dt) <= 0) { puff = 0.35 - lv * 0.25; steamFx(V(POT.x, STEW_Y + 0.1, POT.z), lv > 0.85 ? 3 : 1); }
      if (t >= STIR_GRACE + STIR_S) {
        this_.stars = STARS[3](got);
        callout(`${Math.round(got[1] / STIR_S * 100)}% in the band`, V(POT.x, STEW_Y + 0.4, POT.z), this_.stars / 3, this_.stars === 3);
        this_.done = true; boil(null);
      }
    },
    down(x, y) {
      // (the first press has to be on the soup: that's where the ladle is)
      if (!on) {
        const b = onStew(x, y);
        if (!b || Math.hypot(b.x - POT.x, b.z - POT.z) > STEW_R) { callout('On the soup!', V(POT.x, STEW_Y + 0.3, POT.z), 0.5); return; }
        on = true;
      }
      const c = centre();
      last = Math.hypot(x - c.x, y - c.y) > 4 ? Math.atan2(y - c.y, x - c.x) : null;
    },
    move(x, y) {
      if (!on) return;
      const c = centre(), a = Math.atan2(y - c.y, x - c.x);
      // (right over the middle the angle swings wildly for a tiny move: it doesn't count there)
      if (Math.hypot(x - c.x, y - c.y) < 24) { last = null; return; }
      if (last == null) { last = a; return; }
      let d = a - last;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      acc += Math.min(Math.abs(d), 1); last = a;
      // (the screen's y runs down, the world's z towards the camera: the same way round)
      ang = a;
    },
    // (letting go doesn't stop it: the ladle goes on following the mouse; a finger lifted just leaves it there)
    up() { /* the next press picks the ladle up where it's pointed */ },
    // (each press of the key takes the ladle a step round, on the soup half way out)
    key() {
      const c = centre(), e = toScreen(POT.x + STEW_R / 2, POT.z), r = Math.max(30, Math.hypot(e.x - c.x, e.y - c.y));
      this_.down!(c.x + Math.cos(spin) * r, c.y + Math.sin(spin) * r);
      spin += 1.4;
      this_.move!(c.x + Math.cos(spin) * r, c.y + Math.sin(spin) * r);
    },
  };
  return this_;
}

// ---------- the broadcast's frame ----------
const $ = (id: string) => document.getElementById(id)!;
const ui = {
  root: $('show'), steps: $('showSteps'), banner: $('showBanner'), pops: $('showPops'), cap: $('showCap'),
  meter: $('showMeter'), boil: $('showBoil'), card: $('showCard'), intro: $('showIntro'), btn: $('cook') as HTMLButtonElement,
  bonus: $('potBonus'),
};
const SEAS = ['Salt', 'Soy', 'Miso'];
function meter(k: Season | null) {
  ui.meter.hidden = !k;
  if (!k) return;
  ui.meter.style.setProperty('--c', String(k.c)); ui.meter.style.setProperty('--lv', String(k.level));
  ui.meter.dataset.k = k.name;
  ui.meter.querySelector('b')!.textContent = k.name;
  ui.meter.querySelectorAll('i.dot').forEach((d, j) => { (d as HTMLElement).dataset.on = String(SEAS[j] === k.name); });
}
function boil(lv: number | null, c = 0.5, msg = '') {
  ui.boil.hidden = lv == null;
  if (lv == null) return;
  ui.boil.style.setProperty('--lv', String(Math.min(1.1, lv) / 1.1)); ui.boil.style.setProperty('--c', String(c / 1.1));
  ui.boil.dataset.ok = String(Math.abs(lv - c) < STIR_BAND);
  ui.boil.querySelector('b')!.textContent = msg;
}
function scoreboard() {
  if (!S) return;
  ui.steps.innerHTML = S.steps.map((st, j) => {
    const on = j === S!.i && (S!.phase === 'banner' || S!.phase === 'play'), done = st.done;
    return `<li class="${on ? 'on' : ''}${done ? ' done' : ''}"><span class="k">${st.kanji}</span><span class="n">${st.name}</span><span class="st">${'★'.repeat(done ? st.stars : 0)}${'☆'.repeat(done ? 3 - st.stars : 3)}</span></li>`;
  }).join('');
}
function bannerFor(st: Step) {
  ui.banner.querySelector('.k')!.textContent = st.kanji;
  ui.banner.querySelector('.w')!.textContent = `${st.name}!`;
  ui.banner.classList.remove('show'); void ui.banner.offsetWidth; ui.banner.classList.add('show');
}

// ---------- the run ----------
const keyWas = V(0, 0, 0);
type Phase = 'in' | 'intro' | 'banner' | 'play' | 'after' | 'result' | 'out';
/** The show on screen: where it is, its steps, and the run they keep their scores in (F.show once it's begun). */
let S: { phase: Phase; t: number; i: number; steps: Step[]; downSent: boolean; run: ShowRun } | null = null;
/** Whether the show's on (the game holds still: game.ts), easing out included. */
export const showing = () => !!S;

/** A run from the start: no step played, no line cut yet. */
const freshRun = (): ShowRun => ({ step: 0, got: [[-1, -1, -1], [], [], []], lines: [] });
/** Starts the show, or carries on the one left half way (F.show): the game holds still, and the camera cuts in to the
 *  pot. It takes nothing: it's played for the bonus alone. */
export function startShow() {
  if (S || !canShow()) return false;
  set ??= build();
  const s = set;
  s.g.visible = true;
  [s.knife, s.fillet, s.target, s.ladle, ...s.shakers].forEach(o => { o.visible = false; });
  s.floats.length = 0;
  // the pieces back in the fillet, whole, and the rest off the stew
  s.pieces.forEach((p, i) => { s.fillet.add(p); p.position.set((i - 1.5) * 0.15, 0.066, 0); p.rotation.set(0, p.userData.ry, 0); p.scale.copy(p.userData.sc); });
  s.chunks.forEach(c => c.removeFromParent()); s.chunks = [];
  for (const o of [s.mush, s.rice]) { o.visible = false; o.rotation.set(0, o.userData.ry, 0); o.scale.copy(o.userData.sc); }
  const was = F.show, run = was ?? freshRun(), g = run.got;
  const steps = [cutStep(s, g[0]), throwStep(s, g[0], g[1]), seasonStep(s, g[2], run.lines), stirStep(s, g[3])];
  // (carrying on: the steps already played are done, their stars as they were)
  steps.forEach((st, j) => { if (j < run.step) { st.done = true; st.stars = STARS[j](g[j]); } });
  S = { phase: 'in', t: 0, i: run.step, steps, downSent: false, run };
  aim(SHOTS.wide);
  // the pot full of stew for the camera, its ladle and tag put away, the player out of the shot
  const fill = potMesh.getObjectByName('potFill')!;
  fill.visible = true; fill.position.y = STEW_Y - CY - POT_TOP; fill.scale.set(1, 1, 1);
  for (const n of ['potLadle', 'potTally', 'potCord']) { const o = potMesh.getObjectByName(n); if (o) o.visible = false; }
  const pad = cellar.getObjectByName('potPad'); if (pad) pad.visible = false;
  // (and what would hang frozen in the air while the game holds still: bowls on their way to the counter, the steam)
  cellar.children.forEach(o => { if (o.name === 'potFlight' || o.name === 'potSteam') o.visible = false; });
  player.g.visible = false;
  // (the hearth's fire light hangs right over the prep board: up and back it goes, as the show's key light)
  keyWas.copy(lights[3].position);
  lights[3].position.set(POT.x + 0.7, CY + 2.7, POT.z + 2.9);
  document.body.classList.add('show');
  ui.root.hidden = false; ui.card.hidden = true; ui.intro.hidden = false;
  ui.cap.textContent = 'The game waits while you cook';
  const sofar = steps.reduce((a, st) => a + (st.done ? st.stars : 0), 0);
  ui.intro.querySelector('.sub')!.textContent = was
    ? `★ ${sofar} so far · ${steps[Math.min(run.step, steps.length - 1)].name} next`
    : '🔪 Cut · 🐟 Throw · 🧂 Season · 🥄 Stir';
  ui.intro.querySelector('.bonus')!.textContent = `Up to +${BONUS_TIERS[0].pct}% bowls for ${BONUS_S} s`;
  $('showGo').textContent = was ? 'Carry on' : 'Start';
  meter(null); boil(null);
  scoreboard();
  return true;
}
function begin() {
  if (!S) return;
  // (it's kept from here on: leaving now carries on later from where it was left)
  F.show = S.run;
  if (S.i >= S.steps.length) { S.i = S.steps.length - 1; finish(); return; }
  const st = S.steps[S.i];
  S.phase = 'banner'; S.t = 0; S.downSent = false;
  aim(SHOTS[st.shot]);
  ui.cap.textContent = st.cap;
  st.start();
  scoreboard(); bannerFor(st);
}
function finish() {
  if (!S) return;
  S.phase = 'result'; S.t = 0;
  const total = S.steps.reduce((a, st) => a + st.stars, 0), tier = showResult(total);
  aim(SHOTS.wide);
  ui.cap.textContent = `${total} of 12 stars`;
  ui.card.hidden = false;
  ui.card.querySelector('.stars')!.textContent = `★ ${total} / 12`;
  ui.card.querySelector('.tier')!.textContent = tier.name;
  ui.card.querySelector('.bonus')!.textContent = tier.pct ? `+${tier.pct}% bowls · ${BONUS_S} s` : 'No bonus this time';
  ui.card.querySelector('.sub')!.textContent = tier.pct ? `🍲 ${batchBowls()} a batch${F.hires.cook ? ` · 👨‍🍳 ${cookBowls()}` : ''}` : 'Cook again any time';
  const hanko = ui.card.querySelector('.hanko')!;
  hanko.textContent = tier.pct >= 50 ? '極' : tier.pct >= 35 ? '旨' : tier.pct ? '良' : '薄';
  hanko.classList.remove('show'); void (hanko as HTMLElement).offsetWidth; hanko.classList.add('show');
  scoreboard();
}
/** Ends the show: the camera eases back out to the player. Left half way, it's kept (F.show) as it stands, what's in
 *  the air settled, to carry on from at the same step. */
export function stopShow() {
  if (!S || S.phase === 'out') return;
  if (S.phase === 'play') {
    const st = S.steps[S.i];
    st.leave?.();
    if (st.done) S.run.step = S.i + 1;
  }
  S.phase = 'out'; S.t = 0;
  ui.root.hidden = true;
  document.body.classList.remove('show');
  meter(null); boil(null);
}
function gone() {
  const s = set!;
  s.g.visible = false;
  for (const n of ['potLadle', 'potTally', 'potCord']) { const o = potMesh.getObjectByName(n); if (o) o.visible = true; }
  const pad = cellar.getObjectByName('potPad'); if (pad) pad.visible = true;
  cellar.children.forEach(o => { if (o.name === 'potFlight') o.visible = true; });
  potMesh.getObjectByName('potFill')!.rotation.y = 0;
  player.g.visible = true;
  // (and what was put away for the camera)
  cleared.splice(0).forEach(o => { o.visible = true; });
  lights[3].position.copy(keyWas);
  showCam.k = 0;
  S = null;
}

/** Moves the show on by `dt` (instead of the game, while it's on: game.ts). */
export function updShow(dt: number) {
  if (!S) return;
  S.t += dt;
  updFx(dt);
  shake.t = Math.max(0, shake.t - dt);
  if (S.phase === 'in') { showCam.k = Math.min(1, S.t / 0.5); if (S.t >= 0.5) { S.phase = 'intro'; S.t = 0; } return; }
  if (S.phase === 'out') { showCam.k = Math.max(0, 1 - S.t / 0.5); if (S.t >= 0.5) gone(); return; }
  showCam.k = 1;
  const st = S.steps[S.i];
  if (S.phase === 'banner' && S.t > 0.85) {
    S.phase = 'play'; S.t = 0;
    if (pressed && st.hold) { S.downSent = true; st.down?.(innerWidth / 2, innerHeight / 2); }
  } else if (S.phase === 'play') {
    st.update(dt);
    if (st.done) { S.phase = 'after'; S.t = 0; S.run.step = S.i + 1; scoreboard(); }
  } else if (S.phase === 'after' && S.t > 0.9) {
    S.i++;
    if (S.i >= S.steps.length) { S.i = S.steps.length - 1; finish(); } else begin();
  }
}
/** The camera's little jolt on a chop (main.ts adds it). */
export const showShake = () => (shake.t > 0 ? shake.t * 0.08 : 0);

// ---------- the Cook button, and the bonus on the HUD ----------
let eWas = false;
const atPot = () => stage.n === 3 && level.down && Math.hypot(player.g.position.x - POT_PAD.x, player.g.position.z - POT_PAD.z) < POT_PAD.r;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
/** Shows the Cook button while the player's at the pot (pressing E there works too), and the bonus while it lasts. */
export function updCookButton() {
  const here = atPot() && !S, ready = canShow();
  ui.btn.hidden = !here;
  if (here) {
    ui.btn.disabled = !ready;
    // (waiting out the bonus)
    ui.btn.querySelector('b')!.textContent = ready ? 'Cook' : mmss(F.bonus.t);
  }
  const e = keyHeld('e');
  if (here && ready && e && !eWas) startShow();
  eWas = e;
  const on = stage.n === 3 && F.bonus.t > 0;
  ui.bonus.hidden = !on;
  if (on) ui.bonus.querySelector('.v')!.textContent = `+${F.bonus.pct}% · ${mmss(F.bonus.t)}`;
}
ui.btn.addEventListener('click', () => { if (atPot()) startShow(); });

// ---------- input ----------
const ray = new Raycaster(), ndc = new Vector2(), stew = new Plane(V(0, 1, 0), -STEW_Y);
/** Where a point on the screen falls on the stew's surface. */
function onStew(x: number, y: number) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(stew, V(0, 0, 0));
}
let pressed = false;
const play = $('showPlay');
play.addEventListener('pointerdown', e => {
  // (the cards' buttons are pressed as buttons)
  if (!S || (e.target as Element).closest('.shCard')) return;
  pressed = true;
  try { play.setPointerCapture(e.pointerId); } catch { /* a pointer that's already gone */ }
  e.preventDefault();
  if (S.phase === 'play') { S.downSent = true; S.steps[S.i].down?.(e.clientX, e.clientY); }
});
// (moves and lets-go are heard anywhere on the screen, the step bar above too: the stir's ladle follows the mouse with
// no button held, so nothing captures it there)
addEventListener('pointermove', e => {
  if (S?.phase !== 'play') return;
  const st = S.steps[S.i];
  if (pressed && !S.downSent && st.hold) { S.downSent = true; st.down?.(e.clientX, e.clientY); }
  st.move?.(e.clientX, e.clientY);
});
const lift = (e: PointerEvent) => {
  if (!pressed) return;
  pressed = false;
  if (S?.phase === 'play' && S.downSent) S.steps[S.i].up?.(e.clientX, e.clientY);
};
addEventListener('pointerup', lift);
addEventListener('pointercancel', lift);
// the keyboard: Space (or E) taps, holds and stirs; it starts the show from its ready card too
addEventListener('keydown', e => {
  if (!S || (e.code !== 'Space' && e.code !== 'KeyE')) return;
  e.preventDefault();
  if (e.repeat) return;
  if (S.phase === 'intro') { $('showGo').click(); return; }
  if (S.phase !== 'play') return;
  const st = S.steps[S.i];
  if (st.key) st.key();
  else st.down?.(innerWidth / 2, innerHeight / 2);
});
addEventListener('keyup', e => {
  if (S?.phase !== 'play' || (e.code !== 'Space' && e.code !== 'KeyE')) return;
  const st = S.steps[S.i];
  if (st.name === 'Season') st.up?.(0, 0);
});
$('showGo').addEventListener('click', () => { if (S?.phase === 'intro') { ui.intro.hidden = true; begin(); } });
$('showShut').addEventListener('click', stopShow);
$('showBack').addEventListener('click', stopShow);

/** For tests: where the show is. */
export const showState = () => (S ? { phase: S.phase, step: S.steps[S.i]?.name, stars: S.steps.map(s => s.stars), run: structuredClone(S.run), hidden: cleared.length } : null);
export { BONUS_TIERS };
