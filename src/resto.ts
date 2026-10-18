// Mama Moray's Honest Chanko (stage 3): the Family's chanko restaurant out front, through the arena's south doorway.
// What the pot can't hold, once the ledge is stocked, goes to her (fight.ts, toResto): the bowls are tipped into a
// hatch in the floor by the hearth, ride a belt under the floor (underBelt.ts) and come up through a slot in her
// counter, and loop round it, and the fans on its stools take them as they pass; she keeps the till, and pays a cut of
// each bowl (the Family keeps the rest). The fans eat at the counter and at tables down the hall and its dining wing,
// each table's nabe on its burner, as many of them in as there's been chanko lately.
//
// It starts a wreck, and is put right level by level of Word on the street (stageOf, lookOf, dress): at 0 and 1 toppled
// tables, rubble, gaps in the floor, cobwebs and a torn curtain, shut; from 2 to 4 being cleared, still shut: the
// rubble stacked, a broom and a bucket, then the floor patched and the tables up, then the stools; at 5 patched and
// open, Mama at her till ("Open for business, dear."), and only then does she take her cut (about when the second
// boss falls, and the stall's way into the Undertow opens); then its looks: at 6 a back-street joint, plank walls,
// paper lanterns and a plain counter; at 7 Mama's touch, framed sumo photos and the family's portrait, red lanterns strung
// along the walls and checked cloths on the tables; at 8 the Family's front, dark panelling with a thin gold line, slim
// purple banners with a gold fish, a lacquered board and a dark counter. Shut or open, its hall's always walkable, to
// the restroom. Each level's close-up waits for the arena's (spotlight.ts, spotBusy). Its sound is restoSound.ts.
//
// Its restroom, off the wing, has two stalls: the first's in use, the second's out of order at every level, taped
// across, its toilet taped up, a bare bulb over it on a wire; and its back is the doorman's door into the Undertow
// (southDoor.ts, which tears the tape and flickers the bulb). Once the second boss is beaten, a pink light leaks under
// it. Everything's made on dice of its own (never the game's luck), the first time stage 3's dressed.
import {
  AdditiveBlending, CatmullRomCurve3, CylinderGeometry, DoubleSide, Group, type Material, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, type Object3D, PlaneGeometry, RepeatWrapping, TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { cellar, CY, lights, POT_TOP, stallTape, WALL } from './cellar';
import {
  BASINS, CLUB_DOOR, HEARTH, MAMA, POT, MAMA_COUNTER as K, RISE, STALL_DOOR, STALLS, STOOLS, TABLE_SEAT, TABLES, TILL,
} from './cellarPlan';
import { belowGround, crowdModel, type Person } from './characters';
import { stallDoor } from './doorway';
import { mods } from './economy';
import { flatten, type Hood, mama, settle } from './family';
import { F, on } from './fight';
import { apart, dice } from './kit';
import { ARENA, CRAFT, DOORS, level, LOO, RESTO, stage, WING } from './layout';
import { player } from './player';
import { fly } from './holder';
import { popIn } from './pop';
import { updRestoSound } from './restoSound';
import { spotBusy, spotlight } from './spotlight';
import { staging } from './stage';
import { canvasTex, FONT, G, mesh } from './render';
import { bubble } from './speech';
import { popText } from './ui';
import { floorClear, type UnderBelt, underBelt } from './underBelt';
import { crowdStyle } from './wardrobe';

/** Everything here: in the cellar from the start, empty till stage 3's first dressed. */
export const resto = apart(() => new Group(), dice(0x4E570));
cellar.add(resto);

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
const lam = (color: number, emissive = 0) => new MeshLambertMaterial({ color, emissive });
const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
/** A box `sx` by `sy` by `sz` with its middle at (x, y, z), y up from the cellar's floor. */
function box(p: Object3D, m: number | Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) {
  const o = add(p, mesh(G.box, m, x, CY + y, z, cast)); o.scale.set(sx, sy, sz); return o;
}
/** A round thing `r` in radius and `h` high, its middle at (x, y, z). */
function cyl(p: Object3D, m: number | Material, x: number, y: number, z: number, r: number, h: number, cast = true) {
  const o = add(p, mesh(G.cyl, m, x, CY + y, z, cast)); o.scale.set(r, h, r); return o;
}
function ball(p: Object3D, m: number | Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
  const o = add(p, mesh(G.sphere, m, x, CY + y, z)); o.scale.set(sx, sy, sz); return o;
}
/** A picture `w` by `h` facing +z (turned `ry`), its middle at (x, y, z), as `draw` paints it. */
function sign(p: Object3D, x: number, y: number, z: number, w: number, h: number, ry: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, px = 220) {
  const m = new MeshLambertMaterial({ map: canvasTex(Math.round(w * px), Math.round(h * px), draw).tex, side: DoubleSide });
  const o = add(p, new Mesh(new PlaneGeometry(w, h), m));
  o.position.set(x, CY + y, z); o.rotation.y = ry; o.receiveShadow = true;
  return o;
}
/** A flat sheet of `m`, `w` by `h`, facing +z (turned `ry`), its middle at (x, y, z). */
function plane(p: Object3D, m: Material, x: number, y: number, z: number, w: number, h: number, ry = 0) {
  const o = add(p, new Mesh(new PlaneGeometry(w, h), m));
  o.position.set(x, CY + y, z); o.rotation.y = ry; o.receiveShadow = true;
  return o;
}
/** A texture drawn once, repeating `rx` by `ry` times where it's laid. */
function repeat(px: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const t = canvasTex(px, px, draw).tex;
  return (rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
}
/** A paper lantern hung at (x, y, z): white, or red. */
function lantern(p: Object3D, m: Material, x: number, y: number, z: number, cord = 0.4) {
  ball(p, m, x, y, z, 0.15, 0.2, 0.15);
  for (const s of [-1, 1]) cyl(p, 0x1B1A1E, x, y + s * 0.19, z, 0.07, 0.035, false);
  cyl(p, 0x1B1A1E, x, y + 0.2 + cord / 2, z, 0.008, cord, false);
}
/** A string hung from `a` to `b`, sagging `drop` in the middle: a point every 1/`n` of the way. */
const sag = (a: Vector3, b: Vector3, drop: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, q = a.clone().lerp(b, t); q.y -= drop * 4 * t * (1 - t); return q;
});
const wire = (p: Object3D, pts: Vector3[], r: number, c: number) => add(p, mesh(new TubeGeometry(new CatmullRomCurve3(pts), pts.length * 2, r, 4), c));

// ---------- what it's made of ----------
const M = {
  wood: lam(0x7A4E32), woodDark: lam(0x4A2C1E), top: lam(0x9A6A44), steel: lam(0x8A9096), steelDark: lam(0x4A5056),
  clay: lam(0x3B2A20), claySoft: lam(0x6A4A34), stew: lam(0xC9803A), tofu: lam(0xF4F0E6), cabbage: lam(0x7FB850),
  carrot: lam(0xE07A2A), tuna: lam(0x8A4A2A), mush: lam(0xD8C4A0), bowl: lam(0xEDE6D8), iron: lam(0x2E2E33),
  porcelain: lam(0xF2F0EA), teal: lam(0x2A7068), tape: lam(0xE8C43A, 0x3A2A00), brass: lam(0xC9A23A, 0x2A1A00),
  flame: new MeshLambertMaterial({ color: 0x8AC0FF, emissive: 0x3A7AFF }),
  paper: new MeshLambertMaterial({ color: 0xFFF1D6, emissive: 0xFFC46A, emissiveIntensity: 0.9 }),
  red: new MeshLambertMaterial({ color: 0xE0392B, emissive: 0xB0250F }),
  steam: new MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.2, depthWrite: false }),
  lacquer: lam(0x22140F), purple: lam(0x5B2A86), gold: lam(0xD2AA4A, 0x3A2A00),
};
/** The belt's steel slats, across it. */
const slats = repeat(64, (c, w, h) => {
  c.fillStyle = '#9AA0A6'; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { c.fillStyle = '#5A6066'; c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 4, 0, 2, h); }
});
/** Red and white gingham, for the tables at level 3. */
const gingham = repeat(64, (c, w, h) => {
  c.fillStyle = '#F4EFE6'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(190,40,40,.55)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 16, 0, 8, h); c.fillRect(0, i * 16, w, 8); }
});
/** Dark panelling, a panel a tile, framed in a thin gold line. */
const panelling = repeat(128, (c, w, h) => {
  c.fillStyle = '#3E2016'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? 'rgba(20,8,4,.2)' : 'rgba(120,60,30,.1)'; c.fillRect((i * 37) % w, 0, 2, h); }
  c.strokeStyle = '#D2AA4A'; c.lineWidth = 3; c.strokeRect(12, 14, w - 24, h - 28);
});
/** Caution tape: yellow, black bands across it, the word along it. */
const tapeMat = () => new MeshLambertMaterial({
  side: DoubleSide, emissive: 0x2A2000,
  map: canvasTex(256, 24, (c, w, h) => {
    c.fillStyle = '#F2C81E'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1A1A1A'; c.font = `800 16px ${FONT}`; c.textBaseline = 'middle';
    for (let x = 6; x < w; x += 92) c.fillText('CAUTION', x, h / 2 + 1);
  }).tex,
});

// ---------- the pieces ----------
/** A nabe on a burner, its broth with what goes in the cellar's: tofu, cabbage, carrot, cured tuna, mushrooms. */
function nabe(p: Object3D, x: number, y: number, z: number, s = 1) {
  const g = add(p, new Group()); g.position.set(x, CY + y, z); g.scale.setScalar(s);
  const b = (m: Material, bx: number, by: number, bz: number, sx: number, sy: number, sz: number) => { const o = add(g, mesh(G.box, m, bx, by, bz)); o.scale.set(sx, sy, sz); return o; };
  const c = (m: Material, cx: number, cy: number, cz: number, r: number, h: number) => { const o = add(g, mesh(G.cyl, m, cx, cy, cz, true)); o.scale.set(r, h, r); return o; };
  b(M.iron, 0, 0.045, 0, 0.42, 0.09, 0.42);
  const flame = add(g, mesh(new TorusGeometry(0.13, 0.018, 6, 20), M.flame, 0, 0.1, 0)); flame.rotation.x = Math.PI / 2;
  c(M.clay, 0, 0.2, 0, 0.25, 0.18);
  const rim = add(g, mesh(new TorusGeometry(0.25, 0.025, 6, 24), M.claySoft, 0, 0.29, 0)); rim.rotation.x = Math.PI / 2;
  c(M.stew, 0, 0.28, 0, 0.23, 0.01);
  for (const [m, bx, bz, r] of [[M.tofu, 0.1, 0.05, 0.07], [M.tofu, -0.08, 0.1, 0.07], [M.cabbage, -0.12, -0.06, 0.09], [M.cabbage, 0.04, -0.13, 0.08],
    [M.carrot, 0.13, -0.08, 0.05], [M.tuna, -0.02, 0.02, 0.09], [M.mush, 0.08, 0.14, 0.06], [M.mush, -0.15, 0.06, 0.05]] as const) b(m, bx, 0.295, bz, r, 0.035, r * 0.8).rotation.y = bx * 9;
  return g;
}
/** A bowl of chanko on its little plate, at its foot's middle (for the belt). */
function bowlModel() {
  const g = new Group();
  const plate = add(g, mesh(G.cyl, M.bowl, 0, 0.008, 0)); plate.scale.set(0.1, 0.016, 0.1);
  const b = add(g, mesh(new CylinderGeometry(0.08, 0.05, 0.07, 12), M.bowl, 0, 0.05, 0, true));
  b.castShadow = true;
  const s = add(g, mesh(G.cyl, M.stew, 0, 0.083, 0)); s.scale.set(0.07, 0.005, 0.07);
  const tofu = add(g, mesh(G.box, M.tofu, 0.02, 0.088, 0.01)); tofu.scale.set(0.035, 0.02, 0.035);
  const leaf = add(g, mesh(G.box, M.cabbage, -0.025, 0.088, -0.01)); leaf.scale.set(0.04, 0.012, 0.03);
  return g;
}
/** A stool, its top `h` up. */
function stool(p: Object3D, x: number, z: number, h: number) { cyl(p, M.woodDark, x, h, z, 0.17, 0.05); cyl(p, M.iron, x, h / 2, z, 0.03, h); }

// ---------- the belt ----------
/** The belt's path: up out of the slot in the counter's top (from under the floor), onto the loop, then round it (west
 *  along its back, along its front, and back up its east end to where it came on), and its length along the way. */
const TOP = K.h + 0.065, LX0 = K.x0 + 0.2, LX1 = K.x1 - 0.2, LZ0 = K.z0 + 0.2, LZ1 = K.z1 - 0.2;
const MOUTH = V(RISE.x, CY + TOP - 0.3, RISE.z), FOOT = V(RISE.x, CY + TOP, LZ0);
const LOOP = [FOOT, V(LX0, CY + TOP, LZ0), V(LX0, CY + TOP, LZ1), V(LX1, CY + TOP, LZ1), V(LX1, CY + TOP, LZ0), FOOT];
const CHUTE = MOUTH.distanceTo(FOOT);
const LAP = LOOP.slice(1).reduce((s, q, i) => s + q.distanceTo(LOOP[i]), 0);
/** Where a bowl `d` along the belt is: down the chute, then round and round. */
function along(d: number, out: Vector3) {
  if (d < CHUTE) return out.copy(MOUTH).lerp(FOOT, d / CHUTE);
  let r = (d - CHUTE) % LAP;
  for (let i = 1; i < LOOP.length; i++) {
    const l = LOOP[i].distanceTo(LOOP[i - 1]);
    if (r <= l) return out.copy(LOOP[i - 1]).lerp(LOOP[i], r / l);
    r -= l;
  }
  return out.copy(FOOT);
}
/** The belt's way under the floor, from its hatch by the hearth to under her counter's slot. */
// (square to the rooms: south down the hearth room's west side, west across it and the soup square's south end, then
// south under the arena's wall)
const UNDER_X = HEARTH.x - HEARTH.w / 2 - 0.45, UNDER_Z = ARENA.z1 - 0.7;
const UNDER = [{ x: UNDER_X, z: HEARTH.z + 0.2 }, { x: UNDER_X, z: UNDER_Z }, { x: RISE.x, z: UNDER_Z }, { x: RISE.x, z: RISE.z }];
/** How fast the belt runs (metres a second), how close the bowls ride, and how many laps one goes round before someone
 *  at a table's had it sent over. */
const BELT_V = 0.32, GAP = 0.34, LAPS = 2;

// ---------- the diners ----------
interface Seat { x: number; z: number; face: number; top: number; counter: boolean }
const SEATS: Seat[] = [
  ...STOOLS.map(s => ({ x: s.x, z: s.z, face: Math.PI, top: 0.65, counter: true })),
  ...TABLES.flatMap(t => [
    { x: t.x - TABLE_SEAT, z: t.z, face: Math.PI / 2, top: 0.48, counter: false },
    { x: t.x + TABLE_SEAT, z: t.z, face: -Math.PI / 2, top: 0.48, counter: false },
  ]),
];
/** The order the seats fill in: a couple at the counter, then the hall's table, then down the wing, the rest after. */
const ORDER = [1, 3, 5, 6, 0, 2, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
interface Diner { p: Person; seat: Seat; eat: number; t: number }

interface Built {
  diners: Diner[]; mama: Hood; bowls: { o: Group; d: number }[]; looks: Group[];
  board: Mesh; boards: [Material, Material]; counter: Mesh; counters: [Material, Material];
  stallB: Group; tapeWhole: Group; tapeTorn: Group; bulb: Mesh; bulbOn: Material; bulbOff: Material; leak: Mesh;
  under: UnderBelt; drops: { o: Group; busy: boolean }[];
  tables: { g: Group; set: Group }[]; stools: Group; noren: Mesh; norens: Material[]; shopNoren: Mesh; shopNorens: Material[]; ruin: Ruin;
  says: ReturnType<typeof bubble>; opened: boolean;
  /** Where its close-up looks: the middle of the hall and its wing. */
  middle: Object3D;
}
/** What she says as she opens. */
export const OPENING = 'Open for business, dear.';
let B: Built | null = null;

function build(): Built {
  const base = add(resto, new Group()), still = add(base, new Group());
  const looks = [0, 1, 2].map(() => { const g = add(resto, new Group()); g.visible = false; return g; });
  const [, l2, l3] = looks;

  // ---- the front door, from the arena: a noren across it, a red lantern either side ----
  const DOOR = { x0: -1.9, x1: -0.7 }, DX = (DOOR.x0 + DOOR.x1) / 2;
  // (three of it: torn while it's a ruin, patched with a paper OPEN sign as it reopens, then whole)
  const norenOf = (torn: boolean, open: boolean) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    const n = 3, sw = w / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = '#23305A';
      if (!torn) { c.fillRect(i * sw + 3, 0, sw - 6, h); continue; }
      // a ragged hem, one strip half gone
      const end = i === 1 ? h * 0.45 : h * (0.78 + 0.08 * i);
      c.beginPath(); c.moveTo(i * sw + 3, 0); c.lineTo(i * sw + sw - 3, 0);
      for (let k = 0; k <= 6; k++) c.lineTo(i * sw + sw - 3 - k * (sw - 6) / 6, end - ((k * 7 + i * 3) % 5) * h * 0.035);
      c.closePath(); c.fill();
    }
    c.fillStyle = '#1A2444'; c.fillRect(0, 0, w, h * 0.14);
    c.fillStyle = torn ? '#9A9488' : '#F2EEE2'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(h * 0.4)}px ${MINCHO}`;
    c.fillText('ちゃんこ', w / 2, h * 0.6);
    if (open) {
      c.save(); c.translate(w * 0.72, h * 0.72); c.rotate(-0.12);
      c.fillStyle = '#F4EEDC'; c.fillRect(-w * 0.16, -h * 0.13, w * 0.32, h * 0.26);
      c.fillStyle = '#B0202E'; c.font = `800 ${Math.round(h * 0.16)}px ${FONT}`; c.fillText('OPEN', 0, 2);
      c.restore();
    }
  };
  const NW = DOOR.x1 - DOOR.x0 + 0.1;
  const noren = sign(base, DX, 1.68, RESTO.z0 - 0.02, NW, 0.62, 0, norenOf(false, false));
  const norens = [norenOf(true, false), norenOf(true, true), null].map(d => d ? new MeshLambertMaterial({ map: canvasTex(Math.round(NW * 220), Math.round(0.62 * 220), d).tex, side: DoubleSide, alphaTest: 0.5 }) : noren.material as Material);
  for (const x of [DOOR.x0 - 0.35, DOOR.x1 + 0.35]) lantern(base, M.red, x, 1.75, RESTO.z0 + 0.12, 0.25);
  // ---- the cookware shop's back door, from the dining wing: a long noren, the shop's own (道具, tools), on the wing's
  // side of its lintel; in rags, faded and torn, while she's shut, and whole once she's open ----
  const SD = DOORS.find(d => d.a === 'wing' && d.b === 'craft')!, SW = SD.x1 - SD.x0 + 0.5, SH = 1.4;
  const shopNorenOf = (torn: boolean) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    const n = 3, sw = w / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = torn ? '#3B4363' : '#23305A';
      if (!torn) { c.fillRect(i * sw + 3, 0, sw - 6, h); continue; }
      // a ragged hem, each strip torn off at its own length, the middle one shortest
      const end = h * [0.82, 0.5, 0.68][i];
      c.beginPath(); c.moveTo(i * sw + 3, 0); c.lineTo(i * sw + sw - 3, 0);
      for (let k = 0; k <= 7; k++) c.lineTo(i * sw + sw - 3 - k * (sw - 6) / 7, end - ((k * 5 + i * 3) % 4) * h * 0.04);
      c.closePath(); c.fill();
    }
    c.fillStyle = torn ? '#2A3048' : '#1A2444'; c.fillRect(0, 0, w, h * 0.08);
    if (torn) {
      // a hole worn through the first strip, and a stain down the last
      c.clearRect(sw * 0.35, h * 0.5, sw * 0.25, h * 0.08);
      c.fillStyle = 'rgba(40, 30, 20, 0.45)'; c.fillRect(sw * 2.3, h * 0.15, sw * 0.35, h * 0.35);
    }
    c.fillStyle = torn ? '#8E8A80' : '#F4F1EA'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(sw * 0.62)}px ${FONT}`;
    c.fillText('道', sw / 2, h * 0.3); c.fillText('具', sw * 2.5, h * 0.3);
    c.lineWidth = sw * 0.07; c.strokeStyle = c.fillStyle; c.beginPath(); c.arc(w / 2, h * 0.24, sw * 0.17, 0, Math.PI * 2); c.stroke();
  };
  const shopNorens = [true, false].map(t => new MeshLambertMaterial({ map: canvasTex(Math.round(SW * 160), Math.round(SH * 160), shopNorenOf(t)).tex, side: DoubleSide, alphaTest: 0.5 }));
  const shopNoren = plane(base, shopNorens[0], (SD.x0 + SD.x1) / 2, 1.93 - SH / 2, (SD.z0 + SD.z1) / 2 + 0.15, SW, SH);
  // ---- the back wall behind Mama: a panel over the arena's low wall, the name board on it ----
  const BACK = { x0: K.x0 - 0.1, x1: RISE.x - 0.32 }, BZ = ARENA.z1 + 0.1;
  box(still, M.wood, (BACK.x0 + BACK.x1) / 2, WALL + 0.4, BZ, BACK.x1 - BACK.x0, 0.8, 0.1);
  box(still, M.woodDark, (BACK.x0 + BACK.x1) / 2, WALL + 0.83, BZ, BACK.x1 - BACK.x0 + 0.06, 0.06, 0.16);
  const nameBoard = (lacquer: boolean) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = lacquer ? '#1A0E0A' : '#5A3422'; c.fillRect(0, 0, w, h);
    c.strokeStyle = lacquer ? '#D2AA4A' : '#C9A23A'; c.lineWidth = lacquer ? 5 : 9; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = lacquer ? '#E8C46A' : '#F2E2B0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${Math.round(h * 0.4)}px ${FONT}`; c.fillText('HONEST CHANKO', w / 2, h * 0.44);
    c.fillStyle = lacquer ? '#C9A23A' : '#E0B860'; c.font = `700 ${Math.round(h * 0.15)}px ${FONT}`; c.fillText("MAMA MORAY'S · SINCE YESTERDAY", w / 2, h * 0.79);
  };
  const BW = 1.65, board = sign(base, (K.x0 + RISE.x - 0.32) / 2, WALL + 0.42, BZ + 0.066, BW, 0.48, 0, nameBoard(false), 300);
  const boards: [Material, Material] = [board.material as Material, new MeshLambertMaterial({ map: canvasTex(Math.round(BW * 300), 144, nameBoard(true)).tex })];
  // the menu: a chalkboard on its stand in the corner by the door
  const menu = sign(base, RESTO.x0 + 0.42, 0.62, RESTO.z0 + 0.35, 0.6, 0.78, 0.55, (c, w, h) => {
    c.fillStyle = '#1F2A24'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6A4630'; c.lineWidth = 12; c.strokeRect(0, 0, w, h);
    c.fillStyle = '#E8E4D8'; c.textAlign = 'center'; c.font = `800 ${Math.round(h * 0.13)}px ${FONT}`; c.fillText('MENU', w / 2, h * 0.2);
    c.font = `600 ${Math.round(h * 0.085)}px ${FONT}`; ['Chanko', 'Chanko', 'Big chanko', 'Ask Mama'].forEach((t, i) => c.fillText(t, w / 2, h * (0.4 + i * 0.15)));
  });
  menu.rotation.x = -0.12;
  for (const s of [-1, 1]) { const leg = box(still, M.woodDark, RESTO.x0 + 0.42 + s * 0.26 * Math.cos(0.55), 0.5, RESTO.z0 + 0.3 - s * 0.26 * Math.sin(0.55), 0.04, 1.0, 0.04); leg.rotation.x = 0.12; }

  // ---- the counter, the belt round its top, the chute from the hatch ----
  const counter = box(base, M.wood, (K.x0 + K.x1) / 2, K.h / 2, (K.z0 + K.z1) / 2, K.x1 - K.x0, K.h, K.z1 - K.z0);
  const counters: [Material, Material] = [M.wood, M.lacquer];
  box(still, M.top, (K.x0 + K.x1) / 2, K.h + 0.02, (K.z0 + K.z1) / 2, K.x1 - K.x0 + 0.12, 0.04, K.z1 - K.z0 + 0.12);
  // (a foot rail along its front, for the stools)
  box(still, M.brass, (K.x0 + K.x1) / 2, 0.22, K.z1 + 0.09, K.x1 - K.x0 - 0.2, 0.03, 0.03, false);
  const belt = new MeshLambertMaterial({ map: slats(12, 1) });
  const run = (a: Vector3, b: Vector3) => {
    const mid = a.clone().lerp(b, 0.5), len = a.distanceTo(b), alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    const o = box(still, belt, mid.x, mid.y - CY - 0.02, mid.z, alongX ? len + 0.26 : 0.26, 0.03, alongX ? 0.26 : len + 0.26, false);
    for (const s of [-1, 1]) box(still, M.steelDark, mid.x + (alongX ? 0 : s * 0.15), mid.y - CY, mid.z + (alongX ? s * 0.15 : 0), alongX ? len + 0.3 : 0.025, 0.05, alongX ? 0.025 : len + 0.3, false);
    return o;
  };
  for (let i = 1; i < LOOP.length - 1; i++) run(LOOP[i - 1], LOOP[i]);
  // the slot in the counter's top the bowls come up through, a steel rim round it
  box(still, 0x0B0C0D, RISE.x, K.h + 0.045, RISE.z, 0.24, 0.01, 0.26, false);
  for (const s of [-1, 1]) { box(still, M.steel, RISE.x + s * 0.14, K.h + 0.05, RISE.z, 0.03, 0.02, 0.32, false); box(still, M.steel, RISE.x, K.h + 0.05, RISE.z + s * 0.15, 0.31, 0.02, 0.03, false); }
  // on the counter's inside: her till, a stack of clean bowls, a pot of her own
  box(still, M.brass, TILL.x, K.h + 0.16, TILL.z, 0.34, 0.24, 0.26);
  box(still, M.brass, TILL.x, K.h + 0.31, TILL.z - 0.03, 0.3, 0.06, 0.18).rotation.x = -0.4;
  const NOTES = lam(0x7AA65E);
  for (let i = 0; i < 5; i++) { const n = box(still, NOTES, TILL.x - 0.08 + i * 0.04, K.h + 0.3 + (i % 2) * 0.02, TILL.z + 0.1, 0.06, 0.012, 0.12, false); n.rotation.set(0.5, 0, (i - 2) * 0.2); }
  for (let i = 0; i < 6; i++) cyl(still, M.bowl, LX0 + 0.45, K.h + 0.07 + i * 0.045, TILL.z, 0.08 - i * 0.002, 0.05);
  nabe(base, LX1 - 0.55, K.h + 0.04, TILL.z, 0.6);
  // Mama Moray, behind her counter
  const mm = mama(); mm.position.set(MAMA.x, CY, MAMA.z); settle(mm); base.add(mm);
  // stools along the front
  const stools = add(base, new Group());
  for (const s of STOOLS) stool(stools, s.x, s.z, 0.62);

  // ---- the tables: each its own, with what's set out on it (a nabe and two bowls) ----
  const tables = TABLES.map(t => {
    const g = add(base, new Group()), set = add(g, new Group());
    cyl(g, M.woodDark, t.x, 0.36, t.z, 0.06, 0.72); cyl(g, M.woodDark, t.x, 0.02, t.z, 0.24, 0.04);
    cyl(g, M.top, t.x, 0.73, t.z, 0.42, 0.04);
    nabe(set, t.x, 0.75, t.z, 0.72);
    for (const s of [-1, 1]) {
      stool(g, t.x + s * TABLE_SEAT, t.z, 0.45);
      const b = bowlModel(); b.position.set(t.x + s * 0.27, CY + 0.75, t.z + 0.06); set.add(b);
    }
    // (a paper lantern over each)
    lantern(base, M.paper, t.x, 2.25, t.z, 0.5);
    return { g, set };
  });
  for (const x of [0.4, 2.4]) lantern(base, M.paper, x, 2.35, (K.z0 + K.z1) / 2, 0.5);

  // ---- the restroom ----
  buildLoo(base, still);
  const stallB = add(base, new Group()); stallB.position.set(STALLS.x, CY, STALL_DOOR.z0);
  {
    const W = STALL_DOOR.z1 - STALL_DOOR.z0;
    const d = add(stallB, mesh(G.box, M.teal, 0, 0.8, W / 2, true)); d.scale.set(0.04, 1.25, W - 0.02);
    // (the group's at the floor already: its pieces' heights are its own)
    const oo = sign(stallB, 0.025, 1.12 - CY, W / 2, 0.7, 0.26, Math.PI / 2, (c, w, h) => {
      c.fillStyle = '#F2EEE2'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#B0202E'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(h * 0.5)}px ${FONT}`; c.fillText('OUT OF ORDER', w / 2, h / 2 + 2);
    });
    (oo.material as MeshLambertMaterial).emissive.setHex(0x404040);
    box(stallB, M.steel, 0.04, 0.95 - CY, W - 0.08, 0.04, 0.12, 0.03, false);
  }
  const T = tapeMat(), tapeWhole = add(base, new Group()), tapeTorn = add(base, new Group());
  {
    const x = STALLS.x + 0.06, z0 = STALLS.b.z0 + 0.05, z1 = STALLS.b.z1 - 0.05, len = Math.hypot(z1 - z0, 0.6);
    for (const s of [-1, 1]) {
      const strip = add(tapeWhole, new Mesh(new PlaneGeometry(len, 0.07), T));
      strip.position.set(x + (s + 1) * 0.004, CY + 0.95, (z0 + z1) / 2); strip.rotation.set(0, -Math.PI / 2, s * Math.atan2(0.6, z1 - z0));
    }
    // torn away: a length hanging off the front's north end, and a scrap off its south end
    const hang = add(tapeTorn, new Mesh(new PlaneGeometry(0.9, 0.07), T));
    hang.position.set(x, CY + 0.78, z0 + 0.08); hang.rotation.set(0, -Math.PI / 2, 1.35);
    const scrap = add(tapeTorn, new Mesh(new PlaneGeometry(0.3, 0.07), T));
    scrap.position.set(x, CY + 1.12, z1 - 0.08); scrap.rotation.set(0, -Math.PI / 2, -1.1);
  }
  // the bare bulb over the out-of-order stall, on its wire
  const bulbOn = new MeshLambertMaterial({ color: 0xFFF2C0, emissive: 0xFFD27A }), bulbOff = lam(0x6A6450);
  const BX = (LOO.x0 + STALLS.x) / 2, BZ2 = (CLUB_DOOR.z0 + CLUB_DOOR.z1) / 2;
  cyl(still, 0x1B1A1E, BX, 2.75, BZ2, 0.008, 0.7, false);
  cyl(still, 0x2A2A2E, BX, 2.38, BZ2, 0.025, 0.05, false);
  const bulb = ball(base, bulbOn, BX, 2.29, BZ2, 0.055, 0.07, 0.055);
  // a pink light leaking out under the stall's back, once there's something behind it
  const leak = add(base, new Mesh(new PlaneGeometry(0.16, CLUB_DOOR.z1 - CLUB_DOOR.z0 - 0.1), new MeshBasicMaterial({ color: 0xFF5FA8, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false })));
  leak.rotation.x = -Math.PI / 2; leak.position.set(CLUB_DOOR.x + 0.14, CY + 0.014, BZ2); leak.visible = false;

  // ---- level 3, Mama's touch: photos, red lanterns strung along the walls, checked cloths ----
  const photo = (p: Object3D, x: number, y: number, z: number, ry: number, w: number, h: number, kind: number) => sign(p, x, y, z, w, h, ry, (c, cw, ch) => {
    c.fillStyle = '#2A1A10'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = kind === 2 ? '#C8B48C' : '#B8B0A0'; c.fillRect(cw * 0.1, ch * 0.08, cw * 0.8, ch * 0.84);
    c.fillStyle = 'rgba(40,30,20,.75)';
    if (kind === 2) {
      // the family's portrait: Mama in the middle, two of hers either side
      for (const [px, r] of [[0.5, 0.17], [0.25, 0.12], [0.75, 0.12]]) { c.beginPath(); c.ellipse(cw * px, ch * 0.42, cw * r * 0.6, ch * r, 0, 0, Math.PI * 2); c.fill(); c.fillRect(cw * (px - r * 0.8), ch * 0.55, cw * r * 1.6, ch * 0.32); }
    } else {
      // two wrestlers locked at the middle of a ring
      c.beginPath(); c.arc(cw * 0.5, ch * 0.78, cw * 0.36, Math.PI, 0); c.fill();
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cw * (0.5 + s * 0.13), ch * 0.5, cw * 0.14, ch * 0.2, s * 0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(cw * (0.5 + s * 0.2), ch * 0.27, cw * 0.06, 0, Math.PI * 2); c.fill(); }
    }
  }, 160);
  photo(l2, K.x0 - 0.05, WALL + 0.4, BZ + 0.066, 0, 0.26, 0.34, 0);
  photo(l2, RISE.x - 0.47, WALL + 0.4, BZ + 0.066, 0, 0.22, 0.3, 1);
  photo(l2, RESTO.x0 - 0.02, 0.72, 9.9, Math.PI / 2, 0.6, 0.42, 2);
  for (const [i, x] of [4.6, 7.6, 8.6, 9.8].entries()) photo(l2, x, 0.72, WING.z0 - 0.222, 0, 0.36, 0.3, i % 2);
  const strings: [Vector3, Vector3][] = [[V(CRAFT.x0 - 0.2, CY + 1.85, WING.z0 - 0.28), V(WING.x1 - 0.1, CY + 1.85, WING.z0 - 0.28)], [V(RESTO.x0 - 0.1, CY + 1.85, RESTO.z0 + 0.2), V(RESTO.x0 - 0.1, CY + 1.85, RESTO.z1 - 0.1)]];
  for (const [a, b] of strings) {
    for (const q of [a, b]) cyl(l2, M.woodDark, q.x, (q.y - CY + WALL) / 2, q.z, 0.025, q.y - CY - WALL + 0.1, false);
    const pts = sag(a, b, 0.18, 12);
    wire(l2, pts, 0.008, 0x1B1A1E);
    for (let i = 1; i < 12; i += 1.5) { const q = sag(a, b, 0.18, 24)[Math.round(i * 2)]; lantern(l2, M.red, q.x, q.y - CY - 0.24, q.z, 0.05); }
  }
  for (const t of TABLES) { const c = cyl(l2, new MeshLambertMaterial({ map: gingham(3, 1) }), t.x, 0.735, t.z, 0.47, 0.06); c.castShadow = false; }

  // ---- level 6, the Family's front: dark panelling, purple banners, the lacquered board and counter, the curtain ----
  const panel = (x0: number, x1: number, z0: number, z1: number) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = alongX ? x1 - x0 : z1 - z0;
    plane(l3, new MeshLambertMaterial({ map: panelling(Math.max(1, Math.round(len / 1.2)), 1) }), (x0 + x1) / 2, (WALL - 0.16) / 2 + 0.16, (z0 + z1) / 2, len, WALL - 0.16, alongX ? 0 : Math.PI / 2);
  };
  panel(RESTO.x0, DOOR.x0 - 0.1, BZ + 0.075, BZ + 0.075); panel(DOOR.x1 + 0.1, RISE.x - 0.32, BZ + 0.075, BZ + 0.075);
  panel(RESTO.x0 - 0.032, RESTO.x0 - 0.032, RESTO.z0, RESTO.z1);
  // (either side of the doorway to the cookware shop)
  panel(CRAFT.x0 - 0.2, 5.6, WING.z0 - 0.233, WING.z0 - 0.233); panel(7.0, WING.x1, WING.z0 - 0.233, WING.z0 - 0.233);
  plane(l3, new MeshLambertMaterial({ map: panelling(3, 1) }), (BACK.x0 + BACK.x1) / 2, WALL + 0.4, BZ + 0.058, BACK.x1 - BACK.x0, 0.8);
  const fishBanner = new MeshLambertMaterial({
    side: DoubleSide, map: canvasTex(48, 192, (c, w, h) => {
      c.fillStyle = '#5B2A86'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#D2AA4A'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 8, w, 8); c.fillRect(4, 10, 2, h - 18); c.fillRect(w - 6, 10, 2, h - 18);
      c.beginPath(); c.ellipse(w / 2, h * 0.5, w * 0.24, h * 0.13, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(w / 2, h * 0.62); c.lineTo(w * 0.3, h * 0.72); c.lineTo(w * 0.7, h * 0.72); c.fill();
    }).tex,
  });
  const banner = (x: number, z: number, ry: number, off: [number, number]) => {
    cyl(l3, M.woodDark, x, (WALL + 2.35) / 2, z, 0.025, 2.35 - WALL, false);
    box(l3, M.gold, x + off[0] / 2, 2.3, z + off[1] / 2, Math.abs(off[0]) + 0.03, 0.03, Math.abs(off[1]) + 0.03, false);
    const b = add(l3, new Mesh(new PlaneGeometry(0.3, 0.95), fishBanner)); b.position.set(x + off[0], CY + 1.8, z + off[1]); b.rotation.y = ry;
  };
  for (const x of [5.0, 7.2, 9.4]) banner(x, WING.z0 - 0.3, 0, [0, 0.16]);
  for (const z of [8.7, 11.0]) banner(RESTO.x0 - 0.1, z, Math.PI / 2, [0.16, 0]);
  box(l3, M.gold, (K.x0 + K.x1) / 2, K.h - 0.06, K.z1 + 0.005, K.x1 - K.x0, 0.02, 0.01, false);
  box(l3, M.gold, (BACK.x0 + BACK.x1) / 2, WALL + 0.06, BZ + 0.06, BACK.x1 - BACK.x0, 0.015, 0.01, false);

  // ---- the diners: your fans, in from the arena, as many as there's been chanko lately ----
  const diners = ORDER.slice(0, 14).map((si, i): Diner => {
    const p = belowGround(crowdModel(crowdStyle(300_000 + i), i % 2 ? 'hooligan' : 'yakuza'));
    p.restyle(0xFF6B4A, p.style);
    const seat = SEATS[si];
    p.position.set(seat.x, CY + seat.top - 0.3, seat.z); p.rotation.y = seat.face;
    for (const l of p.legs) l.rotation.x = -1.45;
    p.visible = false; base.add(p);
    return { p, seat, eat: seat.counter ? 0 : 1e9, t: i * 0.7 };
  });

  // the bowls riding the belt
  const bowls = Array.from({ length: 16 }, () => { const o = bowlModel(); o.visible = false; base.add(o); return { o, d: -1 }; });
  flatten(still);
  // the belt under the floor, from a hatch at the hearth's west end (each bowl ladled across into it) to her counter's
  // slot: under the hearth room, the soup square and the arena's wall
  const under = underBelt(UNDER, CY, { clear: floorClear, arrive: () => { due += 1; } });
  base.add(under.group);
  const drops = Array.from({ length: 4 }, () => { const o = add(base, bowlModel()); o.visible = false; return { o, busy: false }; });
  const ruin = buildRuin(base);
  // what she says, over her
  const says = bubble(base, 2.2); says.sprite.position.set(MAMA.x, CY + 2.35, MAMA.z);
  const middle = add(base, new Group()); middle.position.set(3.2, CY, 12.0);
  return { middle, says, opened: false, diners, mama: mm, bowls, looks, board, boards, counter, counters, stallB, tapeWhole, tapeTorn, bulb, bulbOn, bulbOff, leak, under, drops, tables, stools, noren, norens, shopNoren, shopNorens, ruin };
}

// ---------- before it opens (Word on the street 0 to 2) ----------
/** What's out front before Mama Moray's opens, and as it does, by Word on the street's level: at 0 a wreck (its tables
 *  and stools knocked over where they stood, broken planks along the walls, boards up out of the floor, cobwebs in the
 *  corners, the restroom's floor cracked); at 1 being cleared (the tables stood back up, the rubble in neat stacks by
 *  the walls, a broom and a bucket, new pale boards in the floor and nailed over the walls, tape round the broken
 *  tables); at 2 open on a shoestring (crates for a couple of tables, bare bulbs on wires, the new boards and the tape
 *  still there). Dust sheets cover her counter till it opens. Nothing of it on the walkways or in front of a door. */
interface Ruin { wreck: Group; clearing: Group; patched: Group; mended: Group; closed: Group; crates: number[] }
/** The tables that are crates when it reopens. */
const CRATES = [3, 5, 7];
function buildRuin(base: Object3D): Ruin {
  const [wreck, clearing, patched, mended, closed] = [0, 0, 0, 0, 0].map(() => { const g = add(base, new Group()); g.visible = false; return g; });
  const PLANK = lam(0xB89A72), PLASTER = lam(0x9C968A), PALE = lam(0xD2B088), SHEET = lam(0xD4CFC4), HOLE = lam(0x140D08), CRATE = lam(0xA27848);
  const floor = (p: Object3D, m: Material, x: number, z: number, w: number, d: number, ry = 0) => {
    const o = add(p, new Mesh(new PlaneGeometry(w, d), m)); o.rotation.set(-Math.PI / 2, 0, ry); o.position.set(x, CY + 0.022, z); o.receiveShadow = true; return o;
  };
  // the tables and stools knocked over where they stood, and the counter's stools
  TABLES.forEach((t, i) => {
    const s = i % 2 ? 1 : -1;
    const top = cyl(wreck, M.top, t.x + 0.18 * s, 0.4, t.z + 0.05, 0.42, 0.04); top.rotation.z = 1.2 * s;
    const leg = cyl(wreck, M.woodDark, t.x - 0.2 * s, 0.07, t.z, 0.06, 0.6); leg.rotation.z = Math.PI / 2;
    for (const k of [-1, 1]) {
      const st = add(wreck, new Group()); st.position.set(t.x + k * TABLE_SEAT, CY, t.z + (k === s ? 0.15 : -0.1)); st.rotation.set(Math.PI / 2, 0, i + k);
      cyl(st, M.woodDark, 0, 0.17 - CY, 0, 0.17, 0.05); cyl(st, M.iron, 0, -CY, 0, 0.03, 0.4);
    }
  });
  for (const [i, s] of STOOLS.entries()) if (i % 2 === 0) { const st = cyl(wreck, M.woodDark, s.x + 0.1, 0.17, s.z, 0.17, 0.05); st.rotation.x = 1.4; }
  // broken planks and rubble along the walls, at 0; stacked neat at 1
  const WALLS = [
    { x: RESTO.x0 + 0.3, z: 10.1, ry: Math.PI / 2 }, { x: RESTO.x0 + 0.3, z: 11.1, ry: Math.PI / 2 }, { x: -2.2, z: RESTO.z1 - 0.3, ry: 0 },
    { x: 2.2, z: WING.z1 - 0.3, ry: 0 }, { x: 4.8, z: WING.z1 - 0.3, ry: 0 }, { x: 7.6, z: WING.z1 - 0.3, ry: 0 }, { x: 9.9, z: WING.z1 - 0.3, ry: 0 },
    { x: WING.x1 - 0.3, z: 13.0, ry: Math.PI / 2 }, { x: WING.x1 - 0.3, z: 14.9, ry: Math.PI / 2 },
  ];
  // (twice what a real plank is, so it reads at the game's distance)
  WALLS.forEach((w, i) => {
    const ax = Math.cos(w.ry), az = -Math.sin(w.ry);
    for (let k = 0; k < 5; k++) {
      const p = box(wreck, k % 2 ? PLANK : M.woodDark, w.x + ax * (k - 2) * 0.2, 0.05 + (k % 3) * 0.05, w.z + az * (k - 2) * 0.2, 0.9 - k * 0.09, 0.07, 0.14);
      p.rotation.set((k % 2) * 0.15, w.ry + (k - 2) * 0.55 + i, 0);
    }
    for (let k = 0; k < 3; k++) box(wreck, PLASTER, w.x + ax * (k - 1) * 0.3 + 0.1, 0.07, w.z + az * (k - 1) * 0.3 + 0.1, 0.22 - k * 0.04, 0.14 - k * 0.03, 0.18).rotation.y = i + k;
  });
  for (const w of [WALLS[1], WALLS[4], WALLS[8]]) {
    for (let k = 0; k < 5; k++) box(clearing, k % 2 ? PLANK : M.woodDark, w.x, 0.04 + k * 0.07, w.z, 0.9, 0.07, 0.14).rotation.y = w.ry + Math.PI / 2 + (k % 2) * 0.06;
  }
  // a broom against the wing's east wall, a bucket by it
  const broom = add(clearing, new Group()); broom.position.set(WING.x1 - 0.2, CY, 12.8); broom.rotation.z = 0.22;
  cyl(broom, 0xB89A6A, 0, 0.6 - CY, 0, 0.018, 1.2, false); box(broom, 0xC9A060, 0, 0.06 - CY, 0, 0.08, 0.12, 0.26);
  cyl(clearing, M.steelDark, WING.x1 - 0.32, 0.13, 13.25, 0.13, 0.26); cyl(clearing, 0x2A3A44, WING.x1 - 0.32, 0.25, 13.25, 0.11, 0.01, false);
  // boards up out of the floor at 0 (dark gaps), new pale ones in their place from 1
  const GAPS = [{ x: -1.6, z: 10.95 }, { x: 5.6, z: 14.25 }, { x: 8.1, z: 13.95 }, { x: 3.7, z: 15.45 }];
  for (const g of GAPS) { floor(wreck, HOLE, g.x, g.z, 1.1, 0.16); floor(mended, PALE, g.x, g.z, 1.1, 0.16); floor(mended, PALE, g.x + 0.1, g.z + 0.17, 0.8, 0.15); }
  // and pale boards nailed over the walls' broken stretches
  for (const [x, z, ry] of [[RESTO.x0 + 0.04, 9.6, Math.PI / 2], [6.3, WING.z1 - 0.04, 0], [WING.x1 - 0.04, 14.0, Math.PI / 2]] as const) {
    for (const k of [0, 1]) { const b = box(mended, PALE, x, 0.55 + k * 0.28, z, 0.75, 0.1, 0.03, false); b.rotation.set(0, ry, (k ? -1 : 1) * 0.18); }
  }
  // tape round the broken tables (1 and 2), and the crates in place of some (2)
  TABLES.forEach((t, i) => {
    if (i % 3 === 1) for (const a of [0.7, -0.7]) { const tp = box(mended, M.tape, t.x, 0.757, t.z, 0.78, 0.006, 0.06, false); tp.rotation.y = a; }
    if (CRATES.includes(i)) {
      box(patched, CRATE, t.x, 0.3, t.z, 0.62, 0.6, 0.62);
      for (const k of [-1, 0, 1]) box(patched, M.woodDark, t.x, 0.15 + (k + 1) * 0.2, t.z + 0.315, 0.64, 0.025, 0.01, false);
      for (const sd of [-1, 1]) stool(patched, t.x + sd * TABLE_SEAT, t.z, 0.4);
    }
  });
  // cobwebs in the corners
  const web = new MeshLambertMaterial({
    side: DoubleSide, transparent: true, depthWrite: false, map: canvasTex(128, 128, (c, w) => {
      // (fanned out from its top middle, where the corner is)
      c.strokeStyle = 'rgba(240,240,236,.85)'; c.lineWidth = 3;
      const fan = (t: number, q: number): [number, number] => [w / 2 + Math.cos(t) * q, Math.sin(t) * q];
      for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(...fan(t, w)); c.stroke(); }
      for (let r = 14; r < w * 0.7; r += 14) { c.beginPath(); for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI, q = r + ((a * 7) % 5); if (a) c.lineTo(...fan(t, q)); else c.moveTo(...fan(t, q)); } c.stroke(); }
    }).tex,
  });
  for (const [x, z, ry] of [[RESTO.x0, RESTO.z1, Math.PI * 0.75], [WING.x1, WING.z1, -Math.PI * 0.75], [WING.x1, WING.z0, -Math.PI * 0.25], [WING.x0, WING.z1, Math.PI * 0.75]] as const) {
    const o = add(wreck, new Mesh(new PlaneGeometry(1.3, 0.9), web)); o.position.set(x + Math.sin(ry) * 0.45, CY + WALL - 0.4, z + Math.cos(ry) * 0.45); o.rotation.y = ry;
  }
  // the restroom's floor cracked, a few tiles gone
  for (const [x, z, a] of [[-1.9, 13.3, 0.4], [-0.6, 14.6, -0.7], [-1.4, 15.6, 1.1]] as const) box(wreck, 0x2A2420, x, 0.02, z, 0.7, 0.005, 0.02, false).rotation.y = a;
  for (const [x, z] of [[-1.15, 13.9], [-0.25, 15.3]] as const) floor(wreck, HOLE, x, z, 0.24, 0.24);
  // bare bulbs on wires as it reopens
  const BULB = new MeshLambertMaterial({ color: 0xFFF2C0, emissive: 0xFFD27A });
  for (const [x, z] of [[-1.0, 10.7], [1.8, 10.8], [3.6, 13.3], [6.3, 14.2], [8.8, 13.3], [5.0, 15.3]] as const) {
    cyl(patched, 0x1B1A1E, x, 2.6, z, 0.008, 0.7, false); ball(patched, BULB, x, 2.22, z, 0.06, 0.08, 0.06);
  }
  // dust sheets over her counter while it's shut
  box(closed, SHEET, (K.x0 + K.x1) / 2, K.h + 0.06, (K.z0 + K.z1) / 2, K.x1 - K.x0 + 0.16, 0.1, K.z1 - K.z0 + 0.16);
  for (const [x, w] of [[K.x0 + 0.9, 1.6], [K.x1 - 0.8, 1.4]] as const) { const d = box(closed, SHEET, x, K.h - 0.28, K.z1 + 0.1, w, 0.62, 0.03); d.rotation.x = 0.06; }
  return { wreck, clearing, patched, mended, closed, crates: CRATES };
}

/** The restroom: a tiled face along its north wall, a mirror and two basins on it, the WC sign by its door; the two
 *  stalls along its west wall, the first shut (someone's feet under it), the second out of order. */
function buildLoo(base: Object3D, still: Object3D) {
  const tiles = repeat(128, (c, w, h) => {
    c.fillStyle = '#E8E6DE'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,80,70,.35)'; for (let k = 0; k <= 4; k++) { c.fillRect(k * w / 4 - 1, 0, 2, h); c.fillRect(0, k * h / 4 - 1, w, 2); }
    c.strokeStyle = 'rgba(40,40,30,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w * 0.6, h * 0.25); c.lineTo(w * 0.68, h * 0.42); c.lineTo(w * 0.62, h * 0.5); c.stroke();
    c.fillStyle = '#2E8A7E'; c.fillRect(0, h - 10, w, 10);
  });
  const FACE = LOO.z0 - 0.17, H = 1.75;
  const face = add(still, new Mesh(new PlaneGeometry(LOO.x1 - LOO.x0, H), new MeshLambertMaterial({ map: tiles((LOO.x1 - LOO.x0) / 1.0, H / 1.0) })));
  face.position.set((LOO.x0 + LOO.x1) / 2, CY + H / 2, FACE); face.receiveShadow = true;
  box(still, 0xE8E6DE, (LOO.x0 + LOO.x1) / 2, H / 2, FACE - 0.045, LOO.x1 - LOO.x0, H, 0.08);
  box(still, 0x2E8A7E, (LOO.x0 + LOO.x1) / 2, H + 0.02, FACE - 0.03, LOO.x1 - LOO.x0 + 0.04, 0.04, 0.14);
  // the mirror, over the basins
  const mx = (BASINS[0].x + BASINS[1].x) / 2;
  box(still, 0x8A8F94, mx, 1.38, FACE + 0.015, 1.42, 0.58, 0.02, false);
  add(base, mesh(new PlaneGeometry(1.34, 0.5), new MeshLambertMaterial({ color: 0xA8C8D0, emissive: 0x1A2A30 }), mx, CY + 1.38, FACE + 0.03));
  for (const b of BASINS) {
    box(still, M.porcelain, b.x, 0.82, b.z, 0.5, 0.12, 0.36);
    cyl(still, M.porcelain, b.x, 0.4, b.z - 0.04, 0.07, 0.8);
    box(still, M.steel, b.x, 0.94, b.z - 0.12, 0.03, 0.12, 0.03, false);
  }
  // the WC sign, on the wing's side by the door
  sign(base, WING.x0 - 0.222, 0.78, LOO.z0 + 0.8, 0.36, 0.36, Math.PI / 2, (c, w, h) => {
    c.fillStyle = '#2E7A78'; c.fillRect(0, 0, w, h); c.fillStyle = '#F2EEE2'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${Math.round(h * 0.42)}px ${FONT}`; c.fillText('WC', w / 2, h / 2 + 3);
  });
  // the stalls: their partitions, out from the west wall to their fronts, a gap under each
  const SX = STALLS.x, PH = 1.3, PY = 0.15 + PH / 2, mid = (LOO.x0 + SX) / 2, deep = SX - LOO.x0;
  for (const z of [STALLS.a.z1 + 0.015, STALLS.b.z1]) box(still, M.teal, mid, PY, z, deep, PH, 0.04);
  // the first's front, its door shut; a pair of shoes under it
  box(still, M.teal, SX, PY, (STALLS.a.z0 + STALLS.a.z1) / 2, 0.04, PH, STALLS.a.z1 - STALLS.a.z0);
  box(still, M.steel, SX + 0.03, 0.95, (STALLS.a.z0 + STALLS.a.z1) / 2 + 0.3, 0.03, 0.1, 0.03, false);
  for (const dz of [-0.09, 0.09]) box(still, 0x1A1A1E, SX - 0.22, 0.04, (STALLS.a.z0 + STALLS.a.z1) / 2 + dz, 0.24, 0.07, 0.11);
  // the second's front, either side of its door
  for (const [z0, z1] of [[STALLS.b.z0, STALL_DOOR.z0], [STALL_DOOR.z1, STALLS.b.z1]]) box(still, M.teal, SX, PY, (z0 + z1) / 2, 0.04, PH, z1 - z0);
  // (a cardboard sign stuck on crooked, on the second's front)
  const card = sign(base, SX + 0.03, 1.15, (STALL_DOOR.z1 + STALLS.b.z1) / 2, 0.42, 0.3, Math.PI / 2, (c, w, h) => {
    c.fillStyle = '#C8A472'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2A1A10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(h * 0.26)}px ${FONT}`;
    c.fillText('OUT OF', w / 2, h * 0.34); c.fillText('ORDER!!', w / 2, h * 0.68);
  });
  card.rotation.z = 0.18; (card.material as MeshLambertMaterial).emissive.setHex(0x302418);
  // the toilets: the first's against the wall, the second's against its south side, taped across
  const toilet = (x: number, z: number, ry: number, taped: boolean) => {
    const g = add(base, new Group()); g.position.set(x, CY, z); g.rotation.y = ry;
    const bowl = add(g, mesh(G.cyl, M.porcelain, 0, 0.21, 0.05, true)); bowl.scale.set(0.18, 0.42, 0.22);
    add(g, mesh(G.cyl, 0xE8E4DA, 0, 0.43, 0.05)).scale.set(0.19, 0.03, 0.23);
    const tank = add(g, mesh(G.box, M.porcelain, 0, 0.62, -0.17, true)); tank.scale.set(0.4, 0.4, 0.16);
    if (taped) for (const s of [-1, 1]) { const t = add(g, mesh(G.box, M.tape, 0, 0.455, 0.05)); t.scale.set(0.5, 0.012, 0.06); t.rotation.y = s * 0.7; }
  };
  toilet(LOO.x0 + 0.32, (STALLS.a.z0 + STALLS.a.z1) / 2, Math.PI / 2, false);
  toilet(LOO.x0 + 0.62, STALLS.b.z1 - 0.25, Math.PI, true);
}

// ---------- keeping it in step ----------
let made = false, t = 0;
/** Bowls waiting to come down the chute, chips taken at the till since the last pop over it, how busy it's been lately
 *  (bowls, wearing off), and the look it's dressed in (-1: not yet). */
let due = 0, sending = 0, sendT = 0, chips = 0, chipsT = 0, busy = 0, dressed = -1;
on.resto = (bowls, got) => {
  // (a bowl down the belt for every few sold: ladled across from the pot into its hatch, under the floor to her counter)
  sending = Math.min(sending + bowls / 4, 12);
  chips += got;
  busy += bowls;
};
/** Where it is, for Word on the street's level: 0 a wreck (levels 0 and 1), 1 being cleared (2 to 4, a bit more each
 *  level: the rubble stacked, then the floor patched and the tables stood up, then the stools), 2 open on a shoestring
 *  (5, Mama's in: fight.ts' RESTO_OPENS), 3 on its looks; and that look: 0 the back-street joint (6), 1 Mama's touch
 *  (7), 2 the Family's front (8). */
const stageOf = (n: number) => (n >= 6 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0);
const lookOf = (n: number) => (n >= 8 ? 2 : n >= 7 ? 1 : 0);
/** Her light's brightness, as made (none while it's a wreck, a little as it's cleared). */
let LIGHT = -1;
const tmp = V(0, 0, 0);

/** How it is, as drawn, for tests: how far it's come (stageOf), whether Mama's in, what she's saying, the diners in,
 *  the wreck, whether her belt's laid (its hatch and grates), and the bowls on their way under the floor. */
export const restoShows = () => B && ({
  stage: stageOf(dressed), mama: B.mama.visible, says: B.says.text, diners: B.diners.filter(d => d.p.visible).length,
  wreck: B.ruin.wreck.visible, belt: B.under.group.visible, under: B.under.riding(),
});
/** Dresses it for Word on the street's level `n`: from a wreck to the Family's front. `up`: bought just now (not just
 *  loaded), so what's new pops in. */
function dress(b: Built, n: number, up: boolean) {
  const st = stageOf(n), look = lookOf(n), r = b.ruin;
  const lit: Object3D[] = [];
  const show = (o: Object3D, on: boolean) => { if (on && !o.visible && up) lit.push(o); o.visible = on; };
  // (being cleared, a step a level: the rubble stacked; then the floor patched and the tables up; then the stools)
  const cleared = st === 1 ? n - 1 : st > 1 ? 3 : 0;
  show(r.wreck, st === 0); show(r.clearing, st === 1); show(r.patched, st === 2); show(r.mended, cleared >= 2 && st <= 2); r.closed.visible = st < 2;
  b.tables.forEach((t, i) => { show(t.g, cleared >= 2 && !(st === 2 && r.crates.includes(i))); t.set.visible = st >= 3; });
  show(b.stools, cleared >= 3);
  b.mama.visible = st >= 2;
  // (and her belt from the hearth room, its hatch and grates, laid only as she opens)
  show(b.under.group, st >= 2);
  b.noren.material = b.norens[st < 2 ? 0 : st === 2 ? 1 : 2];
  b.shopNoren.material = b.shopNorens[st < 2 ? 0 : 1];
  b.board.rotation.z = st < 2 ? 0.1 : 0;
  // (the lanterns dark till it opens; her light out while it's a wreck, a little more light in each step it's cleared)
  M.paper.emissiveIntensity = st < 2 ? 0 : 0.9; M.red.emissiveIntensity = st < 2 ? 0 : 1;
  M.paper.color.setHex(st < 2 ? 0x6E675A : 0xFFF1D6); M.red.color.setHex(st < 2 ? 0x5A2620 : 0xE0392B);
  if (LIGHT < 0) LIGHT = lights[13].intensity;
  lights[13].intensity = st === 0 ? 0 : st === 1 ? LIGHT * (0.15 + 0.15 * cleared) : LIGHT;
  b.looks.forEach((g, i) => { show(g, st >= 3 && i <= look); });
  b.board.material = b.boards[st >= 3 && look >= 2 ? 1 : 0];
  b.counter.material = b.counters[st >= 3 && look >= 2 ? 1 : 0];
  // (and the moment she opens: a word from her)
  if (up && st === 2 && !b.opened) { b.opened = true; b.says.say(OPENING); }
  // its own close-up, once the arena's is over (two goes, the arena first: cellarLooks.ts)
  if (lit.length) spotNext = { on: [b.middle], t: 0, seen: false };
}
/** The close-up waiting on the arena's: what changed. */
let spotNext: { on: Object3D[]; t: number; seen: boolean } | null = null;
/** Not with a boss in, nor while a scene has the player (as for the arena's). */
const free = () => !F.rush && !player.held && !staging();

/** Mama Moray's, every frame (stage 3): the belt and its bowls, the diners, Mama, the stall's tape and bulb, and the
 *  look. */
export function updResto(dt: number) {
  if (stage.n !== 3) return;
  if (!made) { made = true; B = apart(build, dice(0x4E571)); }
  const b = B!;
  t += dt;
  // how far it's come, as Word on the street's dressed the arena
  if (mods.street !== dressed) { dress(b, mods.street, dressed >= 0 && mods.street > dressed); dressed = mods.street; }
  // the bowls into the hatch by the hearth, a few a second, and along under the floor
  sendT -= dt;
  if (sending >= 1 && sendT <= 0) {
    const d = b.drops.find(o => !o.busy);
    if (d) {
      sending -= 1; sendT = 0.35; d.busy = true; d.o.visible = true;
      d.o.position.set(POT.x - 0.4, CY + POT_TOP, POT.z);
      const into = V(UNDER[0].x, CY - 0.15, UNDER[0].z);
      fly(d.o, () => into, 0.5, 0.5, () => { d.busy = false; d.o.visible = false; b.under.send(false); });
    }
  }
  b.under.update(dt);
  // the bowls up out of the slot and round the counter: one in as there's room behind the last
  busy *= Math.exp(-dt / 90);
  const last = Math.min(...b.bowls.filter(w => w.d >= 0).map(w => w.d), Infinity);
  if (due >= 1 && last > GAP) { const free = b.bowls.find(w => w.d < 0); if (free) { free.d = 0; free.o.visible = true; } due -= 1; }
  due = Math.min(due, 8);
  for (const w of b.bowls) {
    if (w.d < 0) continue;
    const was = w.d;
    w.d += BELT_V * dt;
    w.o.position.copy(along(w.d, tmp));
    // someone at the counter takes it as it passes (along its front), if they've finished their last
    if (w.d > CHUTE) {
      const at = (d: number) => along(d, V(0, 0, 0));
      const p0 = at(was), p1 = at(w.d);
      const taker = Math.abs(p1.z - LZ1) < 0.01 && b.diners.find(d => d.p.visible && d.seat.counter && d.eat <= 0 && Math.abs(d.seat.x - p1.x) < 0.12 && Math.sign(d.seat.x - p0.x) !== Math.sign(d.seat.x - p1.x));
      if (taker) { taker.eat = 9; w.d = -1; w.o.visible = false; continue; }
    }
    if (w.d > CHUTE + LAP * LAPS) { w.d = -1; w.o.visible = false; }
  }
  // the diners, once it's open: as many in as it's been busy (a couple of regulars always), eating
  const n = stageOf(mods.street) < 2 ? 0 : Math.min(b.diners.length, 2 + Math.round(busy / 8));
  b.diners.forEach((d, i) => {
    const want = i < n;
    if (want !== d.p.visible) { d.p.visible = want; if (want) popIn(d.p); }
    if (!want) return;
    if (!d.p.upToDate) { d.p.redress(); for (const l of d.p.legs) l.rotation.x = -1.45; }
    d.t += dt; d.eat -= dt;
    const eating = d.eat > 0 && (!d.seat.counter || d.eat < 8.5);
    d.p.arms[0].rotation.x = eating ? -1.9 + Math.sin(d.t * 9) * 0.3 : -0.7;
    d.p.arms[1].rotation.x = -0.7;
    d.p.body.scale.y = 1 + Math.sin(d.t * 2.4) * 0.012;
  });
  // Mama: breathing, an eye on whoever's at her counter
  const pp = player.g.position;
  b.mama.watch = level.down && Math.abs(pp.x - MAMA.x) < 3 && pp.z > RESTO.z0 && pp.z < RESTO.z1 + 0.5 ? pp : null;
  b.mama.update(dt);
  b.says.upd(dt);
  updRestoSound(dt, stageOf(mods.street) >= 2, Math.min(1, busy / 60));
  if (spotNext) {
    spotNext.t += dt;
    if (spotBusy()) spotNext.seen = true;
    else if (spotNext.seen || spotNext.t > 1) { if (free()) spotlight(spotNext.on, { close: 0.72, when: free }); spotNext = null; }
  }
  // chips over the till, a second's worth at a time
  chipsT -= dt;
  if (chipsT <= 0) {
    chipsT = 1;
    if (chips > 0 && level.down) popText(`+🐡 ${chips < 10 ? chips.toFixed(1).replace(/\.0$/, '') : Math.round(chips)}`, { x: TILL.x, y: CY + K.h + 0.6, z: TILL.z });
    chips = 0;
  }
  // the out-of-order stall: taped across till the scene tears it (its door swung wide then), its bulb flickering when
  // southDoor.ts says, and the pink light under its back once the second boss is beaten (not while it's open)
  const torn = F.den.way || stallDoor.torn;
  b.tapeWhole.visible = !torn; b.tapeTorn.visible = torn;
  stallTape.up = !torn;
  const swing = torn ? 1.25 : 0.55;
  b.stallB.rotation.y += (swing - b.stallB.rotation.y) * Math.min(1, dt * 5);
  const lit = stallDoor.flicker <= 0 || Math.floor(t * 14) % 3 === 0 || Math.sin(t * 61) > 0.6;
  b.bulb.material = lit ? b.bulbOn : b.bulbOff;
  b.leak.visible = F.beaten >= 2 && stallDoor.open < 0.5;
  (b.leak.material as MeshBasicMaterial).opacity = 0.3 + 0.12 * Math.sin(t * 2.1);
}
