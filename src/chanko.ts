// Cooking at the pot (stage 3): standing at the pot, the player presses Cook; the game holds still (game.ts) and the
// camera comes in close on the real pot, framed by a hinoki cutting board (the scoreboard of the four steps along its top,
// what to do along its foot). The four steps are played on a little set built at the hearth from the game's own things,
// over a stew of its own that answers everything done to it: a napa cabbage, a carrot, a block of tofu and a block of
// tuna slide along a long prep board under the knife (tap as each gold line lights up under it), the cut pieces hopping
// into a basket; they're thrown in one by one, then a mushroom and a handful of dried rice (drag up and let go: the
// nearer the pot's middle the better), and sink into the stew; salt, soy and miso are
// poured to a line (hold, let go in the band), each turning the stew its colour from where it goes in; and the stew is
// stirred round in the boil band (press the soup to take the ladle, then it follows the mouse or finger), whirling with
// the ladle, and what went in comes back up. Each step gives up to 3 stars; the 12 buy the pot a bonus for a while
// (fight.ts' showResult): bigger batches, and the cook's 70% of them. It's a bonus game and nothing more: it takes
// nothing off the ledge and cooks no batch, and the pot goes on cooking from the ledge as it always does. Left half way
// (✕), it's kept as it was (F.show, saved with the game): Cook carries it on at the same step, with the stars already
// won, so a bad start can't be thrown away and played again. Press Cook for a new one once the bonus has run out. A crew
// member or anything else standing between the camera and the set is put away until it's over. (In the code it's "the
// show".)
import {
  Box3, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  MeshPhongMaterial, type Object3D, Plane, Ray, Raycaster, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
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
/** Seconds of the stirring (after a moment to get going). */
const STIR_S = 5, STIR_GRACE = 0.6;
/** How fast the row slides under the knife (metres a second): a line about every 0.9 s along the fish. */
const CUT_V = 0.72 / 4.2;
/** How far off the band's middle the boil can be and still count. */
const STIR_BAND = 0.15;
/** The stew's top during the show (just under the pot's rim), and how far from the pot's middle the stew reaches. */
const STEW_Y = CY + POT_TOP - 0.06, STEW_R = 0.78;
/** The prep board's middle, in front of the hearth's ledge. */
const BOARD = V(POT.x, CY + 0.92, POT.z + 1.3);
/** How far apart a cut's ends must be from the knife (metres along the board) for a clean cut, a good one, a ragged one. */
const CLEAN = 0.024, GOOD = 0.05, RAGGED = 0.075;

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
  ...[-0.8, -0.5, 0, 0.5].flatMap(x => [-0.18, 0.18].map(z => V(BOARD.x + x, BOARD.y + 0.05, BOARD.z + z))),
  ...[[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].map(([x, z]) => V(POT.x + x, STEW_Y + 0.05, POT.z + z)),
  V(POT.x + 0.12, CY + 1.95, POT.z + 0.2),
];
/** Where the long prep board and its stand stand (nothing's to be in them). */
const boardBox = () => new Box3(V(BOARD.x + BOARD_L - 0.02, BOARD.y - 0.9, BOARD.z - 0.25), V(BOARD.x + BOARD_R + 0.02, BOARD.y + 0.3, BOARD.z + 0.25));
/** Puts away whatever's in the cellar between the show's camera and its set (the crew, a prop), or standing where its
 *  long board is (what's on the ledge behind it): the game holds still meanwhile, so it stays put away until gone()
 *  puts it back. */
function clearShot() {
  const eye = showCam.pos, marks = subject(), board = boardBox();
  for (const o of cellar.children) {
    if (!o.visible || o === set?.g || o === potMesh || o.name === 'potFlight' || o.name === 'potSteam') continue;
    bb.setFromObject(o);
    if (bb.isEmpty() || Math.max(...bb.getSize(size).toArray()) > CLEAR_MAX) continue;
    if (bb.intersectsBox(board)) { o.visible = false; cleared.push(o); continue; }
    if (marks.some(m => bb.containsPoint(m))) continue;
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
// ---------- what's cut ----------
type Cut = 'cabbage' | 'carrot' | 'tofu' | 'fish';
/** What's laid on the board, in the order it comes under the knife: what goes in the stew with the fish (a napa
 *  cabbage, a carrot, a block of tofu: the stew's own cabbage, carrot and tofu), then the block of tuna; each in `n`
 *  pieces `len` long along the board and `d` across it. */
const ROW: { k: Cut; n: number; len: number; d: number }[] = [
  { k: 'cabbage', n: 2, len: 0.08, d: 0.16 }, { k: 'carrot', n: 2, len: 0.08, d: 0.08 }, { k: 'tofu', n: 2, len: 0.08, d: 0.13 },
  { k: 'fish', n: 4, len: 0.15, d: 0.17 },
];
/** The gap between one thing and the next along the board. */
const ROW_GAP = 0.03;
/** Every piece along the row (its middle, from the row's start), and which thing it's part of. */
const PIECES = (() => {
  const out: { item: number; x: number }[] = [];
  let x = 0;
  ROW.forEach((r, item) => { for (let i = 0; i < r.n; i++) out.push({ item, x: x + r.len * (i + 0.5) }); x += r.len * r.n + ROW_GAP; });
  return out;
})();
/** Every line to cut: between two pieces of one thing (`i`: the piece left of it), and where it is along the row. */
const LINES = PIECES.flatMap((p, i) => (PIECES[i + 1]?.item === p.item ? [{ i, x: p.x + ROW[p.item].len / 2 }] : []));
/** Where the row's start is from the knife as the cut begins (its first line a little way off), and how long the cut
 *  lasts: till its last line has gone by. */
const ROW_FROM = 0.22 - LINES[0].x;
const CUT_S = (ROW_FROM + LINES[LINES.length - 1].x + RAGGED) / CUT_V;
/** Seconds into the cut each line comes under the knife (for the tests). */
export const cutTimes = () => LINES.map(l => (ROW_FROM + l.x) / CUT_V);
/** Where piece `i` lies along the row once `got`'s cuts are made: each cut opens its thing a little, pushing the
 *  piece it cut off on away from the knife. */
const pieceX = (got: number[], i: number) =>
  PIECES[i].x - 0.03 * LINES.filter((l, j) => got[j] > 0 && l.i >= i && PIECES[l.i].item === PIECES[i].item).length;

// ---------- the stew, as the show has it ----------
/** The show's stew is its own: a fine round top in the pot's place, which moves (rings where things land and where
 *  seasonings pour, a whirl and a dip in the middle as it's stirred, a simmer that bubbles harder the harder it
 *  boils), takes the seasonings' colour as they spread out from where they're poured, and swallows what's thrown in:
 *  it sinks, and the stir brings it back up, round and round with it. */
const BROTH_R = 0.8, RINGS = 14, SECTORS = 44;
/** Plain dashi, before it's seasoned; what each seasoning turns it towards, and how far a good pour of it does. */
const DASHI = 0xE3BC72;
const TINTS: [number, number][] = [[0xFBF3E2, 0.3], [0x5A2610, 0.72], [0xB8692A, 0.78]];
/** How fast a seasoning's colour spreads through the stew (metres a second). */
const DYE_V = 0.45;
const B = {
  t: 0, whirl: 0, swirl: 0, boil: 0.15, rise: 0, puff: 0,
  /** Its colour: what it was, and what it's being turned by the seasoning being poured, spreading from `dye`. */
  was: new Color(DASHI), now: new Color(DASHI), dye: null as { x: number; z: number; t: number } | null,
};
const waves: { x: number; z: number; t: number; a: number }[] = [];
/** What's gone into the stew: sinking from `t` where it went in, then going round with it (and back up as it's stirred,
 *  `up`: the rice stays down). */
const bits: { o: Object3D; a: number; r: number; t: number; tip: number; up: boolean; gloop: boolean; placed?: boolean }[] = [];
const tint = new Color(), shadeC = new Color();
/** The stew's colour for seasonings poured to `levels` (salt, soy, miso: 0 to 1, none yet: 0). */
function seasoned(levels: number[], out = new Color()) {
  out.setHex(DASHI);
  TINTS.forEach(([c, w], j) => { if (levels[j] > 0) out.lerp(tint.setHex(c), w * Math.min(1, levels[j] / 0.5)); });
  return out;
}
/** Rings out from `x, z` on the stew, `a` high. */
const wave = (x: number, z: number, a: number) => { waves.push({ x, z, t: B.t, a }); if (waves.length > 24) waves.shift(); };
/** How far the stew's top is above or below its rest at `x, z` now. */
function stewH(x: number, z: number) {
  const dx = x - POT.x, dz = z - POT.z, r = Math.hypot(dx, dz) / BROTH_R;
  if (r >= 1) return 0;
  let h = 0;
  for (const w of waves) {
    const age = B.t - w.t, behind = age * 0.8 - Math.hypot(x - w.x, z - w.z);
    if (behind > 0) h += w.a * Math.exp(-age * 1.6 - behind * 3) * Math.sin(behind * 32);
  }
  const th = Math.atan2(dz, dx);
  h += B.whirl * (-0.05 * (1 - r * r) + 0.012 * r * Math.sin(3 * th - B.swirl * 2 + r * 9));
  h += B.boil * 0.012 * Math.sin(dx * 21 + B.t * 6.3) * Math.sin(dz * 17 - B.t * 5.1);
  return h * (1 - r ** 6);
}
/** The stew's top: a disc of rings, its heights and colours moved every frame. */
function brothMesh() {
  const n = 1 + RINGS * SECTORS, pos = new Float32Array(n * 3), idx: number[] = [];
  for (let r = 1; r <= RINGS; r++) for (let k = 0; k < SECTORS; k++) {
    const v = 1 + (r - 1) * SECTORS + k, a = k / SECTORS * Math.PI * 2;
    pos[v * 3] = Math.cos(a) * r / RINGS * BROTH_R; pos[v * 3 + 2] = Math.sin(a) * r / RINGS * BROTH_R;
  }
  for (let k = 0; k < SECTORS; k++) idx.push(0, 1 + (k + 1) % SECTORS, 1 + k);
  for (let r = 1; r < RINGS; r++) for (let k = 0; k < SECTORS; k++) {
    const a = 1 + (r - 1) * SECTORS + k, b = 1 + (r - 1) * SECTORS + (k + 1) % SECTORS;
    idx.push(a, b, a + SECTORS, b, b + SECTORS, a + SECTORS);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
  geo.setIndex(idx);
  const m = new Mesh(geo, new MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0x2C2216 }));
  m.position.set(POT.x, STEW_Y, POT.z);
  m.receiveShadow = true;
  return m;
}
/** Into the stew at `x, z` goes `o` (already sunk, `under`): it sinks, then goes round with it. */
function drown(o: Object3D, x: number, z: number, up = true, under = false) {
  const dx = x - POT.x, dz = z - POT.z;
  set!.g.add(o); o.visible = true;
  bits.push({ o, a: Math.atan2(dz, dx), r: Math.min(0.6, Math.hypot(dx, dz)), t: under ? -99 : B.t, tip: rnd(-1, 1), up, gloop: under });
}
const ease = (k: number) => k * k * (3 - 2 * k);
/** Moves the stew on: its top, its colour, what's in it, its bubbles and steam. */
function updStew(dt: number) {
  const s = set!;
  B.t += dt;
  while (waves.length && B.t - waves[0].t > 3) waves.shift();
  if (B.dye && (B.t - B.dye.t) * DYE_V > 2 * BROTH_R + 0.4) { B.was.copy(B.now); B.dye = null; }
  const geo = s.broth.geometry, pos = geo.attributes.position.array as Float32Array, col = geo.attributes.color.array as Float32Array;
  for (let v = 0; v < pos.length / 3; v++) {
    const x = POT.x + pos[v * 3], z = POT.z + pos[v * 3 + 2], r = Math.hypot(pos[v * 3], pos[v * 3 + 2]) / BROTH_R;
    pos[v * 3 + 1] = stewH(x, z);
    // (a seasoning spreads out in a ragged ring from where it went in, and it's darker round the edge, in the pot's shade)
    let k = 1;
    if (B.dye) {
      const d = Math.hypot(x - B.dye.x, z - B.dye.z), th = Math.atan2(z - B.dye.z, x - B.dye.x);
      k = clamp(((B.t - B.dye.t) * DYE_V * (1 + 0.3 * Math.sin(3 * th + B.dye.t * 7 + B.swirl)) - d) / 0.25, 0, 1);
    }
    shadeC.copy(B.was).lerp(B.now, k).multiplyScalar(1 - 0.16 * r * r - 0.22 * r ** 8);
    col[v * 3] = shadeC.r; col[v * 3 + 1] = shadeC.g; col[v * 3 + 2] = shadeC.b;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  geo.computeVertexNormals();
  // what's in it: sinking for a second and more after it goes in (with a last gloop), round with the stew, and as
  // it's stirred, back up to show at the top
  bits.forEach((b, j) => {
    const age = B.t - b.t, k = ease(clamp(age / 1.3, 0, 1));
    // (out of sight at the bottom, it's moved round to a place of its own, so what comes back up is spread over the pot)
    if (k >= 1 && !b.placed && B.rise < 0.05) { b.placed = true; b.a = j * 2.4 + 0.5; b.r = 0.14 + ((j * 0.37) % 0.46); }
    if (!b.gloop && age > 0.55) { b.gloop = true; wave(POT.x + Math.cos(b.a) * b.r, POT.z + Math.sin(b.a) * b.r, 0.012); }
    b.a += B.whirl * dt * 1.7 * (1.3 - b.r / BROTH_R);
    const x = POT.x + Math.cos(b.a) * b.r, z = POT.z + Math.sin(b.a) * b.r;
    const y = lerp(lerp(0.015, -0.13, k), -0.012, b.up ? B.rise : 0);
    b.o.position.set(x, STEW_Y + stewH(x, z) + y, z);
    b.o.rotation.set(b.tip * 0.5 * k * (1 - B.rise), b.a * 0.6, b.tip * 0.3 * k * (1 - B.rise));
  });
  // drops of fat on top, drifting, and going round with the stew
  for (const d of s.fat) {
    const u = d.userData as { a: number; r: number; v: number };
    u.a += (B.whirl * 1.7 * (1.3 - u.r / BROTH_R) + u.v) * dt;
    const x = POT.x + Math.cos(u.a) * u.r, z = POT.z + Math.sin(u.a) * u.r;
    d.position.set(x, STEW_Y + stewH(x, z) + 0.003, z);
  }
  // bubbles, more and quicker the harder it boils, and steam
  const lv = B.boil;
  s.bubbles.forEach((b, j) => {
    b.userData.t += dt * (0.6 + lv * 2.5);
    const k = b.userData.t % 1, a = j * 2.4 + Math.floor(b.userData.t) * 1.7, r = 0.15 + ((j * 0.37 + Math.floor(b.userData.t) * 0.23) % 0.55);
    const x = POT.x + Math.cos(a) * r, z = POT.z + Math.sin(a) * r;
    b.visible = j < 2 + lv * 10;
    b.position.set(x, STEW_Y + stewH(x, z) + 0.01, z);
    b.scale.setScalar(0.035 * Math.sin(k * Math.PI));
    // (and each one that bursts sends out a little ring)
    if (b.visible && k < (b.userData.k ?? 1)) wave(x, z, 0.003 + lv * 0.004);
    b.userData.k = k;
  });
  if ((B.puff -= dt) <= 0) { B.puff = 0.45 - lv * 0.3; steamFx(V(POT.x, STEW_Y + 0.1, POT.z), lv > 0.85 ? 3 : 1); }
  if (!stirring) { B.whirl *= Math.exp(-dt * 1.5); B.boil += (0.15 - B.boil) * Math.min(1, dt * 2); }
}
let stirring = false;

// ---------- the set ----------
interface Set {
  g: Group; knife: Group; row: Group; pieces: Object3D[]; guides: Group[];
  target: Group; shakers: Group[]; ladle: Group; bubbles: Mesh[]; mush: Object3D; rice: Object3D; broth: Mesh; fat: Mesh[];
  /** What's being thrown, held together. */
  hand: Group;
}
let set: Set | null = null;
/** The prep board's top, along its length (from the knife: it runs on well past both sides of the close shot), and
 *  the bamboo basket at its left end the cut pieces go into. */
const BOARD_L = -1.02, BOARD_R = 1.62;
const ZARU = V(BOARD.x - 0.8, BOARD.y + 0.031, BOARD.z);
/** Where piece `i` lies in the basket: heaped up in a spiral. */
const slot = (i: number) => {
  const a = i * 2.4, r = 0.17 * Math.sqrt((i + 0.5) / PIECES.length), p = set!.pieces[i];
  return V(ZARU.x + Math.cos(a) * r, ZARU.y + 0.012 + (p.userData.y - 0.031) + (i % 3) * 0.025, ZARU.z + Math.sin(a) * r * 0.8);
};
/** Where the mushroom and the rice wait on the board till it's their turn, right of the knife. */
const MUSH_AT = V(BOARD.x + 0.8, BOARD.y + 0.07, BOARD.z - 0.05), RICE_AT = V(BOARD.x + 1.05, BOARD.y + 0.07, BOARD.z + 0.03);
const hops: { o: Object3D; a: Vector3; b: Vector3; t: number; up: number }[] = [];
/** `o` hops off to `to` (in the world) in an arc, over a third of a second. */
function hop(o: Object3D, to: Vector3, up = 0.16) {
  const a = o.getWorldPosition(V(0, 0, 0));
  set!.g.add(o); o.position.copy(a); o.visible = true;
  hops.push({ o, a, b: to.clone(), t: 0, up });
}
function updHops(dt: number) {
  for (let j = hops.length - 1; j >= 0; j--) {
    const h = hops[j];
    h.t = Math.min(1, h.t + dt / 0.34);
    h.o.position.lerpVectors(h.a, h.b, h.t); h.o.position.y += Math.sin(h.t * Math.PI) * h.up;
    if (h.t >= 1) hops.splice(j, 1);
  }
}
const cabbageRib = new MeshLambertMaterial({ color: 0xE8EFCB }), cabbageLeaf = new MeshLambertMaterial({ color: 0x8FC46A });
const CARROT = new MeshLambertMaterial({ color: 0xE8833A }), TOFU = new MeshLambertMaterial({ color: 0xF6F0DC });
/** Piece `i` of a thing on the board, `len` long and `d` across, in the stew's own colours: a napa cabbage's pale ribs
 *  under its leaves, a carrot tapering to its tip (its leaves at the far end), tofu, and the tuna's (from `fish`). Its
 *  middle's `y` above the board (whose top is 0.031 up), its top `top`. */
function piece(k: Cut, i: number, len: number, d: number, fish: (i: number) => Material[]) {
  const g = new Group();
  let y = 0.066, top = 0.104;
  if (k === 'cabbage') {
    add(g, mesh(rbox(len - 0.004, 0.06, d, 0.02), cabbageRib, 0, -0.019, 0, true));
    add(g, mesh(rbox(len - 0.002, 0.034, d * 0.94, 0.015), cabbageLeaf, 0, 0.026, -0.004, true));
    y = 0.08; top = 0.126;
  } else if (k === 'carrot') {
    const [a, b] = i ? [0.034, 0.043] : [0.022, 0.034];
    const c = add(g, mesh(new CylinderGeometry(a, b, len - 0.004, 12), CARROT, 0, 0, 0, true)); c.rotation.z = Math.PI / 2;
    if (i) add(g, mesh(new CylinderGeometry(0.012, 0.02, 0.05, 6), 0x5E9E3E, len / 2 + 0.02, 0.004, 0)).rotation.z = Math.PI / 2;
    y = 0.031 + 0.04; top = 0.031 + 0.083;
  } else if (k === 'tofu') {
    add(g, mesh(rbox(len - 0.006, 0.08, d, 0.012), TOFU, 0, 0, 0, true));
    y = 0.071; top = 0.111;
  } else add(g, mesh(rbox(len, 0.07, d, 0.012), fish(i), 0, 0, 0, true));
  g.userData = { k, y, top };
  return g;
}
/** The set, built the first time the show's on: the long prep board on its stand, the knife, the row of things to
 *  cut, the basket, the stew's own top, the seasonings and a ladle. */
function build(): Set {
  const g = add(cellar, new Group());
  // the prep stand and its long hinoki board, in front of the ledge
  const mid = BOARD.x + (BOARD_L + BOARD_R) / 2, len = BOARD_R - BOARD_L;
  add(g, mesh(rbox(len - 0.3, 0.86, 0.38, 0.04), 0x5E3B2C, mid, BOARD.y - 0.46, BOARD.z, true));
  add(g, mesh(rbox(len, 0.06, 0.46, 0.025), 0xBF9A64, mid, BOARD.y - 0.0, BOARD.z, true));
  add(g, mesh(rbox(len - 0.16, 0.012, 0.03, 0.005), 0xC9AE7A, mid, BOARD.y + 0.031, BOARD.z + 0.19));
  // a red line across the board under the knife: where a gold line wants to be when you tap
  const mark = add(g, mesh(G.box, unlit(0xD9342B), BOARD.x, BOARD.y + 0.032, BOARD.z)); mark.scale.set(0.01, 0.002, 0.44);
  // the knife: a long steel blade along the board's depth, its wooden handle towards the camera
  const knife = add(g, new Group());
  add(knife, mesh(rbox(0.022, 0.13, 0.34, 0.008), STEEL, 0, 0.065, -0.04, true));
  add(knife, mesh(rbox(0.024, 0.014, 0.34, 0.004), 0x9AA4AC, 0, 0.13, -0.04));
  add(knife, mesh(rbox(0.03, 0.04, 0.03, 0.008), 0x3E3E44, 0, 0.075, 0.145));
  add(knife, mesh(rbox(0.034, 0.046, 0.17, 0.016), 0x5B3424, 0, 0.075, 0.245, true));
  // the row: the cabbage, the carrot and the tofu, then the block of tuna, end to end, a gold line over each cut
  const row = add(g, new Group());
  // (the tuna off the loin, in the market fillet's colours: four pieces whose top picture runs on from one to the next)
  const { tex } = canvasTex(256, 64, sakuFace), side = new MeshLambertMaterial({ color: 0xC62F48 }), front = new MeshLambertMaterial({ color: 0xD8344F });
  const fish = (i: number) => {
    const t = tex.clone(); t.repeat.set(0.25, 1); t.offset.set(i * 0.25, 0); t.needsUpdate = true;
    return [side, side, new MeshLambertMaterial({ map: t }), side, front, side];
  };
  const pieces = PIECES.map((p, i) => {
    const r = ROW[p.item], o = add(row, piece(r.k, i - PIECES.findIndex(q => q.item === p.item), r.len, r.d, fish));
    o.position.set(p.x, o.userData.y, 0);
    return o as Object3D;
  });
  const guides = LINES.map(l => {
    const r = ROW[PIECES[l.i].item], gl = add(row, new Group());
    gl.position.set(l.x, pieces[l.i].userData.top + 0.003, 0);
    // (each line its own paint: it lights up while it's under the knife)
    const paint = unlit(0xE8B84A);
    for (const z of [-r.d / 3, 0, r.d / 3]) add(gl, mesh(G.box, paint, 0, 0, z)).scale.set(0.012, 0.004, r.d / 4);
    gl.userData.paint = paint;
    return gl;
  });
  // the bamboo basket at the board's left end
  const zaru = add(g, new Group()); zaru.position.copy(ZARU);
  add(zaru, mesh(new CylinderGeometry(0.26, 0.2, 0.07, 24, 1, true), new MeshLambertMaterial({ color: 0xC9A86A, side: DoubleSide }), 0, 0.035, 0, true));
  add(zaru, mesh(new CylinderGeometry(0.2, 0.2, 0.008, 24), 0xB8955A, 0, 0.004, 0));
  add(zaru, mesh(new TorusGeometry(0.26, 0.013, 5, 28), 0xA27B45, 0, 0.07, 0)).rotation.x = Math.PI / 2;
  for (let k = 0; k < 6; k++) add(zaru, mesh(new TorusGeometry(0.205 + k * 0.009, 0.003, 3, 28), 0xA9874F, 0, 0.012 + k * 0.01, 0)).rotation.x = Math.PI / 2;
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
  // the stew's top, and bubbles on it
  const broth = add(g, brothMesh());
  const bubbles = Array.from({ length: 12 }, () => { const b = add(g, mesh(G.sphere, 0xF6E2BE, 0, 0, 0)); b.visible = false; b.userData.t = Math.random(); return b; });
  // (and drops of golden fat floating on it, the same scatter every time)
  const fatMat = new MeshPhongMaterial({ color: 0xF5C858, specular: 0x6A5638, shininess: 90, transparent: true, opacity: 0.6, depthWrite: false });
  const disc = new CylinderGeometry(1, 1, 0.002, 14);
  const fat = Array.from({ length: 16 }, (_, j) => {
    const d = add(g, mesh(disc, fatMat, 0, 0, 0)), w = 0.012 + ((j * 0.37) % 1) * 0.03;
    d.scale.set(w, 1, w * 0.85);
    d.userData = { a: j * 2.4, r: 0.1 + ((j * 0.61) % 1) * 0.6, v: (j % 2 ? 1 : -1) * (0.02 + (j % 5) * 0.01) };
    return d;
  });
  // the mushroom and the handful of dried rice that are thrown in after the rest
  const mush = add(g, fit(newMushroom(), 0.2, 0.17, 0.2)), rice = add(g, driedRice());
  for (const o of [mush, rice]) { o.visible = false; o.userData.sc = o.scale.clone(); o.userData.ry = o.rotation.y; }
  const hand = add(g, new Group());
  g.visible = false;
  return { g, knife, row, pieces, guides, target, shakers, ladle, bubbles, mush, rice, broth, fat, hand };
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
  /** Carrying on past it (it was played before): the set as it left it. */
  settle?(): void;
}
/** Each step's stars, from what it's scored (ShowRun's got): the cuts' and the throws' scores averaged (three stars for
 *  all of them in the middle), the pours' added up, and the stir's share of its seconds in the band. */
const STARS = [
  (got: number[]) => Math.round(got.reduce((a, x) => a + Math.max(0, x), 0) / LINES.length * 3),
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

/** The cut: the row slides along under the knife, and each line's cut or missed once (`got`: their scores, -1 for one
 *  still to come, kept by the run); what's gone by hops off into the basket. Left half way, what's cut stays cut and
 *  what's missed stays missed; the row comes back along for the lines still to come. */
function cutStep(s: Set, got: number[]): Step {
  for (let j = got.length; j < LINES.length; j++) got.push(-1);
  const cuts = LINES.map((_, j) => ({ done: got[j] >= 0, cut: got[j] > 0, score: Math.max(0, got[j]) }));
  const mark = (j: number, score: number) => { const c = cuts[j]; c.done = true; c.cut = score > 0; c.score = score; got[j] = score; };
  const off = PIECES.map(() => false);
  let t = 0, chop = 0, end = 0, swept = false;
  const knifeX = BOARD.x;
  const rowX = () => BOARD.x + ROW_FROM - CUT_V * t;
  const lineX = (j: number) => rowX() + LINES[j].x;
  const toBasket = (i: number) => { if (!off[i]) { off[i] = true; hop(s.pieces[i], slot(i)); } };
  function tap() {
    if (chop > 0.4) return;
    chop = 1;
    const open = cuts.map((c, j) => ({ c, j })).filter(x => !x.c.done);
    if (!open.length) return;
    let best = open[0], err = Infinity;
    for (const o of open) { const e = Math.abs(lineX(o.j) - knifeX); if (e < err) { err = e; best = o; } }
    const at = V(knifeX, BOARD.y + 0.12, BOARD.z);
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
      s.row.visible = s.knife.visible = true;
      s.pieces.forEach((p, i) => { s.row.add(p); p.visible = true; p.position.set(pieceX(got, i), p.userData.y, 0); p.rotation.set(0, 0, 0); });
      s.guides.forEach((l, j) => { l.visible = !cuts[j].done; });
      s.row.position.set(rowX(), BOARD.y, BOARD.z);
      s.knife.position.set(knifeX, BOARD.y + 0.2, BOARD.z);
    },
    update(dt) {
      t += dt; chop = Math.max(0, chop - dt * 5.5);
      s.row.position.x = rowX();
      // (a cut opens its thing there: the piece that's through the knife is pushed on away from it, and what's still to
      // cut stays put, so the next line comes up to the knife just as it was going to; well past it, into the basket)
      s.pieces.forEach((p, i) => {
        if (off[i]) return;
        p.position.x = pieceX(got, i);
        if (rowX() + p.position.x < knifeX - 0.42) toBasket(i);
      });
      // the knife comes down and goes back up
      s.knife.position.y = BOARD.y + 0.035 + 0.17 * (1 - Math.sin((1 - chop) * Math.PI) * (chop > 0 ? 1 : 0));
      cuts.forEach((c, j) => { if (!c.done && lineX(j) < knifeX - RAGGED) { mark(j, 0); callout('Missed', V(knifeX, BOARD.y + 0.12, BOARD.z), 0); } });
      // a line under the knife, near enough for a good cut, lights up and stands out: tap now
      s.guides.forEach((l, j) => {
        const lit = !cuts[j].done && Math.abs(lineX(j) - knifeX) < GOOD;
        (l.userData.paint as MeshBasicMaterial).color.setHex(lit ? 0xFFF8DC : 0xE8B84A);
        l.scale.set(lit ? 1.8 : 1, lit ? 2.5 : 1, 1);
      });
      if (t > CUT_S + 0.3) cuts.forEach((c, j) => { if (!c.done) mark(j, 0); });
      // the last line done, what's left on the board is swept into the basket too
      if (cuts.every(c => c.done)) {
        if (!swept) { swept = true; PIECES.forEach((_, i) => toBasket(i)); }
        if ((end += dt) > 0.6) this.done = true;
      }
      if (this.done) this.stars = STARS[0](got);
    },
    down: tap,
  };
}

/** The throw: every piece that was cut, one at a time (two a missed line left joined go as one), the cabbage first and
 *  the tuna last, then a mushroom (once the grow room's open) and a handful of dried rice. Each hops up from the basket
 *  onto the board right of the knife to be thrown, and what goes in sinks into the stew. `got`: each throw's score,
 *  kept by the run, so carrying on starts at the next one. */
function throwStep(s: Set, cut: number[], got: number[]): Step {
  type Hand = { parts: Object3D[]; offs: Vector3[]; up: boolean };
  let hands: Hand[] = [];
  let i = got.length, t = 0, wait = 0;
  let st: 'hop' | 'ready' | 'fly' | 'wait' = 'ready';
  let drag: { x: number; y: number } | null = null, fly: { a: Vector3; b: Vector3; t: number } | null = null;
  /** Where each piece is held to be thrown: on the board, right of the knife. */
  const REST = V(BOARD.x + 0.32, BOARD.y + 0.031, BOARD.z + 0.04);
  /** The pieces as they were cut: each on its own, but a run its missed lines left joined held together. */
  function cutPieces(): Hand[] {
    const runs: number[][] = [];
    PIECES.forEach((p, k) => {
      const line = LINES.findIndex(l => l.i === k - 1);
      if (k && PIECES[k - 1].item === p.item && !(cut[line] > 0)) runs[runs.length - 1].push(k); else runs.push([k]);
    });
    return runs.map(ids => {
      const len = ROW[PIECES[ids[0]].item].len, mid = (ids.length - 1) / 2;
      return { parts: ids.map(id => s.pieces[id]), offs: ids.map((id, k) => V((k - mid) * len, s.pieces[id].userData.y - 0.031, 0)), up: true };
    });
  }
  /** The board and the stew as they are with `n` thrown: those in the stew (or gone), the rest waiting. */
  function lay(n: number) {
    s.row.visible = s.knife.visible = false;
    hands = [...cutPieces(),
      ...(growOpen() ? [{ parts: [s.mush], offs: [V(0, 0.039, 0)], up: true }] : []), { parts: [s.rice], offs: [V(0, 0.039, 0)], up: false }];
    s.mush.visible = growOpen(); s.rice.visible = true;
    s.g.add(s.mush); s.mush.position.copy(MUSH_AT);
    s.g.add(s.rice); s.rice.position.copy(RICE_AT);
    s.pieces.forEach((p, k) => { s.g.add(p); p.visible = true; p.position.copy(slot(k)); p.rotation.set(0, k * 1.3, 0); });
    hands.slice(0, n).forEach((h, j) => {
      if (!(got[j] > 0)) { h.parts.forEach(o => { o.visible = false; }); return; }
      const a = rnd(0, 6), r = rnd(0, 0.4);
      h.parts.forEach(o => drown(o, POT.x + Math.cos(a) * r + rnd(-0.1, 0.1), POT.z + Math.sin(a) * r + rnd(-0.1, 0.1), h.up, true));
    });
  }
  function next() {
    if (i >= hands.length) { this_.stars = STARS[1](got); this_.done = true; return; }
    const h = hands[i];
    h.parts.forEach((o, k) => { o.rotation.set(0, 0, 0); hop(o, REST.clone().add(h.offs[k]), 0.22); });
    st = 'hop';
  }
  /** The next one's on the board: held (a joined run together), to drag and throw. */
  function grab() {
    const h = hands[i];
    s.hand.position.copy(REST); s.hand.rotation.set(0, 0, 0);
    h.parts.forEach((o, k) => { s.hand.add(o); o.position.copy(h.offs[k]); });
    st = 'ready';
  }
  /** What's in the air comes down where it was aimed: in the pot, and the nearer its middle the better. */
  function land() {
    if (!fly) return;
    const h = hands[i], d = Math.hypot(fly.b.x - POT.x, fly.b.z - POT.z) / STEW_R, inPot = d < 1;
    const sc = !inPot ? 0 : d < 0.35 ? 1 : 0.6;
    got.push(sc);
    callout(sc === 1 ? 'Bullseye!' : sc ? 'In!' : 'Splash!', fly.b.clone().setY(STEW_Y + 0.25), sc, sc === 1);
    if (inPot) {
      splashFx({ x: fly.b.x, z: fly.b.z }, STEW_Y);
      wave(fly.b.x, fly.b.z, 0.045);
      // (a joined run lands a little apart)
      h.parts.forEach((o, k) => drown(o, fly!.b.x + h.offs[k].x * 0.7 + rnd(-0.05, 0.05), fly!.b.z + rnd(-0.08, 0.08), h.up));
    } else h.parts.forEach(o => { s.g.add(o); o.visible = false; });
    fly = null;
    st = 'wait'; wait = 0.3;
  }
  const this_: Step = {
    name: 'Throw', kanji: '投', cap: 'Drag up, let go into the pot', shot: 'throw', stars: 0, done: false,
    start() { s.target.visible = false; lay(i); next(); },
    settle() { lay(Infinity); },
    update(dt) {
      t += dt;
      if (st === 'hop' && !hops.some(x => hands[i].parts.includes(x.o))) grab();
      else if (st === 'fly' && fly) {
        fly.t = Math.min(1, fly.t + dt / 0.55);
        const k = fly.t;
        s.hand.position.lerpVectors(fly.a, fly.b, k); s.hand.position.y += Math.sin(k * Math.PI) * 0.55;
        s.hand.rotation.x += dt * 9; s.hand.rotation.z += dt * 5;
        if (k >= 1) land();
      } else if (st === 'wait' && (wait -= dt) <= 0) { i++; next(); }
      else if (st === 'ready' && !drag) s.hand.position.y = REST.y + Math.abs(Math.sin(t * 5)) * 0.03;
    },
    down(x, y) { if (st === 'ready') drag = { x, y }; },
    move(x, y) {
      if (!drag || st !== 'ready') return;
      // (it follows the finger a little, up off the board, and its shadow shows where it'd land)
      const dy = clamp((drag.y - y) / innerHeight, 0, 0.2);
      s.hand.position.set(REST.x + clamp((x - drag.x) / innerWidth, -0.15, 0.15) * 0.8, REST.y + dy * 0.6, REST.z - dy * 0.4);
      const b = y < drag.y - 14 ? onStew(drag.x + (x - drag.x) * 2.7, drag.y + (y - drag.y) * 2.7) : null;
      s.target.visible = !!b && Math.hypot(b.x - POT.x, b.z - POT.z) < STEW_R;
      if (b) s.target.position.set(b.x, STEW_Y + stewH(b.x, b.z) + 0.012, b.z);
    },
    up(x, y) {
      if (!drag || st !== 'ready') { drag = null; return; }
      const dx = x - drag.x, dy = y - drag.y, from = drag;
      drag = null; s.target.visible = false;
      // where the drag points, carried on 2.7 times as far
      if (dy > -14) { s.hand.position.copy(REST); callout('Drag it up', REST.clone().setY(REST.y + 0.25), 0.5); return; }
      const b = onStew(from.x + dx * 2.7, from.y + dy * 2.7);
      if (!b) return;
      fly = { a: s.hand.position.clone(), b, t: 0 };
      st = 'fly';
    },
    leave() {
      land();
      if (got.length >= hands.length) { this_.stars = STARS[1](got); this_.done = true; }
    },
  };
  return this_;
}

interface Season { name: string; color: number; size: number; c: number; level: number; score: number | null }
/** The seasoning: salt, soy and miso, each poured to its line once (`got`: their scores; `lines`: where the lines are,
 *  rolled once a show, both kept by the run). Each turns the stew its colour as it goes in. */
function seasonStep(s: Set, got: number[], lines: number[]): Step {
  for (let j = lines.length; j < 3; j++) lines.push(rnd(0.42, 0.78));
  // (one poured before, the show left since: it went in about to its line)
  const kinds: Season[] = [['Salt', 0xFFFFFF, 0.014], ['Soy', 0x3A1E14, 0.02], ['Miso', 0xB8772F, 0.03]].map(([name, color, size], j) =>
    ({ name: name as string, color: color as number, size: size as number, c: lines[j], level: j < got.length ? lines[j] : 0, score: got[j] ?? null }));
  let i = got.length, held = 0, wait = 0, tilt = 0, drip = 0;
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
        // (where it goes in, the stew rings and takes its colour, the more the more's poured)
        seasoned(kinds.map(q => q.level), B.now);
        if ((drip -= dt) <= 0) { drip = 0.08; wave(mouth.x - 0.05, mouth.z, 0.007); }
        if (k.level >= 1) stop();
      } else if (st === 'wait' && (wait -= dt) <= 0) {
        i++; held = 0; tilt = 0;
        if (i >= kinds.length) { this.stars = STARS[2](got); this.done = true; meter(null); s.shakers.forEach(x => { x.visible = false; }); }
        else { st = 'ready'; show(); }
      }
      if (!this.done) meter(kinds[i]);
    },
    down() {
      if (st !== 'ready') return;
      st = 'pour'; held = 0;
      // (the colour spreads out from under the pour: what it was so far is what it is now)
      const mouth = V(0, 0.13, 0).applyEuler(s.shakers[i].rotation).add(s.shakers[i].position);
      if (B.dye) B.was.copy(B.now);
      B.dye = { x: mouth.x - 0.05, z: mouth.z, t: B.t };
    },
    up: stop,
    leave() {
      stop();
      if (got.length >= kinds.length) { this.stars = STARS[2](got); this.done = true; }
    },
  };
}

/** The stir: five seconds of circling in the band, from the first press on the soup (`got`: the seconds stirred and the
 *  seconds of them in the band, kept by the run: carrying on, the ladle's taken up again and the clock goes on). The
 *  stew whirls round with the ladle, and what went in comes back up. */
function stirStep(s: Set, got: number[]): Step {
  if (got.length < 2) got.splice(0, got.length, 0, 0);
  let acc = 0, speed = 0, last: number | null = null, ang = -Math.PI / 2, on = false, idle = 0, spin = 0, wake = 0;
  const toScreen = (x: number, z: number) => { const p = V(x, STEW_Y, z).project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; };
  const centre = () => toScreen(POT.x, POT.z);
  // (the band drifts a little and slowly, and it's wide: a finger's circles are never even)
  const band = () => 0.5 + Math.sin(got[0] * 0.8) * 0.08;
  const this_: Step = {
    name: 'Stir', kanji: '混', cap: 'Press the soup, then circle round', shot: 'stir', stars: 0, done: false,
    start() { s.ladle.visible = true; stirring = true; boil(0, band(), ''); },
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
      // the stew goes round with the ladle and dips in the middle, simmering the harder the harder it boils, and what
      // went in comes back up as it's stirred
      B.whirl = lv; B.boil = 0.15 + lv * 0.85; B.swirl += speed * dt * 0.35;
      B.rise = Math.max(B.rise, clamp(t / (STIR_GRACE + STIR_S) * 1.4, 0, 1));
      // the ladle goes round with the finger (and till it's taken up, it bobs where it lies, asking to be), leaving a wake
      if (last == null) ang += speed * dt;
      const lx = POT.x + Math.cos(ang) * 0.42, lz = POT.z + Math.sin(ang) * 0.42;
      s.ladle.position.set(lx, STEW_Y + stewH(lx, lz) + 0.02 + (on ? 0 : Math.abs(Math.sin(idle * 4)) * 0.05), lz);
      s.ladle.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5);
      if (lv > 0.05 && (wake -= dt) <= 0) { wake = 0.12; wave(lx, lz, 0.004 + lv * 0.008); }
      if (t >= STIR_GRACE + STIR_S) {
        this_.stars = STARS[3](got);
        callout(`${Math.round(got[1] / STIR_S * 100)}% in the band`, V(POT.x, STEW_Y + 0.4, POT.z), this_.stars / 3, this_.stars === 3);
        this_.done = true; boil(null); stirring = false; B.rise = 1;
      }
    },
    down(x, y) {
      // (the first press has to be on the soup: that's where the ladle is)
      if (!on) {
        const b = onStew(x, y);
        if (!b || Math.hypot(b.x - POT.x, b.z - POT.z) > STEW_R) { callout('On the soup!', V(POT.x, STEW_Y + 0.3, POT.z), 0.5); return; }
        on = true;
        wave(b.x, b.z, 0.02);
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
    leave() { stirring = false; },
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
const freshRun = (): ShowRun => ({ step: 0, got: [LINES.map(() => -1), [], [], []], lines: [] });
/** Starts the show, or carries on the one left half way (F.show): the game holds still, and the camera cuts in to the
 *  pot. It takes nothing: it's played for the bonus alone. */
export function startShow() {
  if (S || !canShow()) return false;
  set ??= build();
  const s = set;
  s.g.visible = true;
  [s.knife, s.target, s.ladle, ...s.shakers].forEach(o => { o.visible = false; });
  // the row back on the board, whole, and the stew plain dashi with nothing in it (or as it was left)
  s.row.visible = true;
  s.pieces.forEach((p, i) => { s.row.add(p); p.visible = true; p.position.set(PIECES[i].x, p.userData.y, 0); p.rotation.set(0, 0, 0); });
  for (const o of [s.mush, s.rice]) { o.visible = false; o.rotation.set(0, o.userData.ry, 0); o.scale.copy(o.userData.sc); }
  bits.length = 0; waves.length = 0; hops.length = 0;
  const was = F.show, run = was ?? freshRun(), g = run.got;
  Object.assign(B, { whirl: 0, swirl: 0, boil: 0.15, dye: null, rise: run.step > 3 ? 1 : clamp((g[3]?.[0] ?? 0) / (STIR_GRACE + STIR_S) * 1.4, 0, 1) });
  seasoned([0, 1, 2].map(j => (j < g[2].length ? run.lines[j] : 0)), B.was); B.now.copy(B.was);
  stirring = false;
  const steps = [cutStep(s, g[0]), throwStep(s, g[0], g[1]), seasonStep(s, g[2], run.lines), stirStep(s, g[3])];
  // (carrying on: the steps already played are done, their stars as they were, the set as they left it)
  steps.forEach((st, j) => { if (j < run.step) { st.done = true; st.stars = STARS[j](g[j]); st.settle?.(); } });
  S = { phase: 'in', t: 0, i: run.step, steps, downSent: false, run };
  aim(SHOTS.wide);
  // the stew is the show's own (the pot's, with what's in it, is put away), its ladle and tag too, the player out of
  // the shot
  potMesh.getObjectByName('potFill')!.visible = false;
  updStew(0);
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
  potMesh.getObjectByName('potFill')!.visible = true;
  stirring = false;
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
  updStew(dt); updHops(dt);
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
const ray = new Raycaster(), ndc = new Vector2(), stewTop = new Plane(V(0, 1, 0), -STEW_Y);
/** Where a point on the screen falls on the stew's surface. */
function onStew(x: number, y: number) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(stewTop, V(0, 0, 0));
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
export const showState = () => (S ? {
  phase: S.phase, step: S.steps[S.i]?.name, stars: S.steps.map(s => s.stars), run: structuredClone(S.run), hidden: cleared.length,
  /** The stew: its colour, and how far below its top each thing in it is (metres; less than 0, under). */
  stew: { colour: B.now.getHex(), was: B.was.getHex(), in: bits.map(b => b.o.position.y - STEW_Y), rise: B.rise },
} : null);
export { BONUS_TIERS };
