// The casino salon on the yacht's upper deck: walls of tall windows between slim gold mullions (white outside,
// burgundy inside) round a red carpet, under a hardtop with an LED line under its edge. On top, behind a glass
// windbreak: a sky lounge wrapped in dark glass with a radar turning and a flag flying from its mast, and aft of it a
// teak sundeck with a jacuzzi (two guests soaking to their shoulders) and sun loungers. A CASINO sign hangs on
// each side of the ship below the salon, its bulbs chasing round it. As in the restaurant, the roof lifts away and the
// walls on the camera's side fade while the player is inside. The games stand along the back wall, leaving the floor
// open from the door to them, and round them it's full of life: a long bar across the stern with two bartenders and
// guests on the stools, a short row of slot machines by the door with guests playing them (now and then one wins), a
// palm, a guest at the roulette table who cheers when the player wins, and a waiter carrying champagne along the
// windows, who doesn't block the way and stops to toast with the player over a glass. None of it touches the game's
// luck: the guests run on their own dice.
import {
  CanvasTexture, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  MeshPhongMaterial, PlaneGeometry, Shape, ShapeGeometry, Vector3, RepeatWrapping, type Material,
} from 'three';
import {
  atTable, both, CHIPS, easeInOut, highOnly, leaveSeat, LIT, offLuck, onCheer, type Pen, speaker, takeSeat, tipsy,
} from './casinoKit';
import { clink } from './sfx';
import { animPerson, Person, SUITS } from './characters';
import { baked, Build, K } from './kit';
import { aboard, DECKS, pushOutOfBox, SALON, SHIP, stage, UPPER } from './layout';
import { player } from './player';
import { canvasTex, FONT, mesh, painted, scene } from './render';
import { drawReels, REELS_PX, slotRow } from './slotMachine';
import { FY, money, V, type XZ } from './util';
import { wallet } from './wallet';
import { crowd, DRESSES, rng } from './wardrobe';
import { planks } from './world';

const GOLD = 0xE3B23C, WHITE = 0xFFFFFF, PAPER = 0x6E1A26;
/** The windows: how far apart, how wide, and their sill and head above the deck. */
const WIN = { pitch: 1.3, w: 1.2, sill: 0.45, head: 2.0 };
/** The door at the top of the stairs. */
const DOOR = DECKS.stairs.half + 0.2;
/** The salon's layout, in the ship's own space. The games stand along the back (north) wall (layout.ts). The bar runs
 *  the length of the stern, its counter at `x`, the back bar against the wall and stools out front; a short row of
 *  the guests' slot machines stands against the bow wall beside the door, facing aft; the waiter walks along the
 *  windows. */
export const BAR = { x: SALON.x0 + 1.1, z0: -2.75, z1: 2.55, stools: [-2.1, -1.05, 0, 1.05, 2.1] };
const STOOL_X = BAR.x + 0.55;
export const ROW = { x: SALON.x1 - 0.42, zs: [-2.55, -1.7] };
/** A potted palm in the corner by the door on the windows' side. */
const PALMS = [[SALON.x1 - 0.5, SALON.side - 0.5]];

/** Draws a guest's or the bartender's dice: their own sequence, so the game's luck is left alone. */
const dice = rng(0xCA5170);

// ---------- materials ----------
const carpetTex = offLuck(() => canvasTex(128, 128, (c, w) => {
  c.fillStyle = '#8E1F2F'; c.fillRect(0, 0, w, w);
  c.strokeStyle = '#C9A24A'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w - 6, w / 2); c.lineTo(w / 2, w - 6); c.lineTo(6, w / 2); c.closePath(); c.stroke();
  c.fillStyle = '#C9A24A'; c.beginPath(); c.arc(w / 2, w / 2, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6E1A26'; for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); }
}));
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
/** What of a wall is drawn: its white outside (which casts the shadow), its burgundy lining and gold trim, or its glass. */
type Layer = 'outside' | 'lining' | 'glass';
/** A wall `along` x or z from `a` to `b` at `at` (the other way), its outside towards `out` (+1 or -1), with windows
 *  and `doors`: white outside, burgundy inside and trimmed in gold, with glass in the windows. Draws `layer` of it. */
function wall(p: Pen, layer: Layer, along: 'x' | 'z', a: number, b: number, at: number, out: number, doors: Span[]) {
  const n = Math.floor((b - a) / WIN.pitch), off = (b - a - n * WIN.pitch) / 2;
  const wins: Span[] = [];
  for (let i = 0; i < n; i++) {
    const c = a + off + WIN.pitch * (i + 0.5);
    if (!doors.some(([d0, d1]) => c + WIN.w / 2 > d0 - 0.15 && c - WIN.w / 2 < d1 + 0.15)) wins.push([c - WIN.w / 2, c + WIN.w / 2]);
  }
  const box = (c: number, s0: number, s1: number, y0: number, y1: number, depth: number, shift: number) => {
    if ((c === WHITE) !== (layer === 'outside')) return;
    const m = (s0 + s1) / 2, w = s1 - s0, z = at + shift * out, y = UPPER + (y0 + y1) / 2;
    if (along === 'x') p.box(w, y1 - y0, depth, c, m, y, z, null, 0.01);
    else p.box(depth, y1 - y0, w, c, z, y, m, null, 0.01);
  };
  if (layer === 'glass') {
    for (const w of wins) {
      const m = (w[0] + w[1]) / 2, y = UPPER + (WIN.sill + WIN.head) / 2, h = WIN.head - WIN.sill;
      if (along === 'x') p.flat(w[1] - w[0], h, 0.02, 0x8FB4C6, m, y, at);
      else p.flat(0.02, h, w[1] - w[0], 0x8FB4C6, at, y, m);
    }
    return;
  }
  const solid = (s: Span, y0: number, y1: number) => {
    box(WHITE, s[0], s[1], y0, y1, 0.1, 0.02);
    box(PAPER, s[0], s[1], y0, y1, 0.02, -0.05);
  };
  minus([a, b], doors).forEach(s => solid(s, 0, WIN.sill));
  // slim gold mullions between the windows, so the glass reads as one band
  minus([a, b], [...doors, ...wins]).forEach(s => {
    if (s[1] - s[0] < 0.3) { box(GOLD, s[0], s[1], WIN.sill, WIN.head, 0.1, 0.02); box(PAPER, s[0], s[1], WIN.sill, WIN.head, 0.02, -0.05); }
    else solid(s, WIN.sill, WIN.head);
  });
  solid([a, b], WIN.head, SALON.h);
  // gold bands along the outside at the sills and the heads, and round the top
  for (const y of [WIN.sill, WIN.head]) minus([a, b], y === WIN.sill ? doors : []).forEach(s => box(GOLD, s[0], s[1], y - 0.03, y + 0.03, 0.04, 0.09));
  box(GOLD, a, b, SALON.h - 0.08, SALON.h, 0.05, 0.09);
}

/** The salon's walls, each with its own materials so the near ones can fade, and the ground where standing puts each
 *  between the player and the camera (which looks in from the south-east, high up). */
interface Fader { walls: Mesh[]; mats: Material[]; base: number[] }
function buildWalls(g: Group) {
  const faders: Fader[] = [];
  const add = (fades: boolean, build: (p: Pen, layer: Layer) => void) => {
    // the walls that never fade are painted like everything else, so they merge with it (batch.ts)
    const solid = fades ? new MeshLambertMaterial({ vertexColors: true, transparent: true }) : painted;
    const glass = new MeshLambertMaterial({ color: 0x8FB4C6, transparent: true, opacity: 0.32, depthWrite: false });
    // only the white outside casts a shadow: the trim lies flat on it, and would only shade it with specks
    const walls = both(g, p => build(p, 'outside'), true, solid).filter(m => m !== null);
    both(g, p => build(p, 'lining'), false, solid);
    both(g, p => build(p, 'glass'), false, glass);
    if (fades) faders.push({ walls, mats: [solid, glass], base: [1, glass.opacity] });
  };
  const { x0, x1, side } = SALON;
  add(false, (p, layer) => { wall(p, layer, 'x', x0, x1, -side, -1, []); wall(p, layer, 'z', -side, side, x0, -1, []); });
  add(true, (p, layer) => wall(p, layer, 'x', x0, x1, side, 1, []));
  add(true, (p, layer) => wall(p, layer, 'z', -side, side, x1, 1, [[-DOOR, DOOR]]));
  return faders;
}

// ---------- shapes ----------
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
/** A shape lying flat, extruded `h` up from 0. */
export const slab = (shape: Shape, h: number) =>
  new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2);

// ---------- roof ----------
const SIGN_TEX = offLuck(() => canvasTex(512, 160, (c, w, h) => {
  c.fillStyle = '#5A1420'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#E3B23C'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
  c.font = `800 96px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = '#2A0F16'; c.strokeText('CASINO', w / 2, h / 2 + 6);
  c.fillStyle = '#FFD24A'; c.fillText('CASINO', w / 2, h / 2 + 6);
}));
/** The marquee's bulbs, in two sets that take turns to light: the chase round the CASINO sign. */
const [bulbsOn, bulbsOff] = offLuck(() => [new MeshBasicMaterial({ color: 0xFFE08A }), new MeshBasicMaterial({ color: 0xB07A2A })]);
/** The top of the jackstaff at the bow (casino.ts), which the strings of lights run down to from the mast. */
export const JACK = { x: SHIP.bow - 0.55, y: FY + 3.0 };
/** The sky lounge on the hardtop, at the front, and the mast on its roof; the sundeck aft of it, with the jacuzzi. */
const BRIDGE = { x0: -0.8, x1: 2.9, half: 1.85 };
const MAST = { x: 1.4, spread: 0.7 };
const SUNDECK = { x1: -1.2 };
const TUB = { x: -3.3, z: -0.5, r: 0.8 };
/** The CASINO signs on both sides of the lower deck, under the salon, facing out: where along, how big, how high. */
const SIGN = { x: -2.3, w: 3.04, h: 0.95, y: FY + 1.4, out: SHIP.beam - 0.38 + 0.07 };

/** The hardtop, the sky lounge and the mast on it, the windbreak's rail, the jacuzzi's surround and the loungers. */
function drawRoof(p: Pen) {
  const { x0, x1, side, h } = SALON, top = UPPER + h, deckY = top + 0.16, bridgeTop = deckY + 0.92, mastTop = bridgeTop + 1.9;
  // the hardtop, sweeping forward over the top of the stairs
  p.add(ROOF.hardtop, WHITE, 0, top, 0);
  // a gold rail along the top of the glass windbreak round the sides and the stern
  const rx0 = x0 - 0.1, rx1 = x1 + 0.2, rz = side + 0.02, y = deckY + 0.57;
  for (const z of [-rz, rz]) p.box(rx1 - rx0 + 0.05, 0.05, 0.05, GOLD, (rx0 + rx1) / 2, y, z, null, 0.015);
  p.box(0.05, 0.05, 2 * rz + 0.05, GOLD, rx0, y, 0, null, 0.015);
  // the sky lounge: rounded at the front, under a white roof that reaches out over it (its dark glass is its own mesh)
  p.add(ROOF.lounge, WHITE, 0, deckY, 0).add(ROOF.loungeRoof, WHITE, 0, deckY + 0.82, 0);
  // the mast, its spreader (gold tips on High), and the radar's post
  p.rod(V(MAST.x + 0.35, bridgeTop, 0), V(MAST.x, mastTop, 0), 0.07, WHITE);
  p.box(0.08, 0.06, MAST.spread * 2, WHITE, MAST.x + 0.07, mastTop - 0.4, 0, null, 0.015);
  if (p.high) for (const s of [-1, 1]) p.ball(0.05, GOLD, MAST.x + 0.07, mastTop - 0.4, s * MAST.spread);
  p.cyl(0.08, 0.08, 0.2, WHITE, -0.2, bridgeTop + 0.1, 0, null, 8);
  // the jacuzzi's raised teak surround under a white rim, with a step up to it
  p.add(ROOF.tub, 0x8A5A3B, 0, deckY, 0).add(ROOF.rim, WHITE, 0, deckY + 0.5, 0);
  p.box(0.7, 0.22, 0.32, WHITE, TUB.x, deckY + 0.11, TUB.z + TUB.r + 0.28);
  // sun loungers along the quay side of the sundeck, their backs up towards the far side, a red towel on each
  for (let x = x0 + 0.6; x < SUNDECK.x1 - 0.3; x += 0.85) {
    const z = side - 1.0;
    p.box(0.56, 0.14, 1.25, 0x9A9086, x, deckY + 0.1, z + 0.15).box(0.54, 0.1, 1.05, WHITE, x, deckY + 0.22, z + 0.25, null, 0.04);
    p.box(0.54, 0.08, 0.6, WHITE, x, deckY + 0.44, z - 0.6, [0.7, 0, 0], 0.035).box(0.5, 0.03, 0.34, 0xB0283A, x, deckY + 0.28, z + 0.55, null, 0.01);
  }
}
/** The roof's shapes, cut once for both settings. */
const ROOF = offLuck(() => {
  const { x0, x1, side } = SALON, { x0: b0, x1: b1, half: bh } = BRIDGE, R = TUB.r;
  const ring = oblong(TUB.x - R - 0.16, TUB.x + R + 0.16, R + 0.16, 0.42, 0.42);
  ring.holes.push(oblong(TUB.x - R + 0.06, TUB.x + R - 0.06, R - 0.06, 0.3, 0.3));
  return {
    hardtop: slab(oblong(x0 - 0.3, x1 + 0.9, side + 0.16, 0.3, 1.1), 0.16),
    led: slab(oblong(x0 - 0.26, x1 + 0.86, side + 0.12, 0.28, 1.06), 0.03),
    lounge: slab(oblong(b0, b1, bh, 0.4, 1.6), 0.2),
    glass: slab(oblong(b0 + 0.05, b1 - 0.05, bh - 0.05, 0.36, 1.55), 0.62),
    loungeRoof: slab(oblong(b0 - 0.2, b1 + 0.2, bh + 0.12, 0.5, 1.75), 0.1),
    loungeLed: slab(oblong(b0 - 0.16, b1 + 0.16, bh + 0.08, 0.48, 1.71), 0.03),
    tub: slab(oblong(TUB.x - R - 0.12, TUB.x + R + 0.12, R + 0.12, 0.4, 0.4), 0.5),
    rim: slab(ring, 0.07),
  };
});

function buildRoof() {
  const g = new Group();
  const { x0, x1, side, h } = SALON, top = UPPER + h, deckY = top + 0.16;
  const mats: Material[] = [], base: number[] = [];
  const own = <M extends Material>(m: M, opacity = 1) => { m.transparent = true; m.opacity = opacity; mats.push(m); base.push(opacity); return m; };
  const coat = own(new MeshLambertMaterial({ vertexColors: true }));
  both(g, drawRoof, true, coat);
  // the LED lines glowing under the hardtop's edge and the lounge's roof, and the lounge's dark glass
  both(g, p => p.add(ROOF.led, 0xFFD98A, 0, top - 0.025, 0).add(ROOF.loungeLed, 0xFFD98A, 0, deckY + 0.8, 0), false, own(new MeshBasicMaterial({ vertexColors: true })));
  both(g, p => p.add(ROOF.glass, 0x1C2B38, 0, deckY + 0.2, 0), true, own(new MeshPhongMaterial({ vertexColors: true, specular: 0x9FB4C4, shininess: 70 })));
  // a teak sundeck aft, and the glass windbreak round the sides and the stern
  const teak = own(new MeshLambertMaterial({ map: planks('#B07A52', '#BC8660', 0.35, 0.35) }));
  const deck = new Mesh(new ShapeGeometry(oblong(x0 - 0.15, SUNDECK.x1, side - 0.02, 0.2, 0.05), 8), teak);
  deck.rotation.x = -Math.PI / 2; deck.position.y = deckY + 0.005; deck.receiveShadow = true; g.add(deck);
  both(g, p => {
    const run = (ax: number, az: number, bx: number, bz: number) => {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2));
      for (let i = 0; i < n; i++) {
        const cx = ax + (bx - ax) * (i + 0.5) / n, cz = az + (bz - az) * (i + 0.5) / n, w = Math.hypot(bx - ax, bz - az) / n - 0.06;
        if (ax === bx) p.flat(0.02, 0.5, w, 0xCDEBF5, cx, deckY + 0.3, cz); else p.flat(w, 0.5, 0.02, 0xCDEBF5, cx, deckY + 0.3, cz);
      }
    };
    const rx0 = x0 - 0.1, rx1 = x1 + 0.2, rz = side + 0.02;
    run(rx0, -rz, rx1, -rz); run(rx0, rz, rx1, rz); run(rx0, -rz, rx0, rz);
  }, false, own(new MeshLambertMaterial({ color: 0xCDEBF5, depthWrite: false }), 0.3));
  // the radar turning on the lounge's roof, and the flag flying from the mast
  const bridgeTop = deckY + 0.92, mastTop = bridgeTop + 1.9;
  const radar = new Group(); radar.position.set(-0.2, bridgeTop + 0.24, 0); radar.userData.noBatch = true; g.add(radar);
  both(radar, p => p.box(0.1, 0.07, 0.9, WHITE, 0, 0, 0, null, 0.015), false, coat);
  const flag = new Group(); flag.position.set(MAST.x, mastTop - 0.05, 0); flag.userData.noBatch = true; g.add(flag);
  both(flag, p => p.box(0.6, 0.36, 0.02, 0xB0283A, -0.32, -0.15, 0, null, 0.008), false, coat);
  // the jacuzzi's bubbling water; two guests sit in it against opposite sides, hatless, their shoulders just out of it
  const R = TUB.r, water = deckY + 0.5 + 0.03;
  const pool = new Mesh(new ShapeGeometry(oblong(TUB.x - R + 0.06, TUB.x + R - 0.06, R - 0.06, 0.3, 0.3), 6), own(new MeshBasicMaterial({ color: 0x5ED8E0 })));
  pool.rotation.x = -Math.PI / 2; pool.position.y = water; g.add(pool);
  const soakers = new Group(); soakers.userData.noBatch = true; g.add(soakers);
  [[-1, 0.15], [1, -0.15]].forEach(([side, dz], i) => {
    const p = guest(i + 2, true);
    // sitting on the bench, legs out under the water: hips well down, so the shoulders just clear it
    p.position.set(TUB.x + side * (R - 0.36), water - 0.77, TUB.z + dz); p.rotation.y = -side * Math.PI / 2;
    for (const l of p.legs) l.rotation.x = -1.45;
    soakers.add(p);
  });
  // on High, foam bubbling up at the jets, and steam rising off it, each wisp swelling and fading as it goes
  const bubbling = highOnly(soakers), foamMat = own(new MeshBasicMaterial({ color: 0xF2FCFF }));
  const foam = Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * Math.PI * 2, f = mesh(K.dot, foamMat, TUB.x + Math.cos(a) * (R - 0.2), water, TUB.z + Math.sin(a) * (R - 0.2));
    bubbling.add(f);
    return { f, t: i * 0.37 };
  });
  const steam = Array.from({ length: 6 }, (_, i) => {
    const m = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false });
    const w = mesh(K.ball, m, TUB.x, water, TUB.z);
    bubbling.add(w);
    return { w, m, a: i / 6 * Math.PI * 2, t: i / 6, y: water };
  });
  // on High, the strings of lights from the bow up to the mast's spreader
  const strings = new Build();
  for (const s of [-1, 1]) {
    for (let k = 1; k < 18; k++) {
      const t = k / 18, tx = MAST.x + 0.07, ty = mastTop - 0.4;
      strings.add(K.dot, 0xFFE08A, JACK.x + (tx - JACK.x) * t, JACK.y + (ty - JACK.y) * t - Math.sin(Math.PI * t) * 0.1, s * MAST.spread * t, null, 0.06);
    }
  }
  const lights = new Group();
  highOnly(g).add(lights);
  lights.add(baked(strings.pieces, false, bulbsOn));
  return { g, mats, base, lights, soakers, steam, foam, radar, flag };
}

// ---------- the signs ----------
/** The CASINO sign on each side of the ship, its bulbs chasing round it: out of the way of the view into the salon. */
function buildSigns(g: Group) {
  const sets = [new Build(), new Build()];
  const signMat = new MeshBasicMaterial({ map: SIGN_TEX.tex });
  both(g, p => { for (const side of [-1, 1]) p.box(SIGN.w + 0.16, SIGN.h + 0.16, 0.08, 0x5A1420, SIGN.x, SIGN.y, side * SIGN.out - side * 0.03, null, 0.03); });
  for (const side of [-1, 1]) {
    const z = side * SIGN.out;
    const face = new Mesh(new PlaneGeometry(SIGN.w, SIGN.h), signMat);
    face.position.set(SIGN.x, SIGN.y, z + side * 0.015); if (side < 0) face.rotation.y = Math.PI;
    g.add(face);
    let i = 0;
    const bulb = (x: number, y: number) => sets[i++ % 2].add(K.dot, 0xFFE08A, x, y, z + side * 0.02, null, 0.04);
    for (let x = -SIGN.w / 2; x <= SIGN.w / 2 + 0.01; x += SIGN.w / 14) { bulb(SIGN.x + x, SIGN.y + SIGN.h / 2 + 0.06); bulb(SIGN.x + x, SIGN.y - SIGN.h / 2 - 0.06); }
    for (const e of [-1, 1]) for (let y = -SIGN.h / 2 + 0.14; y < SIGN.h / 2 - 0.08; y += 0.2) bulb(SIGN.x + e * (SIGN.w / 2 + 0.06), SIGN.y + y);
  }
  // the bulbs, on High: they swap between lit and dim all the time, so they're never merged (batch.ts)
  const bulbs = highOnly(g);
  bulbs.userData.noBatch = true;
  const chase = sets.map(s => baked(s.pieces, false, bulbsOn));
  bulbs.add(...chase);
  return chase;
}

// ---------- the bar ----------
/** The bar across the stern with its brass rail, the back bar's shelves of bottles under a long mirror, the stools,
 *  and a potted palm by the door. */
function drawBar(p: Pen) {
  const { x, z0, z1 } = BAR, wood = 0x5A2E1F, len = z1 - z0, mid = (z0 + z1) / 2;
  p.box(0.5, 1.05, len, wood, x, UPPER + 0.525, mid, null, 0.03).box(0.62, 0.06, len + 0.1, 0x2A1410, x, UPPER + 1.08, mid, null, 0.02);
  p.box(0.04, 0.06, len, GOLD, x + 0.27, UPPER + 0.3, mid, null, 0.01).cyl(0.025, 0.025, len, GOLD, x + 0.4, UPPER + 0.18, mid, [Math.PI / 2, 0, 0], 8);
  // the back bar against the stern wall: shelves of bottles under a long mirror
  const bx = SALON.x0 + 0.22, wide = len - 0.2;
  p.box(0.3, 0.9, wide, wood, bx, UPPER + 0.45, mid, null, 0.03).flat(0.02, 0.9, wide - 0.6, 0xBFD4DC, bx - 0.05, UPPER + 1.6, mid);
  for (const y of [1.25, 1.75]) p.box(0.26, 0.04, wide, wood, bx + 0.02, UPPER + y, mid, null, 0.01);
  let n = 0;
  for (const y of [0.9, 1.27, 1.77]) for (let z = z0 + 0.2; z <= z1 - 0.2; z += 0.22) {
    p.cyl(0.045, 0.045, 0.24, [0x2E7D4F, 0x8E1F2F, 0xC9A24A][n++ % 3], bx + 0.02, UPPER + y + 0.13, z, null, 6);
    if (p.high) p.cyl(0.012, 0.03, 0.08, 0x1F1012, bx + 0.02, UPPER + y + 0.29, z, null, 5);
  }
  // stools in front of the bar
  for (const z of BAR.stools) p.cyl(0.05, 0.05, 0.7, GOLD, STOOL_X, UPPER + 0.35, z, null, 8).cyl(0.2, 0.2, 0.07, GOLD, STOOL_X, UPPER + 0.72, z, null, 12);
  // and a potted palm by the door
  for (const [px, pz] of PALMS) {
    p.cyl(0.24, 0.24, 0.44, GOLD, px, UPPER + 0.22, pz, null, 12).cyl(0.05, 0.05, 1.2, 0x7A5634, px, UPPER + 0.8, pz, null, 6);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      p.box(0.62, 0.03, 0.16, 0x2F7D3E, px + Math.cos(a) * 0.32, UPPER + 1.3, pz + Math.sin(a) * 0.32, [0, -a, 0.5], 0.01);
    }
  }
}
function buildBar(g: Group) {
  both(g, drawBar);
  // the strip of light over the mirror
  both(g, p => p.flat(0.05, 0.04, BAR.z1 - BAR.z0 - 0.6, 0xFFD98A, SALON.x0 + 0.27, UPPER + 2.12, (BAR.z0 + BAR.z1) / 2), false, LIT);
}

// ---------- the guests ----------
/** A well-dressed guest, a man in a suit or a woman in an evening dress. */
function guest(i: number, hatless = false) {
  const who = crowd();
  if (hatless) who.hat = 'bare';
  return new Person(who.woman ? DRESSES[i % DRESSES.length] : SUITS[i % SUITS.length], 'fancy', who);
}

/** One of the salon's slot machines, its reels spinning when a guest plays it. */
interface Machine { lever: Group; ctx: CanvasRenderingContext2D; tex: CanvasTexture; from: number[]; to: number[]; spin: number }
/** How long a guest's spin takes, and when each reel stops. */
const SPIN = 1.6, STOPS = [0.9, 1.25, 1.6];
/** A guest at a slot machine: pulls the lever every few seconds, the reels spin, and now and then they win. */
interface Gambler { p: Person; m: Machine; wait: number; t: number; joy: number; say: ReturnType<typeof speaker> }

function buildCrowd(g: Group) {
  // the slot machines against the bow wall, facing aft (the row's turned a quarter round: along it is across)
  const screens = ROW.zs.map((_, i) => {
    const { ctx, tex } = canvasTex(REELS_PX.w, REELS_PX.h, () => {});
    const pos = [i * 3, i * 7 + 2, i * 5 + 4];
    drawReels(ctx, pos);
    return { ctx, tex, pos };
  });
  const row = slotRow(ROW.zs, screens.map(s => new MeshBasicMaterial({ map: s.tex })));
  row.g.position.set(ROW.x, UPPER, 0); row.g.rotation.y = -Math.PI / 2;
  g.add(row.g);
  const machines: Machine[] = screens.map((s, i) => ({ lever: row.levers[i], ctx: s.ctx, tex: s.tex, from: s.pos, to: s.pos, spin: 0 }));
  const gamblers: Gambler[] = [0, 1].map((m, i) => {
    const p = guest(i);
    p.position.set(ROW.x - 0.75, UPPER, ROW.zs[m]); p.rotation.y = Math.PI / 2;
    g.add(p);
    return { p, m: machines[m], wait: 1 + i * 1.7, t: 0, joy: 0, say: speaker(p, 2.1) };
  });
  // the bar: two bartenders behind it, one polishing a glass and one shaking a cocktail, and guests on three stools
  const bartenders = [-1.1, 1.3].map(z => {
    const b = new Person(0x1F1F1F, 'waiter');
    b.position.set(BAR.x - 0.5, UPPER, z); b.rotation.y = Math.PI / 2;
    g.add(b);
    return b;
  });
  const drinkers = [0, 2, 3].map((k, i) => {
    const p = guest(i + 4), z = BAR.stools[k];
    p.position.set(STOOL_X, UPPER + 0.42, z); p.rotation.y = -Math.PI / 2;
    g.add(p);
    return { p, t: 2 + i * 2.5 };
  });
  // a waiter carrying a tray of champagne up and down along the windows, who stops to serve the player a glass
  const waiter = new Person(0x24476B, 'waiter');
  waiter.position.set(WAITER.x0, UPPER, WAITER.z);
  // the tray sits flat on the palm of the hand held out in front (the arm's turned to level, so the tray's turned back)
  const tray = new Group(); tray.position.set(0, -0.33, 0.07); tray.rotation.x = TRAY_ARM; waiter.arms[0].add(tray);
  tray.add(mesh(new CylinderGeometry(0.18, 0.18, 0.03, 16), 0xC0C6CC));
  const trayGlasses = [[-0.07, 0], [0.07, 0.04], [0, -0.08]].map(([dx, dz]) => {
    const f = flute(); f.g.position.set(dx, 0.015, dz); f.g.scale.setScalar(0.8); tray.add(f.g);
    return f.g;
  });
  g.add(waiter);
  // the player's glass and the waiter's own, for a toast
  const glass = flute(), his = flute();
  for (const f of [glass, his]) { f.g.visible = false; f.g.scale.setScalar(0.8 * 1.4); scene.add(f.g); }
  // a guest at the end of the roulette table, watching the wheel, who cheers when the player wins
  const fan = guest(7);
  fan.position.set(FAN.x, UPPER, FAN.z); fan.rotation.y = Math.PI / 2;
  g.add(fan);
  const fanSay = speaker(fan, 2.1);
  const crowdState = {
    machines, gamblers, bartenders, drinkers, waiter, tray, trayGlasses, glass, his, fan, fanSay, clap: 0,
    walk: { dir: 1, pause: 0 }, waiterSay: speaker(waiter, 1.75), hic: speaker(player.g, 1.75), hicT: 0,
    pour: null as Pour | null, buzz: 0,
  };
  onCheer(() => {
    crowdState.clap = 1.4;
    fanSay.say(['Nice!', 'Wow!', 'Lucky!'][Math.floor(dice() * 3)]);
  });
  return crowdState;
}
/** The waiter's beat along the windows, and the fan's spot at the roulette table's far end: both off the player's way
 *  from the door to the games. */
const WAITER = { x0: SALON.x0 + 2.4, x1: SALON.x1 - 1.1, z: SALON.side - 0.9 };
const FAN = { x: -5.85, z: -1.55 };
/** How far forward the waiter holds the tray arm: level with the shoulder. */
const TRAY_ARM = 1.6;

// ---------- champagne ----------
const glassMat = offLuck(() => new MeshLambertMaterial({ color: 0xE8F4F8, transparent: true, opacity: 0.45, depthWrite: false }));
/** A champagne flute: its bowl, the champagne in it (which goes down as it's drunk, from the top), its stem and foot. */
function flute() {
  const g = new Group();
  const wine = mesh(new CylinderGeometry(0.03, 0.013, 0.1, 10).translate(0, 0.05, 0), 0xF2D27A);
  wine.position.y = 0.08;
  g.add(
    mesh(new CylinderGeometry(0.036, 0.015, 0.13, 10), glassMat, 0, 0.145, 0), wine,
    mesh(new CylinderGeometry(0.006, 0.006, 0.08, 6), glassMat, 0, 0.04, 0),
    mesh(new CylinderGeometry(0.028, 0.028, 0.008, 10), glassMat, 0, 0.004, 0),
  );
  g.scale.setScalar(1.4);
  return { g, wine };
}

/** What a glass costs: the second chip of the stage. */
const price = () => CHIPS[stage.n][1];
/** How close the player comes for the waiter to stop and offer a glass, and how far they go for him to carry on. */
const NEAR = 1.2, AWAY = 2.4;
/**
 * A glass served and drunk, as keyframes of where each glass is: on the `tray`, `held` at the chest, raised for the
 * `toast` (the glasses touching between the two of them) or at the `lips`, tipping as it empties. The waiter takes a
 * glass too: they clink, both drink, the player twice, and the empties go back on the tray.
 */
type Spot = 'tray' | 'held' | 'toast' | 'lips';
const PLAYER_KEYS: [number, Spot][] = [
  [0, 'tray'], [0.6, 'held'], [0.85, 'held'], [1.2, 'toast'], [1.4, 'toast'], [1.7, 'held'], [2.0, 'lips'], [2.9, 'lips'],
  [3.2, 'held'], [3.45, 'lips'], [4.35, 'lips'], [4.65, 'held'], [5.1, 'tray'],
];
const WAITER_KEYS: [number, Spot][] = [
  [0, 'tray'], [0.6, 'held'], [0.85, 'held'], [1.2, 'toast'], [1.4, 'toast'], [1.7, 'held'], [2.0, 'lips'], [2.9, 'lips'],
  [3.2, 'held'], [4.65, 'held'], [5.1, 'tray'],
];
/** When the glasses clink, when each sip is at the lips (and how much of the glass it drinks), and when it's over. */
const DRINK = { clink: 1.3, sips: [[2.0, 2.9, 0.5], [3.45, 4.35, 0.47]], done: 5.1 };
/** Glasses in a row that make the player tipsy (within half a minute or so: each wears off over a minute), and how
 *  long they stagger. */
const TOO_MANY = 3, SOBER_RATE = 1 / 60, TIPSY_SECS = 5;
/** A glass being served: how long it's been, and what the camera looks at. */
interface Pour { t: number; at: Vector3; clinked: boolean }
const bubbly = document.getElementById('bubbly')!, bubblyMsg = document.getElementById('bubblyMsg')!;
const sipBtn = document.getElementById('sip') as HTMLButtonElement;
const tmpA = new Vector3(), tmpB = new Vector3(), tmpC = new Vector3(), UP = new Vector3(0, 1, 0);

/** Where the waiter is, in the world. */
const waiterAt = (c: ReturnType<typeof buildCrowd>) => tmpB.set(SHIP.x + c.waiter.position.x, UPPER, SHIP.z + c.waiter.position.z);

/** Buys the player a glass from the waiter, if they're by him and can pay: the camera comes in close while they drink. */
function buyChampagne() {
  const c = salon?.crowd;
  if (!c || c.pour || bubbly.hidden || wallet.money < price()) return;
  wallet.money -= price();
  const pp = player.g.position, w = waiterAt(c);
  c.pour = { t: 0, at: V((pp.x + w.x) / 2, UPPER + 1.05, (pp.z + w.z) / 2), clinked: false };
  // the camera looks in from the side (the windows' side) and a little in front of the player, to see them drink
  const d = V(w.x - pp.x, 0, w.z - pp.z).normalize(), side = V(-d.z, 0, d.x);
  if (side.z < 0) side.negate();
  takeSeat({ at: c.pour.at, from: side.addScaledVector(d, 0.75).add(V(0, 0.6, 0)).normalize(), wide: 1.9, tall: 1.8 }, bubbly);
  refreshBubbly();
}
sipBtn.addEventListener('click', buyChampagne);
window.addEventListener('keydown', e => { if (e.code === 'KeyE' && !e.repeat) buyChampagne(); });

let shown = '';
/** The panel's message and button, set only when they change. */
function refreshBubbly() {
  const c = salon!.crowd, text = c.pour ? 'Cheers! 🥂' : `Champagne · ${money(price())}`;
  const say = c.pour ? 'Bottoms up!' : wallet.money < price() ? `A glass is ${money(price())}`
    : c.buzz >= TOO_MANY - 1.5 ? 'Steady now… 🥂' : 'Champagne? 🥂';
  sipBtn.disabled = !!c.pour || wallet.money < price();
  if (shown === text + say) return;
  shown = text + say;
  sipBtn.textContent = text; bubblyMsg.textContent = say;
}

/** Where someone's glass is at a keyframe: its foot, and how far it's tipped towards their face (back, if less than 0). */
function spot(c: ReturnType<typeof buildCrowd>, who: Person, arm: Group, k: Spot, other: Person, level: number) {
  const f = who.getWorldDirection(tmpA).setY(0).normalize();
  if (k === 'tray') return { foot: c.tray.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0)), tip: 0 };
  if (k === 'held') return { foot: who.body.localToWorld(V(arm.position.x * 0.6, 0.66, 0.3)), tip: 0 };
  if (k === 'toast') {
    // the two glasses touch over the middle, raised to head height, leaning in to each other
    const mine = who.getWorldPosition(V(0, 0, 0)), theirs = other.getWorldPosition(V(0, 0, 0));
    const mid = mine.clone().lerp(theirs, 0.5), d = theirs.sub(mine).setY(0).normalize();
    return { foot: mid.addScaledVector(d, -0.05).setY(UPPER + 1.0), tip: -0.3 };
  }
  // at the lips: the rim at the mouth, tipped further the emptier it is
  const tip = 0.95 + 0.6 * (1 - level), mouth = who.body.localToWorld(V(0, 0.98, 0.05)).addScaledVector(f, 0.17);
  const u = UP.clone().applyAxisAngle(tmpC.crossVectors(f, UP).normalize(), tip);
  return { foot: mouth.addScaledVector(u, -0.27), tip };
}

/**
 * Puts `glass` at `foot`, tipped by `tip` towards `who`'s face, and points their `arm` at its stem, so the hand's on it.
 * Leans them back a little as they drink.
 */
function holdGlass(who: Person, arm: Group, glass: Group, foot: Vector3, tip: number) {
  const f = who.getWorldDirection(tmpA).setY(0).normalize(), axis = tmpC.crossVectors(f, UP).normalize();
  glass.position.copy(foot);
  glass.quaternion.setFromAxisAngle(axis, tip);
  const stem = UP.clone().applyQuaternion(glass.quaternion).multiplyScalar(0.06).add(foot);
  const d = arm.parent!.worldToLocal(stem).sub(arm.position).normalize();
  arm.rotation.set(Math.atan2(-d.z, -d.y), 0, Math.asin(Math.max(-1, Math.min(1, d.x))));
  if (tip > 0.5) who.body.rotation.x = -0.1 * Math.min(1, tip - 0.5);
}

/** Where a glass is at `t`, eased between keyframes. */
function along(c: ReturnType<typeof buildCrowd>, keys: [number, Spot][], t: number, who: Person, arm: Group, other: Person, level: number) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1], k = easeInOut(Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));
  const A = spot(c, who, arm, a, other, level), B = spot(c, who, arm, b, other, level);
  return { foot: A.foot.lerp(B.foot, k), tip: A.tip + (B.tip - A.tip) * k };
}

/** How much of a glass is left at `t`, with `sips` of it drunk. */
const left = (t: number, sips: number) =>
  1 - DRINK.sips.slice(0, sips).reduce((d, [a, b, much]) => d + much * Math.max(0, Math.min(1, (t - a) / (b - a))), 0);

/** The toast: the waiter hands the player a glass and takes one, they clink, both drink, and the empties go back. */
function updPour(c: ReturnType<typeof buildCrowd>, dt: number) {
  const P = c.pour!, w = waiterAt(c), pp = player.g.position, me = player.g as Person;
  P.t += dt;
  // walking off leaves the glasses with the waiter
  if (P.t > DRINK.done || Math.hypot(pp.x - w.x, pp.z - w.z) > AWAY) {
    for (const g of [c.glass, c.his]) { g.g.visible = false; g.wine.scale.y = 1; }
    c.trayGlasses.forEach(g => { g.visible = true; });
    c.pour = null; leaveSeat(bubbly);
    if (P.t > DRINK.done) drank(c);
    return;
  }
  // face each other
  if (!player.moving) {
    let dh = Math.atan2(w.x - pp.x, w.z - pp.z) - player.h;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    player.h += dh * Math.min(1, dt * 8);
    player.g.rotation.y = player.h;
  }
  c.trayGlasses[0].visible = c.trayGlasses[1].visible = P.t < 0.05;
  c.glass.g.visible = c.his.g.visible = true;
  me.updateMatrixWorld(true); c.waiter.updateMatrixWorld(true);
  const mine = left(P.t, 2), his = left(P.t, 1);
  c.glass.wine.scale.y = Math.max(0.05, mine); c.his.wine.scale.y = Math.max(0.05, his);
  const a = along(c, PLAYER_KEYS, P.t, me, me.arms[0], c.waiter, mine), b = along(c, WAITER_KEYS, P.t, c.waiter, c.waiter.arms[1], me, his);
  holdGlass(me, me.arms[0], c.glass.g, a.foot, a.tip);
  holdGlass(c.waiter, c.waiter.arms[1], c.his.g, b.foot, b.tip);
  if (!P.clinked && P.t >= DRINK.clink) {
    P.clinked = true;
    clink(c.glass.g.position);
    c.waiterSay.say('To Lady Luck!'); c.hic.say('Cheers!');
  }
}

/** A glass drunk: one more makes the player tipsy for a few seconds, zigzagging with the camera swaying; else a hic. */
function drank(c: ReturnType<typeof buildCrowd>) {
  c.buzz += 1;
  if (c.buzz >= TOO_MANY - 0.5) { c.buzz = 1; tipsy.t = TIPSY_SECS; c.hic.say('Hic!'); c.hicT = 2.2; }
  else c.hicT = 1.2;
}

// ---------- the salon ----------
let salon: {
  roof: ReturnType<typeof buildRoof>; faders: Fader[]; crowd: ReturnType<typeof buildCrowd>; clock: number;
  roofK: number; chase: Mesh[];
} | null = null;

/** Builds the salon into the ship's group `g` (in the ship's own space). */
export function buildSalon(g: Group) {
  const faders = buildWalls(g);
  const roof = buildRoof();
  g.add(roof.g);
  buildBar(g);
  salon = { roof, faders, crowd: buildCrowd(g), clock: 0, roofK: 1, chase: buildSigns(g) };
}

/** The player's inside the salon: on the upper deck. */
export const inSalon = (p: XZ & { y: number }) => aboard(p) && p.y > FY + 1.0;

/** Fades between `want` and opaque, for a set of materials. */
function fade(mats: Material[], base: number[], k: number) {
  mats.forEach((m, i) => {
    m.opacity = base[i] * k;
    m.depthWrite = k > 0.95 && base[i] === 1;
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
  for (const p of s.roof.steam) {
    p.t = (p.t + dt / 2.6) % 1;
    const r = 0.25 + p.t * 0.2, a = p.a + p.t * 1.2;
    p.w.position.set(TUB.x + Math.cos(a) * r, p.y + 0.05 + p.t * 0.7, TUB.z + Math.sin(a) * r);
    p.w.scale.setScalar(0.08 + p.t * 0.16);
    p.m.opacity = 0.35 * Math.sin(Math.PI * p.t) * s.roofK;
  }
  for (const b of s.roof.foam) {
    b.t += dt;
    const k = 0.5 + 0.5 * Math.sin(b.t * 7) * Math.sin(b.t * 2.3);
    b.f.scale.set(0.07 + 0.05 * k, 0.02, 0.07 + 0.05 * k);
  }
  s.roof.flag.rotation.y = Math.sin(s.clock * 2.2) * 0.15;
  const wallK = 0.12 + 0.88 * s.roofK;
  for (const f of s.faders) {
    fade(f.mats, f.base, wallK);
    for (const w of f.walls) w.castShadow = wallK > 0.95;
  }
  // the bulbs chase round the signs
  const on = Math.floor(s.clock * 3) % 2;
  s.chase.forEach((m, i) => { m.material = i === on ? bulbsOn : bulbsOff; });
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
  // one bartender polishes a glass, the other shakes cocktails now and then; the guests at the bar sip now and then
  const [polish, shake] = c.bartenders;
  animPerson(polish, false, dt, false); animPerson(shake, false, dt, false);
  polish.arms[0].rotation.x = -1.2 + Math.sin(clock * 5) * 0.25;
  polish.arms[0].rotation.z = Math.cos(clock * 5) * 0.25;
  polish.arms[1].rotation.x = -1.1;
  shake.arms[0].rotation.x = shake.arms[1].rotation.x = -2.0 + Math.sin(clock * 16) * 0.25 * (Math.sin(clock * 0.9) > 0 ? 1 : 0);
  for (const d of c.drinkers) {
    animPerson(d.p, false, dt, false);
    for (const l of d.p.legs) l.rotation.x = -1.45;
    d.t -= dt;
    if (d.t < -1.2) d.t = 4 + dice() * 4;
    d.p.arms[0].rotation.x = d.t < 0 ? -2.0 : -0.7;
    d.p.arms[1].rotation.x = -0.7;
  }
  // the waiter walks up and down with the tray, pausing at each end, and stops for the player to offer a glass
  const w = c.waiter, walk = c.walk, pp = player.g.position, wAt = waiterAt(c);
  const near = !!c.pour || (inSalon(pp) && !atTable() && Math.hypot(pp.x - wAt.x, pp.z - wAt.z) < NEAR);
  if (near !== !bubbly.hidden) { bubbly.hidden = !near; if (near) shown = ''; }
  if (near) refreshBubbly();
  c.waiterSay.upd(dt); c.hic.upd(dt);
  if (c.hicT > 0 && (c.hicT -= dt) <= 0) c.hic.say('Hic!');
  c.buzz = Math.max(0, c.buzz - dt * SOBER_RATE);
  let face = walk.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (near) {
    animPerson(w, false, dt, true);
    face = Math.atan2(pp.x - wAt.x, pp.z - wAt.z);
  } else if (walk.pause > 0) { walk.pause -= dt; animPerson(w, false, dt, true); }
  else {
    w.position.x += walk.dir * 1.1 * dt;
    if (w.position.x > WAITER.x1 || w.position.x < WAITER.x0) {
      w.position.x = Math.max(WAITER.x0, Math.min(WAITER.x1, w.position.x));
      walk.dir *= -1; walk.pause = 2.5;
    }
    animPerson(w, true, dt, true);
  }
  const turn = ((face - w.rotation.y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  w.rotation.y += turn * Math.min(1, dt * 6);
  w.arms[0].rotation.x = -TRAY_ARM; w.arms[0].rotation.z = 0; w.arms[1].rotation.x = -0.4;
  if (c.pour) updPour(c, dt);
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

/** Keeps the player out of the bar, the row of machines and the guests at them, the palm and the fan. The waiter
 *  doesn't block: walk up to him for a glass, or past him. */
export function collideSalon(p: XZ) {
  if (!salon) return;
  const x = (v: number) => SHIP.x + v, z = (v: number) => SHIP.z + v;
  const bar1 = STOOL_X + 0.25, row0 = ROW.x - 1.0, rowZ = [ROW.zs[0] - 0.37, ROW.zs[ROW.zs.length - 1] + 0.37];
  pushOutOfBox(p, x((SALON.x0 + bar1) / 2), z((BAR.z0 + BAR.z1) / 2), (bar1 - SALON.x0) / 2 + 0.3, (BAR.z1 - BAR.z0) / 2 + 0.3);
  pushOutOfBox(p, x((row0 + SALON.x1) / 2), z((rowZ[0] + rowZ[1]) / 2), (SALON.x1 - row0) / 2 + 0.3, (rowZ[1] - rowZ[0]) / 2 + 0.3);
  for (const [px, pz] of PALMS) pushOutOfBox(p, x(px), z(pz), 0.3 + 0.3, 0.3 + 0.3);
  pushOutOfBox(p, x(FAN.x), z(FAN.z), 0.25 + 0.3, 0.25 + 0.3);
  // the east wall either side of the door
  for (const s of [-1, 1]) pushOutOfBox(p, x(SALON.x1), z(s * (DOOR + SALON.side) / 2), 0.08 + 0.3, (SALON.side - DOOR) / 2);
}

/** For tests: jumps the glass being served to `t` seconds in. */
export const pourTo = (t: number) => { if (salon?.crowd.pour) salon.crowd.pour.t = t; };

/** For tests: how far the roof is up (1) or lifted away (0), what the fan by the tables is saying, how many guests
 *  there are, how far the radar has turned, and where the fan and the waiter are (in the ship's own space). */
export const salonView = () => ({
  roof: salon?.roofK ?? 1, fan: salon?.crowd.fanSay.text ?? '', guests: salon ? 2 + 3 + 2 + 1 + 1 + 2 : 0,
  waiter: salon?.crowd.waiterSay.text ?? '', drinking: !!salon?.crowd.pour, says: salon?.crowd.hic.text ?? '',
  radar: salon?.roof.radar.rotation.y ?? 0,
  staff: salon ? [salon.crowd.fan.position, salon.crowd.waiter.position] : [],
});
