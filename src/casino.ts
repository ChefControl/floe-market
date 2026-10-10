// The casino harbor: the dock carries on west as a stone-walled quay with bollards, lamp posts and a ticket booth,
// and a white riverboat is moored along it, bow towards the dock. A gangway takes you aboard onto the foredeck, a
// staircase climbs to the open upper deck where the games are, over a cabin with lit windows, between twin
// smokestacks carrying the CASINO sign and a big red stern wheel. The 'roulette' unlock brings it all in with the
// roulette table; the blackjack table and the slot machines are upgrades of their own, bought on the upper deck. It
// stays put through the stage-up. The games themselves are in rouletteTable.ts, blackjackTable.ts and slotMachine.ts.
import {
  BoxGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  PlaneGeometry, Quaternion, Shape, ShapeGeometry, TorusGeometry, Vector3, type Object3D,
} from 'three';
import { collideBlackjack, updBlackjack } from './blackjackTable';
import { updTweens, visits } from './casinoKit';
import { aboard, casinoBoat, DECKS, pushOutOfBox, QUAY, SHIP, UPPER } from './layout';
import { player } from './player';
import { popIn } from './pop';
import { bake, canvasTex, FONT, G, mat, mesh, scene, type Part } from './render';
import { collideRoulette, enableRoulette, updRoulette } from './rouletteTable';
import { collideSlots, updSlots } from './slotMachine';
import { view } from './stage';
import { FY, V, type XZ } from './util';
import { openQuayGap, planks } from './world';

const GOLD = 0xE3B23C, HULL = 0xF4EFE6, RED = 0xB0283A, DARK_RED = 0x6E1A26, STONE = 0x9AA3AA, IRON = 0x2B2F33;
const bulbMat = new MeshBasicMaterial({ color: 0xFFE08A });
const glowMat = new MeshBasicMaterial({ color: 0xFFD98A });
/** The upper deck's height above the main deck. */
const UP = UPPER - FY;

/** A group at (x, z) that pops in about its own centre; `put` places things in it by world position. */
function piece(x: number, z: number) {
  const g = new Group(); g.position.set(x, 0, z); scene.add(g);
  return g;
}
function put<T extends Object3D>(g: Group, o: T, x: number, y: number, z: number) {
  o.position.set(x - g.position.x, y, z - g.position.z); g.add(o);
  return o;
}
const UP_AXIS = new Vector3(0, 1, 0), tmpQ = new Quaternion(), tmpE = new Euler();
/** A rope, rail or beam from `a` to `b`, as a thin cylinder. */
function strut(a: Vector3, b: Vector3, r: number): Part {
  const d = b.clone().sub(a), len = d.length();
  tmpE.setFromQuaternion(tmpQ.setFromUnitVectors(UP_AXIS, d.normalize()));
  return { geo: G.cyl, at: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], rot: [tmpE.x, tmpE.y, tmpE.z], scale: [r, len, r] };
}

const SIGN = canvasTex(512, 160, (c, w, h) => {
  c.fillStyle = '#5A1420'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#FFD24A';
  for (let i = 0; i < 24; i++) {
    c.beginPath(); c.arc(12 + i * 21.2, 12, 6, 0, Math.PI * 2); c.arc(12 + i * 21.2, h - 12, 6, 0, Math.PI * 2); c.fill();
  }
  c.font = `800 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = '#2A0F16'; c.strokeText('CASINO', w / 2, h / 2 + 6);
  c.fillStyle = '#FFD24A'; c.fillText('CASINO', w / 2, h / 2 + 6);
});
const BOOTH_SIGN = canvasTex(256, 64, (c, w, h) => {
  c.fillStyle = '#FFF8EC'; c.fillRect(0, 0, w, h);
  c.font = `800 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#8E1F2F';
  c.fillText('TICKETS', w / 2, h / 2 + 3);
});

// ---------- the quay ----------
const LAMPS_X = [-10.6, -16.4, -22.2];
/** The ticket booth and the pile of crates on the quay, which the player walks round. */
const BOOTH = { x: -12.6, z: -4.85, w: 1.3, d: 0.9 };
const CRATES = { x: -23.3, z: -4.95, w: 1.9, d: 1.0 };

/** The quay: a stone wall into the water, plank-topped like the dock, a kerb with bollards, lamps, a booth and crates. */
function buildQuay() {
  const { x0, x1, z0, z1 } = QUAY, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  const g = piece(cx, cz);
  put(g, mesh(new BoxGeometry(w, 0.75, d + 0.1), STONE, 0, 0, 0, true), cx, FY - 0.55, cz);
  const side = mat(0x9C6644), top = new MeshLambertMaterial({ map: planks('#C3875D', '#CF946A', w / 4, d / 4) });
  put(g, new Mesh(new BoxGeometry(w, 0.2, d), [side, side, top, side, side, side]), cx, FY - 0.1, cz).receiveShadow = true;
  // the kerb along the water's edge and round the west end, and stone blocks marked in the wall's face
  const kerb: Part[] = [
    { geo: G.box, at: [0, FY + 0.03, z0 + 0.17 - cz], scale: [w, 0.12, 0.34] },
    { geo: G.box, at: [x0 + 0.17 - cx, FY + 0.03, 0], scale: [0.34, 0.12, d] },
  ];
  for (let x = x0 + 0.6; x < x1; x += 1.2) kerb.push({ geo: G.box, at: [x - cx, FY - 0.42, z0 - cz - 0.02], scale: [1.12, 0.32, 0.06] });
  g.add(mesh(bake(kerb), 0xC9D0D5, 0, 0, 0, true));
  // bollards along the kerb
  const bollards: Part[] = [];
  for (let x = x0 + 1.0; x < x1 - 0.5; x += 2.8) {
    bollards.push({ geo: G.cyl, at: [x - cx, FY + 0.25, z0 + 0.17 - cz], scale: [0.13, 0.36, 0.13] });
    bollards.push({ geo: G.cyl, at: [x - cx, FY + 0.45, z0 + 0.17 - cz], scale: [0.18, 0.06, 0.18] });
  }
  g.add(mesh(bake(bollards), IRON, 0, 0, 0, true));
  // lamp posts along the landward side, their lanterns lit
  const posts: Part[] = [], lights: Part[] = [];
  for (const x of LAMPS_X) {
    const lz = z1 - 0.25 - cz;
    posts.push({ geo: G.cyl, at: [x - cx, FY + 1.3, lz], scale: [0.06, 2.6, 0.06] });
    posts.push({ geo: G.cyl, at: [x - cx, FY + 0.12, lz], scale: [0.14, 0.24, 0.14] });
    posts.push({ geo: G.cone, at: [x - cx, FY + 2.95, lz], scale: [0.26, 0.2, 0.26] });
    lights.push({ geo: G.box, at: [x - cx, FY + 2.7, lz], scale: [0.26, 0.32, 0.26] });
  }
  g.add(mesh(bake(posts), 0x234238, 0, 0, 0, true), mesh(bake(lights), glowMat));
  // the ticket booth: a little white kiosk with a red-and-white striped roof, its window towards the water
  const b = put(g, new Group(), BOOTH.x, FY, BOOTH.z);
  b.add(mesh(new BoxGeometry(BOOTH.w, 1.5, BOOTH.d), 0xF4EFE6, 0, 0.75, 0, true));
  b.add(mesh(new BoxGeometry(BOOTH.w - 0.3, 0.6, 0.04), 0x2A3F4C, 0, 1.05, -BOOTH.d / 2 - 0.01));
  b.add(mesh(new BoxGeometry(BOOTH.w + 0.1, 0.1, 0.4), RED, 0, 0.7, -BOOTH.d / 2 - 0.15, true));
  const red: Part[] = [], white: Part[] = [];
  for (let i = 0; i < 6; i++) (i % 2 ? white : red).push({ geo: G.box, at: [-BOOTH.w / 2 + 0.11 + i * 0.22, 1.62, 0], scale: [0.22, 0.12, BOOTH.d + 0.3] });
  b.add(mesh(bake(red), RED, 0, 0, 0, true), mesh(bake(white), 0xFFF8EC, 0, 0, 0, true));
  b.add(mesh(new BoxGeometry(BOOTH.w + 0.1, 0.34, 0.06), 0x8E1F2F, 0, 1.86, -BOOTH.d / 2 - 0.12));
  const sign = new Mesh(new PlaneGeometry(1.1, 0.28), new MeshBasicMaterial({ map: BOOTH_SIGN.tex }));
  sign.position.set(0, 1.86, -BOOTH.d / 2 - 0.16); sign.rotation.y = Math.PI; b.add(sign);
  // crates and barrels piled at the west end
  const crates: Part[] = [
    { geo: G.box, at: [CRATES.x - 0.45 - cx, FY + 0.3, CRATES.z - cz], scale: [0.6, 0.6, 0.6] },
    { geo: G.box, at: [CRATES.x + 0.2 - cx, FY + 0.25, CRATES.z + 0.1 - cz], scale: [0.5, 0.5, 0.5] },
    { geo: G.box, at: [CRATES.x - 0.4 - cx, FY + 0.8, CRATES.z - cz], scale: [0.45, 0.4, 0.45] },
  ];
  g.add(mesh(bake(crates), 0xB7834F, 0, 0, 0, true));
  const barrels: Part[] = [[0.7, -0.15], [0.75, 0.3]].map(([dx, dz]) => ({ geo: G.cyl, at: [CRATES.x + dx - cx, FY + 0.32, CRATES.z + dz - cz], scale: [0.22, 0.64, 0.22] }));
  g.add(mesh(bake(barrels), 0x7A4E2D, 0, 0, 0, true));
  return g;
}

// ---------- the riverboat ----------
const L = SHIP.half, B = SHIP.beam, BOW = L + 0.5;
/** The hull's outline from above, `k` times as wide: square at the stern, a rounded point at the bow (+x). */
function hullShape(k = 1) {
  const s = new Shape();
  s.moveTo(-L + 0.4, -B * k);
  s.lineTo(4.0, -B * k);
  s.quadraticCurveTo(6.0, -B * 0.92 * k, BOW, 0);
  s.quadraticCurveTo(6.0, B * 0.92 * k, 4.0, B * k);
  s.lineTo(-L + 0.4, B * k);
  s.quadraticCurveTo(-L, B * k, -L, B * k - 0.4);
  s.lineTo(-L, -B * k + 0.4);
  s.quadraticCurveTo(-L, -B * k, -L + 0.4, -B * k);
  return s;
}
/** Roughly the hull's half-width at `x` along it (for the bow's railing and the mooring cleats). */
const halfBeamAt = (x: number) => x <= 4.0 ? B : B * Math.sqrt(Math.max(0, 1 - ((x - 4.0) / (BOW - 4.0)) ** 2));

/** A shape lying flat, extruded `h` up from `y`. */
function slab(shape: Shape, h: number, y: number, m: number) {
  const o = mesh(new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 }), m, 0, y, 0, true);
  o.rotation.x = -Math.PI / 2;
  return o;
}

/** A railing through `pts` at height `y`: posts, a gold rail between them and a bulb on each post. */
function railing(pts: [number, number][], y: number, out: { posts: Part[]; rails: Part[]; bulbs: Part[] }, h = 0.75) {
  pts.forEach(([x, z], i) => {
    out.posts.push({ geo: G.cyl, at: [x, y + h / 2, z], scale: [0.04, h, 0.04] });
    out.bulbs.push({ geo: G.sphere, at: [x, y + h + 0.05, z], scale: [0.06, 0.06, 0.06] });
    if (!i) return;
    const [px, pz] = pts[i - 1];
    out.rails.push(strut(V(px, y + h, pz), V(x, y + h, z), 0.03));
  });
}
/** Points about every 0.9 m from `a` to `b`, both ends included. */
function line(a: [number, number], b: [number, number]): [number, number][] {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.9));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
}
/** Points along the bow's edge on side `s`, from `from` to `to` along the ship. */
function bowEdge(from: number, to: number, s: number) {
  const pts: [number, number][] = [];
  for (let x = from; x <= to + 0.01; x += 0.45) pts.push([x, s * (halfBeamAt(x) - 0.14)]);
  return pts;
}

function buildShip() {
  const g = new Group(); g.position.set(SHIP.x, 0, SHIP.z); scene.add(g);
  // the hull: white, a red stripe, a dark band at the waterline; a planked main deck on top
  g.add(slab(hullShape(), 0.8, -0.67, HULL));
  g.add(slab(hullShape(1.012), 0.12, FY - 0.3, RED));
  g.add(slab(hullShape(1.006), 0.14, -0.1, DARK_RED));
  const deck = new Mesh(new ShapeGeometry(hullShape(0.985), 10), new MeshLambertMaterial({ map: planks('#B07A52', '#BC8660', 0.35, 0.35) }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = FY + 0.135; deck.receiveShadow = true; g.add(deck);
  const rail = { posts: [] as Part[], rails: [] as Part[], bulbs: [] as Part[] };
  // the cabin under the upper deck: white walls, lit windows in gold frames, a red door at each end
  const c0 = DECKS.stern + 0.35, c1 = DECKS.front - 0.35, cw = B - 0.45, ch = UP - 0.14;
  g.add(mesh(new BoxGeometry(c1 - c0, ch, cw * 2), HULL, (c0 + c1) / 2, FY + 0.135 + ch / 2, 0, true));
  const panes: Part[] = [], frames: Part[] = [], doors: Part[] = [];
  for (let x = c0 + 0.7; x < c1 - 0.4; x += 1.1) {
    for (const s of [-1, 1]) {
      panes.push({ geo: G.box, at: [x, FY + 1.15, s * (cw + 0.02)], scale: [0.5, 0.62, 0.02] });
      frames.push({ geo: G.box, at: [x, FY + 1.15, s * (cw + 0.01)], scale: [0.62, 0.74, 0.02] });
    }
  }
  for (const x of [c0 - 0.02, c1 + 0.02]) doors.push({ geo: G.box, at: [x, FY + 0.85, 0], scale: [0.04, 1.4, 0.8] });
  g.add(mesh(bake(frames), GOLD), mesh(bake(panes), glowMat), mesh(bake(doors), 0x8E1F2F));
  // white columns round the main deck holding up the upper deck
  const cols: Part[] = [];
  for (let x = DECKS.stern + 0.2; x <= DECKS.front; x += 1.35) {
    for (const s of [-1, 1]) cols.push({ geo: G.cyl, at: [x, FY + UP / 2, s * (B - 0.2)], scale: [0.07, UP, 0.07] });
  }
  g.add(mesh(bake(cols), 0xFFFFFF, 0, 0, 0, true));
  // the upper deck: planked, edged in gold, railed all round but for the top of the stairs
  const len = DECKS.front - DECKS.stern, mid = (DECKS.front + DECKS.stern) / 2;
  const white = mat(0xFFFFFF), boards = new MeshLambertMaterial({ map: planks('#9B5A3C', '#A8664A', len / 3, 2) });
  const floor = new Mesh(new BoxGeometry(len, 0.16, B * 2), [white, white, boards, white, white, white]);
  floor.position.set(mid, UPPER - 0.08, 0); floor.castShadow = floor.receiveShadow = true; g.add(floor);
  g.add(mesh(new BoxGeometry(len + 0.06, 0.1, B * 2 + 0.06), GOLD, mid, UPPER - 0.2, 0));
  const e = 0.12, sx = DECKS.stern + e, fx = DECKS.front - e, gap = DECKS.stairs.half + 0.15;
  railing(line([sx, -B + e], [fx, -B + e]), UPPER, rail);
  railing(line([sx, B - e], [fx, B - e]), UPPER, rail);
  railing(line([sx, -B + e], [sx, B - e]), UPPER, rail);
  railing(line([fx, -B + e], [fx, -gap]), UPPER, rail);
  railing(line([fx, gap], [fx, B - e]), UPPER, rail);
  // the foredeck's railing round the bow, open where the gangway comes aboard
  railing([...bowEdge(DECKS.front, L + 0.3, -1), [BOW - 0.15, 0]], FY, rail, 0.6);
  railing([[BOW - 0.15, 0], ...bowEdge(DECKS.gangway + 0.55, L + 0.3, 1).reverse()], FY, rail, 0.6);
  railing(bowEdge(DECKS.front, DECKS.gangway - 0.55, 1), FY, rail, 0.6);
  // the staircase from the foredeck up to the upper deck, with white sides and gold handrails
  const { x0: tx, x1: bx, half: hw } = DECKS.stairs, steps: Part[] = [], n = 10;
  for (let i = 0; i < n; i++) {
    const x = bx - (bx - tx) * (i + 0.5) / n;
    steps.push({ geo: G.box, at: [x, FY + UP * (i + 1) / n - 0.05, 0], scale: [(bx - tx) / n + 0.02, 0.1, hw * 2] });
  }
  g.add(mesh(bake(steps), 0x9B5A3C, 0, 0, 0, true));
  const sides: Part[] = [], hand: Part[] = [];
  for (const s of [-1, 1]) {
    sides.push(strut(V(bx, FY + 0.05, s * (hw + 0.04)), V(tx, UPPER - 0.05, s * (hw + 0.04)), 0.05));
    hand.push(strut(V(bx, FY + 0.85, s * (hw + 0.06)), V(tx, UPPER + 0.75, s * (hw + 0.06)), 0.03));
    hand.push({ geo: G.cyl, at: [bx, FY + 0.45, s * (hw + 0.06)], scale: [0.035, 0.85, 0.035] });
  }
  g.add(mesh(bake(sides), 0xFFFFFF, 0, 0, 0, true), mesh(bake(hand), GOLD, 0, 0, 0, true));
  // twin smokestacks at the back of the upper deck, the CASINO sign hung between them
  const stackX = [DECKS.stern + 0.7, DECKS.stern + 3.0], stackZ = -B + 0.5;
  for (const x of stackX) {
    g.add(mesh(new CylinderGeometry(0.28, 0.32, 3.6, 14), 0x22303C, x, UPPER + 1.8, stackZ, true));
    g.add(mesh(new CylinderGeometry(0.42, 0.3, 0.3, 14), GOLD, x, UPPER + 3.65, stackZ, true));
  }
  const signX = (stackX[0] + stackX[1]) / 2;
  g.add(mesh(new BoxGeometry(2.3, 0.86, 0.12), 0x5A1420, signX, UPPER + 2.45, stackZ, true));
  const sign = new Mesh(new PlaneGeometry(2.16, 0.74), new MeshBasicMaterial({ map: SIGN.tex }));
  sign.position.set(signX, UPPER + 2.45, stackZ + 0.07); g.add(sign);
  // a flagpole at the bow, and strings of bulbs from it to the smokestacks
  g.add(mesh(new CylinderGeometry(0.04, 0.05, 3.2, 8), 0xFFFFFF, BOW - 0.35, FY + 1.6, 0, true));
  const flag = new Group(); flag.position.set(BOW - 0.35, FY + 2.95, 0); g.add(flag);
  flag.add(mesh(new BoxGeometry(0.7, 0.4, 0.02), RED, -0.36, 0, 0));
  const top = V(BOW - 0.35, FY + 3.2, 0);
  for (const x of stackX) {
    const end = V(x, UPPER + 3.5, stackZ);
    for (let i = 1; i < 14; i++) {
      const k = i / 14, p = top.clone().lerp(end, k);
      p.y -= Math.sin(Math.PI * k) * 0.35;
      rail.bulbs.push({ geo: G.sphere, at: [p.x, p.y, p.z], scale: [0.07, 0.07, 0.07] });
    }
  }
  g.add(mesh(bake(rail.posts), GOLD, 0, 0, 0, true), mesh(bake(rail.rails), GOLD, 0, 0, 0, true), mesh(bake(rail.bulbs), bulbMat));
  // the stern wheel, turning, under a red housing on two beams
  const wheel = new Group(); wheel.position.set(-L - 1.25, FY + 0.25, 0); g.add(wheel);
  const paddles: Part[] = [];
  for (let i = 0; i < 6; i++) paddles.push({ geo: G.box, at: [0, 0, 0], rot: [0, 0, i / 6 * Math.PI], scale: [2.4, 0.08, 3.2] });
  wheel.add(mesh(bake(paddles), RED, 0, 0, 0, true));
  for (const z of [-1.65, 1.65]) wheel.add(mesh(new TorusGeometry(1.2, 0.05, 6, 28), GOLD, 0, 0, z, true));
  for (const z of [-1.85, 1.85]) g.add(mesh(new BoxGeometry(1.6, 0.16, 0.16), 0x8A5A3B, -L - 0.75, FY + 0.25, z, true));
  g.add(mesh(new BoxGeometry(1.3, 0.18, 3.8), RED, -L - 1.25, FY + 1.55, 0, true));
  return { g, wheel, flag };
}

/** The gangway from the quay onto the foredeck, and the mooring ropes from the quay's bollards to the hull. */
function buildGangway() {
  const x = SHIP.x + DECKS.gangway, z0 = SHIP.z + halfBeamAt(DECKS.gangway) - 0.3, z1 = QUAY.z0 + 0.4, cz = (z0 + z1) / 2;
  const g = piece(x, cz);
  put(g, mesh(new BoxGeometry(0.9, 0.08, z1 - z0), 0x9B5A3C, 0, 0, 0, true), x, FY + 0.12, cz);
  const rails: Part[] = [];
  for (const s of [-1, 1]) {
    rails.push(strut(V(s * 0.45, FY + 0.75, z0 - cz), V(s * 0.45, FY + 0.75, z1 - cz), 0.025));
    for (const z of [z0, z1]) rails.push({ geo: G.cyl, at: [s * 0.45, FY + 0.45, z - cz], scale: [0.03, 0.66, 0.03] });
  }
  g.add(mesh(bake(rails), GOLD, 0, 0, 0, true));
  const ropes: Part[] = [];
  for (const dx of [-4.2, 5.3]) {
    const bollard = V(SHIP.x + dx + Math.sign(dx) * 0.9 - x, FY + 0.42, QUAY.z0 + 0.17 - cz);
    const cleat = V(SHIP.x + dx - x, FY + 0.1, SHIP.z + halfBeamAt(dx) - cz);
    ropes.push(strut(bollard, cleat, 0.025));
  }
  g.add(mesh(bake(ropes), 0xE3C26B));
  return g;
}

let ship: ReturnType<typeof buildShip> | null = null;
let pieces: Object3D[] = [];
/** The quay, the gangway and the ship, once they're in. */
export const casinoPieces = () => pieces;

// ---------- the ship coming in ----------
/** The camera's look over at the ship as it comes in: easing over, holding, easing back; the ship pops in on arrival. */
const GLANCE = { over: 0.6, hold: 1.4, back: 0.6, popAt: 0.5 };
let glance: { t: number; waiting: Object3D[]; was: ReturnType<typeof V> } | null = null;
const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

/**
 * The 'roulette' unlock: the quay and the ship come in, with the roulette table. Returns what pops in at once (the
 * quay). Unless `silent` (loading a save), the camera then looks over at the ship, which pops in with its gangway and
 * table as it gets there; with reduced motion it all pops in straight away instead.
 */
export function enableCasino(silent = false): Object3D[] {
  casinoBoat.open = true;
  openQuayGap();
  const quay = buildQuay(), gangway = buildGangway(), roulette = enableRoulette();
  ship = buildShip();
  pieces = [quay, gangway, ship.g];
  if (silent) return [];
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return [...pieces, ...roulette];
  const waiting = [gangway, ship.g, ...roulette];
  waiting.forEach(o => { o.visible = false; });
  glance = { t: 0, waiting, was: view.focus.clone() };
  return [quay];
}

function updGlance(dt: number) {
  const g = glance!, { over, hold, back, popAt } = GLANCE;
  g.t += dt;
  view.focus.set(SHIP.x, FY, SHIP.z);
  view.k = g.t < over + hold ? ease(Math.min(1, g.t / over)) : 1 - ease(Math.min(1, (g.t - over - hold) / back));
  if (g.waiting.length && g.t >= popAt) g.waiting.splice(0).forEach(o => { o.visible = true; popIn(o); });
  if (g.t >= over + hold + back) { view.k = 0; view.focus.copy(g.was); glance = null; }
}

/** Whether the player was aboard last frame: stepping off starts a new visit, so the games greet them again next time. */
let wasAboard = false;
function updVisit() {
  const on = aboard(player.g.position);
  if (wasAboard && !on) visits.n++;
  wasAboard = on;
}

/** Keeps the player out of the games' tables and machines, and the quay's booth and crates. */
export function collideCasino(p: XZ) {
  if (!ship) return;
  collideRoulette(p); collideBlackjack(p); collideSlots(p);
  for (const o of [BOOTH, CRATES]) pushOutOfBox(p, o.x, o.z, o.w / 2 + 0.3, o.d / 2 + 0.3);
}

let clock = 0;
export function updCasino(dt: number) {
  if (!ship) return;
  clock += dt;
  ship.wheel.rotation.z += dt * 0.6;
  ship.flag.rotation.y = Math.sin(clock * 2.2) * 0.15;
  if (glance) updGlance(dt);
  updVisit();
  updTweens(dt);
  updRoulette(dt);
  updBlackjack(dt);
  updSlots(dt);
}
