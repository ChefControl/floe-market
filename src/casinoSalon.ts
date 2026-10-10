// The casino salon on the yacht's upper deck: walls of tall windows between slim gold mullions (white outside,
// burgundy inside) round a red carpet, under a hardtop with an LED line under its edge. On top, behind a glass
// windbreak: a sky lounge wrapped in dark glass with the CASINO sign on its roof (its bulbs chasing round it), a radar
// turning and a flag flying from its mast, and aft of it a teak sundeck with a hot tub (two guests soaking) and sun
// loungers. As in the restaurant, the roof lifts away and the walls on the camera's side fade while the player is
// inside. The games stand along the back wall, leaving the floor open from the door to them, and round them it's full
// of life: a row of slot machines along the stern wall with guests playing them (now and then one wins), a bar by the
// door with a bartender polishing glasses and two guests on stools, a waiter carrying a tray along the windows, potted
// palms, and a guest watching the wheel from the end of the roulette table who cheers when the player wins, none of
// them in the player's way. None of it touches the game's luck: the guests run on their own dice.
import {
  BoxGeometry, CanvasTexture, CylinderGeometry, Euler, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, MeshPhongMaterial, PlaneGeometry, Quaternion, Shape, ShapeGeometry, Vector3,
  RepeatWrapping, TorusGeometry, type Material,
} from 'three';
import { onCheer, speaker } from './casinoKit';
import { animPerson, Person, SUITS } from './characters';
import { aboard, DECKS, pushOutOfBox, SALON, SHIP, UPPER } from './layout';
import { bake, bakePainted, canvasTex, FONT, G, mesh, type Part } from './render';
import { drawReels, REELS_PX, slotRow } from './slotMachine';
import { FY, V, type XZ } from './util';
import { crowd, DRESSES, rng } from './wardrobe';
import { planks } from './world';

const GOLD = 0xE3B23C, WHITE = 0xFFFFFF, PAPER = 0x6E1A26;
/** The windows: how far apart, how wide, and their sill and head above the deck. */
const WIN = { pitch: 1.3, w: 1.2, sill: 0.45, head: 2.0 };
/** The door at the top of the stairs. */
const DOOR = DECKS.stairs.half + 0.2;
/** The bar across the stern, and the row of slot machines along the back (north) wall, in the ship's own space. */
/** The salon's layout, in the ship's own space. The games stand along the back (north) wall (layout.ts). The guests'
 *  slot machines line the stern wall, facing forward; the bar runs along the bow wall beside the door, its counter
 *  at `x`, the back bar against the wall and stools out front; the waiter walks along the windows. */
const ROW = { x: SALON.x0 + 0.42, zs: [-2.55, -1.7, -0.85, 0, 0.85, 1.7] };
const BAR = { x: 2.45, z0: -2.95, z1: -1.25, back: SALON.x1 - 0.2, stools: [-2.5, -1.6] };
const STOOL_X = BAR.x - 0.5;
/** Potted palms in the corners on the windows' side. */
const PALMS = [[SALON.x1 - 0.5, SALON.side - 0.5], [SALON.x0 + 0.5, SALON.side - 0.5]];

/** Draws a guest's or the bartender's dice: their own sequence, so the game's luck is left alone. */
const dice = rng(0xCA5170);

// ---------- materials ----------
/** A wall's materials: those of the walls on the camera's side fade (each wall its own), the others never do. */
function wallMats(fades: boolean) {
  const m = (c: number) => new MeshLambertMaterial({ color: c, transparent: fades });
  return { out: m(WHITE), in: m(PAPER), trim: m(GOLD), glass: new MeshLambertMaterial({ color: 0x8FB4C6, transparent: true, opacity: 0.32, depthWrite: false }) };
}
const carpetTex = canvasTex(128, 128, (c, w) => {
  c.fillStyle = '#8E1F2F'; c.fillRect(0, 0, w, w);
  c.strokeStyle = '#C9A24A'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w - 6, w / 2); c.lineTo(w / 2, w - 6); c.lineTo(6, w / 2); c.closePath(); c.stroke();
  c.fillStyle = '#C9A24A'; c.beginPath(); c.arc(w / 2, w / 2, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6E1A26'; for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); }
});
/** The salon's carpet, for the upper deck's floor (casino.ts). */
export function carpet(len: number, wide: number) {
  const t = carpetTex.tex.clone();
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(len / 0.9, wide / 0.9);
  t.needsUpdate = true;
  return new MeshLambertMaterial({ map: t });
}

// ---------- walls ----------
type Span = [number, number];
/** What's left of `[a, b]` once `holes` are cut out of it. */
function minus([a, b]: Span, holes: Span[]): Span[] {
  let out: Span[] = [[a, b]];
  for (const [h0, h1] of holes) out = out.flatMap(([s0, s1]) => h1 <= s0 || h0 >= s1 ? [[s0, s1] as Span] : [[s0, h0] as Span, [h1, s1] as Span].filter(([x, y]) => y - x > 0.01));
  return out;
}
/** A wall `along` x or z from `a` to `b` at `at` (the other way), its outside towards `out` (+1 or -1), with windows
 *  and `doors`. Its parts go into the white, burgundy, gold and glass lists. */
function wall(along: 'x' | 'z', a: number, b: number, at: number, out: number, doors: Span[], p: { out: Part[]; in: Part[]; trim: Part[]; glass: Part[] }) {
  const n = Math.floor((b - a) / WIN.pitch), off = (b - a - n * WIN.pitch) / 2;
  const wins: Span[] = [];
  for (let i = 0; i < n; i++) {
    const c = a + off + WIN.pitch * (i + 0.5);
    if (!doors.some(([d0, d1]) => c + WIN.w / 2 > d0 - 0.15 && c - WIN.w / 2 < d1 + 0.15)) wins.push([c - WIN.w / 2, c + WIN.w / 2]);
  }
  const box = (into: Part[], s0: number, s1: number, y0: number, y1: number, depth: number, shift: number) => {
    const m = (s0 + s1) / 2, w = s1 - s0, c = at + shift * out;
    into.push(along === 'x'
      ? { geo: G.box, at: [m, UPPER + (y0 + y1) / 2, c], scale: [w, y1 - y0, depth] }
      : { geo: G.box, at: [c, UPPER + (y0 + y1) / 2, m], scale: [depth, y1 - y0, w] });
  };
  const solid = (s: Span, y0: number, y1: number) => {
    box(p.out, s[0], s[1], y0, y1, 0.1, 0.02);
    box(p.in, s[0], s[1], y0, y1, 0.02, -0.05);
  };
  const doorTop = WIN.head;
  minus([a, b], doors).forEach(s => solid(s, 0, WIN.sill));
  // slim gold mullions between the windows, so the glass reads as one band
  minus([a, b], [...doors, ...wins]).forEach(s => {
    if (s[1] - s[0] < 0.3) { box(p.trim, s[0], s[1], WIN.sill, WIN.head, 0.1, 0.02); box(p.in, s[0], s[1], WIN.sill, WIN.head, 0.02, -0.05); }
    else solid(s, WIN.sill, WIN.head);
  });
  solid([a, b], doorTop, SALON.h);
  for (const w of wins) box(p.glass, w[0], w[1], WIN.sill, WIN.head, 0.02, 0);
  // gold bands along the outside at the sills and the heads, and round the top
  for (const y of [WIN.sill, WIN.head]) minus([a, b], y === WIN.sill ? doors : []).forEach(s => box(p.trim, s[0], s[1], y - 0.03, y + 0.03, 0.04, 0.09));
  box(p.trim, a, b, SALON.h - 0.08, SALON.h, 0.05, 0.09);
}

/** The salon's walls, each with its own materials so the near ones can fade, and the ground where standing puts each
 *  between the player and the camera (which looks in from the south-east, high up). */
interface Fader { meshes: Mesh[]; mats: Material[]; near: boolean; base: number[] }
function buildWalls(g: Group) {
  const faders: Fader[] = [];
  const add = (fades: boolean, build: (p: { out: Part[]; in: Part[]; trim: Part[]; glass: Part[] }) => void) => {
    const p = { out: [] as Part[], in: [] as Part[], trim: [] as Part[], glass: [] as Part[] };
    build(p);
    const m = wallMats(fades);
    const meshes = [mesh(bake(p.out), m.out, 0, 0, 0, true), mesh(bake(p.in), m.in), mesh(bake(p.trim), m.trim), mesh(bake(p.glass), m.glass)];
    meshes[3].castShadow = false;
    g.add(...meshes);
    if (fades) faders.push({ meshes, mats: [m.out, m.in, m.trim, m.glass], near: false, base: [1, 1, 1, m.glass.opacity] });
  };
  const { x0, x1, side } = SALON;
  add(false, p => { wall('x', x0, x1, -side, -1, [], p); wall('z', -side, side, x0, -1, [], p); });
  add(true, p => wall('x', x0, x1, side, 1, [], p));
  add(true, p => wall('z', -side, side, x1, 1, [[-DOOR, DOOR]], p));
  return faders;
}

// ---------- shapes ----------
const UP_AXIS = new Vector3(0, 1, 0), tmpQ = new Quaternion(), tmpE = new Euler();
/** A rope, rail or beam from `a` to `b`, as a thin cylinder. */
export function strut(a: Vector3, b: Vector3, r: number): Part {
  const d = b.clone().sub(a), len = d.length();
  tmpE.setFromQuaternion(tmpQ.setFromUnitVectors(UP_AXIS, d.normalize()));
  return { geo: G.cyl, at: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], rot: [tmpE.x, tmpE.y, tmpE.z], scale: [r, len, r] };
}
/** An oblong from above, `x0` to `x1` along the ship and `half` either side, its back corners rounded by `rb` and its
 *  front ones by `rf`. */
export function oblong(x0: number, x1: number, half: number, rb: number, rf: number) {
  const s = new Shape();
  s.moveTo(x0 + rb, -half);
  s.lineTo(x1 - rf, -half);
  s.quadraticCurveTo(x1, -half, x1, -half + rf);
  s.lineTo(x1, half - rf);
  s.quadraticCurveTo(x1, half, x1 - rf, half);
  s.lineTo(x0 + rb, half);
  s.quadraticCurveTo(x0, half, x0, half - rb);
  s.lineTo(x0, -half + rb);
  s.quadraticCurveTo(x0, -half, x0 + rb, -half);
  return s;
}
/** A shape lying flat, extruded `h` up from `y`. */
export function slab(shape: Shape, h: number, y: number, m: number | Material) {
  const o = mesh(new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 }), m, 0, y, 0, true);
  o.rotation.x = -Math.PI / 2;
  return o;
}

// ---------- roof ----------
const SIGN_TEX = canvasTex(512, 160, (c, w, h) => {
  c.fillStyle = '#5A1420'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#E3B23C'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
  c.font = `800 96px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = '#2A0F16'; c.strokeText('CASINO', w / 2, h / 2 + 6);
  c.fillStyle = '#FFD24A'; c.fillText('CASINO', w / 2, h / 2 + 6);
});
/** The marquee's bulbs, in two sets that take turns to light: the chase round the CASINO sign. */
const bulbsOn = new MeshBasicMaterial({ color: 0xFFE08A }), bulbsOff = new MeshBasicMaterial({ color: 0xB07A2A });
/** The top of the jackstaff at the bow (casino.ts), which the strings of lights run down to from the mast. */
export const JACK = { x: SHIP.bow - 0.55, y: FY + 3.0 };
/** The sky lounge on the hardtop, at the front, and the mast on its roof; the sundeck aft of it, with the hot tub. */
const BRIDGE = { x0: -0.8, x1: 2.9, half: 1.85 };
const MAST = { x: 1.4, spread: 0.7 };
const SUNDECK = { x1: -1.2 };
const TUB = { x: -3.3, z: -0.5, r: 0.8 };
const SIGN = { x: 0.9, w: 3.1, h: 1.0 };

function buildRoof() {
  const g = new Group();
  const { x0, x1, side, h } = SALON, top = UPPER + h, deckY = top + 0.16;
  const mats: Material[] = [], base: number[] = [];
  const own = <M extends Material>(m: M, opacity = 1) => { m.transparent = true; m.opacity = opacity; mats.push(m); base.push(opacity); return m; };
  const lam = (c: number) => own(new MeshLambertMaterial({ color: c }));
  const white = lam(WHITE), gold = lam(GOLD);
  const glass = own(new MeshPhongMaterial({ color: 0x1C2B38, specular: 0x9FB4C4, shininess: 70 }));
  const glow = own(new MeshBasicMaterial({ color: 0xFFD98A }));
  // the hardtop, sweeping forward over the top of the stairs, an LED line glowing under its edge; a teak sundeck aft
  g.add(slab(oblong(x0 - 0.3, x1 + 0.9, side + 0.16, 0.3, 1.1), 0.16, top, white));
  g.add(slab(oblong(x0 - 0.26, x1 + 0.86, side + 0.12, 0.28, 1.06), 0.03, top - 0.025, glow));
  const teak = own(new MeshLambertMaterial({ map: planks('#B07A52', '#BC8660', 0.35, 0.35) }));
  const deck = new Mesh(new ShapeGeometry(oblong(x0 - 0.15, SUNDECK.x1, side - 0.02, 0.2, 0.05), 8), teak);
  deck.rotation.x = -Math.PI / 2; deck.position.y = deckY + 0.005; deck.receiveShadow = true; g.add(deck);
  // a glass windbreak round the sides and the stern, a gold rail along its top
  const panes: Part[] = [], rail: Part[] = [];
  const run = (ax: number, az: number, bx: number, bz: number) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2));
    for (let i = 0; i < n; i++) {
      const cx = ax + (bx - ax) * (i + 0.5) / n, cz = az + (bz - az) * (i + 0.5) / n, w = Math.hypot(bx - ax, bz - az) / n - 0.06;
      panes.push({ geo: G.box, at: [cx, deckY + 0.3, cz], scale: ax === bx ? [0.02, 0.5, w] : [w, 0.5, 0.02] });
    }
    rail.push({ geo: G.box, at: [(ax + bx) / 2, deckY + 0.57, (az + bz) / 2], scale: ax === bx ? [0.05, 0.05, Math.abs(bz - az) + 0.05] : [Math.abs(bx - ax) + 0.05, 0.05, 0.05] });
  };
  const rx0 = x0 - 0.1, rx1 = x1 + 0.2, rz = side + 0.02;
  run(rx0, -rz, rx1, -rz); run(rx0, rz, rx1, rz); run(rx0, -rz, rx0, rz);
  g.add(mesh(bake(panes), own(new MeshLambertMaterial({ color: 0xCDEBF5, depthWrite: false }), 0.3)), mesh(bake(rail), gold));
  // the sky lounge: rounded at the front, wrapped in dark glass under a white roof that reaches out over it, with the
  // mast and a turning radar on top
  const { x0: b0, x1: b1, half: bh } = BRIDGE;
  g.add(slab(oblong(b0, b1, bh, 0.4, 1.6), 0.2, deckY, white));
  g.add(slab(oblong(b0 + 0.05, b1 - 0.05, bh - 0.05, 0.36, 1.55), 0.62, deckY + 0.2, glass));
  g.add(slab(oblong(b0 - 0.2, b1 + 0.2, bh + 0.12, 0.5, 1.75), 0.1, deckY + 0.82, white));
  g.add(slab(oblong(b0 - 0.16, b1 + 0.16, bh + 0.08, 0.48, 1.71), 0.03, deckY + 0.8, glow));
  const bridgeTop = deckY + 0.92, mastTop = bridgeTop + 1.9;
  const mast: Part[] = [
    strut(V(MAST.x + 0.35, bridgeTop, 0), V(MAST.x, mastTop, 0), 0.07),
    { geo: G.box, at: [MAST.x + 0.07, mastTop - 0.4, 0], scale: [0.08, 0.06, MAST.spread * 2] },
    { geo: G.cyl, at: [-0.2, bridgeTop + 0.1, 0], scale: [0.08, 0.2, 0.08] },
  ];
  g.add(mesh(bake(mast), white));
  const tips: Part[] = [-1, 1].map(s => ({ geo: G.sphere, at: [MAST.x + 0.07, mastTop - 0.4, s * MAST.spread], scale: [0.05, 0.05, 0.05] }));
  g.add(mesh(bake(tips), gold));
  const radar = new Group(); radar.position.set(-0.2, bridgeTop + 0.24, 0); g.add(radar);
  radar.add(mesh(new BoxGeometry(0.1, 0.07, 0.9), white));
  const flag = new Group(); flag.position.set(MAST.x, mastTop - 0.05, 0); g.add(flag);
  flag.add(mesh(new BoxGeometry(0.6, 0.36, 0.02), lam(0xB0283A), -0.32, -0.15, 0));
  // a hot tub glowing turquoise on the sundeck, two guests soaking in it
  g.add(mesh(new CylinderGeometry(TUB.r, TUB.r + 0.05, 0.32, 24), white, TUB.x, deckY + 0.16, TUB.z, true));
  g.add(mesh(new CylinderGeometry(TUB.r - 0.1, TUB.r - 0.1, 0.02, 24), own(new MeshBasicMaterial({ color: 0x5ED8E0 })), TUB.x, deckY + 0.28, TUB.z));
  g.add(mesh(new TorusGeometry(TUB.r - 0.04, 0.04, 6, 28), gold, TUB.x, deckY + 0.32, TUB.z).rotateX(Math.PI / 2));
  const soakers = new Group(); g.add(soakers);
  [[-0.35, -0.3, 0.9], [0.3, 0.3, -2.3]].forEach(([dx, dz, ry], i) => {
    const p = guest(i + 2);
    p.position.set(TUB.x + dx, deckY - 0.12, TUB.z + dz); p.rotation.y = ry;
    for (const l of p.legs) l.rotation.x = -1.45;
    p.arms[0].rotation.z = -0.9; p.arms[1].rotation.z = 0.9;
    soakers.add(p);
  });
  // sun loungers along the quay side of the sundeck, their backs up towards the far side, a red towel on each
  const lounge: (Part & { c: number })[] = [];
  for (let x = x0 + 0.6; x < SUNDECK.x1 - 0.3; x += 0.85) {
    const z = side - 1.0;
    lounge.push({ geo: G.box, at: [x, deckY + 0.1, z + 0.15], scale: [0.56, 0.14, 1.25], c: 0x9A9086 });
    lounge.push({ geo: G.box, at: [x, deckY + 0.22, z + 0.25], scale: [0.54, 0.1, 1.05], c: 0xFFFFFF });
    lounge.push({ geo: G.box, at: [x, deckY + 0.44, z - 0.6], rot: [0.7, 0, 0], scale: [0.54, 0.08, 0.6], c: 0xFFFFFF });
    lounge.push({ geo: G.box, at: [x, deckY + 0.28, z + 0.55], scale: [0.5, 0.03, 0.34], c: 0xB0283A });
  }
  const lounger = new MeshLambertMaterial({ vertexColors: true });
  g.add(mesh(bakePainted(lounge), own(lounger), 0, 0, 0, true));
  // the CASINO sign on the sky lounge's roof, along the far side, on gold posts, its bulbs chasing round it, and the
  // strings of lights from the bow up to the mast's spreader
  const sz = -bh + 0.35, sy = bridgeTop + 0.35 + SIGN.h / 2;
  const posts: Part[] = [-1, 1].map(s => ({ geo: G.cyl, at: [SIGN.x + s * (SIGN.w / 2 - 0.3), bridgeTop + 0.2, sz], scale: [0.05, 0.4, 0.05] }));
  g.add(mesh(bake(posts), gold, 0, 0, 0, true));
  g.add(mesh(new BoxGeometry(SIGN.w + 0.14, SIGN.h + 0.14, 0.1), lam(0x5A1420), SIGN.x, sy, sz, true));
  const signMat = own(new MeshBasicMaterial({ map: SIGN_TEX.tex }));
  for (const s of [-1, 1]) {
    const face = new Mesh(new PlaneGeometry(SIGN.w, SIGN.h), signMat);
    face.position.set(SIGN.x, sy, sz + s * 0.055); if (s < 0) face.rotation.y = Math.PI;
    g.add(face);
  }
  const sets: Part[][] = [[], []];
  let i = 0;
  const bulb = (x: number, y: number) => { for (const s of [-1, 1]) sets[i % 2].push({ geo: G.sphere, at: [x, y, sz + s * 0.07], scale: [0.04, 0.04, 0.04] }); i++; };
  for (let x = -SIGN.w / 2; x <= SIGN.w / 2 + 0.01; x += SIGN.w / 16) { bulb(SIGN.x + x, sy + SIGN.h / 2 + 0.07); bulb(SIGN.x + x, sy - SIGN.h / 2 - 0.07); }
  for (const s of [-1, 1]) for (let y = -SIGN.h / 2 + 0.17; y < SIGN.h / 2 - 0.1; y += 0.22) bulb(SIGN.x + s * (SIGN.w / 2 + 0.07), sy + y);
  const chase = sets.map(s => mesh(bake(s), bulbsOn));
  g.add(...chase);
  const strings: Part[] = [];
  for (const s of [-1, 1]) {
    for (let k = 1; k < 18; k++) {
      const t = k / 18, tx = MAST.x + 0.07, ty = mastTop - 0.4;
      strings.push({ geo: G.sphere, at: [JACK.x + (tx - JACK.x) * t, JACK.y + (ty - JACK.y) * t - Math.sin(Math.PI * t) * 0.1, s * MAST.spread * t], scale: [0.06, 0.06, 0.06] });
    }
  }
  const lights = mesh(bake(strings), bulbsOn);
  g.add(lights);
  return { g, mats, base, chase, lights, soakers, radar, flag };
}

// ---------- the bar ----------
function buildBar(g: Group) {
  const { x, z0, z1, back } = BAR, wood = 0x5A2E1F, len = z1 - z0, mid = (z0 + z1) / 2;
  g.add(mesh(new BoxGeometry(0.5, 1.05, len), wood, x, UPPER + 0.525, mid, true));
  g.add(mesh(new BoxGeometry(0.62, 0.06, len + 0.1), 0x2A1410, x, UPPER + 1.08, mid, true));
  g.add(mesh(new BoxGeometry(0.04, 0.06, len), GOLD, x - 0.27, UPPER + 0.3, mid));
  // the back bar against the bow wall: a low cabinet, a shelf of bottles over it
  g.add(mesh(new BoxGeometry(0.3, 0.9, len), wood, back, UPPER + 0.45, mid, true));
  const shelf: Part[] = [{ geo: G.box, at: [back + 0.02, UPPER + 1.35, mid], scale: [0.26, 0.04, len] }];
  const bottles: Part[][] = [[], [], []];
  let n = 0;
  for (const y of [0.9, 1.37]) for (let z = z0 + 0.15; z <= z1 - 0.1; z += 0.2) {
    bottles[n++ % 3].push({ geo: G.cyl, at: [back + 0.02, UPPER + y + 0.13, z], scale: [0.045, 0.24, 0.045] });
  }
  g.add(mesh(bake(shelf), wood));
  [0x2E7D4F, 0x8E1F2F, 0xC9A24A].forEach((c, i) => g.add(mesh(bake(bottles[i]), c)));
  // stools in front of the bar
  const stools: Part[] = [];
  for (const z of BAR.stools) {
    stools.push({ geo: G.cyl, at: [STOOL_X, UPPER + 0.35, z], scale: [0.05, 0.7, 0.05] });
    stools.push({ geo: G.cyl, at: [STOOL_X, UPPER + 0.72, z], scale: [0.2, 0.07, 0.2] });
  }
  g.add(mesh(bake(stools), GOLD, 0, 0, 0, true));
  // and potted palms in the corners by the windows
  const palms: (Part & { c: number })[] = [];
  for (const [px, pz] of PALMS) {
    palms.push({ geo: G.cyl, at: [px, UPPER + 0.22, pz], scale: [0.24, 0.44, 0.24], c: GOLD });
    palms.push({ geo: G.cyl, at: [px, UPPER + 0.8, pz], scale: [0.05, 1.2, 0.05], c: 0x7A5634 });
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      palms.push({ geo: G.box, at: [px + Math.cos(a) * 0.32, UPPER + 1.3, pz + Math.sin(a) * 0.32], rot: [0, -a, 0.5], scale: [0.62, 0.03, 0.16], c: 0x2F7D3E });
    }
  }
  g.add(mesh(bakePainted(palms), new MeshLambertMaterial({ vertexColors: true }), 0, 0, 0, true));
}

// ---------- the guests ----------
/** A well-dressed guest, a man in a suit or a woman in an evening dress. */
function guest(i: number) {
  const who = crowd();
  return new Person(who.woman ? DRESSES[i % DRESSES.length] : SUITS[i % SUITS.length], 'fancy', who);
}

/** One of the salon's slot machines, its reels spinning when a guest plays it. */
interface Machine { lever: Group; ctx: CanvasRenderingContext2D; tex: CanvasTexture; from: number[]; to: number[]; spin: number }
/** How long a guest's spin takes, and when each reel stops. */
const SPIN = 1.6, STOPS = [0.9, 1.25, 1.6];
/** A guest at a slot machine: pulls the lever every few seconds, the reels spin, and now and then they win. */
interface Gambler { p: Person; m: Machine; wait: number; t: number; joy: number; say: ReturnType<typeof speaker> }

function buildCrowd(g: Group) {
  // the slot machines along the stern wall, facing forward (the row's turned a quarter round: along it is across)
  const screens = ROW.zs.map((_, i) => {
    const { ctx, tex } = canvasTex(REELS_PX.w, REELS_PX.h, () => {});
    const pos = [i * 3, i * 7 + 2, i * 5 + 4];
    drawReels(ctx, pos);
    return { ctx, tex, pos };
  });
  const row = slotRow(ROW.zs.map(z => -z), screens.map(s => new MeshBasicMaterial({ map: s.tex })));
  row.g.position.set(ROW.x, UPPER, 0); row.g.rotation.y = Math.PI / 2;
  g.add(row.g);
  const machines: Machine[] = screens.map((s, i) => ({ lever: row.levers[i], ctx: s.ctx, tex: s.tex, from: s.pos, to: s.pos, spin: 0 }));
  const gamblers: Gambler[] = [0, 2, 3, 5].map((m, i) => {
    const p = guest(i);
    p.position.set(ROW.x + 0.75, UPPER, ROW.zs[m]); p.rotation.y = -Math.PI / 2;
    g.add(p);
    return { p, m: machines[m], wait: 1 + i * 1.7, t: 0, joy: 0, say: speaker(p, 2.1) };
  });
  // the bar: the bartender behind it, two guests on stools
  const bartender = new Person(0x1F1F1F, 'waiter');
  bartender.position.set((BAR.x + BAR.back) / 2, UPPER, (BAR.z0 + BAR.z1) / 2); bartender.rotation.y = -Math.PI / 2;
  g.add(bartender);
  const drinkers = BAR.stools.map((z, i) => {
    const p = guest(i + 4);
    p.position.set(STOOL_X, UPPER + 0.42, z); p.rotation.y = Math.PI / 2;
    g.add(p);
    return { p, t: 2 + i * 2.5 };
  });
  // a waiter carrying a tray of drinks up and down along the windows
  const waiter = new Person(0x24476B, 'waiter');
  waiter.position.set(WAITER.x0, UPPER, WAITER.z);
  // the tray sits flat on the palm of the hand held out in front (the arm's turned to level, so the tray's turned back)
  const tray = new Group(); tray.position.set(0, -0.33, 0.07); tray.rotation.x = TRAY_ARM; waiter.arms[0].add(tray);
  tray.add(mesh(new CylinderGeometry(0.18, 0.18, 0.03, 16), 0xC0C6CC));
  for (const [dx, dz] of [[-0.07, 0], [0.07, 0.04], [0, -0.08]]) tray.add(mesh(new CylinderGeometry(0.03, 0.025, 0.12, 8), 0xF2C14E, dx, 0.08, dz));
  g.add(waiter);
  // a guest at the end of the roulette table, watching the wheel, who cheers when the player wins
  const fan = guest(7);
  fan.position.set(FAN.x, UPPER, FAN.z); fan.rotation.y = Math.PI / 2;
  g.add(fan);
  const fanSay = speaker(fan, 2.1);
  const crowdState = { machines, gamblers, bartender, drinkers, waiter, fan, fanSay, clap: 0, walk: { dir: 1, pause: 0 } };
  onCheer(() => {
    crowdState.clap = 1.4;
    fanSay.say(['Nice!', 'Wow!', 'Lucky!'][Math.floor(dice() * 3)]);
  });
  return crowdState;
}
/** The waiter's beat and the fan's spot: both off the player's way from the door to the games. */
/** The waiter's beat along the windows, and the fan's spot at the roulette table's far end: both off the player's way
 *  from the door to the games. */
const WAITER = { x0: SALON.x0 + 1.7, x1: SALON.x1 - 1.1, z: SALON.side - 0.9 };
const FAN = { x: -5.95, z: -1.55 };
/** How far forward the waiter holds the tray arm: level with the shoulder. */
const TRAY_ARM = 1.6;

// ---------- the salon ----------
let salon: {
  roof: ReturnType<typeof buildRoof>; faders: Fader[]; crowd: ReturnType<typeof buildCrowd>; clock: number;
  roofK: number;
} | null = null;

/** Builds the salon into the ship's group `g` (in the ship's own space). */
export function buildSalon(g: Group) {
  const faders = buildWalls(g);
  const roof = buildRoof();
  g.add(roof.g);
  buildBar(g);
  salon = { roof, faders, crowd: buildCrowd(g), clock: 0, roofK: 1 };
}

/** The player's inside the salon: on the upper deck. */
export const inSalon = (p: XZ & { y: number }) => aboard(p) && p.y > FY + 1.0;

/** Fades between `want` and opaque, for a set of materials. */
function fade(mats: Material[], base: number[], k: number) {
  mats.forEach((m, i) => {
    m.opacity = base[i] * k;
    m.depthWrite = k > 0.95 && i < 3;
  });
}

/**
 * Lifts the roof away and fades the walls on the camera's side while the player's inside (`all` keeps everything up,
 * for the stage-up), and runs the guests: the marquee chases, the machines spin, the bar and the waiter carry on.
 */
export function updSalon(dt: number, p: XZ & { y: number }, all: boolean) {
  if (!salon) return;
  const s = salon, inside = !all && inSalon(p);
  s.clock += dt;
  s.roofK += ((inside ? 0 : 1) - s.roofK) * Math.min(1, dt * 8);
  if (!inside && s.roofK > 0.995) s.roofK = 1;
  s.roof.g.visible = s.roofK > 0.02;
  s.roof.mats.forEach((m, i) => {
    m.opacity = s.roof.base[i] * s.roofK;
    m.depthWrite = s.roofK > 0.95 && s.roof.base[i] === 1;
  });
  s.roof.lights.visible = s.roof.soakers.visible = s.roofK > 0.5;
  s.roof.radar.rotation.y += dt * 1.6;
  s.roof.flag.rotation.y = Math.sin(s.clock * 2.2) * 0.15;
  const wallK = 0.12 + 0.88 * s.roofK;
  for (const f of s.faders) {
    fade(f.mats, f.base, wallK);
    f.meshes[0].castShadow = wallK > 0.95;
  }
  // the marquee chases round the roof
  const on = Math.floor(s.clock * 3) % 2;
  s.roof.chase.forEach((m, i) => { m.material = i === on ? bulbsOn : bulbsOff; });
  updCrowd(s.crowd, dt, s.clock);
}

function updCrowd(c: ReturnType<typeof buildCrowd>, dt: number, clock: number) {
  for (const gm of c.gamblers) {
    const p = gm.p, m = gm.m;
    animPerson(p, false, dt, false);
    gm.say.upd(dt);
    gm.wait -= dt;
    if (gm.wait <= 0 && m.spin <= 0) {
      gm.wait = 3 + dice() * 5;
      m.spin = SPIN; gm.t = 0;
      // where the reels will stop: now and then three of a kind, a win
      const win = dice() < 0.18, same = Math.floor(dice() * 20);
      m.from = m.to.map(Math.round);
      m.to = m.from.map((f, i) => f + 20 * (2 + i) + (((win ? same : Math.floor(dice() * 20)) - f) % 20 + 20) % 20);
      gm.joy = win ? -1 : 0;
    }
    if (m.spin > 0) {
      gm.t += dt;
      m.spin -= dt;
      m.lever.rotation.x = Math.sin(Math.min(1, gm.t / 0.4) * Math.PI) * 1.1;
      // each reel slows to a stop, left to right
      const shown = m.from.map((f, i) => f + (m.to[i] - f) * (1 - Math.pow(1 - Math.min(1, gm.t / STOPS[i]), 3)));
      if (Math.floor(clock * 20) % 2 === 0 || m.spin <= 0) { drawReels(m.ctx, shown); m.tex.needsUpdate = true; }
      if (m.spin <= 0 && gm.joy < 0) { gm.joy = 1.4; gm.say.say(dice() < 0.25 ? 'Jackpot!' : 'Yes!'); }
    }
    // pulling with the right arm; both arms up for a win
    p.arms[1].rotation.x = gm.t < 0.4 && m.spin > 0 ? -1.4 : -0.5;
    if (gm.joy > 0) { gm.joy -= dt; p.arms[0].rotation.x = p.arms[1].rotation.x = -2.8; }
    else p.arms[0].rotation.x = -0.4;
  }
  // the bartender polishes a glass; the guests at the bar sip now and then
  animPerson(c.bartender, false, dt, false);
  c.bartender.arms[0].rotation.x = -1.2 + Math.sin(clock * 5) * 0.25;
  c.bartender.arms[0].rotation.z = Math.cos(clock * 5) * 0.25;
  c.bartender.arms[1].rotation.x = -1.1;
  for (const d of c.drinkers) {
    animPerson(d.p, false, dt, false);
    for (const l of d.p.legs) l.rotation.x = -1.45;
    d.t -= dt;
    if (d.t < -1.2) d.t = 4 + dice() * 4;
    d.p.arms[0].rotation.x = d.t < 0 ? -2.0 : -0.7;
    d.p.arms[1].rotation.x = -0.7;
  }
  // the waiter walks up and down with the tray, pausing at each end
  const w = c.waiter, walk = c.walk;
  if (walk.pause > 0) { walk.pause -= dt; animPerson(w, false, dt, true); }
  else {
    w.position.x += walk.dir * 1.1 * dt;
    if (w.position.x > WAITER.x1 || w.position.x < WAITER.x0) {
      w.position.x = Math.max(WAITER.x0, Math.min(WAITER.x1, w.position.x));
      walk.dir *= -1; walk.pause = 2.5;
    }
    animPerson(w, true, dt, true);
  }
  w.rotation.y += ((walk.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - w.rotation.y) * Math.min(1, dt * 6);
  w.arms[0].rotation.x = -TRAY_ARM; w.arms[0].rotation.z = 0; w.arms[1].rotation.x = -0.4;
  // the fan by the tables claps along with a win
  animPerson(c.fan, false, dt, false);
  c.fanSay.upd(dt);
  if (c.clap > 0) {
    c.clap -= dt;
    const k = Math.abs(Math.sin(c.clap * 14)) * 0.35;
    c.fan.arms[0].rotation.x = c.fan.arms[1].rotation.x = -1.3;
    c.fan.arms[0].rotation.z = -0.3 - k; c.fan.arms[1].rotation.z = 0.3 + k;
  }
}

/** Keeps the player out of the bar, the row of machines and the guests at them, the palms, the fan and the waiter. */
export function collideSalon(p: XZ) {
  if (!salon) return;
  const x = (v: number) => SHIP.x + v, z = (v: number) => SHIP.z + v;
  const bar0 = STOOL_X - 0.25, rowZ = [ROW.zs[0] - 0.37, ROW.zs[ROW.zs.length - 1] + 0.37];
  pushOutOfBox(p, x((bar0 + SALON.x1) / 2), z((-SALON.side + BAR.z1) / 2), (SALON.x1 - bar0) / 2 + 0.3, (BAR.z1 + SALON.side) / 2 + 0.3);
  pushOutOfBox(p, x((SALON.x0 + ROW.x + 1.0) / 2), z((rowZ[0] + rowZ[1]) / 2), (ROW.x + 1.0 - SALON.x0) / 2 + 0.3, (rowZ[1] - rowZ[0]) / 2 + 0.3);
  for (const [px, pz] of PALMS) pushOutOfBox(p, x(px), z(pz), 0.3 + 0.3, 0.3 + 0.3);
  pushOutOfBox(p, x(FAN.x), z(FAN.z), 0.25 + 0.3, 0.25 + 0.3);
  const w = salon.crowd.waiter.position;
  pushOutOfBox(p, x(w.x), z(w.z), 0.25 + 0.3, 0.25 + 0.3);
  // the east wall either side of the door
  for (const s of [-1, 1]) pushOutOfBox(p, x(SALON.x1), z(s * (DOOR + SALON.side) / 2), 0.08 + 0.3, (SALON.side - DOOR) / 2);
}

/** For tests: how far the roof is up (1) or lifted away (0), what the fan by the tables is saying, how many guests
 *  there are, how far the radar has turned, and where the fan and the waiter are (in the ship's own space). */
export const salonView = () => ({
  roof: salon?.roofK ?? 1, fan: salon?.crowd.fanSay.text ?? '', guests: salon ? 4 + 2 + 1 + 1 + 1 + 2 : 0,
  radar: salon?.roof.radar.rotation.y ?? 0,
  staff: salon ? [salon.crowd.fan.position, salon.crowd.waiter.position] : [],
});
