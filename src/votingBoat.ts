// The voting boat, for Israel's election day (flags.ts ELECTION_DAYS, or ?vote=on): a white houseboat that sails in
// from the sea once the game opens, sounding its horn, and moors alongside the pier's arm (layout.ts VOTE_BOAT),
// dressed in blue-and-white bunting with a flag at its bow; once the day's over, it sails away again. A gangway
// crosses to its side deck, between two queue ropes, to the door of its one cabin: the polling room, a kalpi like a
// real Israeli polling station's. The committee's three at their table with the register open and the station's number
// on a tent card, the blue ballot box sealed on it, the cardboard voting screen in the corner with the slips and the
// blue envelopes behind it, a flag and a clock on the wall. As in the casino's salon, the roof lifts away and the walls
// on the camera's side fade while the player's inside.
// Walking in, the chair greets you; behind the screen you pick a slip (a dish or a fish: it's for voting itself, never
// a party or anyone on a ballot) and carry it out in a blue envelope; at the ballot box it drops in through the slot,
// the committee thanks you, and an "I voted" sticker stays on your chest for the visit. Once each time aboard. Nothing
// of it is saved, and on any other day nothing of it is built, so the game is just as it was.
import {
  BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, type Material, Mesh, MeshLambertMaterial, PlaneGeometry, Shape,
  type Vector3,
} from 'three';
import { crowdModel, type Person } from './characters';
import { electionDay, voteParam, votingBoatOn } from './flags';
import { drawIcon } from './icons';
import { apart, Build, detail, dice, rbox } from './kit';
import { inPollingRoom, level, onVoteBoat, PIER, pushOutOfBox, VOTE_BOAT, voteBoat, voteX as X } from './layout';
import { C } from './palette';
import { player } from './player';
import { bakePainted, canvasTex, FONT, mesh, painted, type Part, rr, scene } from './render';
import { pick, put, shipHorn } from './sfx';
import { bubble } from './speech';
import { panel as kitPanel } from './uiKit';
import { d2xz, V, type XZ } from './util';
import { crowdStyle } from './wardrobe';

// ---------- the plan ----------
const { hull: HULL, cabin: CAB, gangway: GW, deck: DECK, dz: DZ } = VOTE_BOAT;
/** The flag's own blue. */
const BLUE = 0x0038B8;
/** The cabin's walls' thickness, and the door in its dock-side wall. */
const T = 0.08, DOOR = { x0: X(4.15), x1: X(3.35), h: 1.85 };
/** Where the hull's sides start drawing in to the bow, and the middle of its width. */
const BOW = X(6.2), MID = (HULL.z0 + HULL.z1) / 2;
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
/** The queue ropes either side of the landing, along the side deck: their posts. */
const ROPES_X = [[X(2.75), X(3.3)], [X(4.2), X(4.75)]], ROPE_Z = -7.3 + DZ;
/** The slips to pick from: the game's own dishes and fish. */
export const SLIPS = [['🍣', 'Sushi'], ['🐟', 'Fish'], ['🍚', 'Rice'], ['🍲', 'Chanko'], ['🍤', 'Tempura']] as const;
/** What the committee says. */
export const GREETING = 'Shalom! Your ID, please', THANKS = 'Thank you for voting!';

// ---------- building it: blocks drawn plain on Low and bevelled on High ----------
/** A block, `w` by `h` by `d`, painted `c`, its middle at (x, y, z) (y from the deck), turned `ry` about the vertical
 *  and `rz` across. */
interface Block { w: number; h: number; d: number; c: number; x: number; y: number; z: number; ry: number; rz: number }
type Add = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, ry?: number, rz?: number) => void;
function blocks(f: (s: Add) => void) {
  const out: Block[] = [];
  f((w, h, d, c, x, y, z, ry = 0, rz = 0) => out.push({ w, h, d, c, x, y, z, ry, rz }));
  return out;
}
/** The unit box and the pennant every block and pennant is drawn with (made with the boat, off the luck). */
let BOX: BoxGeometry, PEN: CylinderGeometry;
/** `bs` as a Low mesh (plain boxes, `painted`) and a High one (the kit's bevelled boxes, the thin ones plain), shown by
 *  the setting, in `g`; drawn with `material` (one that fades) if given. */
function twin(g: Group, bs: Block[], cast = true, material: MeshLambertMaterial = painted) {
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

/** A small Israeli flag, `w` wide, its middle at (x, y, z), facing along +z: white, its two blue stripes, and the Star
 *  of David between them, two triangles of thin bars. */
function flag(s: Add, w: number, x: number, y: number, z: number) {
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
  // ---- the hull: white sides, a blue band at the waterline and a wooden deck; the same on both ----
  g.add(mesh(bakePainted([
    { geo: slab(0, -0.45, -0.05), c: C.snow, at: [0, 0, 0] },
    { geo: slab(0.015, -0.3, -0.22), c: BLUE, at: [0, 0, 0] },
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
    // the queue ropes: chrome posts on heavy feet, a blue rope sagging between
    for (const [a, b] of ROPES_X) {
      for (const x of [a, b]) { s(0.04, 0.9, 0.04, C.steel, x, 0.45, ROPE_Z); s(0.2, 0.04, 0.2, C.iron, x, 0.02, ROPE_Z); }
      for (let i = 0; i < 4; i++) {
        const xa = a + (b - a) * i / 4, xb = a + (b - a) * (i + 1) / 4, sag = (t: number) => 0.82 - 0.12 * 4 * t * (1 - t);
        along(s, [xa, ROPE_Z], [xb, ROPE_Z], sag((i + 0.5) / 4) - 0.015, 0.03, 0.03, BLUE);
      }
    }
    // the back wall and the stern's wall, white outside and pale inside, a blue band round the room at the windows' sills
    s(x1 - x0, CH, T, C.snow, (x0 + x1) / 2, CH / 2, z0 + T / 2);
    s(T, CH, z1 - z0, C.snow, x0 + T / 2, CH / 2, (z0 + z1) / 2);
    s(x1 - x0 - 2 * T, CH - 0.05, 0.01, C.paper, (x0 + x1) / 2, CH / 2, z0 + T + 0.005);
    s(0.01, CH - 0.05, z1 - z0 - 2 * T, C.paper, x0 + T + 0.005, CH / 2, (z0 + z1) / 2);
    s(x1 - x0 - 2 * T, 0.1, 0.02, BLUE, (x0 + x1) / 2, 0.85, z0 + T + 0.01);
    s(0.02, 0.1, z1 - z0 - 2 * T, BLUE, x0 + T + 0.01, 0.85, (z0 + z1) / 2);
    // the room's floor, pale, over the deck
    s(x1 - x0 - 2 * T, 0.01, z1 - z0 - 2 * T, C.enamel, (x0 + x1) / 2, 0.005, (z0 + z1) / 2);
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
    // the bow: a mast with a flag flying, and bunting from it to the cabin roof's corners
    const mast = X(6.95);
    s(0.05, 1.7, 0.05, C.steel, mast, 0.85, MID);
    flag(s, 0.42, mast + 0.235, 1.48, MID);
    for (const z of [z1, z0]) bunting(s, pennants, [mast, 1.6, MID], [x0, CH + 0.08, z]);
  });
  const clock = new Group();
  clock.position.set(MEMBERS_X[1], 1.75, z0 + T + 0.03);
  clock.rotation.x = Math.PI / 2;
  const dial = new CylinderGeometry(0.17, 0.17, 0.04, 20);
  clock.add(mesh(dial, C.snow), mesh(new CylinderGeometry(0.19, 0.19, 0.03, 20), C.ink, 0, -0.01, 0));
  const hand = (len: number, a: number) => { const m = mesh(BOX, C.ink, Math.sin(a) * len / 2, 0.025, -Math.cos(a) * len / 2); m.scale.set(0.02, 0.01, len); m.rotation.y = -a; clock.add(m); };
  hand(0.1, 0.5); hand(0.14, 2.6);
  g.add(clock);
  twin(g, still);
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

  // ---- the walls on the camera's side (the dock's, with the door and its sign, and the bow's), which fade ----
  const near = new MeshLambertMaterial({ vertexColors: true, transparent: true }), nearMats: Material[] = [near];
  twin(g, blocks(s => {
    const zw = z1 - T / 2;
    // the dock's side: either side of the door and over it, a window each side, a blue band, the door's frame
    s(DOOR.x0 - x0, CH, T, C.snow, (x0 + DOOR.x0) / 2, CH / 2, zw);
    s(x1 - DOOR.x1, CH, T, C.snow, (DOOR.x1 + x1) / 2, CH / 2, zw);
    s(DOOR.x1 - DOOR.x0, CH - DOOR.h, T, C.snow, (DOOR.x0 + DOOR.x1) / 2, (CH + DOOR.h) / 2, zw);
    s(x1 - x0, 0.1, T + 0.02, BLUE, (x0 + x1) / 2, 0.85, zw);
    for (const wx of [X(2.45), X(5.35)]) {
      s(0.8, 0.6, T + 0.03, C.snow, wx, 1.3, zw);
      s(0.68, 0.48, T + 0.04, 0x9FC9E0, wx, 1.3, zw);
    }
    for (const k of [0, 1]) s(0.06, DOOR.h, T + 0.03, BLUE, k ? DOOR.x1 : DOOR.x0, DOOR.h / 2, zw);
    s(DOOR.x1 - DOOR.x0 + 0.06, 0.06, T + 0.03, BLUE, (DOOR.x0 + DOOR.x1) / 2, DOOR.h, zw);
    // the bow's end: a round window
    s(T, CH, z1 - z0, C.snow, x1 - T / 2, CH / 2, (z0 + z1) / 2);
    s(T + 0.02, 0.1, z1 - z0, BLUE, x1 - T / 2, 0.85, (z0 + z1) / 2);
    s(T + 0.03, 0.5, 0.5, 0x9FC9E0, x1 - T / 2, 1.35, MID);
  }), true, near);
  const door = sign('קלפי', 0.62, 0.2, '#0038B8', '#FFFFFF', nearMats);
  door.position.set((DOOR.x0 + DOOR.x1) / 2, (CH + DOOR.h) / 2 + 0.01, z1 + 0.005);
  g.add(door);

  // ---- the roof: white, a blue edge, bunting along the dock's side; it lifts away while the player's inside ----
  const roofMat = new MeshLambertMaterial({ vertexColors: true, transparent: true });
  const roof = new Group();
  g.add(roof);
  const roofPennants: (Part & { c: number })[] = [];
  twin(roof, blocks(s => {
    s(x1 - x0 + 0.2, 0.08, z1 - z0 + 0.2, C.snow, (x0 + x1) / 2, CH + 0.04, (z0 + z1) / 2);
    s(x1 - x0 + 0.22, 0.06, z1 - z0 + 0.22, BLUE, (x0 + x1) / 2, CH + 0.005, (z0 + z1) / 2);
    s(0.9, 0.18, 0.6, C.snow, X(2.4), CH + 0.17, (z0 + z1) / 2);
    bunting(s, roofPennants, [x0, CH + 0.02, z1 + 0.1], [x1, CH + 0.02, z1 + 0.1]);
  }), true, roofMat);
  const roofPen = mesh(bakePainted(roofPennants), new MeshLambertMaterial({ vertexColors: true, transparent: true }));
  roof.add(roofPen);
  const roofMats = [roofMat, roofPen.material as Material];

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
  // ---- the sticker: a round blue "I voted" on the chest ----
  const stickerTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#0038B8'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.stroke();
    c.fillStyle = '#fff'; c.font = `800 26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('I', w / 2, h / 2 - 16); c.fillText('voted', w / 2, h / 2 + 12);
  });
  const sticker = new Mesh(new PlaneGeometry(0.14, 0.14), new MeshLambertMaterial({ map: stickerTex.tex, transparent: true }));
  sticker.position.set(0.1, 0.78, 0.25); sticker.visible = false;
  player.g.body.add(sticker);

  // out at sea till it sails in (updVoting)
  ship.visible = plank.visible = false;
  return {
    ship, g, plank, roof, roofMats, nearMats, members, says, inHand, flying, sticker, roofK: 1,
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
export const voting = { slip: null as string | null, voted: false, greeted: false, sticker: false, drop: -1, inside: false };

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
const WAIT = 2, ARRIVE = 14, EDGE_T = 3, LEAVE = 12;
/** How far off the pier it lines up before edging onto it, and off it before it sails away. */
const OFF = 1.2;
/** Coming in: down from the open sea to the north, between the pier's end and the shore, round to face west, lined
 *  up with the pier (a curve from the first of these to the last, the middle two pulling it round). Going: on west,
 *  bow first, and round north out to sea. */
const IN = [V(BERTH.x + 0.8, 0, -40), V(BERTH.x + 0.8, 0, BERTH.z - OFF - 6), V(BERTH.x + 3.2, 0, BERTH.z - OFF), V(BERTH.x, 0, BERTH.z - OFF)];
const OUT = [V(BERTH.x, 0, BERTH.z - OFF), V(BERTH.x - 6, 0, BERTH.z - OFF), V(-9, 0, BERTH.z - OFF - 2), V(-10, 0, -40)];
/** When it sounds its horn coming in (how far in), as it moors, and as it casts off. */
const HORN_IN = 0.6;
/** How it leaves: with ?vote=bye, a minute after it's moored; with ?vote=on, never; otherwise once election day's
 *  over (and the player's off it). */
const BYE = 60, VOTE = voteParam();
const dayOver = (moored: number) => VOTE === 'bye' ? moored >= BYE : VOTE !== 'on' && !electionDay();

/** The curve through `c` measured along its length: how far along it each of its STEPS points is, so the ship goes
 *  at the pace it's eased to, not faster where the curve's points are spread out. */
const STEPS = 64;
function measure(c: Vector3[]) {
  const len = [0];
  let x = c[0].x, z = c[0].z;
  for (let i = 1; i <= STEPS; i++) {
    const [nx, nz] = curve(c, i / STEPS);
    len.push(len[i - 1] + Math.hypot(nx - x, nz - z));
    x = nx; z = nz;
  }
  return len;
}
/** The point `k` of the way along the curve through `c` (a cubic Bézier), and which way it's heading there. */
function curve(c: Vector3[], k: number) {
  const j = 1 - k, w = [j * j * j, 3 * k * j * j, 3 * k * k * j, k * k * k], d = [-j * j, j * j - 2 * k * j, 2 * k * j - k * k, k * k];
  let x = 0, z = 0, dx = 0, dz = 0;
  c.forEach((p, i) => { x += w[i] * p.x; z += w[i] * p.z; dx += d[i] * p.x; dz += d[i] * p.z; });
  return [x, z, dx, dz];
}
const IN_LEN = measure(IN), OUT_LEN = measure(OUT);
/** Puts the ship `f` of the way along the curve through `c` (by its length, `len`), its bow along it. */
function steer(c: Vector3[], len: number[], f: number) {
  const want = f * len[STEPS];
  let i = 1;
  while (i < STEPS && len[i] < want) i++;
  const k = (i - 1 + (want - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1])) / STEPS;
  const [x, z, dx, dz] = curve(c, k), s = boat!.ship;
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
      steer(IN, IN_LEN, 0);
      if (b.t >= WAIT) { b.sail = 'in'; b.t = 0; b.ship.visible = true; }
      break;
    case 'in': {
      // in at a steady speed, easing off as it lines up, then edging onto the pier
      b.ship.visible = true;
      if (b.t < ARRIVE) steer(IN, IN_LEN, 1 - (1 - b.t / ARRIVE) ** 2);
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
        steer(OUT, OUT_LEN, u * u);
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
    Object.assign(voting, { slip: null, voted: false, greeted: false });
    boat.inHand.visible = false;
  }
  const inside = !level.down && p.z < CAB.z1 + 0.15 && onVoteBoat(p);
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
  if (boat.says.text) boat.says.place(MEMBERS_X[1], VOTE_BOAT.y + 2.0, MEMBER_Z);
  boat.says.upd(dt);
}

/** Keeps the player out of the committee's table (and from behind it) and the screen's. */
export function collideVoting(p: XZ) {
  if (!boat || !inPollingRoom(p)) return;
  const tx = (TABLE.x0 + TABLE.x1) / 2, tz = (TABLE.z1 + CAB.z0) / 2;
  pushOutOfBox(p, tx, tz, (TABLE.x1 - TABLE.x0) / 2 + 0.3, (TABLE.z1 - CAB.z0) / 2 + 0.3);
  pushOutOfBox(p, (SCREEN.x0 + SCREEN.x1) / 2, (SCREEN.z0 + SCREEN.z1) / 2, (SCREEN.x1 - SCREEN.x0) / 2 + 0.3, (SCREEN.z1 - SCREEN.z0) / 2 + 0.3);
}
