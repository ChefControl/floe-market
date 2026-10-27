// The casino harbor: the dock carries on west as a stone-walled quay with bollards, lamp posts and a ticket booth,
// and a casino yacht is moored along it, bow towards the dock: a navy hull with a raked bow, bulwarks that sweep up
// towards it and its name in gold, a lower deck banded in dark glass, and the salon on top (casinoSalon.ts: walled in
// glass under a hardtop with a wheelhouse, a radar mast, a hot tub, loungers and the CASINO sign; guests, a bar and
// more machines inside, the wall of shame behind the bar (wallOfShame.ts), and a restroom stall in the corner by the
// door, to cry in: casinoRestroom.ts). A gangway takes you aboard through a gap in the bulwark onto the foredeck,
// where a staircase climbs to the salon's door. The 'roulette' unlock is a ticket aboard (the casino isn't the
// player's): the quay comes in at once and the yacht sails in to it, once, with the roulette table; the blackjack table
// and the slot machines are passes of their own, bought in the salon. It stays put through the stage-up. The games themselves are in rouletteTable.ts, blackjackTable.ts and slotMachine.ts.
import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, MeshPhongMaterial, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, Vector2,
  type Material, type Object3D, type Vector3,
} from 'three';
import { collideBlackjack, updBlackjack } from './blackjackTable';
import { updTweens, visits } from './casinoKit';
import { buildRestroom, collideRestroom, updRestroom } from './casinoRestroom';
import { buildShame, updShame } from './wallOfShame';
import { course } from './course';
import { buildSalon, carpet, collideSalon, JACK, oblong, slab, strut, updSalon } from './casinoSalon';
import { aboard, casinoBoat, DECKS, hullHalf, pushOutOfBox, QUAY, SHIP, UPPER } from './layout';
import { headless } from './headless';
import { player } from './player';
import { bake, canvasTex, FONT, G, mat, mesh, scene, type Part } from './render';
import { collideRoulette, enableRoulette, updRoulette } from './rouletteTable';
import { shipHorn } from './sfx';
import { collideSlots, updSlots } from './slotMachine';
import { SPOT, spotlight } from './spotlight';
import { staging } from './stage';
import { FY, V, type XZ } from './util';
import { openQuayGap, planks } from './world';

const GOLD = 0xE3B23C, RED = 0xB0283A, STONE = 0x9AA3AA, IRON = 0x2B2F33;
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
const BOOTH_SIGN = canvasTex(256, 64, (c, w, h) => {
  c.fillStyle = '#FFF8EC'; c.fillRect(0, 0, w, h);
  c.font = `800 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#8E1F2F';
  c.fillText('TICKETS', w / 2, h / 2 + 3);
});

// ---------- the quay ----------
const LAMPS_X = [-10.6, -16.4, -22.2];
/** The ticket booth and the pile of crates on the quay, which the player walks round. */
/** The bollards along the kerb, every 2.8 m, leaving the gangway's foot clear. */
const BOLLARDS_X = Array.from({ length: 6 }, (_, i) => QUAY.x0 + 1.0 + i * 2.8)
  .filter(x => Math.abs(x - (SHIP.x + DECKS.gangway)) > 1.0);
const BOOTH = { x: -12.6, z: -4.35, w: 1.3, d: 0.9 };
const CRATES = { x: -23.3, z: -4.45, w: 1.9, d: 1.0 };

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
  for (const x of BOLLARDS_X) {
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

// ---------- the yacht ----------
const L = SHIP.half, B = SHIP.beam, BOW = SHIP.bow;
const NAVY = 0x1F3D66, TEAK = 0xA8693F;
/** The main deck's planking, and the top of the bulwarks round it: level along the sides, sweeping up to the bow. */
const DECK_Y = FY + 0.135;
const sheer = (x: number) => FY + 0.85 + 0.5 * Math.max(0, (x - SHIP.sides) / (BOW - SHIP.sides)) ** 2;
/** The gap in the quay-side bulwark where the gangway comes aboard. */
const GAP = { x0: DECKS.gangway - 0.5, x1: DECKS.gangway + 0.5 };
/** How round the transom's corners are, and how thick the bulwarks. */
const CORNER = 0.6, WALL = 0.07;

/** A point round the hull's edge, the bulwark's top there, and which way is out. */
interface Rim { x: number; z: number; top: number; nx: number; nz: number }
/** The hull's edge at deck level, all the way round: up the quay side to the stem, back down the far side and across
 *  the transom. The gap's ends come twice, the bulwark's top dropping to the deck between them. */
function rimPoints(): Rim[] {
  const xs = [GAP.x0, GAP.x1];
  for (let i = 0; i <= 10; i++) xs.push(-L + CORNER + (SHIP.sides + L - CORNER) * i / 10);
  for (let i = 1; i < 24; i++) xs.push(SHIP.sides + (BOW - SHIP.sides) * i / 24);
  xs.sort((a, b) => a - b);
  const near: [number, number, number][] = [], far: [number, number, number][] = [];
  for (const x of xs) {
    const h = hullHalf(x), top = sheer(x);
    if (x === GAP.x0) near.push([x, h, top], [x, h, DECK_Y]);
    else if (x === GAP.x1) near.push([x, h, DECK_Y], [x, h, top]);
    else near.push([x, h, x > GAP.x0 && x < GAP.x1 ? DECK_Y : top]);
    far.push([x, -h, top]);
  }
  // round the transom's corners: each a quarter circle from `a0`, turning `dir`
  const corner = (cz: number, a0: number, dir: number) => Array.from({ length: 5 }, (_, i) => {
    const a = a0 + dir * (i + 1) / 6 * Math.PI / 2;
    return [-L + CORNER + CORNER * Math.cos(a), cz + CORNER * Math.sin(a), sheer(-L)] as [number, number, number];
  });
  const loop = [...near, [BOW, 0, sheer(BOW)] as [number, number, number], ...far.reverse(),
    ...corner(-B + CORNER, -Math.PI / 2, -1), [-L, -B + CORNER, sheer(-L)] as [number, number, number],
    [-L, B - CORNER, sheer(-L)] as [number, number, number], ...corner(B - CORNER, Math.PI, -1)];
  // which way is out at each point: square to the edge, away from the middle (the outline's convex)
  return loop.map(([x, z, top], i) => {
    const [px, pz] = loop[(i + loop.length - 1) % loop.length], [qx, qz] = loop[(i + 1) % loop.length];
    let nx = qz - pz, nz = px - qx;
    const d = Math.hypot(nx, nz) || 1;
    nx /= d; nz /= d;
    if (nx * x + nz * z < 0) { nx = -nx; nz = -nz; }
    return { x, z, top, nx, nz };
  });
}

/** A band round the hull through `rings` of points, one point per rim point in each, facing out (or in, `flip`). */
function band(rings: Vector3[][], m: Material, flip = false) {
  const n = rings[0].length, pos: number[] = [], idx: number[] = [];
  for (const r of rings) for (const v of r) pos.push(v.x, v.y, v.z);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = a + n, d = b + n;
      idx.push(...(flip ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return mesh(geo, m, 0, 0, 0, true);
}

const NAME = canvasTex(512, 96, (c, w, h) => {
  c.font = `italic 800 64px Georgia, ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#E3B23C'; c.fillText('LADY LUCK', w / 2, h / 2 + 4);
});
const glassMat = new MeshPhongMaterial({ color: 0x1C2B38, specular: 0x9FB4C4, shininess: 70 });
const ledMat = new MeshBasicMaterial({ color: 0xFFD98A });

function buildShip() {
  const g = new Group(); g.position.set(SHIP.x, 0, SHIP.z); scene.add(g);
  // the hull: navy, raked forward at the stem and drawing in below the water, with bulwarks round the deck that sweep
  // up towards the bow, white on the inside, capped in teak; a gold line at the deck and a white one at the water
  const rim = rimPoints();
  const at = (y: number, out = 0) => rim.map(r => V(r.x + r.nx * out, y, r.z + r.nz * out));
  const keel = rim.map(r => V(r.x > SHIP.sides ? SHIP.sides + (r.x - SHIP.sides) * 0.86 : r.x * 0.98, -0.55, r.z * 0.84));
  const deckRing = at(DECK_Y), tops = rim.map(r => V(r.x, r.top, r.z));
  g.add(band([keel, deckRing, tops], mat(NAVY)));
  const inner = (y: (r: Rim) => number) => rim.map(r => V(r.x - r.nx * WALL, y(r), r.z - r.nz * WALL));
  g.add(band([inner(() => DECK_Y), inner(r => r.top)], mat(0xF4EFE6), true));
  g.add(band([rim.map(r => V(r.x + r.nx * 0.015, r.top + 0.03, r.z + r.nz * 0.015)), inner(r => r.top + 0.03)], mat(TEAK)));
  const along = (y: number, out: number) => keel.map((k, i) => k.clone().lerp(deckRing[i], (y + 0.55) / (DECK_Y + 0.55))
    .add(V(rim[i].nx * out, 0, rim[i].nz * out)));
  g.add(band([along(0.03, 0.012), along(0.1, 0.012)], mat(0xF4EFE6)));
  g.add(band([at(DECK_Y - 0.06, 0.012), at(DECK_Y - 0.01, 0.012)], mat(GOLD)));
  // the main deck, teak, inside the bulwarks
  const deckShape = new Shape(inner(() => 0).map(v => new Vector2(v.x, -v.z)));
  const deck = new Mesh(new ShapeGeometry(deckShape), new MeshLambertMaterial({ map: planks('#B07A52', '#BC8660', 0.35, 0.35) }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = DECK_Y; deck.receiveShadow = true; g.add(deck);
  // long hull windows in gold frames along both sides, and the yacht's name in gold on the bow
  const panes: Part[] = [], frames: Part[] = [];
  for (let x = -7.6; x < 1.6; x += 1.4) for (const s of [-1, 1]) {
    panes.push({ geo: G.box, at: [x, FY + 0.42, s * (B + 0.012)], scale: [1.0, 0.16, 0.02] });
    frames.push({ geo: G.box, at: [x, FY + 0.42, s * (B + 0.006)], scale: [1.08, 0.24, 0.02] });
  }
  g.add(mesh(bake(frames), GOLD), mesh(bake(panes), glassMat));
  const nameMat = new MeshBasicMaterial({ map: NAME.tex, transparent: true, depthWrite: false });
  for (const s of [-1, 1]) {
    const x = 5.0, t = (x - SHIP.sides) / (BOW - SHIP.sides), slope = -2 * B * t / (BOW - SHIP.sides);
    const name = new Mesh(new PlaneGeometry(1.3, 0.24), nameMat);
    name.position.set(x, FY + 0.62, s * (hullHalf(x) + 0.03));
    name.rotation.y = Math.atan2(-slope, s);
    g.add(name);
  }
  // a teak swim platform across the transom
  g.add(mesh(new BoxGeometry(0.6, 0.08, B * 2 - 1.0), TEAK, -L - 0.28, 0.1, 0, true));
  // the lower deck under the salon: white, with a band of dark glass all the way round, and the salon's floor above
  // it, carpeted, an LED line glowing under its edge
  const c0 = DECKS.stern + 0.15, c1 = DECKS.front - 0.1, cw = B - 0.38;
  g.add(slab(oblong(c0, c1, cw, 0.4, 0.9), FY + 0.95 - DECK_Y, DECK_Y, 0xFFFFFF));
  g.add(slab(oblong(c0 + 0.04, c1 - 0.04, cw - 0.04, 0.38, 0.86), 0.78, FY + 0.95, glassMat));
  g.add(slab(oblong(c0, c1, cw, 0.4, 0.9), UPPER - 0.16 - FY - 1.73, FY + 1.73, 0xFFFFFF));
  const len = DECKS.front - DECKS.stern, mid = (DECKS.front + DECKS.stern) / 2;
  const white = mat(0xFFFFFF);
  const floor = new Mesh(new BoxGeometry(len, 0.16, B * 2 - 0.1), [white, white, carpet(len, B * 2), white, white, white]);
  floor.position.set(mid, UPPER - 0.08, 0); floor.castShadow = floor.receiveShadow = true; g.add(floor);
  g.add(mesh(new BoxGeometry(len - 0.08, 0.04, B * 2 - 0.18), ledMat, mid, UPPER - 0.18, 0));
  // the staircase from the foredeck up to the salon's door, with white sides and gold handrails
  const { x0: tx, x1: bx, half: hw } = DECKS.stairs, steps: Part[] = [], n = 10;
  for (let i = 0; i < n; i++) {
    const x = bx - (bx - tx) * (i + 0.5) / n;
    steps.push({ geo: G.box, at: [x, FY + UP * (i + 1) / n - 0.05, 0], scale: [(bx - tx) / n + 0.02, 0.1, hw * 2] });
  }
  g.add(mesh(bake(steps), TEAK, 0, 0, 0, true));
  const sides: Part[] = [], hand: Part[] = [];
  for (const s of [-1, 1]) {
    sides.push(strut(V(bx, FY + 0.05, s * (hw + 0.04)), V(tx, UPPER - 0.05, s * (hw + 0.04)), 0.05));
    hand.push(strut(V(bx, FY + 0.85, s * (hw + 0.06)), V(tx, UPPER + 0.75, s * (hw + 0.06)), 0.03));
    hand.push({ geo: G.cyl, at: [bx, FY + 0.45, s * (hw + 0.06)], scale: [0.035, 0.85, 0.035] });
  }
  g.add(mesh(bake(sides), 0xFFFFFF, 0, 0, 0, true), mesh(bake(hand), GOLD, 0, 0, 0, true));
  // a sunpad on the bow, and the jackstaff at the stem that the strings of lights run down to from the mast
  g.add(slab(oblong(6.75, 7.6, 0.7, 0.2, 0.5), 0.22, DECK_Y, 0xFFFFFF));
  g.add(slab(oblong(6.8, 7.55, 0.65, 0.18, 0.45), 0.08, DECK_Y + 0.22, NAVY));
  g.add(mesh(new CylinderGeometry(0.03, 0.045, JACK.y - FY - 0.5, 8), 0xFFFFFF, JACK.x, (JACK.y + FY + 0.5) / 2, 0, true));
  g.add(mesh(new SphereGeometry(0.06, 10, 8), GOLD, JACK.x, JACK.y, 0));
  buildSalon(g);
  buildRestroom(g);
  buildShame(g);
  return { g };
}

/** The gangway from the quay over the bulwark's gap onto the foredeck, and the mooring ropes from the quay's bollards
 *  to the bulwarks. The plank's in a group of its own at the ship's end, to run out from there (`plank.scale.z`). */
function buildGangway() {
  const x = SHIP.x + DECKS.gangway, z0 = SHIP.z + hullHalf(DECKS.gangway) - 0.2, z1 = QUAY.z0 + 0.4, cz = (z0 + z1) / 2;
  const g = piece(x, cz), plank = put(g, new Group(), x, 0, z0);
  plank.add(mesh(new BoxGeometry(0.9, 0.08, z1 - z0), TEAK, 0, FY + 0.12, (z1 - z0) / 2, true));
  const rails: Part[] = [];
  for (const s of [-1, 1]) {
    rails.push(strut(V(s * 0.45, FY + 0.75, 0), V(s * 0.45, FY + 0.75, z1 - z0), 0.025));
    for (const z of [z0, z1]) rails.push({ geo: G.cyl, at: [s * 0.45, FY + 0.45, z - z0], scale: [0.03, 0.66, 0.03] });
  }
  plank.add(mesh(bake(rails), GOLD, 0, 0, 0, true));
  const ropes: Part[] = [];
  for (const dx of [-L + 1.3, SHIP.sides - 0.2]) {
    // each rope runs from its fairlead on the bulwark out to the bollard nearest a little way past it
    const want = SHIP.x + dx + Math.sign(dx) * 0.9;
    const bx = BOLLARDS_X.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a);
    const bollard = V(bx - x, FY + 0.42, QUAY.z0 + 0.17 - cz);
    const lead = V(SHIP.x + dx - x, sheer(dx) - 0.05, SHIP.z + hullHalf(dx) - cz);
    ropes.push(strut(bollard, lead, 0.025));
  }
  const tied = mesh(bake(ropes), 0xE3C26B);
  g.add(tied);
  return { g, plank, ropes: tied };
}

let ship: ReturnType<typeof buildShip> | null = null;
let gangway: ReturnType<typeof buildGangway> | null = null;
let pieces: Object3D[] = [];
/** The quay, the gangway and the ship, once they're in. */
export const casinoPieces = () => pieces;

// ---------- the ship sailing in ----------
/** Seconds: sailing in from the open sea, edging sideways onto the quay, and running the gangway out. */
const ARRIVE = 9, EDGE_T = 3, PLANK_T = 0.8;
/** How far off the quay it lines up before edging onto it. */
const OFF = 3;
/** In from the open sea to the north-west: heading south, then round to face the dock, lined up off the quay. */
const IN = course([V(SHIP.x - 18, 0, -27), V(SHIP.x - 18, 0, SHIP.z - OFF - 3), V(SHIP.x - 9, 0, SHIP.z - OFF), V(SHIP.x, 0, SHIP.z - OFF)]);
/** When it sounds its horn coming in (how far in); a short one as it moors. */
const HORN_IN = 0.6;
/** The spotlight on the ship (spotlight.ts), following it in till the gangway's out: further out than usual, not in
 *  close, as big as it is, to see the sea round it and the quay it's making for. Walking hands the camera back; the ship
 *  sails on in all the same. */
const SHOW = { close: 1.3 };
const smooth = (k: number) => k * k * (3 - 2 * k);

/** The ship coming in, once, right after the ticket's bought: seconds since it set off, or null once it's moored (and
 *  straight away when loading a save, so a game saved or left mid-arrival comes back with it moored). What else is
 *  aboard but built in the world's space (the roulette table and its pad) rides along in the ship's group meanwhile. */
let sailing: { t: number; riders: Object3D[] } | null = null;

/** Puts the ship where it is `t` seconds into sailing in, and the gangway as far out as it's got. */
function place(t: number) {
  const g = ship!.g, { plank } = gangway!;
  if (t < ARRIVE) {
    // in at a steady speed, easing off as it lines up
    const { x, z, dx, dz } = IN(1 - (1 - t / ARRIVE) ** 2);
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-dz, dx); // its bow's to the east (+x) as it's built
  } else {
    g.position.set(SHIP.x, 0, SHIP.z - OFF * (1 - smooth(Math.min(1, (t - ARRIVE) / EDGE_T))));
    g.rotation.y = 0;
  }
  plank.scale.z = Math.max(0.01, smooth(Math.min(1, Math.max(0, t - ARRIVE - EDGE_T) / PLANK_T)));
  plank.visible = t > ARRIVE + EDGE_T;
  gangway!.ropes.visible = t >= ARRIVE + EDGE_T;
}

/** Moored at the quay, the gangway out, and aboard open to the player. */
function moor() {
  place(Infinity);
  ship!.g.updateMatrixWorld(true);
  sailing?.riders.forEach(o => scene.attach(o));
  sailing = null;
  casinoBoat.docked = true;
}

function sail(dt: number) {
  const s = sailing!, t0 = s.t;
  s.t += dt;
  const past = (t: number) => t0 < t && s.t >= t;
  // (the stage-up's show finds it moored)
  if (staging() || s.t >= ARRIVE + EDGE_T + PLANK_T) { moor(); return; }
  place(s.t);
  if (past(HORN_IN * ARRIVE)) shipHorn(ship!.g.position, true);
  if (past(ARRIVE + EDGE_T)) shipHorn(ship!.g.position, false);
}

/**
 * The 'roulette' unlock, the ticket to the casino boat: the quay comes in at once, and the ship with the roulette
 * table. Returns what pops in (the quay). Unless `silent` (loading a save: it's moored), the ship then sails in from
 * the open sea, the camera following it, and moors at the quay, sounding its horn, and the gangway runs out to it;
 * with reduced motion (or in the balance sims) it all pops in moored instead.
 */
export function enableCasino(silent = false): Object3D[] {
  casinoBoat.open = true;
  openQuayGap();
  const quay = buildQuay(), roulette = enableRoulette();
  gangway = buildGangway();
  ship = buildShip();
  pieces = [quay, gangway.g, ship.g];
  if (silent) { moor(); return []; }
  const show = !headless.on && spotlight([ship.g], {
    close: SHOW.close, wait: 0, hold: ARRIVE + EDGE_T + PLANK_T - SPOT.over, leave: () => player.moving,
  });
  if (!show) { moor(); return [...pieces, ...roulette]; }
  roulette.forEach(o => ship!.g.attach(o));
  sailing = { t: 0, riders: roulette };
  place(0);
  return [quay];
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
  collideRoulette(p); collideBlackjack(p); collideSlots(p); collideSalon(p); collideRestroom(p);
  for (const o of [BOOTH, CRATES]) pushOutOfBox(p, o.x, o.z, o.w / 2 + 0.3, o.d / 2 + 0.3);
}

export function updCasino(dt: number) {
  if (!ship) return;
  if (sailing) sail(dt);
  updVisit();
  updSalon(dt, player.g.position, staging());
  updRestroom(dt);
  updShame(dt);
  updTweens(dt);
  updRoulette(dt);
  updBlackjack(dt);
  updSlots(dt);
}
