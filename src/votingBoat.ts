// The voting boat, for Israel's election day (flags.ts ELECTION_DAYS, or ?vote=on): a white houseboat that sails in
// from the sea once the game opens, sounding its horn, and moors alongside the pier's arm (layout.ts VOTE_BOAT): built
// like a house in Tel Aviv's White City, a white cabin with a rounded corner and a band of windows under a ledge, a flat
// roof, one blue stripe on its hull and a flag at its bow; once the day's over, it sails away again. A gangway
// crosses to its side deck, between two queue ropes, to the door of its one cabin: the polling room, a kalpi like a
// real Israeli polling station's. The committee's three at their table with the register open and the station's number
// on a tent card, the blue ballot box sealed on it, the cardboard voting screen in the corner with the slips and the
// blue envelopes behind it, a flag and a clock on the wall. As in the casino's salon, the roof lifts away and the walls
// on the camera's side fade while the player's inside.
// Walking in, the chair greets you; behind the screen you pick a slip (a dish or a fish: it's for voting itself, never
// a party or anyone on a ballot) and carry it out in a blue envelope; at the ballot box it drops in through the slot,
// the committee thanks you, and an "I voted" sticker (הצבעתי) stays on your chest for the visit, the camera coming in
// on it the first time you step off. Once each time aboard. Nothing of it is saved, and on any other day nothing of it
// is built, so the game is just as it was.
import {
  BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, type Material, Mesh, MeshLambertMaterial, PlaneGeometry, Shape, ShapeGeometry,
  SphereGeometry,
  type Vector3,
} from 'three';
import { between, tone } from './audio';
import { offerTalk } from './buy';
import { crowdModel, type Person } from './characters';
import { course } from './course';
import { electionDay, voteParam, votingBoatOn } from './flags';
import { drawIcon } from './icons';
import { apart, Build, detail, dice, K, rbox } from './kit';
import { buyHeld } from './input';
import { inPollingRoom, level, onVoteBoat, PIER, pushOutOfBox, VOTE_BOAT, voteBoat, voteX as X } from './layout';
import { C } from './palette';
import { player } from './player';
import { bakePainted, camera, camK, canvasTex, FONT, G, mesh, OFF as VIEW, painted, type Part, rr, scene } from './render';
import { pick, put, shipHorn } from './sfx';
import { bubble } from './speech';
import { panel as kitPanel } from './uiKit';
import { d2xz, V, type XZ } from './util';
import { viewSize } from './viewSize';
import { crowdStyle, type Style } from './wardrobe';

// ---------- the plan ----------
const { hull: HULL, cabin: CAB, gangway: GW, deck: DECK, dz: DZ } = VOTE_BOAT;
/** The flag's own blue (the beach's too, beach.ts). */
export const BLUE = 0x0038B8;
/** The pale green a school's walls are painted to waist height. */
const SCHOOL = 0xB7D6C6;
/** The cabin's walls' thickness, and the door in its dock-side wall. */
const T = 0.08, DOOR = { x0: X(4.15), x1: X(3.35), h: 1.85 };
/** How round the cabin's corners are (outside), Tel Aviv's White City style: the one the camera sees, between the dock
 *  side and the stern, sweeps round wide; the others just soften, clear of the room's screen and bench inside. */
const CORNERS = { se: 0.6, ne: 0.25, nw: 0.25, sw: 0.25 };
/** Its band of windows, along the dock side and round the stern, under a ledge running all round at the door's top. */
const SILL = 1.05, HEAD = 1.75, LEDGE = DOOR.h + 0.025;
/** Where the hull's sides start drawing in to the bow, and the middle of its width. */
const BOW = HULL.x0 + 1.15, MID = (HULL.z0 + HULL.z1) / 2;
/** Out on the foredeck, two old-timers who happen to be aboard (nobody names them): one stands on his head now and then,
 *  in the bow's far corner by the flag (in from the rail, so his feet clear it as he goes over); the other leans on the
 *  rail round the bow's near side, facing out west over the water, which the camera sees side-on, as in the photo
 *  on the hotel balcony. Each says his piece when the player speaks to him (E, or Talk). */
export const HEADSTAND = { x: HULL.x0 + 1.7, z: HULL.z0 + 0.9 }, DREAMER = { x: HULL.x0 + 0.69, z: MID + 0.95, face: -1.18 };
/** The tall one's hair and beard, dark brown. */
const BEARD = 0x2A1C14;
/** The top of the foredeck's rail: the tall one's hands, his arms out and a little down, rest on it from where he stands. */
const RAIL_TOP = 0.74;
/** On the foredeck, the backgammon table (its chairs either side) and the cool box. */
const TB = { x: HULL.x0 + 3.25, z: MID - 0.8 }, BOXC = { x: HULL.x0 + 3.3, z: HULL.z1 - 0.45 };
export const MIRACLES = "Whoever doesn't believe in miracles is no realist", LEGEND = 'If you will it, it is no legend';
/** How near him the player stands to speak to one. */
const TALK_NEAR = 1.5;
/** The acrobat's round, in seconds: on his feet; a crouch; over onto his head, turning about his middle with a little hop;
 *  balancing there; back over onto his feet; and a "ta-da", arms up, to the end of the round. And the top of a person's
 *  head, at their own height 1 (characters.ts). */
const CROUCH = 2.6, OVER = 3.0, UP = 3.7, DOWN = 7.8, LAND = 8.5, ROUND = 9, HEAD_TOP = 1.24;
/** The committee's table along the back wall, and the three at it (the chair in the middle) with the box at its end. */
export const TABLE = { x0: X(6.15), x1: X(4.2), z0: -9.35 + DZ, z1: -8.75 + DZ, top: 0.72 };
const MEMBERS_X = [X(4.85), X(5.35), X(5.85)], MEMBER_Z = -9.72 + DZ;
/** The ballot box on the table, and where the voter stands to put their envelope in. */
export const BALLOT_BOX = { x: X(4.48), z: -9.05 + DZ, w: 0.38, h: 0.34, d: 0.3 };
export const BOX_SPOT = { x: X(4.48), z: -8.4 + DZ };
/** The voting screen's little table in the corner, and where the voter stands behind the screen. */
export const SCREEN = { x0: X(2.52), x1: X(1.72), z0: -9.98 + DZ, z1: -9.43 + DZ, top: 0.72 };
export const SCREEN_SPOT = { x: X(2.12), z: -8.95 + DZ };
/** Where `ship` turns about: the hull's middle, moored. */
const BERTH = { x: (HULL.x0 + HULL.x1) / 2, z: MID };
/** How near a spot the player has to stand for its card. */
const REACH = 0.5;
/** The queue ropes on the pier, a lane up to the gangway's foot: where each side's posts stand, and how far out. */
const ROPES_X = [GW.x0 - 0.25, GW.x1 + 0.25], ROPE_Z = [VOTE_BOAT.ramp + 0.1, VOTE_BOAT.ramp + 0.9];
/** The slips to pick from: the game's own dishes and fish. */
export const SLIPS = [['🍣', 'Sushi'], ['🐟', 'Fish'], ['🍚', 'Rice'], ['🍲', 'Chanko'], ['🍤', 'Tempura']] as const;
/** What the committee says. */
export const GREETING = 'Shalom! Your ID, please', THANKS = 'Thank you for voting!';

// ---------- building it: blocks drawn plain on Low and bevelled on High ----------
/** A block, `w` by `h` by `d`, painted `c`, its middle at (x, y, z) (y from the deck), turned `ry` about the vertical
 *  and `rz` across. */
interface Block { w: number; h: number; d: number; c: number; x: number; y: number; z: number; ry: number; rz: number }
export type Add = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, ry?: number, rz?: number) => void;
export function blocks(f: (s: Add) => void) {
  const out: Block[] = [];
  f((w, h, d, c, x, y, z, ry = 0, rz = 0) => out.push({ w, h, d, c, x, y, z, ry, rz }));
  return out;
}
/** The unit box and the pennant every block and pennant is drawn with (made with the boat, off the luck; the box
 *  with the beach's blocks, beach.ts, on a day without the boat). */
let BOX: BoxGeometry, PEN: CylinderGeometry;
/** `bs` as a Low mesh (plain boxes, `painted`) and a High one (the kit's bevelled boxes, the thin ones plain), shown by
 *  the setting, in `g`; drawn with `material` (one that fades) if given. */
export function twin(g: Group, bs: Block[], cast = true, material: MeshLambertMaterial = painted) {
  if (!BOX) BOX = new BoxGeometry(1, 1, 1);
  const lo = mesh(bakePainted(bs.map(b => ({ geo: BOX, c: b.c, at: [b.x, b.y, b.z], rot: [0, b.ry, b.rz], scale: [b.w, b.h, b.d] }))), material, 0, 0, 0, cast);
  const hi = new Build();
  for (const b of bs) {
    const t = Math.min(b.w, b.h, b.d), small = t < 0.02;
    hi.add(small ? BOX : rbox(b.w, b.h, b.d, Math.min(0.015, t / 3)), b.c, b.x, b.y, b.z, [0, b.ry, b.rz], small ? [b.w, b.h, b.d] : undefined);
  }
  const high = hi.mesh(cast, material);
  g.add(lo, high);
  detail(lo, high);
}
/** A block from `a` to `b` (on the deck's plane), `h` tall from `y` and `t` thick. */
const along = (s: Add, a: [number, number], b: [number, number], y: number, h: number, t: number, c: number) =>
  s(Math.hypot(b[0] - a[0], b[1] - a[1]), h, t, c, (a[0] + b[0]) / 2, y + h / 2, (a[1] + b[1]) / 2, Math.atan2(-(b[1] - a[1]), b[0] - a[0]));

/** The hull's outline, `grow` out from it (in the shape's own plane: x along, -z across), with a break in its dock side
 *  at the gangway (`gap`) for the bulwark. */
function outline(grow: number, gap = false) {
  const s = new Shape(), z1 = -(HULL.z1 + grow), z0 = -(HULL.z0 - grow), x0 = HULL.x0 - grow, x1 = HULL.x1 + grow;
  s.moveTo(x1, z1);
  if (gap) { s.lineTo(GW.x1, z1); s.moveTo(GW.x0, z1); }
  s.lineTo(BOW, z1);
  s.quadraticCurveTo(x0, z1, x0, -MID);
  s.quadraticCurveTo(x0, z0, BOW, z0);
  s.lineTo(x1, z0);
  s.lineTo(x1, z1);
  return s;
}
/** A slab of the hull's outline, `grow` out from it, from `y0` to `y1`. */
function slab(grow: number, y0: number, y1: number) {
  return new ExtrudeGeometry(outline(grow), { depth: y1 - y0, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2).translate(0, y0, 0);
}

/** The cabin's outline, `grow` out from its walls' outer faces, its corners rounded (CORNERS, grown with it), in the
 *  shape's own plane (x along, -z across) as the hull's outline is. */
function cabinOutline(grow: number) {
  const s = new Shape(), { x0, x1, z0, z1 } = CAB, X0 = x0 - grow, X1 = x1 + grow, Y0 = -(z1 + grow), Y1 = -(z0 - grow);
  const r = (k: keyof typeof CORNERS) => CORNERS[k] + grow;
  s.moveTo(X0 + r('sw'), Y0);
  s.lineTo(X1 - r('se'), Y0); s.absarc(X1 - r('se'), Y0 + r('se'), r('se'), -Math.PI / 2, 0, false);
  s.lineTo(X1, Y1 - r('ne')); s.absarc(X1 - r('ne'), Y1 - r('ne'), r('ne'), 0, Math.PI / 2, false);
  s.lineTo(X0 + r('nw'), Y1); s.absarc(X0 + r('nw'), Y1 - r('nw'), r('nw'), Math.PI / 2, Math.PI, false);
  s.lineTo(X0, Y0 + r('sw')); s.absarc(X0 + r('sw'), Y0 + r('sw'), r('sw'), Math.PI, Math.PI * 1.5, false);
  return s;
}
/** A rounded corner of the cabin's walls, `T` thick and the cabin's height: a quarter ring about (cx, cz), radius `r`
 *  outside, from `a0` round a quarter turn (in the shape's plane). */
function corner(cx: number, cz: number, r: number, a0: number) {
  const s = new Shape();
  s.absarc(cx, -cz, r, a0, a0 + Math.PI / 2, false);
  s.absarc(cx, -cz, r - T, a0 + Math.PI / 2, a0, true);
  return new ExtrudeGeometry(s, { depth: CAB.h, bevelEnabled: false, curveSegments: 12 }).rotateX(-Math.PI / 2);
}
/** Curved white pieces of the cabin (its rounded corners, the ledge, the roof): plain shapes, the same on both, as
 *  the hull is. */
const curved = (geos: ExtrudeGeometry[], material: Material = painted) =>
  mesh(bakePainted(geos.map(geo => ({ geo, c: C.snow, at: [0, 0, 0] })) as (Part & { c: number })[]), material, 0, 0, 0, true);
/** A flat slab of the cabin's outline grown `out` (less `inset` in from that, if a ring), `h` thick from `y`. */
function ring(out: number, inset: number | null, y: number, h: number) {
  const s = cabinOutline(out);
  if (inset !== null) s.holes.push(cabinOutline(out - inset));
  return new ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 12 }).rotateX(-Math.PI / 2).translate(0, y, 0);
}

/** A small Israeli flag, `w` wide, its middle at (x, y, z), facing along +z: white, its two blue stripes, and the Star
 *  of David between them, two triangles of thin bars. */
export function flag(s: Add, w: number, x: number, y: number, z: number) {
  const h = w * 0.73, R = h * 0.19, bar = h * 0.036;
  s(w, h, 0.012, C.snow, x, y, z);
  for (const k of [-1, 1]) s(w, h * 0.15, 0.016, BLUE, x, y + k * h * 0.335, z);
  for (const turn of [0, Math.PI]) for (let i = 0; i < 3; i++) {
    const a = turn + Math.PI * 1.5 + i * Math.PI * 2 / 3; // each side's middle, opposite a corner
    s(R * Math.sqrt(3) + bar, bar, 0.016, BLUE, x + Math.cos(a) * R / 2, y + Math.sin(a) * R / 2, z, 0, a + Math.PI / 2);
  }
}

/** A string of bunting from `a` to `b`, sagging between: the cord, and pennants hanging from it, blue and white. */
const PENNANT = 0.07;
function bunting(s: Add, pennants: (Part & { c: number })[], a: [number, number, number], b: [number, number, number]) {
  const span = Math.hypot(b[0] - a[0], b[2] - a[2]), ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  const pt = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.18 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  for (let i = 0; i < 8; i++) {
    const p = pt(i / 8), q = pt((i + 1) / 8), h = span / 8, dy = q[1] - p[1];
    s(Math.hypot(h, dy), 0.012, 0.012, C.snow, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, ry, Math.atan2(dy, h));
  }
  const n = Math.max(2, Math.round(span / 0.18));
  for (let i = 1; i < n; i++) {
    const [x, y, z] = pt(i / n);
    pennants.push({ geo: PEN, c: i % 2 ? BLUE : C.snow, at: [x, y - PENNANT / 2 - 0.006, z], rot: [0, ry, 0] });
  }
}

/** A sign drawn on canvas, `w` by `h` metres, its words in `ink` on `bg` (a fading wall's sign fades with it). */
function sign(text: string, w: number, h: number, bg: string, ink: string, fades?: Material[]) {
  const px = 256, py = Math.round(px * h / w);
  const t = canvasTex(px, py, (c, cw, ch) => {
    c.fillStyle = bg; rr(c, 2, 2, cw - 4, ch - 4, ch * 0.18); c.fill();
    c.font = `800 ${Math.round(ch * 0.62)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink;
    c.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new MeshLambertMaterial({ map: t.tex, transparent: true });
  fades?.push(m);
  return new Mesh(new PlaneGeometry(w, h), m);
}

function build() {
  // the boat's drawn where it's moored, in `g`; `ship` carries it in and out, turning about its middle
  const ship = new Group(), g = new Group();
  ship.position.set(BERTH.x, 0, BERTH.z);
  g.position.set(-BERTH.x, VOTE_BOAT.y, -BERTH.z);
  ship.add(g);
  scene.add(ship);
  BOX = new BoxGeometry(1, 1, 1);
  PEN = new CylinderGeometry(PENNANT, PENNANT, 0.006, 3).rotateX(Math.PI / 2);
  const { x0, x1, z0, z1, h: CH } = CAB, LIFT = VOTE_BOAT.y - PIER.y;
  // ---- the hull: white sides, its one blue stripe along them under the deck, and a wooden deck; the same on both ----
  g.add(mesh(bakePainted([
    { geo: slab(0, -0.45, -0.05), c: C.snow, at: [0, 0, 0] },
    { geo: slab(0.015, -0.26, -0.11), c: BLUE, at: [0, 0, 0] },
    { geo: slab(-0.02, -0.05, 0), c: C.deck, at: [0, 0, 0] },
  ] as (Part & { c: number })[]), painted, 0, 0, 0, true));
  // ---- what stands still: the bulwark (open at the gangway) and its rail, the gangway, the queue ropes, the cabin's
  // back walls, the room's floor and everything in it, the bow's flag and the bunting to it ----
  const pennants: (Part & { c: number })[] = [];
  const still = blocks(s => {
    const pts = outline(-0.05, true).getPoints(6);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a.distanceTo(b) < 0.01 || (Math.abs(a.y + HULL.z1 - 0.05) < 0.01 && Math.min(a.x, b.x) === GW.x0 && Math.max(a.x, b.x) === GW.x1)) continue;
      along(s, [a.x, -a.y], [b.x, -b.y], 0, 0.28, 0.06, C.snow);
      along(s, [a.x, -a.y], [b.x, -b.y], 0.28, 0.04, 0.1, C.deck);
    }
    // round the foredeck, a rail at everyone's waist (RAIL_TOP): stanchions and a varnished top rail
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = a.distanceTo(b);
      if (len < 0.01 || Math.max(a.x, b.x) > x0 + 0.05) continue;
      along(s, [a.x, -a.y], [b.x, -b.y], RAIL_TOP - 0.04, 0.04, 0.05, C.snow);
      for (let k = 0, n = Math.max(1, Math.round(len / 0.6)); k < n; k++) {
        const t = k / n;
        s(0.035, RAIL_TOP - 0.32, 0.035, C.snow, a.x + (b.x - a.x) * t, (RAIL_TOP + 0.24) / 2, -(a.y + (b.y - a.y) * t));
      }
    }
    // the back wall and the bow end's wall, plain white outside (between the rounded corners) and pale inside, a blue
    // band round the room at the windows' sills
    const bx0 = x0 + CORNERS.nw, bx1 = x1 - CORNERS.ne, ez0 = z0 + CORNERS.nw, ez1 = z1 - CORNERS.sw;
    s(bx1 - bx0, CH, T, C.snow, (bx0 + bx1) / 2, CH / 2, z0 + T / 2);
    s(T, CH, ez1 - ez0, C.snow, x0 + T / 2, CH / 2, (ez0 + ez1) / 2);
    s(bx1 - bx0, CH - 0.05, 0.01, C.paper, (bx0 + bx1) / 2, CH / 2, z0 + T + 0.005);
    s(0.01, CH - 0.05, ez1 - ez0, C.paper, x0 + T + 0.005, CH / 2, (ez0 + ez1) / 2);
    s(bx1 - bx0, 0.1, 0.02, BLUE, (bx0 + bx1) / 2, 0.85, z0 + T + 0.01);
    s(0.02, 0.1, ez1 - ez0, BLUE, x0 + T + 0.01, 0.85, (ez0 + ez1) / 2);
    // the walls' lower half painted a school's pale green, as in a classroom polling station
    s(bx1 - bx0, 0.95, 0.012, SCHOOL, (bx0 + bx1) / 2, 0.475, z0 + T + 0.012);
    s(0.012, 0.95, ez1 - ez0, SCHOOL, x0 + T + 0.012, 0.475, (ez0 + ez1) / 2);
    // a cork notice board over the screen, with the committee's notices pinned on it
    const nb = (SCREEN.x0 + SCREEN.x1) / 2;
    s(0.74, 0.5, 0.02, 0xB98A5A, nb, 1.82, z0 + T + 0.02);
    for (const [dx, dy, w, h] of [[-0.2, 0.05, 0.22, 0.3], [0.06, 0.09, 0.2, 0.24], [0.24, -0.08, 0.16, 0.2]]) {
      s(w, h, 0.006, C.paper, nb + dx, 1.82 + dy, z0 + T + 0.033);
      s(0.03, 0.03, 0.01, C.tomato, nb + dx, 1.82 + dy + h / 2 - 0.03, z0 + T + 0.04);
    }
    // a standing fan in the corner by the door, turned to the committee
    const fan = { x: x1 - T - 0.35, z: z1 - T - 0.4 };
    s(0.3, 0.03, 0.3, C.snow, fan.x, 0.015, fan.z);
    s(0.035, 1.0, 0.035, C.snow, fan.x, 0.5, fan.z);
    s(0.12, 0.12, 0.14, C.snow, fan.x, 1.05, fan.z);
    s(0.03, 0.36, 0.36, 0x9FC9E0, fan.x - 0.1, 1.05, fan.z);
    // on the committee's table, a red thermos and paper cups; and a bench for whoever's waiting, by the window
    s(0.1, 0.26, 0.1, C.tomato, TABLE.x0 + 0.12, TABLE.top + 0.13, TABLE.z0 + 0.15);
    for (let i = 0; i < 3; i++) s(0.05, 0.08, 0.05, C.snow, TABLE.x0 + 0.26 + i * 0.07, TABLE.top + 0.04, TABLE.z0 + 0.18);
    s(1.0, 0.05, 0.32, C.deck2, x0 + 0.95, 0.42, z1 - T - 0.3);
    for (const dx of [-0.42, 0.42]) s(0.05, 0.4, 0.28, C.frame, x0 + 0.95 + dx, 0.2, z1 - T - 0.3);
    // the committee's table: a white cloth with a blue edge over it, three chairs behind, the register open in front of
    // the chair, and the tent card with the station's number facing the room
    const tx = (TABLE.x0 + TABLE.x1) / 2, tz = (TABLE.z0 + TABLE.z1) / 2, tw = TABLE.x1 - TABLE.x0, td = TABLE.z1 - TABLE.z0;
    s(tw, 0.04, td, C.snow, tx, TABLE.top - 0.02, tz);
    s(tw, 0.42, 0.02, C.snow, tx, TABLE.top - 0.23, TABLE.z1);
    s(tw, 0.05, 0.025, BLUE, tx, TABLE.top - 0.42, TABLE.z1);
    for (const sx of [-1, 1]) s(0.02, 0.42, td, C.snow, tx + sx * tw / 2, TABLE.top - 0.23, tz);
    for (const x of MEMBERS_X) {
      s(0.4, 0.05, 0.38, C.slate, x, 0.43, MEMBER_Z);
      s(0.4, 0.45, 0.04, C.slate, x, 0.68, MEMBER_Z - 0.2);
      for (const dx of [-0.17, 0.17]) for (const dz of [-0.16, 0.16]) s(0.03, 0.42, 0.03, C.iron, x + dx, 0.21, MEMBER_Z + dz);
    }
    for (const k of [-1, 1]) s(0.2, 0.012, 0.28, C.paper, MEMBERS_X[1] + k * 0.105, TABLE.top + 0.012, -9.08 + DZ, 0, k * -0.06);
    s(0.42, 0.01, 0.3, C.navy, MEMBERS_X[1], TABLE.top + 0.005, -9.08 + DZ);
    s(0.36, 0.14, 0.05, C.snow, MEMBERS_X[2], TABLE.top + 0.07, -8.88 + DZ);
    // the ballot box: blue plastic, its lid a lighter blue with the slot, and orange seals over its edges
    const B = BALLOT_BOX, top = TABLE.top + B.h;
    s(B.w, B.h, B.d, 0x2F6FD6, B.x, TABLE.top + B.h / 2, B.z);
    s(B.w + 0.03, 0.035, B.d + 0.03, 0x5B9BF0, B.x, top + 0.017, B.z);
    s(0.2, 0.008, 0.025, C.ink, B.x, top + 0.036, B.z);
    for (const k of [-1, 1]) s(0.035, 0.12, 0.005, C.amber, B.x + k * (B.w / 2 - 0.05), top - 0.03, B.z + B.d / 2 + 0.018);
    // the voting screen in the corner: its little table, the cardboard screen round three sides of it (white, printed
    // with blue), the tray of slips behind it (a pile for each) and the stack of blue envelopes
    const S = SCREEN, sx = (S.x0 + S.x1) / 2, sz = (S.z0 + S.z1) / 2, sw = S.x1 - S.x0, sd = S.z1 - S.z0;
    s(sw, 0.04, sd, C.post, sx, S.top - 0.02, sz);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) s(0.04, S.top - 0.04, 0.04, C.frame, sx + dx * (sw / 2 - 0.04), (S.top - 0.04) / 2, sz + dz * (sd / 2 - 0.04));
    s(sw, 0.75, 0.012, C.enamel, sx, S.top + 0.375, S.z0 + 0.01);
    for (const k of [-1, 1]) s(0.012, 0.75, sd - 0.02, C.enamel, sx + k * (sw / 2 - 0.006), S.top + 0.375, sz + 0.005);
    s(sw, 0.08, 0.016, BLUE, sx, S.top + 0.62, S.z0 + 0.01);
    for (const k of [-1, 1]) s(0.016, 0.08, sd - 0.02, BLUE, sx + k * (sw / 2 - 0.006), S.top + 0.62, sz + 0.005);
    s(0.56, 0.02, 0.22, C.slate, sx, S.top + 0.01, sz - 0.08);
    const PILES = [0xE8607A, 0x355C9E, 0xF4F1EA, 0xE8873A, 0xF2C14E];
    PILES.forEach((c, i) => {
      s(0.09, 0.03, 0.13, C.snow, sx - 0.22 + i * 0.11, S.top + 0.035, sz - 0.08);
      s(0.05, 0.004, 0.05, c, sx - 0.22 + i * 0.11, S.top + 0.052, sz - 0.08);
    });
    s(0.16, 0.05, 0.11, 0x4A7FD0, sx + 0.18, S.top + 0.025, sz + 0.12);
    // on the back wall: the flag between the screen and the table, and the clock over the chair
    flag(s, 0.66, X(3.15), 1.5, z0 + T + 0.02);
    s(0.025, 0.55, 0.025, C.gold, X(3.15) + 0.345, 1.5, z0 + T + 0.03);
    // the bow: a mast with a flag flying, and one string of bunting from it to the roof's corner on the dock side
    const mast = HULL.x0 + 0.45;
    s(0.05, 1.7, 0.05, C.steel, mast, 0.85, MID);
    flag(s, 0.42, mast + 0.235, 1.48, MID);
    bunting(s, pennants, [mast, 1.6, MID], [x0 + 0.12, CH + 0.1, z1 - 0.12]);
  });
  // the far corner, round between the back wall and the bow end's
  g.add(curved([corner(x0 + CORNERS.nw, z0 + CORNERS.nw, CORNERS.nw, Math.PI / 2)]));
  const clock = new Group();
  clock.position.set(MEMBERS_X[1], 1.75, z0 + T + 0.03);
  clock.rotation.x = Math.PI / 2;
  const dial = new CylinderGeometry(0.17, 0.17, 0.04, 20);
  clock.add(mesh(dial, C.snow), mesh(new CylinderGeometry(0.19, 0.19, 0.03, 20), C.ink, 0, -0.01, 0));
  const hand = (len: number, a: number) => { const m = mesh(BOX, C.ink, Math.sin(a) * len / 2, 0.025, -Math.cos(a) * len / 2); m.scale.set(0.02, 0.01, len); m.rotation.y = -a; clock.add(m); };
  hand(0.1, 0.5); hand(0.14, 2.6);
  g.add(clock);
  twin(g, still);
  // ---- the foredeck: a backgammon board out on a table between two white plastic chairs, matkot paddles and their
  // ball against the far rail, and a blue cool box ----
  twin(g, blocks(s => {
    s(0.62, 0.04, 0.46, C.post, TB.x, 0.5, TB.z);
    for (const dx of [-0.26, 0.26]) for (const dz of [-0.18, 0.18]) s(0.04, 0.48, 0.04, C.frame, TB.x + dx, 0.24, TB.z + dz);
    for (const k of [-1, 1]) {
      const cx = TB.x + k * 0.58;
      s(0.38, 0.04, 0.38, C.snow, cx, 0.42, TB.z);
      s(0.04, 0.42, 0.38, C.snow, cx + k * 0.19, 0.63, TB.z);
      for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) s(0.035, 0.42, 0.035, C.snow, cx + dx, 0.21, TB.z + dz);
    }
    for (const k of [0, 1]) {
      const px = HULL.x0 + 2.2 + k * 0.4;
      s(0.28, 0.36, 0.025, C.deck2, px, 0.3, HULL.z0 + 0.22, 0, (k ? -1 : 1) * 0.12);
      s(0.05, 0.14, 0.03, C.ink, px + (k ? 0.012 : -0.012), 0.06, HULL.z0 + 0.22, 0, (k ? -1 : 1) * 0.12);
    }
    s(0.5, 0.32, 0.34, 0x2F6FD6, BOXC.x, 0.16, BOXC.z);
    s(0.52, 0.05, 0.36, C.snow, BOXC.x, 0.345, BOXC.z);
  }));
  const ball = mesh(G.sphere, C.ink, HULL.x0 + 2.75, 0.035, HULL.z0 + 0.45);
  ball.scale.setScalar(0.035);
  const board = canvasTex(256, 192, (c, w, h) => {
    c.fillStyle = '#6B3F22'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#E8D2A8'; c.fillRect(10, 10, w / 2 - 18, h - 20); c.fillRect(w / 2 + 8, 10, w / 2 - 18, h - 20);
    const tri = (x: number, top: boolean, dark: boolean) => {
      c.fillStyle = dark ? '#2E2A26' : '#B23A2E';
      c.beginPath(); c.moveTo(x, top ? 10 : h - 10); c.lineTo(x + 18, top ? 10 : h - 10); c.lineTo(x + 9, top ? 82 : h - 82); c.fill();
    };
    for (let i = 0; i < 12; i++) {
      const x = (i < 6 ? 12 : w / 2 + 10) + (i % 6) * 18.5;
      tri(x, true, i % 2 === 0); tri(x, false, i % 2 === 1);
    }
    for (const [x, y, white] of [[21, 20, true], [21, 34, true], [148, h - 20, false], [166, h - 20, false], [203, 20, false], [94, h - 34, true]] as const) {
      c.fillStyle = white ? '#F4F1EA' : '#1E1B1A'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
    }
  });
  const boardTop = mesh(new PlaneGeometry(0.5, 0.375), new MeshLambertMaterial({ map: board.tex }), TB.x, 0.523, TB.z);
  boardTop.rotation.x = -Math.PI / 2;
  g.add(ball, boardTop);
  // ---- the two old-timers ----
  const oldTimer = (seed: number, coat: number, look: 'fancy' | 'yakuza', f: (st: Style) => void) => {
    const st = crowdStyle(seed);
    Object.assign(st, { woman: false, skirt: null, hat: 'bare', glasses: null, neck: 'tie' });
    f(st);
    const p = crowdModel(st, look);
    p.restyle(coat, st);
    return p;
  };
  // the short one, bald on top with two great white tufts standing out at the sides of his head, who stands on his head
  // on the deck now and then (turning about his middle: `tip`)
  const acrobat = oldTimer(270_101, 0xE9E1CF, 'fancy', st => Object.assign(st, { cut: 'bald', hair: 0xF2F0EA, face: 'bare', legs: 0xD9C9A3, neckC: 0xE9E1CF, height: 0.92 }));
  const tufts = new Build();
  for (const k of [-1, 1]) {
    tufts.add(K.ball, 0xF2F0EA, k * 0.23, 1.0, -0.04, [0, 0, k * 0.35], [0.12, 0.085, 0.13]);
    tufts.add(K.ball, 0xF2F0EA, k * 0.29, 1.05, -0.06, [0, 0, k * 0.5], [0.08, 0.06, 0.1]);
    tufts.add(K.ball, 0xF2F0EA, k * 0.17, 1.02, -0.16, [0, 0, k * 0.2], [0.09, 0.08, 0.08]);
  }
  acrobat.add(tufts.mesh());
  const tip = new Group();
  tip.position.set(HEADSTAND.x, HEAD_TOP * 0.92 / 2, HEADSTAND.z);
  acrobat.position.y = -HEAD_TOP * 0.92 / 2;
  tip.add(acrobat);
  g.add(tip);
  // the tall one in a black coat over a white shirt, his dark hair combed back and a long, full dark-brown beard (his own:
  // full along the jaw, falling to a spade's point on his chest, a drooping moustache over a hint of lip), leaning on
  // the bow's rail with his arms on it, gazing out west over the water, as on a hotel balcony once (the dark suit's look, without
  // its sunglasses or its chain)
  const dreamer = oldTimer(270_202, 0x1C1C22, 'yakuza', st => Object.assign(st, {
    cut: 'short', hair: BEARD, face: 'bare', neck: 'bow', neckC: 0xF4F1EA, summer: 'sunhat', eyes: 'dot', mouth: 'none', height: 1.1,
  }));
  dreamer.position.set(DREAMER.x, 0, DREAMER.z);
  dreamer.rotation.order = 'YXZ';
  dreamer.rotation.set(0.12, DREAMER.face, 0);
  for (const [i, a] of dreamer.arms.entries()) { a.rotation.x = -1.4; a.rotation.z = (i ? -1 : 1) * 0.45; }
  // (along his jaw: round the lower half of his head from under his nose; characters.ts's heads are 0.21 round, 1.03 up)
  const jaw = new SphereGeometry(0.215, 14, 8, Math.PI / 2 - 1.25, 2.5, Math.PI * 0.56, Math.PI * 0.32);
  const beard = new Build()
    .add(jaw, BEARD, 0, 1.03, 0.04)
    .add(K.ball, BEARD, 0, 0.82, 0.235, null, [0.13, 0.12, 0.07])
    .add(K.ball, BEARD, 0, 0.71, 0.25, null, [0.075, 0.07, 0.05])
    .add(K.ball, 0xB9776E, 0, 0.945, 0.262, null, [0.028, 0.011, 0.01]);
  for (const k of [-1, 1]) beard.add(K.ball, BEARD, k * 0.05, 0.975, 0.262, [0, 0, -k * 0.3], [0.06, 0.024, 0.03]);
  dreamer.add(beard.mesh());
  g.add(dreamer);
  // the gangway: planks across from the pier's edge to the side deck, with a rope rail each side (run out once it's moored)
  const plank = new Group();
  g.add(plank);
  twin(plank, blocks(s => {
    const foot = VOTE_BOAT.ramp, run = foot - DECK.z1, slope = Math.atan2(LIFT, run), up = (z: number) => -LIFT * (z - DECK.z1) / run;
    s(Math.hypot(run, LIFT), 0.05, GW.x1 - GW.x0, C.deck2, (GW.x0 + GW.x1) / 2, -LIFT / 2 - 0.02, (foot + DECK.z1) / 2, Math.PI / 2, slope);
    for (const x of [GW.x0, GW.x1]) {
      for (const z of [foot - 0.15, DECK.z1]) s(0.04, 0.7, 0.04, C.post, x, up(z) + 0.35, z);
      s(Math.hypot(run - 0.15, up(foot - 0.15)), 0.025, 0.025, C.rope, x, (up(foot - 0.15) + 1.36) / 2, (foot - 0.15 + DECK.z1) / 2, Math.PI / 2, slope);
    }
    // the queue ropes: chrome posts on heavy feet, a blue rope sagging between
    for (const x of ROPES_X) {
      const [a, b] = ROPE_Z;
      for (const z of [a, b]) { s(0.04, 0.9, 0.04, C.steel, x, 0.45, z); s(0.2, 0.04, 0.2, C.iron, x, 0.02, z); }
      for (let i = 0; i < 4; i++) {
        const za = a + (b - a) * i / 4, zb = a + (b - a) * (i + 1) / 4, sag = (t: number) => 0.82 - 0.12 * 4 * t * (1 - t);
        along(s, [x, za], [x, zb], sag((i + 0.5) / 4) - 0.015, 0.03, 0.03, BLUE);
      }
    }
  }));
  g.add(mesh(bakePainted(pennants), painted));
  // 🗳️ on the ballot box's front, the station's number on the tent card, and the voting screen's own words
  const label = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff'; rr(c, 4, 4, w - 8, h - 8, 18); c.fill();
    drawIcon(c, '🗳️', w / 2, h / 2, 100);
  });
  const boxLabel = mesh(new PlaneGeometry(0.2, 0.2), new MeshLambertMaterial({ map: label.tex, transparent: true }), BALLOT_BOX.x, TABLE.top + BALLOT_BOX.h / 2, BALLOT_BOX.z + BALLOT_BOX.d / 2 + 0.003);
  const tent = sign('קלפי 1', 0.34, 0.12, '#FFFFFF', '#0038B8');
  tent.position.set(MEMBERS_X[2], TABLE.top + 0.07, -8.853 + DZ);
  g.add(boxLabel, tent);
  // the floor: speckled terrazzo tiles, as in an old school's classroom (its own dice for the speckles)
  const tiles = canvasTex(512, 256, (c, w, h) => {
    let seed = 7;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    c.fillStyle = '#E4DACB'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = ['#8C7B6B', '#B5A28E', '#5E5248', '#C9B79F'][i % 4];
      c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 2, 2 + rnd() * 2);
    }
    c.strokeStyle = 'rgba(90,75,60,.35)'; c.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  // (inside the walls, round the rounded corners; the tiles laid square across it)
  const floorGeo = new ShapeGeometry(cabinOutline(-T), 12), uv = floorGeo.attributes.uv, fw = CAB.x1 - CAB.x0 - 2 * T, fd = CAB.z1 - CAB.z0 - 2 * T;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - CAB.x0 - T) / fw, (uv.getY(i) + CAB.z1 - T) / fd);
  const floor = mesh(floorGeo.rotateX(-Math.PI / 2), new MeshLambertMaterial({ map: tiles.tex }), 0, 0.012, 0);
  g.add(floor);

  // ---- the walls on the camera's side (the dock's, with the door and its sign, and the stern's), which fade: plain
  // white between rounded corners, a band of windows along them under a ledge that runs all round the cabin ----
  const near = new MeshLambertMaterial({ vertexColors: true, transparent: true }), nearMats: Material[] = [near];
  const sx0 = x0 + CORNERS.sw, sx1 = x1 - CORNERS.se, ez0 = z0 + CORNERS.ne, ez1 = z1 - CORNERS.se;
  twin(g, blocks(s => {
    const zw = z1 - T / 2, xw = x1 - T / 2;
    // the dock's side, either side of the door and over it; and the stern's
    s(DOOR.x0 - sx0, CH, T, C.snow, (sx0 + DOOR.x0) / 2, CH / 2, zw);
    s(sx1 - DOOR.x1, CH, T, C.snow, (DOOR.x1 + sx1) / 2, CH / 2, zw);
    s(DOOR.x1 - DOOR.x0, CH - DOOR.h, T, C.snow, (DOOR.x0 + DOOR.x1) / 2, (CH + DOOR.h) / 2, zw);
    s(T, CH, ez1 - ez0, C.snow, xw, CH / 2, (ez0 + ez1) / 2);
    // the windows: glass through the wall, from sill to head, with slim white mullions
    const panes: [number, number, boolean][] = [[sx0 + 0.2, DOOR.x0 - 0.2, true], [DOOR.x1 + 0.2, sx1 - 0.15, true], [ez0 + 0.2, ez1 - 0.15, false]];
    for (const [a, b, along] of panes) {
      const m = (a + b) / 2, len = b - a, n = Math.max(1, Math.round(len / 0.7));
      if (along) s(len, HEAD - SILL, T + 0.02, 0x9FC9E0, m, (SILL + HEAD) / 2, zw);
      else s(T + 0.02, HEAD - SILL, len, 0x9FC9E0, xw, (SILL + HEAD) / 2, m);
      for (let k = 1; k < n; k++) {
        const at = a + len * k / n;
        if (along) s(0.04, HEAD - SILL, T + 0.04, C.snow, at, (SILL + HEAD) / 2, zw);
        else s(T + 0.04, HEAD - SILL, 0.04, C.snow, xw, (SILL + HEAD) / 2, at);
      }
    }
  }), true, near);
  // the near corners, the wide sweep the camera sees and the two small ones; and the ledge, all round at the door's top
  g.add(curved([
    corner(x1 - CORNERS.se, z1 - CORNERS.se, CORNERS.se, -Math.PI / 2),
    corner(x1 - CORNERS.ne, z0 + CORNERS.ne, CORNERS.ne, 0),
    corner(x0 + CORNERS.sw, z1 - CORNERS.sw, CORNERS.sw, Math.PI),
    ring(0.16, 0.16, LEDGE - 0.025, 0.05),
  ], near));
  const door = sign('קלפי', 0.62, 0.2, '#0038B8', '#FFFFFF', nearMats);
  door.position.set((DOOR.x0 + DOOR.x1) / 2, (CH + DOOR.h) / 2 + 0.01, z1 + 0.005);
  g.add(door);

  // ---- the roof: a flat white slab overhanging the walls all round, with a slim rail round its edge; it lifts away
  // while the player's inside ----
  const roofMat = new MeshLambertMaterial({ vertexColors: true, transparent: true });
  const roof = new Group();
  g.add(roof);
  roof.add(curved([ring(0.18, null, CH, 0.1)], roofMat));
  twin(roof, blocks(s => {
    const pts = cabinOutline(0.06).getPoints(4);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], len = a.distanceTo(b);
      if (len < 0.01) continue;
      for (const y of [CH + 0.38, CH + 0.62]) along(s, [a.x, -a.y], [b.x, -b.y], y, 0.03, 0.03, C.snow);
    }
    const { x0: ox0, x1: ox1, z0: oz0, z1: oz1 } = { x0: x0 - 0.06, x1: x1 + 0.06, z0: z0 - 0.06, z1: z1 + 0.06 };
    for (const [px, pz] of [[ox0 + 0.6, oz1], [ox1 - 1.2, oz1], [(ox0 + ox1) / 2, oz1], [ox0 + 0.6, oz0], [ox1 - 0.6, oz0], [(ox0 + ox1) / 2, oz0], [ox0, MID], [ox1, MID]]) {
      s(0.03, 0.55, 0.03, C.snow, px, CH + 0.37, pz);
    }
  }), true, roofMat);
  const roofMats = [roofMat];

  // ---- the committee: three of the game's own people, seated behind the table, facing the room ----
  const members: Person[] = MEMBERS_X.map((x, i) => {
    const style = crowdStyle(270_000 + i * 7);
    style.hat = 'bare';
    const p = crowdModel(style, 'fancy');
    p.restyle([C.navy, 0x3D7CC9, C.tin][i], style);
    p.position.set(x, 0.13, MEMBER_Z);
    for (const l of p.legs) l.rotation.x = -1.45;
    for (const a of p.arms) a.rotation.x = -0.6;
    g.add(p);
    return p;
  });
  const says = bubble(scene, 2.2);

  // ---- the envelope: in the player's hand, and flying into the box ----
  const ENVELOPE = 0x4A7FD0;
  const inHand = mesh(BOX, ENVELOPE, 0, -0.38, 0.08);
  inHand.scale.set(0.16, 0.11, 0.02); inHand.visible = false;
  player.g.arms[0].add(inHand);
  const flying = mesh(BOX, ENVELOPE);
  flying.scale.set(0.16, 0.02, 0.11); flying.visible = false; flying.userData.noBatch = true;
  scene.add(flying);
  // ---- the sticker on the chest: a round blue הצבעתי ("I voted"), as the polling stations hand out, a white ring
  // round it and a white heart over the word ----
  const stickerTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#0038B8'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 22, 0, 7); c.stroke();
    // (the classic heart, 2r across, its middle at x, y: a square on its corner with a round lobe on each upper
    // side, the lower sides running straight into the point)
    const heart = (x: number, y: number, r: number) => {
      const d = r / (1 + Math.SQRT2), lobe = d * Math.SQRT2, mid = y + d / 2;
      c.beginPath();
      c.moveTo(x, mid + 2 * d);
      c.lineTo(x - 2 * d, mid);
      c.arc(x - d, mid - d, lobe, Math.PI * 0.75, Math.PI * 1.75);
      c.arc(x + d, mid - d, lobe, Math.PI * 1.25, Math.PI * 2.25);
      c.closePath();
    };
    heart(w / 2, 88, 40); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = '#fff';
    c.font = `800 54px ${FONT}, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.direction = 'rtl';
    c.fillText('הצבעתי', w / 2, h / 2 + 34);
  });
  // (on the right of the chest, clear of a scarf's hanging end)
  const sticker = new Mesh(new PlaneGeometry(0.16, 0.16), new MeshLambertMaterial({ map: stickerTex.tex, transparent: true }));
  sticker.position.set(-0.12, 0.74, 0.255); sticker.visible = false;
  player.g.body.add(sticker);

  // out at sea till it sails in (updVoting)
  ship.visible = plank.visible = false;
  return {
    ship, g, plank, roof, roofMats, nearMats, members, says, inHand, flying, sticker, roofK: 1, acrobat, tip, dreamer,
    /** Seconds into the acrobat's round: standing a moment, over onto his head, holding it, and down again. */
    act: 0,
    /** Where it is: out at sea, coming in, moored, going, or gone; and the seconds it's been that. */
    sail: 'out' as Sail, t: 0,
  };
}

/** The boat, in on Israel's election day (null on any other): built off the game's luck, on dice of its own for the
 *  scenery's too, so neither moves on for it. */
export const boat = votingBoatOn() ? apart(build, dice(0x7E1EC7)) : null;

// ---------- the cards ----------
/** A card of the UI kit, made here: a title (if any) over a row of buttons. */
function card(id: string, title: string, buttons: [label: string, kind: string][], keys: boolean) {
  const el = document.createElement('div');
  el.id = id; el.hidden = true;
  if (title) { const t = document.createElement('p'); t.className = 'k-title'; t.textContent = title; el.append(t); }
  const row = document.createElement('div'); row.className = keys ? 'k-row k-keys' : 'k-row';
  const btns = buttons.map(([label, kind]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `k-btn ${kind}`; b.textContent = label;
    row.append(b);
    return b;
  });
  el.append(row);
  document.body.append(el);
  return { el, btns, kit: kitPanel(el, { place: 'card' }) };
}
const slips = boat ? card('voteSlips', 'Pick a slip', SLIPS.map(([e, n]) => [`${e} ${n}`, 'k-plain']), true) : null;
const cast = boat ? card('voteCast', '', [['🗳️ Cast your vote', 'k-main']], false) : null;

// ---------- voting ----------
/** This visit aboard: the slip in the envelope in hand (if one's picked), whether they've voted, whether the chair's
 *  greeted them; and for the whole visit to the game, the sticker. Nothing of it is saved. */
export const voting = { slip: null as string | null, voted: false, greeted: false, sticker: false, shown: false, drop: -1, inside: false };

slips?.btns.forEach((b, i) => b.addEventListener('click', () => {
  if (!boat || voting.slip || voting.voted) return;
  voting.slip = SLIPS[i][1];
  boat.inHand.visible = true;
  pick();
}));
cast?.btns[0].addEventListener('click', () => {
  if (!boat || !voting.slip || voting.drop >= 0) return;
  voting.slip = null; voting.voted = true; voting.drop = 0;
  boat.inHand.visible = false;
  boat.inHand.getWorldPosition(from);
  boat.flying.position.copy(from);
  boat.flying.visible = true;
});

// ---------- sailing in and out ----------
type Sail = 'out' | 'in' | 'moored' | 'going' | 'gone';
/** Seconds: after the game opens before it sails in, coming in, edging sideways onto or off the pier, and going out
 *  to sea. */
const WAIT = 2, ARRIVE = 14, EDGE_T = 4, LEAVE = 12;
/** How far off the pier it lines up before edging onto it, and off it before it sails away. */
const OFF = 2.5;
/** Coming in: down from the open sea to the north, between the pier's end and the shore, round to face west, lined
 *  up with the pier (a curve from the first of these to the last, the middle two pulling it round). Going: on west,
 *  bow first, and round north out to sea. */
const IN = [V(BERTH.x + 1.5, 0, -40), V(BERTH.x + 1.5, 0, BERTH.z - OFF - 7), V(BERTH.x + 4, 0, BERTH.z - OFF), V(BERTH.x, 0, BERTH.z - OFF)];
const OUT = [V(BERTH.x, 0, BERTH.z - OFF), V(BERTH.x - 6, 0, BERTH.z - OFF), V(-9, 0, BERTH.z - OFF - 2), V(-10, 0, -40)];
/** When it sounds its horn coming in (how far in), as it moors, and as it casts off. */
const HORN_IN = 0.6;
/** How it leaves: with ?vote=bye, a minute after it's moored; with ?vote=on, never; otherwise once election day's
 *  over (and the player's off it). */
const BYE = 60, VOTE = voteParam();
const dayOver = (moored: number) => VOTE === 'bye' ? moored >= BYE : VOTE !== 'on' && !electionDay();

const IN_COURSE = course(IN), OUT_COURSE = course(OUT);
/** Puts the ship `f` of the way along `along` (course.ts), its bow along it. */
function steer(along: ReturnType<typeof course>, f: number) {
  const { x, z, dx, dz } = along(f), s = boat!.ship;
  s.position.set(x, 0, z);
  s.rotation.y = Math.atan2(dz, -dx); // its bow's to the west (-x) as it's built
}
/** Edges the ship `k` of the way from lined up off the pier onto its moorings. */
function edge(k: number) {
  const s = boat!.ship;
  s.position.set(BERTH.x, 0, BERTH.z - OFF * (1 - k * k * (3 - 2 * k)));
  s.rotation.y = 0;
}
/** The horn, out where the ship is. */
const horn = (long: boolean) => shipHorn(boat!.ship.position, long);

/** In from the sea once the game opens, moored, and away again once the day's over. */
function sail(dt: number) {
  const b = boat!, t0 = b.t;
  b.t += dt;
  const past = (t: number) => t0 < t && b.t >= t;
  switch (b.sail) {
    case 'out':
      steer(IN_COURSE, 0);
      if (b.t >= WAIT) { b.sail = 'in'; b.t = 0; b.ship.visible = true; }
      break;
    case 'in': {
      // in at a steady speed, easing off as it lines up, then edging onto the pier
      b.ship.visible = true;
      if (b.t < ARRIVE) steer(IN_COURSE, 1 - (1 - b.t / ARRIVE) ** 2);
      else edge(Math.min(1, (b.t - ARRIVE) / EDGE_T));
      if (past(HORN_IN * ARRIVE)) horn(true);
      if (b.t >= ARRIVE + EDGE_T) {
        b.sail = 'moored'; b.t = 0;
        b.plank.visible = voteBoat.open = true;
        horn(false);
      }
      break;
    }
    case 'moored':
      if (dayOver(b.t) && !onVoteBoat(player.g.position)) {
        b.sail = 'going'; b.t = 0;
        b.plank.visible = voteBoat.open = false;
        horn(true);
      }
      break;
    case 'going':
      // edging off the pier, then away bow first
      if (b.t < EDGE_T) edge(1 - b.t / EDGE_T);
      else {
        const u = Math.min(1, (b.t - EDGE_T) / LEAVE);
        steer(OUT_COURSE, u * u);
        if (u >= 1) { b.sail = 'gone'; b.ship.visible = false; }
      }
      break;
  }
}

const from = V(0, 0, 0), slot = V(0, 0, 0);
/** Seconds the envelope takes to the slot, and then down through it. */
const TO_SLOT = 0.35, INTO = 0.2;

/** The boat each frame up in the world: the roof and near walls while the player's inside, the chair's words, the
 *  cards at the screen and the box, and the envelope going in. */
export function updVoting(dt: number) {
  if (!boat || boat.sail === 'gone') return;
  sail(dt);
  const p = player.g.position, aboard = onVoteBoat(p) && p.z < VOTE_BOAT.hull.z1 + 0.2;
  // stepping off ends the visit aboard: coming back, they can vote again
  if (!aboard && (voting.voted || voting.slip || voting.greeted)) {
    // (and the first time off after voting, the sticker shown off)
    if (voting.voted && !voting.shown) showOff();
    Object.assign(voting, { slip: null, voted: false, greeted: false });
    boat.inHand.visible = false;
  }
  const inside = !level.down && (inPollingRoom(p) || (p.x > GW.x0 && p.x < GW.x1 && p.z < CAB.z1 + 0.15 && onVoteBoat(p)));
  voting.inside = inside;
  boat.roofK += ((inside ? 0 : 1) - boat.roofK) * Math.min(1, dt * 8);
  if (!inside && boat.roofK > 0.995) boat.roofK = 1;
  boat.roof.visible = boat.roofK > 0.02;
  boat.roof.position.y = (1 - boat.roofK) * 0.8;
  for (const m of boat.roofMats) { m.opacity = boat.roofK; m.depthWrite = boat.roofK > 0.95; }
  const wallK = 0.15 + 0.85 * boat.roofK;
  for (const m of boat.nearMats) { m.opacity = wallK; m.depthWrite = wallK > 0.95; }
  // walking in, the chair greets them
  if (inPollingRoom(p) && !voting.greeted) { voting.greeted = true; if (!voting.voted) boat.says.say(GREETING); }
  // behind the screen, the slips; at the box with an envelope, the box
  const atScreen = inPollingRoom(p) && d2xz(p, SCREEN_SPOT) < REACH * REACH && !voting.slip && !voting.voted;
  slips!.el.hidden = !slips!.kit.near(atScreen);
  const atBox = inPollingRoom(p) && d2xz(p, BOX_SPOT) < REACH * REACH && !!voting.slip;
  cast!.el.hidden = !cast!.kit.near(atBox);
  // the envelope over to the slot and down through it, then their thanks, and the sticker
  if (voting.drop >= 0) {
    voting.drop += dt;
    slot.set(BALLOT_BOX.x, VOTE_BOAT.y + TABLE.top + BALLOT_BOX.h + 0.2, BALLOT_BOX.z);
    const f = boat.flying.position;
    if (voting.drop < TO_SLOT) {
      const k = voting.drop / TO_SLOT;
      f.lerpVectors(from, slot, k); f.y += Math.sin(Math.PI * k) * 0.15;
    } else {
      f.set(slot.x, slot.y - 0.2 * Math.min(1, (voting.drop - TO_SLOT) / INTO), slot.z);
      boat.flying.scale.set(0.16, 0.11, 0.02);
    }
    if (voting.drop >= TO_SLOT + INTO) {
      voting.drop = -1;
      boat.flying.visible = false;
      boat.flying.scale.set(0.16, 0.02, 0.11);
      boat.says.say(THANKS);
      voting.sticker = boat.sticker.visible = true;
      put();
    }
  }
  showSticker(dt);
  if (boat.says.text) boat.says.place(MEMBERS_X[1], VOTE_BOAT.y + 2.0, MEMBER_Z);
  boat.says.upd(dt);
  foredeck(dt);
}

// ---------- the sticker, shown off ----------
/** Stepping off after voting, the first time in a visit to the game, the camera comes in close on the sticker on the
 *  player's chest, the player turned to face it, holds a moment, and goes back: seconds coming in, held, going back. */
const SHOW = { in: 0.6, hold: 1.6, out: 0.6 };
/** The camera's view of the sticker, blended in by `k` (main.ts); seconds into the shot (-1: none). */
export const stickerCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };
let showing = -1;
function showOff() {
  voting.shown = true;
  showing = 0;
  player.held = true; player.moving = false;
  player.h = Math.atan2(VIEW.x, VIEW.z); player.g.rotation.y = player.h;
}
function showSticker(dt: number) {
  if (showing < 0) return;
  showing += dt;
  const t = showing, back = SHOW.in + SHOW.hold;
  stickerCam.k = t < SHOW.in ? t / SHOW.in : t < back ? 1 : Math.max(0, 1 - (t - back) / SHOW.out);
  if (t >= back && player.held) player.held = false;
  if (t >= back + SHOW.out) showing = -1;
}
/** Puts the camera's view of the sticker in place for this frame (main.ts): a metre in front of it, a little above,
 *  from the game camera's side; further back on a phone held upright. */
export function drawSticker() {
  if (!boat || stickerCam.k <= 0) return;
  boat.sticker.getWorldPosition(stickerCam.look);
  const d = Math.hypot(VIEW.x, VIEW.z), far = camK > 1 ? 1.35 : 1.05;
  stickerCam.pos.set(stickerCam.look.x + VIEW.x / d * far, stickerCam.look.y + 0.3, stickerCam.look.z + VIEW.z / d * far);
}

/** The acrobat's round (spoken to, he comes down onto his feet and stays there till he's done), and speaking to the
 *  old-timers. */
function foredeck(dt: number) {
  const b = boat!;
  if (talk?.i !== 0) b.act = (b.act + dt) % ROUND;
  else if (b.act >= DOWN) { b.act += dt; if (b.act >= ROUND) b.act = 0; }
  else b.act = 0;
  const t = b.act, ease = (k: number) => k * k * (3 - 2 * k), bump = (a: number, z: number) => t >= a && t < z ? Math.sin(Math.PI * (t - a) / (z - a)) : 0;
  // how far over he is (0 on his feet, 1 on his head); his crouch before, and his "ta-da" after
  const k = t < OVER ? 0 : t < UP ? ease((t - OVER) / (UP - OVER)) : t < DOWN ? 1 : t < LAND ? 1 - ease((t - DOWN) / (LAND - DOWN)) : 0;
  const crouch = bump(CROUCH, OVER), tada = bump(LAND, ROUND);
  // over, about his middle, a hop lifting him clear of the deck; on his head, swaying a little as he keeps his balance
  b.tip.rotation.x = k * Math.PI;
  b.tip.position.y = HEAD_TOP * 0.92 / 2 + Math.sin(Math.PI * k) * 0.22 - (crouch + tada) * 0.07;
  b.tip.rotation.z = t >= UP && t < DOWN ? Math.sin((t - UP) * 2.3) * 0.05 * Math.min(1, (t - UP) * 2) : 0;
  // his arms: forward for the crouch, over his head to the deck for the headstand, and up and out for the "ta-da"
  for (const [i, a] of b.acrobat.arms.entries()) {
    a.rotation.x = t < OVER ? -1.1 * crouch : t < LAND ? -k * (Math.PI - 0.35) : -2.6 * tada;
    a.rotation.z = (i ? 1 : -1) * 0.45 * tada;
  }
  // his legs scissoring slowly up in the air
  for (const [i, l] of b.acrobat.legs.entries()) l.rotation.x = k * (i ? 1 : -1) * (0.16 + 0.1 * Math.sin(t * 1.7));
  talking(dt);
}

// ---------- speaking to the old-timers ----------
// Staged as the Family's introductions are in the Undertow (meet.ts, whose bubble and shade it borrows, with nobody's
// name on it): the camera eases in on him from in front, creeping closer, and his line comes a letter at a time in
// blips of his own voice (he stands still: his head's one piece with him). A tap or a key: the rest of it at once, or back to the game.

/** Each old-timer: where he stands, the way the camera looks at him from and which side of that it comes in from (the
 *  short one's from in front and a little to his right; the tall one's from the game's own camera's side, so he's seen
 *  side-on at the rail, as in the photo, the shot looking a little ahead of him, out to sea, which leaves him on its
 *  right and the player out of it), his line, the top of his head over the deck, and his voice: the
 *  short one's quick and high, the tall one's slow and low. On the scene's bus, as the Family's are. */
const OLD = [
  {
    at: HEADSTAND, view: 0, side: -1, ahead: [0, 0], line: MIRACLES, top: 1.2, letter: 0.038,
    syl: () => tone({ f: between(185, 225), d: 0.06, type: 'triangle', a: 0.006, v: 0.26, bus: 'cue' }),
    stop: () => tone({ f: between(160, 168), f2: 142, d: 0.15, type: 'triangle', a: 0.006, v: 0.26, bus: 'cue' }),
  },
  {
    at: DREAMER, view: -0.4, side: 0, ahead: [Math.sin(DREAMER.face) * 0.45, Math.cos(DREAMER.face) * 0.45], line: LEGEND, top: 1.35, letter: 0.058,
    syl: () => tone({ f: between(92, 112), d: 0.11, type: 'triangle', lp: 700, a: 0.01, v: 0.32, bus: 'cue' }),
    stop: () => tone({ f: between(84, 88), f2: 74, d: 0.24, type: 'triangle', lp: 650, a: 0.01, v: 0.32, bus: 'cue' }),
  },
];
/** Seconds before his line starts, as the camera comes in. */
const LEAD = 0.6;
/** The one being spoken to: which, seconds in, how much of his line's said, and the wait for the next letter. */
let talk: { i: number; t: number; n: number; wait: number } | null = null;
/** The camera's view of him, blended in by `k` (main.ts); whose shot it is (kept as it eases back), how far it's crept
 *  in, and whether E was down last frame. */
export const elderCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };
let shot = 0, creep = 0, pressed = false;
/** What's going on, for tests: who's talking (0 or 1) and what he's said so far. */
export const elderState = () => ({ who: talk?.i ?? -1, says: talk ? OLD[talk.i].line.slice(0, talk.n) : '' });

const $ = (id: string) => document.getElementById(id)!;
const talkEl = boat ? { root: $('meet'), say: $('meetSay'), who: $('meetWho'), line: $('meetLine'), live: $('meetLive') } : null;

function begin(i: number) {
  talk = { i, t: 0, n: 0, wait: 0 };
  // (on his head, or going over: down again from where he is)
  const b = boat!;
  if (i === 0 && b.act >= OVER && b.act < DOWN) b.act = b.act < UP ? DOWN + (UP - b.act) : DOWN;
  shot = i; creep = 0;
  player.held = true; player.moving = false;
  // (facing him)
  const at = OLD[i].at, p = player.g.position;
  player.h = Math.atan2(at.x - p.x, at.z - p.z); player.g.rotation.y = player.h;
  const el = talkEl!;
  el.who.textContent = ''; el.line.textContent = ''; el.line.dataset.rest = OLD[i].line;
  el.say.classList.remove('on', 'done');
  el.live.textContent = OLD[i].line;
  el.root.hidden = false;
  document.body.classList.add('meet');
}
function end() {
  talk = null;
  player.held = false;
  const el = talkEl!;
  el.say.classList.remove('on', 'done');
  el.root.hidden = true;
  document.body.classList.remove('meet');
}
/** A tap or a key: the rest of his line at once, or back to the game. */
function advance() {
  if (!talk || !talkEl!.say.classList.contains('on')) return;
  const line = OLD[talk.i].line;
  if (talk.n < line.length) { talk.n = line.length; talkEl!.line.textContent = line; talkEl!.line.dataset.rest = ''; talkEl!.say.classList.add('done'); }
  else end();
}
if (boat) {
  window.addEventListener('keydown', e => {
    if (!talk || e.repeat) return;
    if ([' ', 'Enter', 'z', 'Z', 'e', 'E'].includes(e.key)) { e.preventDefault(); advance(); }
  });
  window.addEventListener('pointerdown', () => { if (talk) advance(); });
}

/** Offers Talk beside either of them while the boat's moored, starts it on E (or Talk), and goes through his line. */
function talking(dt: number) {
  const b = boat!, p = player.g.position, press = buyHeld() && !pressed;
  pressed = buyHeld();
  if (!talk) {
    elderCam.k = Math.max(0, elderCam.k - dt / 0.8);
    let near = -1;
    if (b.sail === 'moored' && !player.held && onVoteBoat(p) && p.x < CAB.x0) {
      for (const [i, o] of OLD.entries()) if (Math.hypot(p.x - o.at.x, p.z - o.at.z) < TALK_NEAR && (near < 0 || d2xz(p, o.at) < d2xz(p, OLD[near].at))) near = i;
    }
    offerTalk(near >= 0, 'boat');
    if (near >= 0 && press) begin(near);
  }
  if (talk) {
    offerTalk(false, 'boat');
    const s = talk, o = OLD[s.i], el = talkEl!;
    s.t += dt;
    elderCam.k = Math.min(1, elderCam.k + dt / 0.7);
    creep = Math.min(1, creep + dt / 10);
    if (s.t >= LEAD && (s.i !== 0 || b.act === 0) && s.n < o.line.length) {
      el.say.classList.add('on');
      s.wait -= dt;
      while (s.wait <= 0 && s.n < o.line.length) {
        const ch = o.line[s.n++];
        // (the end of the line: a lower note)
        if (s.n === o.line.length) { o.stop(); break; }
        s.wait += ch === ',' ? 0.12 : o.letter;
        if (/[a-z0-9]/i.test(ch) && s.n % 2) o.syl();
      }
      el.line.textContent = o.line.slice(0, s.n);
      el.line.dataset.rest = o.line.slice(s.n);
      if (s.n >= o.line.length) el.say.classList.add('done');
    }
  }
}

const nearer = V(0, 0, 0), face = V(0, 0, 0);
/** Puts the camera's view of him and his bubble in place for this frame (main.ts, before the camera's drawn): from in
 *  front of him, a little to one side and up, creeping in as he talks; further back on a phone held upright. */
export function drawElders() {
  if (!boat || elderCam.k <= 0) return;
  const o = OLD[shot], back = camK > 1 ? 1.35 : 1, y = VOTE_BOAT.y;
  // (the short one's face, as he's turned about his middle)
  const t = boat.tip, mid = HEAD_TOP * 0.92 / 2;
  face.set(o.at.x, y + (shot === 0 ? t.position.y + (0.95 - mid) * Math.cos(t.rotation.x) : 1.15), o.at.z);
  const fx = Math.sin(o.view), fz = Math.cos(o.view), sx = 0.9 * o.side;
  const ax = o.at.x + o.ahead[0], az = o.at.z + o.ahead[1];
  elderCam.pos.set(ax + (fx * 2.7 - fz * sx) * back, y + 1.9 * back, az + (fz * 2.7 + fx * sx) * back);
  elderCam.look.set(ax, face.y - 0.1, az);
  elderCam.pos.lerp(nearer.copy(elderCam.look), 0.18 * creep);
  if (!talk || !talkEl!.say.classList.contains('on')) return;
  // over his head, its tail pointing down at him (kept on the screen); the dark round the edges, clear round his face
  const el = talkEl!;
  const toScreen = (v: Vector3) => { v.project(camera); return { x: (v.x + 1) / 2 * viewSize.w, y: (1 - v.y) / 2 * viewSize.h }; };
  const h = toScreen(V(o.at.x, y + o.top, o.at.z)), f = toScreen(face.clone());
  const w = el.say.offsetWidth, x = Math.max(12, Math.min(h.x - w / 2, viewSize.w - w - 12));
  el.say.style.left = x + 'px'; el.say.style.top = Math.max(el.say.offsetHeight + 16, h.y) + 'px';
  el.say.style.setProperty('--tail', Math.max(22, Math.min(w - 22, h.x - x)) + 'px');
  el.root.style.setProperty('--fx', f.x + 'px'); el.root.style.setProperty('--fy', f.y + 'px');
}
/** Keeps the player out of the committee's table (and from behind it) and the screen's. */
export function collideVoting(p: XZ) {
  if (!boat) return;
  if (inPollingRoom(p)) {
    const tx = (TABLE.x0 + TABLE.x1) / 2, tz = (TABLE.z1 + CAB.z0) / 2;
    pushOutOfBox(p, tx, tz, (TABLE.x1 - TABLE.x0) / 2 + 0.3, (TABLE.z1 - CAB.z0) / 2 + 0.3);
    pushOutOfBox(p, (SCREEN.x0 + SCREEN.x1) / 2, (SCREEN.z0 + SCREEN.z1) / 2, (SCREEN.x1 - SCREEN.x0) / 2 + 0.3, (SCREEN.z1 - SCREEN.z0) / 2 + 0.3);
    // the bench by the window and the fan in the corner
    pushOutOfBox(p, CAB.x0 + T + 0.95, CAB.z1 - T - 0.3, 0.75, 0.4);
    pushOutOfBox(p, CAB.x1 - T - 0.35, CAB.z1 - T - 0.4, 0.4, 0.4);
  } else if (onVoteBoat(p) && p.x < CAB.x0) {
    // out on the foredeck: the backgammon table and its chairs, the cool box, and the two old-timers
    pushOutOfBox(p, TB.x, TB.z, 1.05, 0.5);
    pushOutOfBox(p, BOXC.x, BOXC.z, 0.5, 0.42);
    pushOutOfBox(p, HEADSTAND.x, HEADSTAND.z, 0.45, 0.45);
    pushOutOfBox(p, DREAMER.x, DREAMER.z, 0.4, 0.4);
  }
}
