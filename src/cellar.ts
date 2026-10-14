// The cellar under the dock (stage 3): Mr. Fugu's sumo ring and the stew kitchen that feeds its fans, in rooms side by
// side, with thin walls and doorways between them. The arena: a big clay dohyo under lanterns in the middle, crates
// and planks for stands along the back and west walls, the soup bar by the hearth room's door, and the gong and the
// cashier's window against the east wall. Down the middle, Mr. Fugu's office (his desk on a dais), the landing with the
// ladder up to the hatch in the dock, and the hearth room: the big pot, its ledge and the bowl counter. To the east the
// prep hall, where the dumbwaiter from the restaurant's kitchen comes down beside the racks and barrels, and behind its
// stone north wall the grow room, which nobody knows is there until the first boss is beaten. It's built CELLAR_Y under
// the dock, out of the camera's sight from up there, dug into the earth. Only the back walls along the very back of the
// cellar go up high, all to one height: every other wall is low, all to one height too, so the camera sees into every
// room, and the earth round the rooms comes up level with their tops.
// This module is the rooms and their furniture; where things are is cellarPlan.ts, and the kitchen's lines, the bouts
// and the swarm draw themselves (ringKitchen.ts, dohyo.ts, swarm.ts).
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry,
  type Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, PointLight, type Side as Facing, TorusGeometry,
  TubeGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BAR, BENCH, BINS, CASHIER, CHUTE, chuteY, COUNTER, GONG, HEARTH, LIFTS, machineAt, MAX_MACHINES, POT, STORES, TEPPO, TUNNEL_D, TUNNEL_W, TUNNELS,
} from './cellarPlan';
import { Fugu } from './fugu';
import { ARENA, CELLAR_Y, type CellarRoom, CRAFT, DOORS, found, GROW, keepOnFloor, KITCHEN, LANDING, LIFT_ROOM, OFFICE_ROOM, PREP, pushOutOfBox, ROOMS, walkable } from './layout';
import { canvasTex, copyGeo, FONT, G, mat, mesh, OFF, paint, rr, scene } from './render';
import type { XZ } from './util';

export { cellarWay, roomAt } from './cellarPlan';

/** The cellar's floor height. */
export const CY = CELLAR_Y;
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
type Rect = typeof ARENA;

// ---------- where everything is (x, z; the floor is CY) ----------
// the arena
/** The middle of the ring, the height of its top, and half the width of its top. */
export const RING = V(-4.4, CY, -1.4);
export const RING_TOP = 0.6;
export const RING_HALF = 3.3;
/** How far the mound's clay slopes out past its top, each side. */
const RING_FOOT = 0.6;
/** The straw circle: inside it is in, past it is out. */
export const RING_R = 2.6;
// the landing
/** The ladder up to Mr. Fugu's hatch, by the middle of the landing's east wall, halfway between the office and the
 *  hearth room (the levels are never seen together, so it needn't stand right under the hatch), far enough out that the
 *  daylight round it (BEAM_R out from it) stays clear of the wall; where the player stands to climb up, at its foot; and
 *  where they land coming down, a step off that. */
const BEAM_R = 1.0;
export const LADDER = V(LANDING.x1 - BEAM_R - 0.2, CY, (LANDING.z0 + LANDING.z1) / 2);
export const LADDER_PAD = { x: LADDER.x - 0.75, z: LADDER.z, r: 0.6 };
export const LADDER_FOOT = V(LADDER_PAD.x - 0.9, CY, LADDER_PAD.z + 0.4);
/** The cellar's bins (bin.ts): an old oil drum in the hearth room, and one in the prep hall. */
export const KITCHEN_BINS = [V(KITCHEN.x0 + 0.5, CY, KITCHEN.z1 - 0.5), V(PREP.x1 - 0.55, CY, PREP.z1 - 0.55)];
// the office
/** Mr. Fugu's office: his desk, on its dais against the back wall, and his safe in the corner. */
export const OFFICE = V((OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2, CY, -7.9);
const DAIS = { x0: OFFICE.x - 1.8, x1: OFFICE.x + 1.8, z0: OFFICE_ROOM.z0, z1: OFFICE.z + 0.85, h: 0.18 };
export const VAULT = V(OFFICE_ROOM.x1 - 0.75, CY, OFFICE_ROOM.z0 + 0.65);
/** The rest of the office's furniture: two chairs for visitors, the filing cabinet, the fish tank, a plant, and the
 *  coat rack by the door. */
const GUESTS = [{ x: OFFICE.x - 0.75, z: DAIS.z1 + 0.75 }, { x: OFFICE.x + 0.75, z: DAIS.z1 + 0.75 }];
const CABINET = { x: OFFICE_ROOM.x1 - 0.45, z: -7.3 }, TANK = { x: OFFICE_ROOM.x0 + 0.45, z: -8.4 };
const PLANT = { x: OFFICE_ROOM.x1 - 0.5, z: OFFICE_ROOM.z1 - 0.5 }, RACK = { x: 9.65, z: OFFICE_ROOM.z1 - 0.45 };
// the hearth room and the prep hall
/** The dumbwaiter's height, and where in it the trays go round (front and back, bottom and top): the bottom is its
 *  hatch, at chest height, just over the top of its chute (CHUTE.y0), so what tips off a tray there slides down it. */
export const LIFT_H = 4.6;
export const LIFT_LOOP = { front: 0.25, back: -0.25, bottom: 1.6, top: LIFT_H - 0.45 };
/** (Just over the pot's iron top, at 1.39, and under its rim: two faces at one height flicker.) */
export const POT_TOP = 1.43;
const SACKS = { x: PREP.x1 - 0.6, z: PREP.z0 + 0.55 };

// ---------- materials ----------
const WOOD = 0x8A5A3B, WOOD_DARK = 0x5B3424, PILE = 0x4A3A30, CLAY = 0x6E4428, STRAW = 0xD9C47E;
const IRON = 0x2E2E33, STEEL = 0x8C959C, STEEL_DARK = 0x4B5257;
/** Glowing materials (lanterns, the hearth's fire, the hatch's daylight): lit only in the cellar's light. */
const glow = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1 });
const LANTERN_RED = glow(0xE0392B, 0xB0250F), LANTERN_PAPER = glow(0xFFF1D6, 0xFFC46A);

const add = <T extends Object3D>(parent: Object3D, o: T) => { parent.add(o); return o; };
const box = (parent: Object3D, c: number | Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
  const m = add(parent, mesh(G.box, c, x, y, z, cast)); m.scale.set(sx, sy, sz); return m;
};
const log = (parent: Object3D, c: number, x: number, y: number, z: number, r: number, h: number, cast = true) => {
  const m = add(parent, mesh(G.log, c, x, y, z, cast)); m.scale.set(r, h, r); return m;
};

/** The whole cellar, hidden until stage 3. Everything in it is placed in world coordinates (y from CY). */
export const cellar = new Group();
cellar.visible = false;
scene.add(cellar);
/** Parts that come with the venue's tiers, shown when they're bought: the bleachers (the Back-Alley Ring), the upper
 *  tier and the taiko drums (the Underground Arena), and the VIP boxes (the Grand Hall Below). And the grow room, with
 *  the doorway into it, found when the first boss is beaten (until then, `hidden`: the prep hall's tall back wall). */
export const parts = { bleachers: new Group(), tier: new Group(), vip: new Group(), drums: new Group(), grow: new Group(), hidden: new Group() };
Object.values(parts).forEach(g => { g.visible = false; cellar.add(g); });
parts.hidden.visible = true;

// ---------- the rooms ----------
const earth = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#6A5444'; c.fillRect(0, 0, w, h);
  // blotches scattered by a fixed hash (no Math.random: that's the game's; and no steady step, which lines them up
  // in stripes)
  const hash = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 260; i++) {
    c.fillStyle = i % 2 ? 'rgba(40,28,20,.16)' : 'rgba(150,120,90,.10)';
    c.beginPath(); c.arc(hash(i) * w, hash(i + 500) * h, 3 + hash(i + 1000) * 12, 0, Math.PI * 2); c.fill();
  }
});
earth.tex.wrapS = earth.tex.wrapT = 1000; // RepeatWrapping
/** A board floor, for the kitchen. */
const boards = canvasTex(256, 256, (c, w, h) => {
  for (let i = 0; i < 8; i++) {
    c.fillStyle = ['#8A6244', '#93694A', '#80593D', '#8E6546'][i % 4]; c.fillRect(0, i * h / 8, w, h / 8);
    c.fillStyle = 'rgba(40,24,14,.5)'; c.fillRect(0, i * h / 8, w, 2);
    c.fillRect(((i * 97) % 200) + 20, i * h / 8, 2, h / 8);
  }
});
boards.tex.wrapS = boards.tex.wrapT = 1000;
/** Stone flags, for the landing: grey slabs of a few sizes, in rows, with dark joints. */
const flags = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E2A26'; c.fillRect(0, 0, w, h);
  const hash = (i: number) => { const x = Math.sin(i * 91.17) * 43758.5453; return x - Math.floor(x); };
  const ROW = h / 4;
  for (let r = 0, i = 0; r < 4; r++) {
    // each row's joints, staggered, wrapping round so the texture tiles
    let x = (r % 2) * 40;
    while (x < w + (r % 2) * 40) {
      const len = 52 + Math.floor(hash(i++) * 40), g = 90 + Math.floor(hash(i++) * 24);
      c.fillStyle = `rgb(${g + 4},${g - 2},${g - 12})`;
      for (const off of [0, -w]) c.fillRect(x + off + 2, r * ROW + 2, len - 4, ROW - 4);
      c.fillStyle = 'rgba(255,255,255,.06)';
      for (const off of [0, -w]) c.fillRect(x + off + 2, r * ROW + 2, len - 4, 3);
      x += len;
    }
  }
});
flags.tex.wrapS = flags.tex.wrapT = 1000;
/** Dark basket-weave parquet, for Mr. Fugu's office: squares of four strips, each square turned from the last. */
const parquet = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E180F'; c.fillRect(0, 0, w, h);
  const S = 64, T = S / 4, tones = ['#5C3322', '#53301F', '#64392A', '#4E2C1D'];
  for (let gy = 0; gy < h / S; gy++) {
    for (let gx = 0; gx < w / S; gx++) {
      const across = (gx + gy) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        c.fillStyle = tones[(k + gx * 3 + gy) % 4];
        if (across) c.fillRect(gx * S + 1, gy * S + k * T + 1, S - 2, T - 2);
        else c.fillRect(gx * S + k * T + 1, gy * S + 1, T - 2, S - 2);
      }
    }
  }
});
parquet.tex.wrapS = parquet.tex.wrapT = 1000;
const SIDE = mat(0x3A2C22);
/** A floor over `r`, out to the middle of its walls, of earth or boards, its texture repeating every 4 m. */
function floor(r: Rect, tex: typeof earth, pad = 0.3, parent: Object3D = cellar) {
  const w = r.x1 - r.x0 + pad * 2, d = r.z1 - r.z0 + pad * 2;
  const t = tex.tex.clone(); t.repeat.set(w / 4, d / 4); t.needsUpdate = true;
  const f = add(parent, new Mesh(new BoxGeometry(w, 0.4, d), [SIDE, SIDE, new MeshLambertMaterial({ map: t }), SIDE, SIDE, SIDE]));
  f.position.set((r.x0 + r.x1) / 2, CY - 0.2, (r.z0 + r.z1) / 2);
  f.receiveShadow = true;
}
type Side = 'n' | 's' | 'e' | 'w';
/** Where along a room's side the doorways go through it, so its wall leaves them open. */
function gaps(r: Rect, side: Side): [number, number][] {
  const on = (a: number, b: number) => Math.abs(a - b) < 0.01;
  return DOORS.filter(t => side === 'n' ? on(t.z1, r.z0) : side === 's' ? on(t.z0, r.z1) : side === 'w' ? on(t.x1, r.x0) : on(t.x0, r.x1))
    .map(t => (side === 'n' || side === 's' ? [t.x0 - 0.3, t.x1 + 0.3] : [t.z0 - 0.3, t.z1 + 0.3]) as [number, number])
    // (and the fans' tunnels, through the arena's back walls, and the lift room's trays, through the prep hall's east wall)
    .concat(r === ARENA ? TUNNELS.filter(t => t.side === side).map(t => [t.at - TUNNEL_W / 2, t.at + TUNNEL_W / 2] as [number, number]) : [])
    .concat(r === PREP && side === 'e' ? Object.values(LIFTS).map(l => [l.z - 0.4, l.z + 0.4] as [number, number]) : []);
}
/** The stretches of a side between its doorways. */
function spans(r: Rect, side: Side): [number, number][] {
  const along = side === 'n' || side === 's';
  let a = (along ? r.x0 : r.z0) - 0.3;
  const out: [number, number][] = [];
  for (const [g0, g1] of gaps(r, side).sort((x, y) => x[0] - y[0])) { if (g0 > a) out.push([a, g0]); a = g1; }
  const end = (along ? r.x1 : r.z1) + 0.3;
  if (end > a) out.push([a, end]);
  return out;
}
/** Where a side's wall stands: `off` outside the floor. */
const line = (r: Rect, side: Side, off: number) =>
  side === 'n' ? r.z0 - off : side === 's' ? r.z1 + off : side === 'w' ? r.x0 - off : r.x1 + off;
// The walls' heights, one rule for the whole cellar: every wall round a room or between two is low (WALL, under a
// timber rail), so the camera sees into every room over the ones in front; only along the very back of the cellar,
// where there's nothing behind to hide, do the walls go up high, all to TALL under a timber cap: the dock's piles
// behind the arena (north and west) and the grow room, and Mr. Fugu's own wall behind the office. A doorway's frame
// stands FRAME_H, whatever wall it's in.
/** How high a low wall's boards stand (its rail on top), and a tall wall's top. */
const WALL = 1.1, TALL = 6.4;
/** How high a doorway's frame stands. */
const FRAME_H = 2.0;
/** How far out from each room's floor its walls stand, side by side (where a room has none of its own on a side, it's
 *  a neighbour's, between the two: 0.3): the earth round the rooms is dug back to there. Kept by the walls as they go up. */
const reach = new Map<Rect, Partial<Record<Side, number>>>();
const stands = (r: Rect, side: Side, off: number) => {
  const o = reach.get(r) ?? reach.set(r, {}).get(r)!;
  o[side] = Math.max(o[side] ?? 0, off);
};
/** A tall wall at the back of the cellar: the dock's piles going up into the dark, planks behind them, beams across, a
 *  timber cap along the top and a stone footing (none of it casting shadows: the sun's light doesn't reach down here,
 *  and the piles' would streak the floor). Only on the outer back walls, where it hides nothing. */
function tallWall(r: Rect, side: 'n' | 'w', parent: Object3D = cellar) {
  stands(r, side, 1.1);
  const at = (o: number) => line(r, side, o);
  const along = (a0: number, a1: number) => (o: number, y: number, sx: number, sy: number, sz: number, c: number, cast = false) =>
    side === 'n' ? box(parent, c, (a0 + a1) / 2, CY + y, at(o), sx, sy, sz, cast) : box(parent, c, at(o), CY + y, (a0 + a1) / 2, sz, sy, sx, cast);
  for (const [a0, a1] of spans(r, side)) {
    const len = a1 - a0, put = along(a0, a1);
    for (let a = a0 + 0.3; a <= a1; a += 1.1) side === 'n' ? log(parent, PILE, a, CY + (TALL - 0.5) / 2, at(0.6), 1.9, TALL + 0.1, false) : log(parent, PILE, at(0.6), CY + (TALL - 0.5) / 2, a, 1.9, TALL + 0.1, false);
    put(1.1, (TALL - 0.4) / 2, len, TALL, 0.3, 0x2A201A);
    for (const y of [2.2, 4.6]) put(0.25, y, len, 0.22, 0.18, WOOD_DARK, true);
    put(0.3, 0.25, len, 0.5, 0.5, 0x4E4A46, true);
  }
  // (the cap runs the whole way along, over the fans' tunnels too)
  const [a0, a1] = side === 'n' ? [r.x0 - 0.3, r.x1 + 0.3] : [r.z0 - 0.3, r.z1 + 0.3];
  along(a0, a1)(0.75, TALL - 0.1, a1 - a0, 0.2, 1.1, WOOD_DARK);
}
/** Mortared cellar stone: blocks in staggered courses, a few tones in a fixed order. */
const stone = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E2925'; c.fillRect(0, 0, w, h);
  const ROW = h / 6, tones = ['#6E665C', '#787064', '#645D54', '#817869', '#6A6358'];
  for (let r = 0; r < 6; r++) {
    for (let i = 0, x = (r % 2) * -32; x < w; i++, x += 64) {
      c.fillStyle = tones[(r * 3 + i) % tones.length]; rr(c, x + 3, r * ROW + 3, 58, ROW - 6, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 7, r * ROW + 5, 50, 4);
      c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x + 7, r * ROW + ROW - 9, 50, 4);
    }
  }
});
stone.tex.wrapS = stone.tex.wrapT = 1000;
/** The prep hall's back while the grow room behind it is a secret: not plank but mortared stone, a low wall like every
 *  other between rooms (as high, on the same line, under the same rail), with an iron gate in it in a doorway's frame,
 *  chained and padlocked, dark beyond; past it there's only earth. All of it comes down when the first boss is beaten,
 *  for the plank wall and the same gate swung open (built in parts.grow). */
function stoneWall() {
  const p = parts.hidden, z = line(PREP, 'n', 0.3), T = 0.3, x0 = PREP.x0 - 0.3, x1 = PREP.x1 + 0.3;
  stands(PREP, 'n', 0.3);
  const t = DOORS.find(d => d.b === 'grow')!, gx = (t.x0 + t.x1) / 2, gw = t.x1 - t.x0 + 0.6;
  const edge = mat(0x3A3530);
  // the stone either side of the gate, each under its rail
  for (const [a0, a1] of [[x0, gx - gw / 2], [gx + gw / 2, x1]]) {
    const tex = stone.tex.clone(); tex.repeat.set((a1 - a0) / 2, WALL / 2); tex.needsUpdate = true;
    const m = add(p, new Mesh(new BoxGeometry(a1 - a0, WALL, T), [edge, edge, edge, edge, new MeshLambertMaterial({ map: tex }), edge]));
    m.position.set((a0 + a1) / 2, CY + WALL / 2, z); m.receiveShadow = true;
    box(p, WOOD_DARK, (a0 + a1) / 2, CY + WALL + 0.04, z, a1 - a0 + 0.1, 0.08, T + 0.08);
  }
  // a footing, and pilasters every few metres, up to the rail like a plank wall's posts
  box(p, 0x4E4A46, (x0 + x1) / 2, CY + 0.08, z + 0.02, x1 - x0, 0.16, T + 0.12);
  for (const x of [PREP.x0 + 0.2, PREP.x0 + 3.2, PREP.x0 + 6.0, PREP.x1 - 0.2]) box(p, 0x5E574E, x, CY + WALL / 2, z + 0.12, 0.4, WALL, 0.14, false);
  // the gate: a heavy timber frame, as high as a doorway's, dark beyond, iron bars and straps
  for (const s of [-1, 1]) box(p, WOOD_DARK, gx + s * (gw / 2 - 0.12), CY + FRAME_H / 2, z + 0.02, 0.26, FRAME_H, T + 0.1);
  box(p, WOOD_DARK, gx, CY + FRAME_H, z + 0.02, gw + 0.2, 0.2, T + 0.12);
  box(p, new MeshBasicMaterial({ color: 0x0A0908 }), gx, CY + (FRAME_H - 0.1) / 2, z - 0.2, gw - 0.4, FRAME_H - 0.1, 0.1, false);
  bars(p, gx, z + 0.08, gw - 0.5, FRAME_H - 0.25, 0);
  // the chain across where the leaves meet, and the padlock on it
  for (let i = 0; i < 8; i++) {
    const l = add(p, mesh(new TorusGeometry(0.05, 0.016, 5, 10), 0x8A8F96, gx - 0.3 + i * 0.086, CY + 1.2 - Math.sin((i / 7) * Math.PI) * 0.08, z + 0.14));
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
  }
  box(p, 0xC9A23A, gx, CY + 0.98, z + 0.17, 0.22, 0.22, 0.08);
  box(p, 0x1B1A1E, gx, CY + 0.95, z + 0.215, 0.03, 0.07, 0.01, false);
  const shackle = add(p, mesh(new TorusGeometry(0.075, 0.022, 6, 12, Math.PI), 0x9AA4AC, gx, CY + 1.09, z + 0.17));
  shackle.castShadow = true;
  for (const s of [-1, 1]) lantern(p, gx + s * (gw / 2 + 0.45), CY + 2.3, z + 0.35, false);
}
/** An iron gate's bars, `w` wide and `h` tall, centred on `x` (or, `open` > 0, its two leaves swung back that far into the
 *  room behind, hinged on the frame). */
function bars(p: Object3D, x: number, z: number, w: number, h: number, open: number) {
  for (const s of [-1, 1]) {
    const leaf = add(p, new Group()); leaf.position.set(x + s * w / 2, CY, z); leaf.rotation.y = -s * open;
    const n = 4, lw = w / 2;
    for (let i = 0; i < n; i++) {
      const bx = -s * (lw * (i + 0.5) / n);
      add(leaf, mesh(G.box, IRON, bx, h / 2, 0, true)).scale.set(0.045, h, 0.045);
      add(leaf, mesh(G.cone, IRON, bx, h + 0.06, 0)).scale.set(0.05, 0.12, 0.05);
    }
    for (const y of [0.3, h * 0.55, h - 0.12]) add(leaf, mesh(G.box, IRON, -s * lw / 2, y, 0.02, true)).scale.set(lw, 0.07, 0.05);
  }
}
/** The office's back wall, his own and not the dock's piles: dark red wallpaper with a gold pattern over a dark wood
 *  wainscot, a cornice, a portrait of Mr. Fugu, the ring's ranking sheet, a clock, and brass wall lamps. */
function officeWall() {
  // (as high as the piles' wall beside it: its cornice tops out at TALL)
  const r = OFFICE_ROOM, x0 = r.x0 - 0.3, x1 = r.x1 + 0.3, len = x1 - x0, mid = (x0 + x1) / 2, z = r.z0 - 0.25, H = TALL - 0.11;
  stands(r, 'n', 0.25);
  const paper = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#5A1E22'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(214,170,90,.55)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w - 8, h / 2); c.lineTo(w / 2, h - 8); c.lineTo(8, h / 2); c.closePath(); c.stroke();
    c.fillStyle = 'rgba(214,170,90,.55)'; c.beginPath(); c.arc(w / 2, h / 2, 7, 0, Math.PI * 2); c.fill();
  });
  paper.tex.wrapS = paper.tex.wrapT = 1000; paper.tex.repeat.set(len / 1.2, (H - 1.1) / 1.2);
  const edge = mat(0x3A1418);
  const back = add(cellar, new Mesh(new BoxGeometry(len, H - 1.1, 0.2), [edge, edge, edge, edge, new MeshLambertMaterial({ map: paper.tex }), edge]));
  back.position.set(mid, CY + 1.1 + (H - 1.1) / 2, z);
  // the wainscot, its panels, the rail over it, the skirting, and the cornice
  box(cellar, 0x3E2418, mid, CY + 0.55, z + 0.04, len, 1.1, 0.24);
  for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.9) box(cellar, 0x4E2E1E, x, CY + 0.55, z + 0.17, 0.7, 0.75, 0.02, false);
  box(cellar, WOOD_DARK, mid, CY + 1.12, z + 0.16, len, 0.08, 0.1, false);
  box(cellar, 0x2A1810, mid, CY + 0.06, z + 0.17, len, 0.12, 0.06, false);
  box(cellar, WOOD_DARK, mid, CY + H, z + 0.08, len + 0.1, 0.22, 0.4, false);
  /** A picture on the wall: a canvas in a gold frame. */
  const picture = (x: number, y: number, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const t = canvasTex(Math.round(w * 160), Math.round(h * 160), draw), f = mat(0xC9A23A);
    box(cellar, f, x, CY + y, z + 0.13, w + 0.14, h + 0.14, 0.05, false);
    add(cellar, new Mesh(new BoxGeometry(w, h, 0.02), [f, f, f, f, new MeshBasicMaterial({ map: t.tex }), f])).position.set(x, CY + y, z + 0.17);
  };
  // his portrait: a puffer fish in a gold chain, on green
  picture(OFFICE.x, 2.65, 1.0, 1.25, (c, w, h) => {
    c.fillStyle = '#2E4A3A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#E8B04A'; c.beginPath(); c.arc(w / 2, h * 0.48, w * 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#B8862E'; c.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.3, h * 0.48 + Math.sin(a) * w * 0.3); c.lineTo(w / 2 + Math.cos(a) * w * 0.38, h * 0.48 + Math.sin(a) * w * 0.38); c.stroke(); }
    c.fillStyle = '#1B1A1E'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * w * 0.1, h * 0.43, 6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#F2D06B'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h * 0.62, w * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  });
  // the ring's ranking sheet (banzuke): columns of brushed names under a heading
  picture(OFFICE.x + 2.4, 2.45, 1.5, 1.1, (c, w, h) => {
    c.fillStyle = '#EFE3C4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7A1E1E'; c.fillRect(w * 0.1, h * 0.07, w * 0.8, h * 0.12);
    c.strokeStyle = '#2A2420'; c.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = w * (0.12 + i * 0.095);
      c.beginPath(); c.moveTo(x, h * 0.28); c.lineTo(x, h * 0.92); c.stroke();
      for (let k = 0; k < 4; k++) { c.fillStyle = '#2A2420'; c.fillRect(x + 4, h * (0.32 + k * 0.15), w * 0.05, 5 + ((i + k) % 3) * 3); }
    }
  });
  // a clock
  for (const [c, r, y, d] of [[0xC9A23A, 0.36, 0.14, 0.05], [0xF4F1EA, 0.3, 0.17, 0.02]]) {
    const disc = add(cellar, mesh(G.cyl, c, OFFICE.x - 2.3, CY + 2.7, z + y)); disc.scale.set(r, d, r); disc.rotation.x = Math.PI / 2;
  }
  box(cellar, 0x1B1A1E, OFFICE.x - 2.3, CY + 2.77, z + 0.19, 0.03, 0.18, 0.01, false);
  box(cellar, 0x1B1A1E, OFFICE.x - 2.24, CY + 2.7, z + 0.19, 0.13, 0.03, 0.01, false);
  // brass wall lamps, each a glowing shade on a bracket
  for (const x of [OFFICE.x - 1.0, OFFICE.x + 1.0]) {
    box(cellar, 0xB8862E, x, CY + 3.0, z + 0.2, 0.06, 0.06, 0.3, false);
    add(cellar, mesh(G.cone, LANTERN_PAPER, x, CY + 3.08, z + 0.38)).scale.set(0.18, 0.22, 0.18);
  }
}
/** A thin plank wall, waist high so it never hides a room from the camera: boards on a stone sill, posts, and a rail
 *  along the top. Between two rooms it stands in the gap between their floors (`off` 0.3); round the outside, at the
 *  floor's edge. */
function wall(r: Rect, side: Side, off = 0.1, parent: Object3D = cellar) {
  stands(r, side, off);
  const along = side === 'n' || side === 's', at = line(r, side, off);
  for (const [a0, a1] of spans(r, side)) {
    const mid = (a0 + a1) / 2, len = a1 - a0;
    const put = (y: number, l: number, h: number, t: number, c: number) =>
      along ? box(parent, c, mid, CY + y, at, l, h, t) : box(parent, c, at, CY + y, mid, t, h, l);
    put(0.08, len, 0.16, 0.22, 0x4E4A46);
    put(WALL / 2, len, WALL, 0.12, WOOD);
    put(WALL + 0.04, len + 0.1, 0.08, 0.2, WOOD_DARK);
    const n = Math.max(1, Math.round(len / 1.8));
    for (let k = 0; k <= n; k++) {
      const a = a0 + (len * k) / n;
      along ? box(parent, WOOD_DARK, a, CY + WALL / 2, at, 0.16, WALL + 0.1, 0.16) : box(parent, WOOD_DARK, at, CY + WALL / 2, a, 0.16, WALL + 0.1, 0.16);
    }
  }
}
// the ground under it all, so nothing shows the void past a floor's edge
box(cellar, 0x2A201A, (ARENA.x0 + LIFT_ROOM.x1) / 2, CY - 0.3, (ARENA.z0 + CRAFT.z1) / 2, LIFT_ROOM.x1 - ARENA.x0 + 4, 0.5, CRAFT.z1 - ARENA.z0 + 4, false);
// the rooms: floors, and their walls (tall at the very back, thin and low everywhere else)
// (each room its own: packed earth round the ring and in the grow room, stone flags in the landing and the prep hall,
// parquet in the office, boards in the hearth room)
floor(ARENA, earth); floor(LANDING, flags); floor(OFFICE_ROOM, parquet); floor(KITCHEN, boards); floor(PREP, flags);
tallWall(ARENA, 'n'); tallWall(ARENA, 'w'); wall(ARENA, 's');
officeWall(); wall(OFFICE_ROOM, 'w', 0.3); wall(OFFICE_ROOM, 'e', 0.3);
wall(LANDING, 'n', 0.3); wall(LANDING, 'w', 0.3); wall(LANDING, 'e', 0.3);
wall(KITCHEN, 'n', 0.3); wall(KITCHEN, 'w', 0.3); wall(KITCHEN, 'e', 0.3); wall(KITCHEN, 's', 0.3);
// the workshop, through the hearth room's south wall
floor(CRAFT, boards); wall(CRAFT, 'w'); wall(CRAFT, 'e', 0.3); wall(CRAFT, 's');
wall(PREP, 'e', 0.3); wall(PREP, 's');
// the lift room behind the prep hall's east wall, where nobody goes: just the dumbwaiters
floor(LIFT_ROOM, flags); wall(LIFT_ROOM, 'n', 0.3); wall(LIFT_ROOM, 'e'); wall(LIFT_ROOM, 's', 0.3);
// the prep hall's back: a stone wall with a locked gate the player walks past every day, until the gate opens on the
// grow room behind
stoneWall();
wall(PREP, 'n', 0.3, parts.grow);
{ // the gate, swung open into the grow room
  const t = DOORS.find(d => d.b === 'grow')!;
  bars(parts.grow, (t.x0 + t.x1) / 2, PREP.z0 - 0.4, t.x1 - t.x0 + 0.1, 1.75, Math.PI / 2 - 0.15);
}
floor(GROW, earth, 0.3, parts.grow); tallWall(GROW, 'n', parts.grow); wall(GROW, 'e', 0.1, parts.grow);
// ceiling beams over the arena's back
for (let x = ARENA.x0 + 1; x <= ARENA.x1; x += 2.2) box(cellar, WOOD_DARK, x, CY + 6.3, ARENA.z0 + 0.7, 0.25, 0.3, 2.4, false);
// the fans' tunnels: a doorway through the back wall, framed in timber with the wall carried on over it and a lantern
// over it, into a low dark passage, roofed over so nobody's seen till they come out
for (const t of TUNNELS) {
  const west = t.side === 'w', edge = west ? ARENA.x0 : ARENA.z0;
  /** A box `o` out from the arena's wall (into the tunnel) and `a` along it. */
  const put = (o: number, y: number, a: number, so: number, sy: number, sa: number, c: number, cast = false) =>
    west ? box(cellar, c, edge - o, CY + y, a, so, sy, sa, cast) : box(cellar, c, a, CY + y, edge - o, sa, sy, so, cast);
  const D = TUNNEL_D, W = TUNNEL_W;
  put(D / 2, 0.01, t.at, D, 0.02, W + 0.4, 0x2A1A12);
  for (const s of [-1, 1]) put(D / 2 + 0.1, 1.3, t.at + s * (W / 2 + 0.15), D, 2.6, 0.3, 0x2A201A);
  put(D + 0.1, 1.3, t.at, 0.2, 2.6, W + 0.6, 0x2A201A);
  put(D / 2 + 0.15, 2.7, t.at, D + 0.1, 0.2, W + 0.6, 0x2A201A);
  put(0.7, (FRAME_H + TALL - 0.2) / 2, t.at, 1.2, TALL - 0.2 - FRAME_H, W + 0.1, 0x2A201A);
  for (const s of [-1, 1]) put(0.05, FRAME_H / 2, t.at + s * (W / 2 + 0.05), 0.16, FRAME_H, 0.16, WOOD_DARK, true);
  put(0.05, FRAME_H, t.at, 0.2, 0.2, W + 0.4, WOOD_DARK, true);
  west ? lantern(cellar, edge + 0.2, CY + 2.75, t.at, true) : lantern(cellar, t.at, CY + 2.75, edge + 0.2, true);
}

// ---------- the earth the cellar's dug into ----------
// Everything round the rooms is solid ground, so past a wall there's never an edge of the world: cut level with the low
// walls in front (just under their rails, so each shows as a rim round its room and the two never flicker), and banked
// up to the tall walls' caps behind them, with a rock face where the two meet. It's one mesh over the whole cellar and
// far out past it, with each room left open out to its walls' middles. As in the dungeons of a game seen from above,
// the rooms are the only lit places down here: a step out from a wall the ground turns to rough, broken rock with
// boulders lying about on it, and a few metres out it's gone into the dark, the same near-black as the cellar's murk,
// so there's no edge to see, only the lit rooms in the dark. The fans' tunnels run under the bank, which stays whole
// over them (no rock face cuts across one). While the grow room's a secret, its place is ground like the rest
// (parts.hidden), and it opens up when it's found. Nothing in it moves: it's drawn as it is, with no shadows.
/** The earth's top: in front, under the low walls' rails, and behind the back walls, under their caps. */
export const GROUND = { cut: WALL + 0.06, bank: TALL - 0.02 };
/** The rock round the rooms: dark broken stone, cracked, with flat-topped chips catching the light, drawn wrapped round
 *  so it tiles. */
const dirt = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#3B332C'; c.fillRect(0, 0, w, h);
  const hash = (i: number) => { const x = Math.sin(i * 37.719) * 43758.5453; return x - Math.floor(x); };
  /** A shape drawn wrapped round the tile's edges, so it tiles without a seam. */
  const wrapped = (draw: (dx: number, dy: number) => void) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) draw(dx, dy); };
  for (let i = 0; i < 140; i++) {
    c.fillStyle = i % 3 ? 'rgba(18,13,10,.22)' : 'rgba(120,104,88,.12)';
    const x = hash(i) * w, y = hash(i + 300) * h, r = 6 + hash(i + 600) * 18;
    wrapped((dx, dy) => { c.beginPath(); c.ellipse(x + dx, y + dy, r, r * 0.6, hash(i + 700) * Math.PI, 0, Math.PI * 2); c.fill(); });
  }
  // cracks: short jagged dark lines
  c.strokeStyle = 'rgba(12,9,7,.55)'; c.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    const x = hash(i + 2000) * w, y = hash(i + 2100) * h;
    wrapped((dx, dy) => {
      c.beginPath(); c.moveTo(x + dx, y + dy);
      for (let k = 0; k < 4; k++) c.lineTo(x + dx + (hash(i * 7 + k + 2200) - 0.5) * 34 * (k + 1) / 2, y + dy + (hash(i * 7 + k + 2300) - 0.3) * 26 * (k + 1) / 2);
      c.stroke();
    });
  }
  // chips of stone: angular, lit on top, each with its shadow
  for (let i = 0; i < 44; i++) {
    const x = hash(i + 900) * w, y = hash(i + 1200) * h, r = 3 + hash(i + 1500) * 7, a = hash(i + 1600) * Math.PI;
    const chip = (ox: number, oy: number) => { c.beginPath(); for (let k = 0; k < 5; k++) { const t = a + (k / 5) * Math.PI * 2, rr2 = r * (0.7 + hash(i * 5 + k + 1700) * 0.5); c.lineTo(ox + Math.cos(t) * rr2, oy + Math.sin(t) * rr2 * 0.7); } c.closePath(); c.fill(); };
    c.fillStyle = 'rgba(10,7,5,.5)'; wrapped((dx, dy) => chip(x + dx + 1.5, y + dy + 2.5));
    c.fillStyle = ['#5E564D', '#69604F', '#544C44'][i % 3]; wrapped((dx, dy) => chip(x + dx, y + dy));
  }
});
dirt.tex.wrapS = dirt.tex.wrapT = 1000;
// (both sides drawn: a rock face seen from behind, past a wall's end, still shows as rock; and no light of the rooms'
// on it at all, so none ever seems to come through a wall: its light is drawn into it, a facet at a time, by `bake`)
const EARTH = new MeshBasicMaterial({ map: dirt.tex, vertexColors: true, side: DoubleSide });
/** Where the dim light out in the earth comes from: overhead, a little from the camera's side, so the rock's facets
 *  catch it differently and read as broken stone in the dark. */
const SKY = new Vector3(0.3, 1, 0.5).normalize();
/** Draws that light into a mesh's colours (one face at a time; each corner's colour already its darkness): a face
 *  turned up to it at full, one turned away at a third. */
function bake(g: BufferGeometry) {
  const p = g.attributes.position, c = g.attributes.color, a = new Vector3(), b = new Vector3(), n = new Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i + 1).sub(n.fromBufferAttribute(p, i));
    b.fromBufferAttribute(p, i + 2).sub(n);
    n.crossVectors(a, b).normalize();
    const k = 0.35 + 0.65 * Math.max(0, n.dot(SKY));
    for (let j = i; j < i + 3; j++) c.setXYZ(j, c.getX(j) * k, c.getY(j) * k, c.getZ(j) * k);
  }
}
type Box = { x0: number; x1: number; z0: number; z1: number };
/** A room's hole in the earth: out to its walls' middles. */
const dug = (r: Rect): Box => {
  const o = reach.get(r) ?? {};
  return { x0: r.x0 - (o.w ?? 0.3), x1: r.x1 + (o.e ?? 0.3), z0: r.z0 - (o.n ?? 0.3), z1: r.z1 + (o.s ?? 0.3) };
};
const within = (b: Box, x: number, z: number) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;
/** The earth's two meshes: round the rooms, and the grow room's place while it's a secret. */
export const ground = (() => {
  const rooms = [...Object.values(ROOMS), LIFT_ROOM], holes = rooms.map(dug);
  const grow = holes[rooms.indexOf(GROW)], A = dug(ARENA), O = dug(OFFICE_ROOM);
  /** The fans' tunnels, from the arena's wall out past their far ends. */
  const bores: Box[] = TUNNELS.map(t => {
    const a0 = t.at - TUNNEL_W / 2 - 0.35, a1 = t.at + TUNNEL_W / 2 + 0.35, o = TUNNEL_D + 0.3;
    return t.side === 'w' ? { x0: ARENA.x0 - o, x1: A.x0, z0: a0, z1: a1 } : { x0: a0, x1: a1, z0: ARENA.z0 - o, z1: A.z0 };
  });
  /** Where it's banked up: behind the back walls (west of the arena, as far south as its wall goes; north of it, all the
   *  way along; and behind the office's own wall). */
  const banks: Box[] = [
    { x0: -Infinity, x1: A.x0, z0: -Infinity, z1: ARENA.z1 + 0.3 }, { x0: -Infinity, x1: Infinity, z0: -Infinity, z1: A.z0 },
    { x0: O.x0, x1: O.x1, z0: -Infinity, z1: O.z0 },
  ];
  /** The earth's top at a point (from CY), or null where a room's dug out: banked up, or cut low everywhere else. */
  const top = (x: number, z: number) => holes.some(b => within(b, x, z)) ? null
    : banks.some(b => within(b, x, z)) ? GROUND.bank : GROUND.cut;
  const secret = (x: number, z: number) => within(grow, x, z) && !holes.some(b => b !== grow && within(b, x, z));
  const bored = (x: number, z: number) => bores.some(b => within(b, x, z));
  const bb = holes.reduce((b, h) => ({ x0: Math.min(b.x0, h.x0), x1: Math.max(b.x1, h.x1), z0: Math.min(b.z0, h.z0), z1: Math.max(b.z1, h.z1) }));
  /** How far a point is from a box (0 inside it), and from the nearest room, and from the nearest bank. */
  const off = (b: Box, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  const fromRoom = (x: number, z: number) => Math.min(...holes.map(b => off(b, x, z)));
  const fromBank = (x: number, z: number) => Math.min(...banks.map(b => off(b, x, z)));
  const ease = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  /** Smooth noise from 0 to 1, on a fixed hash (never Math.random: that's the game's), in two sizes of lump. */
  const hash2 = (i: number, j: number) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  const noise = (x: number, z: number) => {
    const i = Math.floor(x), j = Math.floor(z), u = ease(0, 1, x - i), v = ease(0, 1, z - j);
    const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const lumps = (x: number, z: number) => noise(x / 1.6, z / 1.6) * 0.7 + noise(x / 0.55 + 40, z / 0.55) * 0.3;
  /** How much the cut ground's broken up at a point: flat at the walls (and at the bank's foot), rough a few steps out;
   *  and over the grow room's place while it's a secret, flat where it meets the walls round it, rough inside. */
  const rough = (x: number, z: number) => ease(0.35, 2.5, fromRoom(x, z)) * ease(0.3, 1.2, fromBank(x, z));
  const roughHidden = (x: number, z: number) => ease(0.35, 2.5, Math.min(x - grow.x0, grow.x1 - x, z - grow.z0, grow.z1 - z));
  const lit = holes.filter(b => b !== grow);
  // On the camera's side, as in front of a dungeon's rooms seen from above, the rock rises toward the camera a step out
  // past the kerb, in a broken slope up to a ridge, with crags on it, so the bottom of the screen is rock in the dark
  // and never an empty black. None of it ever comes up into the camera's sight of a room: the camera looks down 15 in
  // 13 at the middle of the screen, and less steeply at a room off to one side (as far as 48° off in the widest
  // screen), never under about 0.85 in 1, so all of it stays under 0.7 in 1 up from the nearest room in front of it,
  // looking from any way the camera might.
  /** How steep it all rises, at most; and how far out in front it goes on rising. */
  const SLOPE = 0.7, FRONT = 10;
  const yaw = Math.atan2(-OFF.x, -OFF.z), FAN = [-48, -36, -24, -12, 0, 12, 24, 36, 48].map(a => yaw + a * Math.PI / 180);
  const seen = new Map<number, number>();
  /** How far a point is in front of the rooms, toward the camera: going from it away from the camera, straight or off
   *  to either side as far as the screen's edges, how far until a room (Infinity: none, it's not in front of one: no
   *  room within FRONT of it going about straight away from the camera). */
  const before = (x: number, z: number) => {
    const key = Math.round(x * 100) * 100003 + Math.round(z * 100);
    let t = seen.get(key);
    if (t === undefined) {
      const hit = (a: number, most: number) => {
        const dx = Math.sin(a), dz = Math.cos(a);
        for (let d = 0; d < most; d += 0.25) if (lit.some(b => within(b, x + dx * d, z + dz * d))) return d;
        return Infinity;
      };
      t = Math.min(...FAN.slice(3, 6).map(a => hit(a, FRONT)));
      if (t < Infinity) for (const a of FAN) t = Math.min(t, hit(a, t));
      seen.set(key, t);
    }
    return t;
  };
  /** How much the rock's risen at a point: nothing for the first metre out, then a slope steepening, each lump its own,
   *  to a broken ridge 4 to 5 m up. */
  const rise = (x: number, z: number) => {
    const t = before(x, z);
    if (t === Infinity) return 0;
    const up = Math.max(0, t - 1) * SLOPE * ease(1, 3, t) * (0.65 + 0.35 * lumps(x * 0.6 + 21, z * 0.6 - 7));
    return Math.min(up, 3.8 + 1.2 * lumps(x * 0.4 - 5, z * 0.4 + 13));
  };
  /** The ground's height at a corner, on its square's level: the cut ground lumpy, rising and dipping as it goes out, and
   *  rising toward the camera in front of the rooms. */
  const lift = (x: number, z: number, h: number, inGrow = false) =>
    h === GROUND.cut ? h + (inGrow ? roughHidden(x, z) : rough(x, z)) * (lumps(x, z) - 0.32) * 1.1 + (inGrow ? 0 : rise(x, z)) : h;
  // not lit by the rooms at all (their lights stay inside their walls): just made out right by a wall, and gone into the
  // dark 4 m out, a little uneven; the grow room's place as dark as the rest while it's a secret. The rise in front of
  // the rooms never quite goes: its slope and ridge stay just made out, dark rock against the dark.
  const DARK = 4;
  const fromLit = (x: number, z: number) => Math.min(...lit.map(b => off(b, x, z)));
  const shade = (x: number, z: number) => {
    const k = 1 - ease(0, DARK, fromLit(x, z)), t = before(x, z);
    const near = k * k * (0.75 + 0.5 * lumps(x + 9, z - 4)) * 0.45;
    return t === Infinity ? near : Math.max(near, 0.2 * ease(1.5, 4, t) * (0.7 + 0.6 * lumps(x - 3, z + 8)));
  };
  // the squares' edges: every hole's, tunnel's and bank's; every half metre for the first few metres round the rooms
  // (for the ground's lumps and its fall into the dark), and for longer in front of them, toward the camera (for the
  // rise); then rings out to 42 m (as far as the camera ever sees from anywhere in the cellar, and more)
  const STEP = 0.5, NEAR = DARK + 1, RINGS = [12, 18, 25, 33, 42];
  const every = (a0: number, a1: number) => Array.from({ length: Math.floor((a1 - a0 + NEAR + FRONT) / STEP) + 1 }, (_, i) => Math.round((a0 - NEAR) / STEP) * STEP + i * STEP);
  const edges = (a: number[]) => [...new Set(a.filter(Number.isFinite).map(v => Math.round(v * 1000) / 1000))].sort((p, q) => p - q);
  const xs = edges([...holes, ...bores, ...banks].flatMap(b => [b.x0, b.x1]).concat(RINGS.flatMap(d => [bb.x0 - d, bb.x1 + d]), every(bb.x0, bb.x1)));
  const zs = edges([...holes, ...bores, ...banks].flatMap(b => [b.z0, b.z1]).concat(RINGS.flatMap(d => [bb.z0 - d, bb.z1 + d]), every(bb.z0, bb.z1)));
  /** A mesh's worth of quads, each corner's texture by where it is (3 m a tile) and shaded by how far out it is; lit
   *  facet by facet (the normals worked out from the quads once they're all in), like broken stone. */
  const sheet = (inGrow = false) => {
    const pos: number[] = [], uv: number[] = [], col: number[] = [];
    const quad = (q: number[][], n: number[]) => {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z] = q[i], k = shade(x, z);
        pos.push(x, y, z); col.push(k, k, k);
        uv.push((n[0] ? z : x) / 3, (n[1] ? z : y) / 3);
      }
    };
    return {
      /** The top of a square, each corner at its height. */
      flat: (x0: number, x1: number, z0: number, z1: number, h: number) =>
        quad([[x0, CY + lift(x0, z0, h, inGrow), z0], [x0, CY + lift(x0, z1, h, inGrow), z1], [x1, CY + lift(x1, z1, h, inGrow), z1], [x1, CY + lift(x1, z0, h, inGrow), z0]], [0, 1, 0]),
      /** A rock face across x = `at` (or z, `onX` false), from `a0` to `a1` along it, facing `s` (+1 or -1). */
      face: (onX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, s: number) => {
        const [p, q] = s > 0 ? [a1, a0] : [a0, a1], v = (a: number, y: number) => onX ? [at, CY + y, a] : [a, CY + y, at];
        quad(onX ? [v(p, y0), v(q, y0), v(q, y1), v(p, y1)] : [v(q, y0), v(p, y0), v(p, y1), v(q, y1)], onX ? [s, 0, 0] : [0, 0, s]);
      },
      mesh: (parent: Object3D) => {
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setAttribute('color', new Float32BufferAttribute(col, 3));
        bake(g);
        return add(parent, new Mesh(g, EARTH));
      },
    };
  };
  const open = sheet(), hidden = sheet(true);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x = (xs[i] + xs[i + 1]) / 2, z = (zs[j] + zs[j + 1]) / 2, h = top(x, z);
      if (h !== null) open.flat(xs[i], xs[i + 1], zs[j], zs[j + 1], h);
      else if (secret(x, z)) hidden.flat(xs[i], xs[i + 1], zs[j], zs[j + 1], GROUND.cut);
      // a rock face where it steps up or down to the square east of it, or south of it, facing the lower: the bank's
      // face down to the floor where a room's dug out in front of it (inside the back walls, but closing off their ends;
      // never across a tunnel)
      for (const [onX, x2, z2, at, a0, a1] of [[true, (xs[i + 1] + xs[i + 2]) / 2, z, xs[i + 1], zs[j], zs[j + 1]], [false, x, (zs[j + 1] + zs[j + 2]) / 2, zs[j + 1], xs[i], xs[i + 1]]] as const) {
        if (Number.isNaN(x2) || Number.isNaN(z2)) continue;
        const h2 = top(x2, z2);
        if (h !== null && h2 !== null) { if (h !== h2) open.face(onX, at, a0, a1, Math.min(h, h2), Math.max(h, h2), h > h2 ? 1 : -1); }
        else if (h === GROUND.bank && !bored(x, z)) open.face(onX, at, a0, a1, 0, h, 1);
        else if (h2 === GROUND.bank && !bored(x2, z2)) open.face(onX, at, a0, a1, 0, h2, -1);
      }
    }
  }
  // boulders lying about on the cut ground, a step or two out from the walls (never on one, nor in a tunnel), so its
  // edge in the dark is broken up: on a fixed scatter, each its own size and turn, sunk a little into the ground
  const stones: BufferGeometry[] = [];
  for (let x = bb.x0 - 4; x <= bb.x1 + 4; x += 0.9) {
    for (let z = bb.z0 - 4; z <= bb.z1 + 4; z += 0.9) {
      const r = hash2(Math.round(x * 10), Math.round(z * 10)), px = x + (hash2(Math.round(z * 10), 7) - 0.5) * 0.6, pz = z + (r - 0.5) * 0.6;
      const d = fromRoom(px, pz);
      if (r < 0.62 || d < 0.75 || d > 3.6 || top(px, pz) !== GROUND.cut || fromBank(px, pz) < 0.8 || secret(px, pz) || bored(px, pz)) continue;
      const size = 0.16 + hash2(Math.round(px * 10), Math.round(pz * 10)) * 0.32 * Math.min(1, d / 2);
      const b = new IcosahedronGeometry(1, 0);
      b.scale(size * 1.25, size * 0.75, size); b.rotateY(r * 9); b.translate(px, CY + lift(px, pz, GROUND.cut) + size * 0.35, pz);
      // (as dark as the ground it lies on)
      const k = Math.min(1, shade(px, pz) * 1.3);
      b.setAttribute('color', new Float32BufferAttribute(new Array<number>(b.attributes.position.count * 3).fill(k), 3));
      bake(b);
      stones.push(b);
    }
  }
  if (stones.length) {
    add(cellar, new Mesh(mergeGeometries(stones)!, new MeshBasicMaterial({ color: 0x5A5047, vertexColors: true })));
    stones.forEach(b => b.dispose());
  }
  // crags on the rise in front of the rooms, standing up dark against the dark like the rock of a dungeon's edge in
  // the foreground of a game seen from above: on a fixed scatter, each its own size, lean and turn, the further out the
  // bigger, and never reaching the camera's sight of a room (the rise's rule, from the crag's near side)
  const crags: BufferGeometry[] = [];
  for (let x = bb.x0 - 2; x <= bb.x1 + FRONT; x += 1.5) {
    for (let z = bb.z0; z <= bb.z1 + FRONT; z += 1.5) {
      const r = hash2(Math.round(x * 10) + 501, Math.round(z * 10) - 77), px = x + (hash2(Math.round(z * 10), 31) - 0.5) * 1.2, pz = z + (r - 0.5) * 1.2;
      const t = before(px, pz);
      if (r < 0.45 || t < 2.6 || t > FRONT || top(px, pz) !== GROUND.cut || bored(px, pz) || secret(px, pz)) continue;
      const w = 0.5 + hash2(Math.round(px * 10), Math.round(pz * 10)) * 0.5 + t * 0.06, base = lift(px, pz, GROUND.cut);
      const h = Math.min(0.8 + r * 2.4, SLOPE * (t - w) - 0.2 - (base - GROUND.cut));
      if (h < 0.5) continue;
      const c = new IcosahedronGeometry(1, 1);
      const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) {
        // (each corner pushed in or out on the hash, the same where faces share it, so it stays whole)
        const k = 0.8 + 0.4 * hash2(Math.round(p.getX(i) * 50) + Math.round(p.getZ(i) * 50) * 7 + Math.round(r * 999), Math.round(p.getY(i) * 50));
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      c.scale(w, h / 2, w * 0.8); c.rotateZ((r - 0.7) * 0.4); c.rotateY(r * 11); c.translate(px, CY + base + h / 2 - 0.25, pz);
      const k = 0.3 * ease(1.5, 4, t) * (0.8 + 0.5 * r);
      c.setAttribute('color', new Float32BufferAttribute(new Array<number>(p.count * 3).fill(k), 3));
      bake(c);
      crags.push(c);
    }
  }
  const rocks = add(cellar, new Mesh(mergeGeometries(crags)!, new MeshBasicMaterial({ map: dirt.tex, vertexColors: true })));
  crags.forEach(c => c.dispose());
  // the kerb: a course of rough-cut stone along the earth's edge just past each low wall's rail, the wall's top as seen
  // from above, each block its own length and a little its own height, lit like the rest out here but a good deal
  // lighter, so where every room stops reads at a glance (never along a bank, nor over a tunnel; round the grow room's
  // own walls only once it's found)
  const kerbs = new Map<Object3D, BufferGeometry[]>([[cellar, []], [parts.grow, []]]);
  for (const h of holes) {
    const into = kerbs.get(h === grow ? parts.grow : cellar)!;
    for (const side of ['n', 's', 'w', 'e'] as const) {
      const alongX = side === 'n' || side === 's', s = side === 'n' || side === 'w' ? -1 : 1;
      const edge = side === 'n' ? h.z0 : side === 's' ? h.z1 : side === 'w' ? h.x0 : h.x1;
      // (the courses along x run on past the corners, to close them)
      const [a0, a1] = alongX ? [h.x0 - 0.46, h.x1 + 0.46] : [h.z0, h.z1];
      const o0 = edge + s * 0.1, o1 = edge + s * 0.46;
      for (let a = a0, i = 0; a < a1 - 0.15; i++) {
        const r = hash2(Math.round(a * 10) + i, Math.round(edge * 10) + 77), len = Math.min(a1 - a, 0.5 + r * 0.4), b0 = a + 0.02, b1 = a + len - 0.02;
        a += len;
        const at = (u: number, v: number) => alongX ? [u, v] : [v, u];
        if ([at(b0, o0), at(b1, o0), at(b0, o1), at(b1, o1)].some(([x, z]) => top(x, z) !== GROUND.cut || bored(x, z) || fromBank(x, z) < 0.2)) continue;
        const ht = 0.16 + r * 0.06, [cx, cz] = at((b0 + b1) / 2, (o0 + o1) / 2);
        const k = alongX ? new BoxGeometry(b1 - b0, ht, o1 - o0 - s * 0.03 * r) : new BoxGeometry(o1 - o0, ht, b1 - b0);
        const g = k.toNonIndexed(); k.dispose();
        g.translate(cx, CY + GROUND.cut + 0.02 + r * 0.05 - ht / 2, cz);
        g.setAttribute('color', new Float32BufferAttribute(new Array<number>(g.attributes.position.count * 3).fill(0.7 + 0.25 * hash2(i, Math.round(edge * 10))), 3));
        bake(g);
        into.push(g);
      }
    }
  }
  const KERB = new MeshBasicMaterial({ color: 0x6E6458, vertexColors: true });
  const [kerb, growKerb] = [...kerbs].map(([parent, gs]) => {
    const m = add(parent, new Mesh(mergeGeometries(gs)!, KERB));
    gs.forEach(g => g.dispose());
    return m;
  });
  return { open: open.mesh(cellar), hidden: hidden.mesh(parts.hidden), rocks, kerb, growKerb };
})();

// the doorways: a timber frame in the wall, posts and a lintel
/** Whether a doorway's wall runs east-west (between rooms one behind the other), or north-south (side by side). */
const acrossX = (t: (typeof DOORS)[number]) => !Object.values(ROOMS).some(r => Math.abs(r.x1 - t.x0) < 0.01 || Math.abs(r.x0 - t.x1) < 0.01);
for (const t of DOORS) {
  const ax = acrossX(t), cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, w = (ax ? t.x1 - t.x0 : t.z1 - t.z0) + 0.6;
  const g = t.b === 'grow' ? parts.grow : cellar;
  for (const s of [-1, 1]) {
    ax ? box(g, WOOD_DARK, cx + s * w / 2, CY + FRAME_H / 2, cz, 0.2, FRAME_H, 0.22) : box(g, WOOD_DARK, cx, CY + FRAME_H / 2, cz + s * w / 2, 0.22, FRAME_H, 0.2);
  }
  ax ? box(g, WOOD_DARK, cx, CY + FRAME_H, cz, w + 0.3, 0.2, 0.26) : box(g, WOOD_DARK, cx, CY + FRAME_H, cz, 0.26, 0.2, w + 0.3);
}
/**
 * A room's name on a plaque facing the camera, `w` wide: on the room's back wall (standing on a low one's rail, or high
 * on a tall one), so each room's name is on its own side of the wall it's on; and the office's over its door.
 */
function sign(text: string, x: number, y: number, z: number, parent: Object3D = cellar, w = 1.3) {
  const h = w * 0.3, tex = canvasTex(256, 77, (c, cw, ch) => {
    c.fillStyle = '#15181D'; rr(c, 4, 4, cw - 8, ch - 8, 16); c.fill();
    c.fillStyle = '#F2C14E'; c.font = '800 44px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch / 2 + 3);
  });
  const edge = mat(0x15181D);
  const m = add(parent, new Mesh(new BoxGeometry(w, h, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge]));
  m.position.set(x, CY + y, z);
}
/** On a low wall along a room's back (`off` 0.3: between two rooms), standing on its rail; and just in front of a tall
 *  one's front beams. */
const onLow = (r: Rect) => r.z0 - 0.3 + 0.1, onTall = (r: Rect) => r.z0 - 0.1, onRail = WALL + 0.08 + 0.2;
const mid = (r: Rect) => (r.x0 + r.x1) / 2;
sign('RING', mid(ARENA), 2.85, onTall(ARENA), cellar, 2.2);
sign('KITCHEN', KITCHEN.x1 - 0.95, onRail, onLow(KITCHEN) - 0.1);
// (the workshop's between its doorway and the bowl counter, over the fish crates: any further east and it stands in
// front of the counter's bowls)
sign('WORKSHOP', 8.45, onRail, onLow(CRAFT) - 0.1, cellar, 1.6);
// (the prep hall's stands on the rail of its back wall, the stone one or the plank one after it: the two are as high)
sign('PREP', mid(PREP) - 1.5, onRail, onLow(PREP) - 0.1);
sign('GROW ROOM', mid(GROW), 2.85, onTall(GROW), parts.grow, 2.2);
const door = (to: CellarRoom) => DOORS.find(t => t.b === to)!;
sign('OFFICE', (door('office').x0 + door('office').x1) / 2, FRAME_H + 0.3, LANDING.z0 - 0.15, cellar, 1.15);

// ---------- lanterns along the walls ----------
function lantern(parent: Object3D, x: number, y: number, z: number, red: boolean) {
  const g = add(parent, new Group()); g.position.set(x, y, z);
  add(g, mesh(G.sphere, red ? LANTERN_RED : LANTERN_PAPER)).scale.set(0.24, 0.31, 0.24);
  for (const s of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, 0, s * 0.29, 0)).scale.set(0.13, 0.05, 0.13);
  add(g, mesh(G.rope, 0x1B2430, 0, 0.6, 0)).scale.y = 0.6;
}
for (let x = ARENA.x0 + 1.5, i = 0; x <= ARENA.x1 - 1; x += 2.4, i++) lantern(cellar, x, CY + 3.6, ARENA.z0 + 0.1, i % 2 === 0);
for (let z = ARENA.z0 + 1.5, i = 0; z <= ARENA.z1 - 1; z += 2.4, i++) lantern(cellar, ARENA.x0 + 0.1, CY + 3.6, z, i % 2 === 1);

// ---------- the dohyo ----------
// A raised mound of tamped clay, dark, the layers it was beaten down in showing on its sides, with steps cut into it, a
// square of straw bales round its top and the circle of bales inside it, pale sand on top raked in rings, and the two
// white lines they crouch behind: pale on dark, so the ring stands out from the floor. Over it, it's done up like a
// shrine fair at night (an ennichi): four green bamboo poles where an old ring's four posts stood, each flying a tall
// banner (a nobori), and strings of red and paper lanterns between them along the back and the sides (none along the
// front, where they'd hang across the bout) and up from the back two to a big red lantern with Mr. Fugu's name, high
// over the middle.
/** The sand on the ring's top, `SAND_PX` pixels a metre: pale, raked in rings round the middle, paler still in a band
 *  inside the straw. */
const SAND_PX = 512 / (RING_HALF * 2);
const sandTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#D9BE8A'; c.fillRect(0, 0, w, h);
  const r = RING_R * SAND_PX;
  const g = c.createRadialGradient(w / 2, h / 2, r * 0.6, w / 2, h / 2, r * 1.05);
  g.addColorStop(0, 'rgba(255,246,225,0)'); g.addColorStop(0.8, 'rgba(255,246,225,.4)'); g.addColorStop(1, 'rgba(255,246,225,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.lineWidth = 1.4;
  for (let k = 6, i = 0; k < r * 0.95; k += 7, i++) {
    c.strokeStyle = `rgba(150,105,55,${i % 2 ? 0.1 : 0.17})`;
    c.beginPath(); c.arc(w / 2, h / 2, k, 0, Math.PI * 2); c.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    const x = Math.sin(i * 12.9898) * 43758.5453, y = Math.sin(i * 78.233) * 43758.5453;
    c.fillStyle = i % 3 ? 'rgba(120,80,40,.12)' : 'rgba(255,248,230,.2)';
    c.fillRect((x - Math.floor(x)) * w, (y - Math.floor(y)) * h, 2, 2);
  }
});
/** The mound's sides: dark clay, in the bands it was tamped down in (once round each side). */
const clayTex = canvasTex(256, 64, (c, w, h) => {
  c.fillStyle = '#7E4F2E'; c.fillRect(0, 0, w, h);
  for (let k = 1; k < 6; k++) { c.fillStyle = k % 2 ? 'rgba(40,22,10,.35)' : 'rgba(170,120,80,.18)'; c.fillRect(0, (h * k) / 6 - 1, w, 2); }
  for (let i = 0; i < 500; i++) {
    const x = Math.sin(i * 39.346) * 43758.5453, y = Math.sin(i * 11.135) * 43758.5453;
    c.fillStyle = i % 2 ? 'rgba(30,15,5,.25)' : 'rgba(190,140,90,.2)';
    c.fillRect((x - Math.floor(x)) * w, (y - Math.floor(y)) * h, 2, 2);
  }
});
clayTex.tex.wrapS = 1000; // RepeatWrapping
clayTex.tex.repeat.set(4, 1);
/** A straw bale (tawara) lying along x, `len` long, at x, y, z in `parent`, turned `turn` about y. */
const BALE = new CylinderGeometry(0.13, 0.13, 1, 7);
function bale(parent: Object3D, x: number, y: number, z: number, len: number, turn: number, i: number) {
  const m = add(parent, mesh(BALE, i % 2 ? STRAW : 0xCDB56C, x, y, z, true));
  m.scale.y = len; m.rotation.set(0, turn, Math.PI / 2, 'YXZ');
  return m;
}
/** The four banners, from the north-east pole round by the east: the stable's name, "full house", the bout, and the
 *  underground tournament; and their cloth and lettering. */
const BANNERS: [word: string, cloth: string, ink: string][] = [
  ['河豚部屋', '#26345E', '#F2ECE0'], ['大入', '#B8352A', '#F7EFE0'], ['勝負', '#F2ECE0', '#1C1A18'], ['地下場所', '#26345E', '#F2ECE0'],
];
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
/** A point every 1/`n` of the way along a string hung from `a` to `b`, sagging `drop` in the middle. */
const sag = (a: Vector3, b: Vector3, drop: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, p = a.clone().lerp(b, t); p.y -= drop * 4 * t * (1 - t); return p;
});
{
  const g = add(cellar, new Group()); g.position.copy(RING);
  const d = Math.SQRT2;
  // the mound: four-sided, so a turned cylinder is a square with sloping sides
  const base = add(g, mesh(new CylinderGeometry(RING_HALF * d, (RING_HALF + RING_FOOT) * d, RING_TOP, 4, 1), [new MeshLambertMaterial({ map: clayTex.tex }), mat(CLAY), mat(CLAY)], 0, RING_TOP / 2, 0, true));
  base.rotation.y = Math.PI / 4;
  const top = add(g, new Mesh(new BoxGeometry(RING_HALF * 2 - 0.02, 0.02, RING_HALF * 2 - 0.02), [mat(CLAY), mat(CLAY), new MeshLambertMaterial({ map: sandTex.tex }), mat(CLAY), mat(CLAY), mat(CLAY)]));
  top.position.y = RING_TOP + 0.01; top.receiveShadow = true;
  // steps cut into the clay on each side, the east ones where the wrestlers come up
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 0; k < 2; k++) {
      const out = RING_HALF + RING_FOOT * (k ? 0.7 : 0.25), h = RING_TOP * (k ? 0.36 : 0.7);
      box(g, 0x7A4A2B, x * out, h / 2, z * out, x ? 0.4 : 1.3, h, x ? 1.3 : 0.4);
      bale(g, x * (out + (x ? 0.16 : 0)), h, z * (out + (z ? 0.16 : 0)), 1.2, x ? Math.PI / 2 : 0, k);
    }
  }
  // the square of bales round the top's edge
  const edge = RING_HALF - 0.15, n = 8, len = (edge * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = -edge + len * (i + 0.5);
    bale(g, a, RING_TOP + 0.08, edge, len - 0.04, 0, i); bale(g, a, RING_TOP + 0.08, -edge, len - 0.04, 0, i + 1);
    bale(g, edge, RING_TOP + 0.08, a, len - 0.04, Math.PI / 2, i); bale(g, -edge, RING_TOP + 0.08, a, len - 0.04, Math.PI / 2, i + 1);
  }
  // the circle of bales, with the four at the compass points set out a little (the tokudawara)
  const N = 24;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, r = RING_R + (i % 6 === 0 ? 0.12 : 0);
    bale(g, Math.cos(t) * r, RING_TOP + 0.08, Math.sin(t) * r, ((Math.PI * 2 * RING_R) / N) * 0.92, -t + Math.PI / 2, i);
  }
  // the two white lines they crouch behind
  for (const s of [-1, 1]) box(g, 0xFFFFFF, s * 0.42, RING_TOP + 0.03, 0, 0.08, 0.01, 0.7, false);
  // salt and water at the corners, outside the circle
  const c = RING_HALF - 0.55;
  add(g, mesh(G.cyl, 0x9C6644, c, RING_TOP + 0.16, -c, true)).scale.set(0.2, 0.32, 0.2);
  add(g, mesh(G.cyl, 0xFFFFFF, c, RING_TOP + 0.33, -c)).scale.set(0.17, 0.03, 0.17);
  add(g, mesh(G.cyl, 0x3C6E8F, -c, RING_TOP + 0.15, c, true)).scale.set(0.22, 0.3, 0.22);
  add(g, mesh(G.rope, WOOD, -c + 0.1, RING_TOP + 0.4, c, true)).rotation.z = 0.5;
  // the four bamboo poles, at the corners, in lengths with a knot at each joint; each banner hangs from a crossbar on its
  // pole's outer side, turned a little to the camera
  const POLE = 5.4, at = RING_HALF + RING_FOOT * 0.5, SEG = POLE / 6, tops: Vector3[] = [];
  [[1, -1], [1, 1], [-1, 1], [-1, -1]].forEach(([sx, sz], i) => {
    const x = sx * at, z = sz * at;
    for (let k = 0; k < 6; k++) {
      add(g, mesh(G.cyl, k % 2 ? 0x8FA552 : 0x7E9446, x, (k + 0.5) * SEG, z, true)).scale.set(0.085, SEG, 0.085);
      add(g, mesh(G.cyl, 0x5E6E30, x, (k + 1) * SEG, z)).scale.set(0.1, 0.05, 0.1);
    }
    tops.push(V(x, POLE - 0.1, z));
    const [word, cloth, ink] = BANNERS[i];
    const tex = canvasTex(96, 384, (c, w, h) => {
      c.fillStyle = cloth; c.fillRect(0, 0, w, h);
      c.fillStyle = ink; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
      c.font = `800 ${word.length > 2 ? 64 : 84}px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const step = (h - 60) / word.length;
      [...word].forEach((ch, j) => c.fillText(ch, w / 2, 32 + step * (j + 0.5)));
    });
    const fx = x + sx * 0.48, bar = POLE - 0.45;
    box(g, 0x7E9446, fx, bar + 0.04, z, 0.95, 0.05, 0.05, false);
    const flag = add(g, mesh(new PlaneGeometry(0.72, 2.6), new MeshLambertMaterial({ map: tex.tex, side: DoubleSide }), fx, bar - 1.3, z, true));
    flag.rotation.y = sx * sz > 0 ? 0.35 : -0.35;
  });
  // the lantern strings, and the lanterns on them (two shapes in all: one for the red ones and one for the paper)
  const hub = V(0, POLE + 1.6, 0), lit: Record<'red' | 'paper', BufferGeometry[]> = { red: [], paper: [] };
  const string = (pts: Vector3[]) => add(g, mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.015, 4), 0x1A1614));
  const lamp = (p: Vector3, red: boolean, s: number) => {
    const ball = copyGeo(G.sphere); ball.scale(0.2 * s, 0.26 * s, 0.2 * s); ball.translate(p.x, p.y, p.z);
    lit[red ? 'red' : 'paper'].push(ball);
    for (const k of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, p.x, p.y + k * 0.25 * s, p.z)).scale.set(0.1 * s, 0.05 * s, 0.1 * s);
  };
  for (let i = 0; i < 4; i++) {
    // (the front poles, south-east and south-west, have none up to the big lantern, nor one between them: seen from
    // behind the ring, they'd cross the bout)
    if (tops[i].z < 0) {
      const up = sag(tops[i], hub, 0.5, 8); string(up);
      for (const k of [3, 5]) lamp(up[k].clone().setY(up[k].y - 0.28), k === 3, 0.75);
    }
    if (i === 1) continue;
    const along = sag(tops[i], tops[(i + 1) % 4], 0.7, 12); string(along);
    for (let k = 1; k < 12; k++) lamp(along[k].clone().setY(along[k].y - 0.3), (k + i) % 2 === 0, 0.85);
  }
  add(g, new Mesh(mergeGeometries(lit.red)!, LANTERN_RED));
  add(g, new Mesh(mergeGeometries(lit.paper)!, LANTERN_PAPER));
  lit.red.concat(lit.paper).forEach(b => b.dispose());
  // the big red lantern over the middle, "河豚" (fugu) on both sides, glowing through its paper
  const big = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#C8301F'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 6; y < h; y += 10) c.fillRect(0, y, w, 2);
    c.fillStyle = '#16100D'; c.font = `800 62px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const x of [0.25, 0.75]) c.fillText('河豚', w * x, h / 2);
  });
  const BIG_Y = POLE + 0.95;
  add(g, mesh(G.sphere, new MeshLambertMaterial({ map: big.tex, emissive: 0xFFFFFF, emissiveMap: big.tex, emissiveIntensity: 0.55 }), 0, BIG_Y, 0)).scale.set(0.42, 0.56, 0.42);
  for (const k of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, 0, BIG_Y + k * 0.56, 0)).scale.set(0.22, 0.08, 0.22);
  // its cord, on up past the strings' knot to the dock's beams
  add(g, mesh(G.rope, 0x1A1614, 0, (BIG_Y + 0.6 + hub.y + 2) / 2, 0)).scale.y = hub.y + 2 - BIG_Y - 0.6;
}

// ---------- the stands: crates and planks, in tiers, with a cushioned seat for each fan ----------
/** A seat in the stands: where a fan sits (on the plank), which way they face, and which part it's in (swarm.ts). */
export interface Place { pos: Vector3; h: number; part: 'base' | 'bleachers' | 'tier' | 'vip' }
export const places: Place[] = [];
/** A stand's tiers: three when it's all built, the highest at the back wall, stepping down towards the ring. */
const TIERS = 3;
/** The seats' cushions: deep red, indigo and gold, in turn (colours the cellar already uses). */
const CUSHIONS = [0x8E2B2B, 0x2B3A67, 0xF2C14E];
/** Builds `tiers` of a stand along one wall, from tier `from` (counted out from the wall), into `g`, with places
 *  spaced along each. */
function stand(g: Group, part: Place['part'], along: 'x' | 'z', a0: number, a1: number, wall: number, out: number, from: number, tiers: number, gap: number) {
  for (let i = from; i < from + tiers; i++) {
    const h = 0.3 + (TIERS - 1 - i) * 0.42, at = wall + out * (0.45 + i * 0.85), len = Math.abs(a1 - a0), mid = (a0 + a1) / 2;
    const [cx, cz] = along === 'x' ? [mid, at] : [at, mid];
    box(g, i % 2 ? WOOD : 0x9C6644, cx, CY + h / 2, cz, along === 'x' ? len : 0.85, h, along === 'x' ? 0.85 : len);
    // the crates' slats, on the face towards the ring
    for (let k = -len / 2 + 0.6; k < len / 2; k += 2.1) {
      const [bx, bz] = along === 'x' ? [cx + k, cz + out * 0.43] : [cx + out * 0.43, cz + k];
      box(g, WOOD_DARK, bx, CY + h / 2, bz, along === 'x' ? 0.6 : 0.02, h - 0.02, along === 'x' ? 0.02 : 0.6, false);
    }
    const face = along === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let k = -len / 2 + 0.4, n = 0; k < len / 2 - 0.2; k += gap, n++) {
      const [px, pz] = along === 'x' ? [cx + k, cz] : [cx, cz + k];
      places.push({ pos: V(px, CY + h, pz), h: face, part });
      // a cushion (zabuton) on the plank for each seat, in the ring's colours
      box(g, CUSHIONS[(n + i) % CUSHIONS.length], px, CY + h + 0.03, pz, 0.46, 0.06, 0.46, false);
    }
  }
}
// the back stands (the two back tiers to start, the lowest, front one with the upper tier), and the west stands (the
// bleachers)
const BACK = { a0: RING.x - 5.6, a1: RING.x + 5.6, wall: ARENA.z0 + 0.1 };
const WEST = { a0: RING.z - 3.7, a1: RING.z + 3.7, wall: ARENA.x0 + 0.1 };
const baseStand = add(cellar, new Group());
stand(baseStand, 'base', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 0, 2, 0.62);
stand(parts.bleachers, 'bleachers', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 0, 2, 0.62);
stand(parts.tier, 'tier', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 2, 1, 0.62);
stand(parts.tier, 'tier', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 2, 1, 0.62);
// the VIP boxes: box seats (masu-seki) right by the ring, on its south side: a low platform with a red skirt, split
// by rails into a box for each pair, a cushion for each seat, and a sake flask and two cups in every other box
const VIP_Z = RING.z + RING_HALF + RING_FOOT + 0.7;
{
  const H = 0.4, w = 7.2;
  box(parts.vip, WOOD_DARK, RING.x, CY + H / 2, VIP_Z, w, H, 0.9);
  box(parts.vip, WOOD, RING.x, CY + H + 0.01, VIP_Z, w - 0.04, 0.02, 0.86, false);
  box(parts.vip, 0xC0392B, RING.x, CY + H * 0.55, VIP_Z + 0.455, w - 0.1, H * 0.6, 0.02, false);
  for (const s of [-1, 1]) box(parts.vip, WOOD_DARK, RING.x, CY + H + 0.07, VIP_Z + s * 0.42, w, 0.14, 0.06);
  for (let j = 0; j <= 4; j++) box(parts.vip, WOOD_DARK, RING.x - w / 2 + j * 1.8, CY + H + 0.07, VIP_Z, 0.06, 0.14, 0.9);
  for (let j = 0; j < 4; j += 2) {
    const x = RING.x - 2.7 + j * 1.8;
    add(parts.vip, mesh(G.cyl, 0xF4F1EA, x, CY + H + 0.12, VIP_Z - 0.25)).scale.set(0.06, 0.22, 0.06);
    for (const s of [-1, 1]) add(parts.vip, mesh(G.cyl, 0xF4F1EA, x + s * 0.14, CY + H + 0.04, VIP_Z - 0.25)).scale.set(0.035, 0.05, 0.035);
  }
}
for (let i = 0; i < 8; i++) {
  const x = RING.x - 3.15 + i * 0.9, z = VIP_Z;
  box(parts.vip, i % 2 ? 0x8E2B2B : 0xF2C14E, x, CY + 0.44, z + 0.05, 0.46, 0.07, 0.46, false);
  places.push({ pos: V(x, CY + 0.25, z - 0.05), h: Math.PI, part: 'vip' });
}
/** Keeps a spectator's place hidden until it's built. */
export const placeBuilt = (p: Place) => p.part === 'base' || parts[p.part].visible;

// ---------- the arena's east side: the soup bar, the gong and the cashier's window ----------
/** How high the stew stands in the soup bar's pot (ringKitchen.ts puffs its steam from there). */
export const BAR_STEW = BAR.top + 0.47;
{
  // The soup bar: a round counter the fans gather round, knocked together from what was lying about down here. Its
  // body is old barrel staves in two iron hoops, with a straw rope round under the lip and a cigarette-burnt indigo
  // cloth hung over the front; its top a battered sheet of zinc with a dark wooden rim. On the east, facing the hearth
  // room's door, a gap in it (the hatch, its flap lifted), where the player stands to set the bowls out round its top.
  // In the middle, on a drum, the bar's own pot of chanko. Over it a cartwheel hangs from an arm off a crooked post at
  // the hatch, red and paper lanterns round its rim, and the price board is nailed to the post, facing the room.
  // Upturned buckets and a crate are tucked under the lip for stools, and inside the hatch stands a crate of beer.
  const g = add(cellar, new Group()); g.position.set(BAR.x, CY, BAR.z);
  // (round the bar, `a` is the way from its middle, from the east towards the south: x = cos a, z = sin a; the hatch is
  // the GAP either side of the east)
  const R = BAR.r, TOP = BAR.top, GAP = 0.32, ARC = Math.PI * 2 - GAP * 2, SR = 0.92;
  const at = (a: number, r: number) => [Math.cos(a) * r, Math.sin(a) * r] as const;
  /** A flat ring round the bar (a hoop, the rope, the rim) `r` out and `tube` thick, at `y`, open at the hatch. */
  const ring = (c: number, r: number, tube: number, y: number, cast = false) =>
    add(g, mesh(new TorusGeometry(r, tube, 5, 40, ARC), c, 0, y, 0, cast)).rotation.set(Math.PI / 2, 0, GAP);
  // the staves, a little different in shade and height on a fixed pattern, round a dark core, and the hoops round them
  add(g, mesh(new CylinderGeometry(0.55, 0.55, TOP - 0.05, 14), WOOD_DARK, 0, (TOP - 0.05) / 2, 0));
  const STAVES = 26;
  for (let i = 0; i < STAVES; i++) {
    const a = GAP + (i + 0.5) * ARC / STAVES, [x, z] = at(a, SR - 0.03), h = TOP - 0.06 - ((i * 7) % 3) * 0.02;
    box(g, [WOOD, 0x9C6644, 0x7A4A32][i % 3], x, h / 2, z, 0.06, h, 0.21).rotation.y = -a;
  }
  ring(IRON, SR, 0.018, 0.2);
  ring(IRON, SR, 0.018, 0.68);
  // the hatch's posts: a short one on its south side, and on its north the crooked post that holds the lanterns up
  { const [x, z] = at(GAP, SR - 0.03); log(g, WOOD_DARK, x, TOP / 2, z, 0.4, TOP); }
  const [px, pz] = at(-GAP, SR - 0.03), POST = 2.85;
  log(g, WOOD_DARK, px, POST / 2, pz, 0.45, POST).rotation.z = 0.03;
  // the top: a battered sheet of zinc with a dark wooden rim, dented here and there, edged where the hatch cuts it
  add(g, mesh(new CylinderGeometry(R, R, 0.05, 32, 1, false, Math.PI / 2 + GAP, ARC), 0x9AA2A6, 0, TOP - 0.025, 0, true));
  ring(WOOD_DARK, R, 0.035, TOP - 0.02, true);
  for (const s of [-1, 1]) {
    const [x, z] = at(s * GAP, (R + 0.55) / 2);
    box(g, WOOD_DARK, x, TOP - 0.02, z, R - 0.55, 0.07, 0.04).rotation.y = -s * GAP;
  }
  for (const [a, r, k] of [[1.6, 0.86, 0.09], [2.7, 0.5, 0.07], [3.9, 0.95, 0.1], [4.9, 0.72, 0.08]]) {
    const [x, z] = at(a, r);
    add(g, mesh(G.cyl, 0x7C8489, x, TOP + 0.002, z)).scale.set(k, 0.004, k * 0.8);
  }
  // the hatch's flap, lifted on its hinge
  { const a = GAP + 0.03, [x, z] = at(a, (R + 0.55) / 2); box(g, 0x8C949A, x, TOP + 0.3, z, R - 0.55, 0.6, 0.03).rotation.y = -a; }
  // the straw rope round under the lip, and the cloth hung from it over the front: indigo, ragged, burnt by cigarettes
  ring(STRAW, 0.95, 0.04, TOP - 0.1);
  for (let i = 0; i < 6; i++) {
    const a = 1.75 + i * 0.26, h = 0.42 - (i % 2) * 0.05 - (i === 4 ? 0.04 : 0), [x, z] = at(a, 0.99);
    box(g, 0x2B3A67, x, TOP - 0.1 - h / 2, z, 0.015, h, 0.25, false).rotation.y = -a;
  }
  for (const [a, y] of [[1.9, 0.62], [2.35, 0.75], [2.62, 0.58], [3.1, 0.7]]) {
    const [x, z] = at(a, 1.0);
    box(g, 0x15181D, x, y, z, 0.01, 0.035, 0.04, false).rotation.y = -a;
  }
  // stools tucked under the lip: two upturned buckets (one tin, one red) and a crate
  for (const [a, c] of [[1.35, 0x8C959C], [3.75, 0xB03A2E]]) {
    const [x, z] = at(a, SR + 0.15);
    add(g, mesh(new CylinderGeometry(0.12, 0.15, 0.36, 12), c, x, 0.18, z, true));
    add(g, mesh(new TorusGeometry(0.15, 0.015, 4, 14), 0x5F676C, x, 0.02, z)).rotation.x = Math.PI / 2;
  }
  {
    const a = 4.6, [x, z] = at(a, SR + 0.15);
    box(g, WOOD, x, 0.16, z, 0.3, 0.32, 0.3).rotation.y = -a;
    for (const y of [0.08, 0.24]) box(g, WOOD_DARK, x + Math.cos(a) * 0.155, y, z + Math.sin(a) * 0.155, 0.01, 0.05, 0.3, false).rotation.y = -a;
  }
  // inside the hatch, a crate of beer; on the top by it, a stack of empty bowls, and on its other side, an ashtray
  box(g, 0xC98A1E, 0.74, 0.13, 0, 0.28, 0.26, 0.38);
  for (let i = 0; i < 6; i++) add(g, mesh(G.cyl, 0x5A3418, 0.68 + (i % 2) * 0.12, 0.3, -0.12 + Math.floor(i / 2) * 0.12)).scale.set(0.035, 0.12, 0.035);
  const empty = new CylinderGeometry(0.15, 0.09, 0.08, 12);
  { const [x, z] = at(0.62, 0.9); for (let i = 0; i < 4; i++) add(g, mesh(empty, 0xC0392B, x, TOP + 0.04 + i * 0.07, z)); }
  {
    const [x, z] = at(-0.65, 0.97);
    add(g, mesh(G.cyl, 0x6E777C, x, TOP + 0.01, z)).scale.set(0.07, 0.02, 0.07);
    for (const s of [-1, 1]) {
      const butt = add(g, mesh(G.cyl, 0xE8E0D0, x + s * 0.02, TOP + 0.03, z + s * 0.015));
      butt.scale.set(0.012, 0.05, 0.012); butt.rotation.set(0, s, Math.PI / 2);
    }
  }
  // the drum in the middle, and the bar's pot on it, full of chanko, with a ladle in it
  add(g, mesh(new CylinderGeometry(0.4, 0.43, 0.2, 18), WOOD_DARK, 0, TOP + 0.1, 0, true));
  const py = TOP + 0.2, pot = add(g, new Group());
  pot.position.set(0, py, 0.04);
  add(pot, mesh(new CylinderGeometry(0.34, 0.27, 0.3, 18, 1, true), IRON, 0, 0.15, 0, true));
  add(pot, mesh(new CylinderGeometry(0.31, 0.25, 0.3, 18, 1, true), new MeshLambertMaterial({ color: 0x1C1C20, side: BackSide }), 0, 0.15, 0));
  add(pot, mesh(new TorusGeometry(0.34, 0.035, 5, 20), 0x3E3E44, 0, 0.3, 0)).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) add(pot, mesh(new TorusGeometry(0.07, 0.022, 4, 8), 0x3E3E44, s * 0.37, 0.24, 0)).rotation.y = Math.PI / 2;
  add(pot, mesh(new CylinderGeometry(0.32, 0.32, 0.02, 18), 0xC9803A, 0, BAR_STEW - py, 0));
  for (const [c, x, z, sx, sy, sz] of [
    [0x8FC46A, -0.12, 0.08, 0.13, 0.04, 0.08], [0x8FC46A, 0.1, -0.12, 0.12, 0.04, 0.07], [0xF4F1EA, 0.13, 0.1, 0.07, 0.06, 0.07],
    [0xF4F1EA, -0.08, -0.1, 0.07, 0.06, 0.07], [0xE8833A, 0.02, 0.17, 0.05, 0.02, 0.05],
  ]) add(pot, mesh(c === 0xF4F1EA ? G.box : G.sphere, c, x, BAR_STEW - py + 0.015, z)).scale.set(sx, sy, sz);
  const ladle = add(pot, new Group()); ladle.position.set(-0.2, 0.32, -0.12); ladle.rotation.set(0.3, 0, 0.55);
  add(ladle, mesh(G.rope, WOOD, 0, 0.3, 0)).scale.set(1.2, 0.65, 1.2);
  add(ladle, mesh(G.sphere, 0x9AA4AC, 0, -0.04, 0)).scale.set(0.09, 0.05, 0.09);
  // the arm off the post's top over the middle, braced, and the cartwheel hung from it, a lantern at each spoke's end
  const arm = add(g, new Group()), len = Math.hypot(px, pz);
  arm.position.set(px - 0.04, POST - 0.08, pz); arm.rotation.y = -Math.atan2(-pz, -px);
  box(arm, WOOD_DARK, len / 2, 0, 0, len + 0.12, 0.09, 0.09);
  box(arm, WOOD_DARK, 0.2, -0.2, 0, 0.56, 0.06, 0.06).rotation.z = Math.PI / 4;
  add(arm, mesh(G.rope, 0x3A2A20, len, -0.17, 0)).scale.y = 0.34;
  const WHEEL = POST - 0.42;
  add(g, mesh(new TorusGeometry(1.2, 0.035, 5, 36), WOOD_DARK, 0, WHEEL, 0)).rotation.x = Math.PI / 2;
  for (let k = 0; k < 3; k++) box(g, WOOD_DARK, 0, WHEEL, 0, 2.4, 0.04, 0.05, false).rotation.y = k * Math.PI / 3;
  add(g, mesh(G.cyl, WOOD_DARK, 0, WHEEL, 0)).scale.set(0.09, 0.12, 0.09);
  for (let k = 0; k < 6; k++) {
    const [x, z] = at(k * Math.PI / 3, 1.2), y = WHEEL - 0.32;
    add(g, mesh(G.sphere, k % 3 === 1 ? LANTERN_PAPER : LANTERN_RED, x, y, z)).scale.set(0.15, 0.19, 0.15);
    for (const s of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, x, y + s * 0.18, z)).scale.set(0.08, 0.03, 0.08);
    add(g, mesh(G.rope, 0x1B2430, x, y + 0.25, z)).scale.y = 0.14;
  }
  // the price board, an old plank painted by hand (a bowl's price is in chips), nailed to the post facing the room
  const tex = canvasTex(256, 144, (c, w) => {
    c.fillStyle = '#B98C55'; c.fillRect(0, 0, w, 144);
    c.fillStyle = 'rgba(70,40,20,.35)';
    for (let i = 0; i < 5; i++) c.fillRect(0, 14 + i * 28 + ((i * 7) % 9), w, 2);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#1B1A1E'; c.font = '800 58px ' + FONT; c.fillText('ちゃんこ', w / 2, 52);
    c.fillStyle = '#B0250F'; c.font = '800 38px ' + FONT; c.fillText('一杯 🐡', w / 2, 110);
  });
  const edge = mat(0x6B4A2E), FACE = 0.4;
  const sgn = add(g, new Mesh(new BoxGeometry(0.78, 0.44, 0.03), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge]));
  sgn.position.set(px + Math.sin(FACE) * 0.09, 1.85, pz + Math.cos(FACE) * 0.09); sgn.rotation.y = FACE;
}
/** The soup bar, for walking round: its circle (its top's, and a walker's width) as boxes, each a little narrower the
 *  further out from its middle; on the hatch's side they stop short, so the player can step up into it. */
const BAR_BOXES = ([[-0.075, 1.275, 0.3], [0, 1.2, 0.7], [0, 0.98, 0.98], [0, 0.7, 1.2], [0, 0.3, 1.35]] as const)
  .map(([dx, hx, hz]): [number, number, number, number] => [BAR.x + dx, BAR.z, hx, hz]);
/** Straw-wrapped sake barrels (komodaru), stacked against the east wall between the landing's door and the soup bar, the
 *  way a shrine stacks the ones it's given. */
const KOMO = { x: ARENA.x1 - 0.35, z: 1.95 };
{
  // two wraps, each with its crest on the side facing the arena and the one facing the camera
  const wrap = (i: number) => canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#D2B878'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 90; k++) {
      const x = Math.sin((k + i * 90) * 12.9898) * 43758.5453;
      c.fillStyle = k % 3 ? 'rgba(130,95,40,.35)' : 'rgba(255,240,190,.4)'; c.fillRect((x - Math.floor(x)) * w, 0, 1.4, h);
    }
    c.fillStyle = '#1A1614'; c.fillRect(0, 16, w, 5); c.fillRect(0, h - 21, w, 5);
    c.font = `800 36px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    // (round the barrel from the south: west is three quarters of the way, and the south's at both edges)
    for (const x of [0, 0.75, 1]) {
      c.fillStyle = i ? '#B8352A' : '#1E2C55'; c.beginPath(); c.arc(w * x, h / 2, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#F7EFE0'; c.fillText(i ? '酒' : '鰒', w * x, h / 2 + 2);
    }
  });
  const geos: BufferGeometry[][] = [[], []];
  let n = 0;
  for (const [row, y] of [[4, 0.3], [3, 0.9], [2, 1.5]]) {
    for (let k = 0; k < row; k++) {
      const b = new CylinderGeometry(0.3, 0.3, 0.6, 14);
      b.translate(KOMO.x, CY + y, KOMO.z + (k - (row - 1) / 2) * 0.62);
      geos[n++ % 2].push(b);
    }
  }
  geos.forEach((gs, i) => { add(cellar, mesh(mergeGeometries(gs)!, new MeshLambertMaterial({ map: wrap(i).tex }), 0, 0, 0, true)); gs.forEach(b => b.dispose()); });
}
/** The gong: a bronze disc hung in a black frame (gong.ts swings it). */
export const gongDisc = new Group();
{
  const g = add(cellar, new Group()); g.position.set(GONG.x, CY, GONG.z); g.rotation.y = -Math.PI / 2;
  for (const s of [-1, 1]) box(g, 0x1B1A1E, s * 0.85, 1.25, 0, 0.12, 2.5, 0.12);
  box(g, 0x1B1A1E, 0, 2.5, 0, 1.95, 0.14, 0.16);
  box(g, 0x8E2B2B, 0, 2.62, 0, 2.1, 0.08, 0.22);
  gongDisc.position.set(0, 2.38, 0);
  g.add(gongDisc);
  const disc = add(gongDisc, mesh(new CylinderGeometry(0.62, 0.62, 0.05, 24), new MeshLambertMaterial({ color: 0xC9A23A, emissive: 0x5A3A0A }), 0, -0.95, 0, true));
  disc.rotation.x = Math.PI / 2;
  add(gongDisc, mesh(new TorusGeometry(0.62, 0.04, 6, 24), 0x8A6A1E, 0, -0.95, 0));
  add(gongDisc, mesh(G.cyl, 0xE0BE5A, 0, -0.95, 0.03)).scale.set(0.2, 0.02, 0.2);
  for (const s of [-1, 1]) add(gongDisc, mesh(G.rope, 0x3A2A20, s * 0.3, -0.17, 0)).scale.y = 0.32;
  // the mallet, leaning on the frame
  const m = add(g, new Group()); m.position.set(1.05, 0.55, 0.1); m.rotation.z = 0.25;
  add(m, mesh(G.rope, WOOD, 0, 0, 0)).scale.set(1.4, 1.1, 1.4);
  add(m, mesh(G.sphere, 0xC0392B, 0, 0.58, 0)).scale.setScalar(0.12);
}
/** The cashier's window, where the chips go: a cage window like a bookie's, its counter stacked with Fugu Chips. */
{
  const g = add(cellar, new Group()); g.position.set(CASHIER.x, CY, CASHIER.z); g.rotation.y = -Math.PI / 2;
  box(g, WOOD, 0, 0.5, 0, 2.2, 1, 0.8);
  box(g, 0x6B4130, 0, 1.02, 0.08, 2.3, 0.06, 1.0);
  for (let x = -1.05; x <= 1.06; x += 0.21) add(g, mesh(G.rope, 0x9AA4AC, x, 1.6, 0.38)).scale.y = 1.1;
  box(g, 0x9AA4AC, 0, 2.15, 0.38, 2.2, 0.05, 0.05);
  box(g, 0x2A201A, 0, 1.6, -0.45, 2.2, 2.2, 0.1, false);
  // stacks of chips: red, stamped with a gold puffer
  for (let i = 0; i < 6; i++) {
    const h = 3 + ((i * 5) % 4);
    for (let k = 0; k < h; k++) add(g, mesh(G.cyl, k % 2 ? 0xC0392B : 0xE8B04A, -0.7 + i * 0.28, 1.08 + k * 0.03, 0.25)).scale.set(0.11, 0.028, 0.11);
  }
  const tex = canvasTex(256, 80, (c, w, h) => {
    c.fillStyle = '#15181D'; rr(c, 4, 4, w - 8, h - 8, 16); c.fill();
    c.fillStyle = '#F2C14E'; c.font = '800 44px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CHIPS 🐡', w / 2, h / 2 + 3);
  });
  const edge = mat(0x15181D);
  add(g, new Mesh(new BoxGeometry(1.5, 0.46, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge])).position.set(0, 2.55, 0.3);
}

// ---------- the hearth room: the hearth and its pot, the ledge, the bowl counter ----------
{
  // a short indigo curtain (noren) in three strips hanging in the hearth room's doorway from the landing, with a white
  // crest on the middle one
  const t = door('kitchen'), span = t.x1 - t.x0 + 0.6, x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2 + 0.06;
  for (let i = -1; i <= 1; i++) {
    box(cellar, 0x2B3A67, x + i * span / 3, CY + FRAME_H - 0.35, z, span / 3 - 0.04, 0.5, 0.02, false).receiveShadow = false;
  }
  box(cellar, 0xF4F1EA, x, CY + FRAME_H - 0.32, z + 0.02, 0.16, 0.16, 0.01, false);

  // the hearth: a long clay stove with a glowing fire-mouth under the pot, and a prep counter behind it
  const H = HEARTH, g = add(cellar, new Group()); g.position.set(H.x, CY, H.z);
  box(g, 0x9A5B3E, 0, H.h / 2, 0, H.w, H.h, H.d);
  box(g, 0x5E3B2C, 0, H.h + 0.04, 0, H.w + 0.12, 0.08, H.d + 0.12);
  box(g, 0x7E4A33, 0, 0.06, 0, H.w + 0.2, 0.12, H.d + 0.2);
  // the ledge along its front, where each ingredient waits in its own tray
  box(g, 0x5E3B2C, 0, H.h * 0.75, H.d / 2 + 0.3, H.w - 0.2, 0.06, 0.6);
  for (const dx of [-0.7, 0, 0.7]) box(g, 0x3E2A20, dx, H.h * 0.75 + 0.04, H.d / 2 + 0.3, 0.6, 0.03, 0.5, false);
  const EMBER = glow(0xFF7A2A, 0xFF5A10);
  box(g, 0x1E1410, 0, 0.3, H.d / 2 + 0.005, 0.62, 0.36, 0.02, false);
  box(g, EMBER, 0, 0.2, H.d / 2 + 0.012, 0.46, 0.12, 0.02, false);
  for (const x of [-0.12, 0.1]) add(g, mesh(G.sphere, EMBER, x, 0.3, H.d / 2 + 0.02)).scale.set(0.08, 0.13, 0.03);
  add(g, mesh(new TorusGeometry(0.72, 0.05, 6, 24), IRON, 0, H.h + 0.09, 0)).rotation.x = Math.PI / 2;
  // the prep counter behind the hearth, against the wall: a board, a fish, cabbages and a knife
  const back = (KITCHEN.z0 - 0.3 + H.z - H.d / 2) / 2 - H.z;
  box(g, WOOD, 0, 0.45, back, H.w, 0.9, 0.35);
  box(g, 0xE6CFA0, -0.9, 0.92, back, 0.7, 0.04, 0.3);
  add(g, mesh(G.sphere, 0xE59A6B, -0.95, 0.98, back, true)).scale.set(0.28, 0.07, 0.1);
  box(g, 0xC9CDD2, -0.55, 0.95, back + 0.05, 0.26, 0.01, 0.05, false);
  for (const x of [0.3, 0.6, 1.25]) add(g, mesh(G.sphere, 0x8FC46A, x, 1.02, back, true)).scale.set(0.15, 0.13, 0.15);
}
/** The big iron pot of chanko on the hearth: stew to the brim, full of cabbage, tofu, carrot and fish, with a ladle in
 *  it (ringKitchen.ts adds the steam, and colours the stew by what's in it). */
export const potStew = new MeshLambertMaterial({ color: 0xC9803A });
export const potMesh = (() => {
  const g = add(cellar, new Group()); g.position.set(POT.x, CY, POT.z);
  const y = HEARTH.h + 0.08;
  // open, so the stew can sink inside it: an iron shell, its dark inside and a floor
  add(g, mesh(new CylinderGeometry(0.86, 0.66, 0.56, 20, 1, true), IRON, 0, y + 0.28, 0, true));
  add(g, mesh(new CylinderGeometry(0.82, 0.62, 0.56, 20, 1, true), new MeshLambertMaterial({ color: 0x1C1C20, side: BackSide }), 0, y + 0.28, 0));
  add(g, mesh(new CylinderGeometry(0.62, 0.62, 0.02, 20), 0x1C1C20, 0, y + 0.03, 0));
  add(g, mesh(new TorusGeometry(0.85, 0.06, 6, 24), 0x3E3E44, 0, y + 0.56, 0)).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) add(g, mesh(new TorusGeometry(0.12, 0.035, 5, 10), 0x3E3E44, s * 0.92, y + 0.44, 0)).rotation.y = Math.PI / 2;
  // the stew and what's in it, which rise and fall with the bowls waiting (ringKitchen moves this)
  const fill = add(g, new Group()); fill.name = 'potFill';
  add(fill, mesh(new CylinderGeometry(0.8, 0.8, 0.02, 20), potStew, 0, POT_TOP, 0));
  // what's in it, on a fixed scatter
  const bits: [number, number, number, number][] = [
    [0x8FC46A, 0.32, 0.05, 0.16], [0x8FC46A, 0.28, 0.05, 0.14], [0x8FC46A, 0.3, 0.05, 0.15], // cabbage
    [0xF4F1EA, 0.13, 0.11, 0.13], [0xF4F1EA, 0.13, 0.11, 0.13], [0xF4F1EA, 0.13, 0.11, 0.13], // tofu
    [0xE8833A, 0.1, 0.04, 0.1], [0xE8833A, 0.1, 0.04, 0.1], [0xE8833A, 0.1, 0.04, 0.1], // carrot
    [0xF2A68A, 0.18, 0.07, 0.12], [0xF2A68A, 0.18, 0.07, 0.12], // fish
  ];
  bits.forEach(([c, sx, sy, sz], i) => {
    const a = i * 2.4, r = 0.18 + ((i * 0.37) % 0.45), tofu = c === 0xF4F1EA;
    const m = add(fill, mesh(tofu ? G.box : G.sphere, c, Math.cos(a) * r, POT_TOP + 0.02, Math.sin(a) * r));
    m.scale.set(sx, sy, sz); m.rotation.y = a;
  });
  // the ladle, leaning on the rim
  const ladle = add(g, new Group()); ladle.position.set(0.55, POT_TOP + 0.05, -0.35); ladle.rotation.z = -0.6;
  add(ladle, mesh(G.rope, WOOD, 0, 0.5, 0)).scale.set(1.3, 1.1, 1.3);
  add(ladle, mesh(G.sphere, 0x9AA4AC, 0, -0.02, 0)).scale.set(0.13, 0.07, 0.13);
  return g;
})();
{
  // the counter the bowls come out on: a low table against the east wall in the corner south of the prep hall's door, a
  // cloth along it for the bowls, and on a shelf underneath, the empty ones stacked
  const t = add(cellar, new Group()); t.position.set(COUNTER.x, CY, COUNTER.z);
  box(t, WOOD, 0, 0.76, 0, 1.0, 0.08, 1.4);
  for (const [x, z] of [[-0.42, -0.6], [0.42, -0.6], [-0.42, 0.6], [0.42, 0.6]]) box(t, WOOD_DARK, x, 0.36, z, 0.09, 0.72, 0.09);
  box(t, 0x2B3A67, 0.05, 0.81, 0, 0.75, 0.01, 1.3, false);
  box(t, WOOD, 0.05, 0.22, 0, 0.8, 0.05, 1.2);
  for (const z of [-0.3, 0.25]) {
    for (let i = 0; i < 4; i++) add(t, mesh(new CylinderGeometry(0.15, 0.09, 0.08, 12), 0xC0392B, 0.1, 0.29 + i * 0.07, z));
  }
}

// ---------- the lift room: the two dumbwaiters, their wooden chutes, and the stores that feed the prep hall ----------
/** The lift room's woods: cedar boards in two tones, pale hinoki for the trays, bamboo, and straw rope; and the fish's
 *  crushed ice and salt. */
const CEDAR = 0xB98B5A, CEDAR_DARK = 0xA67A4C, HINOKI = 0xD9B98A, BAMBOO = 0xC9A86A, BAMBOO_DARK = 0xA88850;
const ROPE = 0xCDB56C, ICE = 0xD8EBF0, SALT = 0xF4F4EE;
/** A board hung on a store from a loop of straw rope, its line's character brushed on it in ink (米, 魚), and the
 *  maker's red seal in the corner. */
function inkBoard(parent: Object3D, ch: string, y: number, z: number) {
  const t = canvasTex(96, 128, (c, w, h) => {
    c.fillStyle = '#E2C9A0'; c.fillRect(0, 0, w, h);
    // the grain, down the board
    c.strokeStyle = 'rgba(140,96,56,.3)'; c.lineWidth = 2;
    for (const gx of [12, 30, 49, 67, 84]) { c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 5, h * 0.35, gx - 5, h * 0.65, gx + 2, h); c.stroke(); }
    c.fillStyle = '#1B1612'; c.font = '900 72px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, w / 2, h / 2 - 8);
    c.fillStyle = '#B23A2E'; c.fillRect(w - 28, h - 30, 16, 16);
  });
  const edge = mat(CEDAR_DARK);
  const b = add(parent, new Mesh(new BoxGeometry(0.22, 0.29, 0.025), [edge, edge, edge, edge, new MeshLambertMaterial({ map: t.tex }), edge]));
  b.position.set(0, y, z);
  for (const s of [-1, 1]) {
    const r = add(parent, mesh(G.rope, ROPE, s * 0.05, y + 0.2, z - 0.005)); r.scale.set(0.6, 0.13, 0.6); r.rotation.z = s * 0.6;
  }
  add(parent, mesh(G.sphere, WOOD_DARK, 0, y + 0.26, z - 0.01)).scale.setScalar(0.018);
}
/** The short trough at a store's foot, from its west side down into the tray by the wall, with the little gate that
 *  lets out what's taken from the tray (in the store's own space: `x` its west side, `y` where the trough leaves it). */
function spout(parent: Object3D, x: number, y: number) {
  const g = add(parent, new Group()); g.position.set(x - 0.1, y - 0.025, 0); g.rotation.z = 0.24;
  box(g, CEDAR_DARK, 0, 0, 0, 0.22, 0.02, 0.16);
  for (const s of [-1, 1]) box(g, WOOD_DARK, 0, 0.03, s * 0.08, 0.22, 0.07, 0.015);
  // (the gate: a board in two grooves, pulled up a crack, and its peg)
  for (const s of [-1, 1]) box(parent, WOOD_DARK, x - 0.02, y + 0.03, s * 0.1, 0.03, 0.14, 0.03);
  box(parent, CEDAR, x - 0.025, y + 0.06, 0, 0.02, 0.1, 0.18);
  add(parent, mesh(G.cyl, WOOD_DARK, x - 0.045, y + 0.09, 0)).scale.set(0.015, 0.05, 0.015);
}
{
  // The dumbwaiters from the restaurant's kitchen upstairs, rice down one and fish down the other: tall timber shafts
  // up into the dark, open at the front (to the west) down to a hatch at chest height and boarded in below it, their
  // chains and the wheels they go round at the top and bottom (ringKitchen.ts sends their trays round, loaded on the
  // way down; at the hatch each tips over and drops its load onto its chute, down which it slides into the store by
  // the wall, and that keeps a tray at its foot full).
  for (const k of ['rice', 'fish'] as const) {
    const g = add(cellar, new Group()); g.position.set(LIFTS[k].x, CY, LIFTS[k].z); g.rotation.y = -Math.PI / 2;
    const W = 0.95, D = 0.85, L = LIFT_LOOP;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, WOOD_DARK, x * W / 2, LIFT_H / 2, z * D / 2, 0.12, LIFT_H, 0.12);
    for (let y = 0.4; y < LIFT_H; y += 1.4) {
      box(g, WOOD_DARK, 0, y, -D / 2, W, 0.1, 0.1);
      for (const s of [-1, 1]) box(g, WOOD_DARK, s * W / 2, y, 0, 0.1, 0.1, D);
    }
    // (its back boarded dark, so the trays going round in front of it show)
    box(g, 0x2A1E17, 0, LIFT_H / 2, -D / 2 + 0.02, W - 0.1, LIFT_H, 0.04, false);
    box(g, WOOD_DARK, 0, LIFT_H + 0.05, 0, W + 0.2, 0.14, D + 0.2);
    // (the hatch's sill, which the chute's top end rests on, and boards across the front under it)
    const sill = CHUTE.y0 - 0.1;
    box(g, WOOD_DARK, 0, sill, D / 2, W + 0.06, 0.08, 0.16);
    for (let j = 0; j < Math.floor((sill - 0.06) / 0.19); j++) box(g, j % 2 ? CEDAR_DARK : CEDAR, 0, 0.14 + j * 0.19, D / 2 - 0.01, W - 0.1, 0.17, 0.03);
    for (const s of [-1, 1]) {
      for (const z of [L.front, L.back]) add(g, mesh(G.rope, IRON, s * 0.36, (L.bottom + L.top) / 2, z)).scale.set(1.2, L.top - L.bottom, 1.2);
      for (const y of [L.bottom, L.top]) {
        const wheel = add(g, mesh(new CylinderGeometry(0.27, 0.27, 0.05, 14), IRON, s * 0.36, y, 0)); wheel.rotation.z = Math.PI / 2;
      }
    }
    // a lamp on its front post, lighting the trays coming down
    lantern(g, W / 2 + 0.05, 2.7, D / 2 + 0.05, false);

    // its chute: a bed of three cedar planks on a dark board, side boards with a bamboo pole lashed along the top of
    // each in straw rope, and a stop across its top end; resting on the hatch's sill, and on two trestles down to its
    // lip over the store's mouth
    const z = LIFTS[k].z, run = CHUTE.from - CHUTE.to, len = Math.hypot(run, CHUTE.y0 - CHUTE.y1);
    const ch = add(cellar, new Group());
    ch.position.set((CHUTE.from + CHUTE.to) / 2, CY + (CHUTE.y0 + CHUTE.y1) / 2, z); ch.rotation.z = Math.atan2(CHUTE.y0 - CHUTE.y1, run);
    // (in its own space: x along it, up the slope; y up off the bed's top; z across)
    box(ch, WOOD_DARK, 0, -0.045, 0, len, 0.03, 0.46);
    [-0.15, 0, 0.15].forEach((dz, i) => box(ch, i % 2 ? CEDAR_DARK : CEDAR, 0, -0.015, dz, len, 0.03, 0.145));
    box(ch, WOOD_DARK, len / 2 - 0.02, 0.03, 0, 0.04, 0.12, 0.44);
    for (const s of [-1, 1]) {
      box(ch, WOOD_DARK, 0, 0.03, s * 0.235, len, 0.12, 0.03);
      const pole = add(ch, mesh(G.cyl, BAMBOO, 0, 0.115, s * 0.235)); pole.scale.set(0.028, len + 0.08, 0.028); pole.rotation.z = Math.PI / 2;
      for (let u = -len / 2 + 0.22; u < len / 2; u += 0.4) {
        const node = add(ch, mesh(G.cyl, BAMBOO_DARK, u, 0.115, s * 0.235)); node.scale.set(0.034, 0.025, 0.034); node.rotation.z = Math.PI / 2;
      }
      for (const u of [-len / 2 + 0.12, 0.02, len / 2 - 0.14]) box(ch, ROPE, u, 0.07, s * 0.235, 0.04, 0.15, 0.06);
    }
    for (const x of [CHUTE.to + 0.42, (CHUTE.from + CHUTE.to) / 2 + 0.2]) {
      const h = chuteY(x) - 0.07;
      for (const s of [-1, 1]) {
        box(cellar, WOOD_DARK, x, CY + h / 2, z + s * 0.2, 0.07, h, 0.07);
        box(cellar, ROPE, x, CY + h - 0.04, z + s * 0.2, 0.09, 0.07, 0.09);
      }
      box(cellar, WOOD_DARK, x, CY + h - 0.03, z, 0.08, 0.06, 0.52);
      box(cellar, WOOD, x, CY + 0.28, z, 0.04, 0.05, 0.4);
    }

    // the store it slides into, by the wall: for rice, a cedar tub on two timbers, its staves banded with braided
    // bamboo, full of sacks; for fish, a slatted cedar crate standing in a tray of crushed ice and salt, the fish laid
    // on ice in it (ringKitchen.ts puts what's in each); and a board hung on its front, 米 or 魚
    const st = add(cellar, new Group()); st.position.set(STORES[k].x, CY, z);
    if (k === 'rice') {
      const R0 = 0.4, R1 = 0.44, Y0 = 0.1, H = 0.72, r = (y: number) => R0 + (R1 - R0) * (y - Y0) / H;
      for (const s of [-1, 1]) box(st, WOOD_DARK, s * 0.24, Y0 / 2, 0, 0.12, Y0, 0.9);
      add(st, mesh(new CylinderGeometry(R1, R0, H, 18, 1, true), CEDAR, 0, Y0 + H / 2, 0, true));
      add(st, mesh(new CylinderGeometry(R1 - 0.03, R0 - 0.03, H, 18, 1, true), new MeshLambertMaterial({ color: 0x4A3424, side: BackSide }), 0, Y0 + H / 2, 0));
      add(st, mesh(new CylinderGeometry(R0, R0, 0.02, 18), CEDAR_DARK, 0, Y0 + 0.01, 0));
      add(st, mesh(new CylinderGeometry(r(0.74) - 0.03, r(0.74) - 0.03, 0.02, 18), 0x3A2A1E, 0, 0.74, 0));
      add(st, mesh(new TorusGeometry(R1 - 0.015, 0.02, 5, 24), CEDAR_DARK, 0, Y0 + H, 0)).rotation.x = Math.PI / 2;
      // (the staves' joints, on the tub's edges, leaning out with it)
      for (let j = 0; j < 18; j++) {
        const p = add(st, new Group()); p.rotation.y = j / 18 * Math.PI * 2;
        box(p, CEDAR_DARK, 0, Y0 + H / 2, (R0 + R1) / 2 + 0.004, 0.014, H - 0.02, 0.012).rotation.x = Math.atan2(R1 - R0, H);
      }
      for (const y of [0.22, 0.7]) {
        for (const dy of [-0.024, 0.024]) {
          add(st, mesh(new TorusGeometry(r(y + dy) + 0.012, 0.02, 5, 24), dy < 0 ? BAMBOO : BAMBOO_DARK, 0, y + dy, 0)).rotation.x = Math.PI / 2;
        }
      }
      inkBoard(st, '米', 0.44, r(0.44) + 0.03);
      spout(st, -r(0.76), 0.76);
    } else {
      // (the tray of ice and salt it stands in, lumps of both round its foot)
      for (const s of [-1, 1]) {
        box(st, WOOD_DARK, s * 0.47, 0.08, 0, 0.03, 0.16, 0.96);
        box(st, WOOD_DARK, 0, 0.08, s * 0.47, 0.96, 0.16, 0.03);
      }
      box(st, ICE, 0, 0.06, 0, 0.92, 0.12, 0.92, false);
      for (let j = 0; j < 16; j++) {
        const side = j % 4, u = -0.3 + Math.floor(j / 4) * 0.2, o = 0.42;
        const [x, zz] = side === 0 ? [u, o] : side === 1 ? [o, -u] : side === 2 ? [-u, -o] : [-o, u];
        add(st, mesh(G.sphere, j % 3 ? ICE : SALT, x, 0.12, zz)).scale.set(0.06 - (j % 2) * 0.015, 0.035, 0.05);
      }
      // (the crate: corner posts, four slats a side with the dark showing between them, a rail round its top, and a
      // bed of ice inside)
      const B = 0.76, Y0 = 0.13;
      box(st, 0x2A1E17, 0, Y0 + 0.32, 0, B - 0.06, 0.62, B - 0.06, false);
      for (const [x, zz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(st, WOOD_DARK, x * (B / 2 - 0.02), Y0 + 0.335, zz * (B / 2 - 0.02), 0.06, 0.67, 0.06);
      for (let j = 0; j < 4; j++) {
        const y = Y0 + 0.075 + j * 0.16, c = j % 2 ? CEDAR_DARK : CEDAR;
        for (const s of [-1, 1]) {
          box(st, c, 0, y, s * (B / 2 - 0.01), B - 0.1, 0.11, 0.025);
          box(st, c, s * (B / 2 - 0.01), y, 0, 0.025, 0.11, B - 0.1);
        }
      }
      for (const s of [-1, 1]) {
        box(st, WOOD_DARK, 0, Y0 + 0.64, s * (B / 2), B + 0.02, 0.05, 0.04);
        box(st, WOOD_DARK, s * (B / 2), Y0 + 0.64, 0, 0.04, 0.05, B + 0.02);
      }
      box(st, ICE, 0, Y0 + 0.6, 0, B - 0.08, 0.04, B - 0.08, false);
      for (const [x, zz] of [[-0.26, -0.26], [0.26, -0.24], [0.25, 0.26], [-0.24, 0.25], [0, -0.28]]) {
        add(st, mesh(G.sphere, ICE, x, Y0 + 0.63, zz)).scale.set(0.07, 0.035, 0.06);
      }
      inkBoard(st, '魚', 0.42, B / 2 + 0.03);
      spout(st, -B / 2, 0.72);
    }

    // the tray at its foot, by the wall, that what's taken is handed over the wall from: a hinoki tray with a lip, on
    // short legs, lined with a straw mat for the rice and with bamboo leaves for the fish
    const tray = add(cellar, new Group()); tray.position.set(BINS[k].x, CY, z);
    box(tray, HINOKI, 0, 0.575, 0, 0.5, 0.03, 0.72);
    for (const s of [-1, 1]) {
      box(tray, CEDAR_DARK, s * 0.235, 0.615, 0, 0.03, 0.07, 0.72);
      box(tray, CEDAR_DARK, 0, 0.615, s * 0.345, 0.5, 0.07, 0.03);
      for (const t of [-1, 1]) box(tray, WOOD_DARK, s * 0.18, 0.28, t * 0.28, 0.05, 0.56, 0.05);
      box(tray, WOOD_DARK, s * 0.18, 0.14, 0, 0.04, 0.04, 0.56);
    }
    if (k === 'rice') box(tray, STRAW, 0, 0.593, 0, 0.42, 0.006, 0.64, false);
    else for (const s of [-1, 1]) add(tray, mesh(G.sphere, s < 0 ? 0x3F7A3A : 0x4E8C45, s * 0.1, 0.593, 0)).scale.set(0.12, 0.004, 0.32);
  }
  // rice sacks in the corner
  const k = add(cellar, new Group()); k.position.set(SACKS.x, CY, SACKS.z);
  [[0, 0, 0], [-0.45, 0.1, 0.5], [-0.2, 0.3, 0.3]].forEach(([x, z, r]) => {
    const sack = add(k, mesh(G.sphere, 0xE8DCC0, x, 0.32, z, true)); sack.scale.set(0.3, 0.34, 0.26); sack.rotation.y = r;
    add(k, mesh(G.cyl, 0xB08A5A, x, 0.64, z)).scale.set(0.08, 0.08, 0.08);
  });
  // a chalk board by the door, ruled into the three lines
  box(cellar, 0x23302A, PREP.x0 + 0.2, CY + 1.5, 2.6, 0.06, 0.9, 1.3, false);
}

// ---------- the workshop: the crafting bench, a daiku's tools, and what's kept down here from the fish dock ----------
/** Where the workshop's things stand, for walking round them (the way from its doorway to the bench's square is kept
 *  clear): a tansu chest by the bench; fish crates and straw-wrapped sake barrels against the north wall, east of the
 *  doorway; timber along the east wall, with a net hung over it; a beam being cut on two trestles; and along the south
 *  wall, coils of rope, a heap of net with its floats, and a water bucket for the whetstones. */
const TANSU = { x: CRAFT.x0 + 0.95, z: CRAFT.z0 + 0.25 }, CRATES = { x: 8.3, z: CRAFT.z0 + 0.42 }, SAKE = { x: 9.95, z: CRAFT.z0 + 0.4 };
const TIMBER = { x: CRAFT.x1 - 0.45, z: 9.75 }, BEAM = { x: 8.85, z: 10.05 };
const COILS = { x: 6.3, z: CRAFT.z1 - 0.4 }, HEAP = { x: 8.7, z: CRAFT.z1 - 0.4 }, BUCKET = { x: CRAFT.x0 + 0.4, z: CRAFT.z1 - 0.3 };
/** A flat thing lying on the floor (sawdust), lit like the floor. */
function onFloor(x: number, z: number, w: number, d: number, turn: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const t = canvasTex(128, 128, draw);
  const m = add(cellar, new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ map: t.tex, transparent: true, depthWrite: false })));
  m.rotation.set(-Math.PI / 2, 0, turn); m.position.set(x, CY + 0.006, z); m.renderOrder = 1;
}
/** The same picture on several faces, as one mesh: `geo` (facing +z) moved into place by each of `at`. */
function pictures(geo: BufferGeometry, map: typeof earth.tex, at: Matrix4[]) {
  return add(cellar, new Mesh(mergeGeometries(at.map(m => copyGeo(geo).applyMatrix4(m)))!, new MeshLambertMaterial({ map })));
}
const placed = (x: number, y: number, z: number, turn = 0) => new Matrix4().makeRotationY(turn).setPosition(x, y, z);
/** A curl of plane shavings; and the colours of pale new-cut wood, hemp rope, old glass floats and black iron. */
const CURL = new TorusGeometry(0.045, 0.012, 4, 8, Math.PI * 1.4);
const SHAVING = 0xEED8A6, HEMP = 0x8A6A44, GLASS = 0x6FB5A0, BLACK_IRON = 0x1E1E22;
function curl(parent: Object3D, x: number, y: number, z: number, turn: number) {
  add(parent, mesh(CURL, SHAVING, x, y + 0.03, z)).rotation.set(0.3, turn, 0.2);
}
/** An old glass fishing float, `r` round, in its rope cage. */
function float(parent: Object3D, x: number, y: number, z: number, r: number) {
  add(parent, mesh(G.sphere, GLASS, x, y, z, true)).scale.setScalar(r);
  for (const turn of [0, Math.PI / 2]) {
    const cage = add(parent, mesh(G.hood, HEMP, x, y, z)); cage.scale.setScalar(r / 0.19 * 1.02); cage.rotation.y = turn;
  }
}
{
  // the crafting bench: a daiku's heavy low bench, a thick slab on squat legs that come up through it, wedged, with
  // rails between them and a stop at its north end to plane against; on it a plane (kanna), a pull saw (ryoba) with
  // its handle bound in cane, chisels in a wooden tray, a wooden mallet, an ink pot for snapping lines, a whetstone,
  // and curls of shavings
  const g = add(cellar, new Group()); g.position.set(BENCH.x, CY, BENCH.z);
  const { w: W, d: D } = BENCH, TOP = 0.72;
  box(g, 0xA8774D, 0, TOP - 0.07, 0, W, 0.14, D);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, WOOD_DARK, x * (W / 2 - 0.13), (TOP - 0.14) / 2, z * (D / 2 - 0.22), 0.16, TOP - 0.14, 0.16);
    box(g, 0x7A5235, x * (W / 2 - 0.13), TOP + 0.002, z * (D / 2 - 0.22), 0.12, 0.006, 0.12, false);
    box(g, 0x3E2418, x * (W / 2 - 0.13), TOP + 0.004, z * (D / 2 - 0.22), 0.03, 0.006, 0.13, false);
  }
  for (const s of [-1, 1]) box(g, WOOD_DARK, s * (W / 2 - 0.13), 0.16, 0, 0.09, 0.1, D - 0.4);
  for (const s of [-1, 1]) box(g, WOOD_DARK, 0, 0.16, s * (D / 2 - 0.22), W - 0.3, 0.1, 0.09);
  box(g, 0x7A5235, 0, TOP + 0.03, -D / 2 + 0.1, 0.36, 0.06, 0.07);
  // (the plane: an oak block, its iron blade wedged in at a slant, a curl coming out of its mouth)
  const kanna = add(g, new Group()); kanna.position.set(0.12, TOP, 0.5); kanna.rotation.y = 0.15;
  box(kanna, 0xC9A36A, 0, 0.03, 0, 0.1, 0.06, 0.3);
  box(kanna, 0x2A1A12, 0, 0.061, 0.02, 0.07, 0.003, 0.014, false);
  box(kanna, IRON, 0, 0.07, -0.04, 0.08, 0.012, 0.1).rotation.x = -0.6;
  box(kanna, STEEL, 0, 0.075, -0.02, 0.07, 0.008, 0.06).rotation.x = -0.6;
  curl(kanna, 0, 0.04, 0.06, 0.4);
  // (the saw, lying flat: a blade toothed along both edges, its neck, and a long cane-bound handle)
  const saw = add(g, new Group()); saw.position.set(-0.15, TOP, -0.45); saw.rotation.y = 0.25;
  box(saw, STEEL, 0, 0.004, 0.13, 0.17, 0.006, 0.34);
  for (const s of [-1, 1]) box(saw, STEEL_DARK, s * 0.085, 0.004, 0.13, 0.012, 0.007, 0.34, false);
  box(saw, STEEL, 0, 0.005, -0.08, 0.03, 0.008, 0.09);
  const grip = add(saw, mesh(G.cyl, 0xD8B98A, 0, 0.022, -0.28)); grip.scale.set(0.022, 0.32, 0.022); grip.rotation.x = Math.PI / 2;
  for (const dz of [-0.17, -0.27, -0.37]) {
    const band = add(saw, mesh(G.cyl, 0x7A4E2A, 0, 0.022, dz)); band.scale.set(0.025, 0.03, 0.025); band.rotation.x = Math.PI / 2;
  }
  // (the chisels, in their tray: steel blades, wooden handles with an iron hoop at the end)
  const tray = add(g, new Group()); tray.position.set(0.2, TOP, -0.02); tray.rotation.y = -0.1;
  box(tray, WOOD, 0, 0.01, 0, 0.26, 0.02, 0.34);
  for (const s of [-1, 1]) { box(tray, WOOD_DARK, s * 0.125, 0.03, 0, 0.02, 0.04, 0.34); box(tray, WOOD_DARK, 0, 0.03, s * 0.165, 0.26, 0.04, 0.02); }
  [-0.08, -0.025, 0.03, 0.085].forEach((x, i) => {
    const z = (i % 2) * 0.03 - 0.015;
    box(tray, STEEL, x, 0.03, z + 0.08, 0.022 - i * 0.003, 0.012, 0.13);
    const h = add(tray, mesh(G.cyl, 0xB07A4A, x, 0.035, z - 0.04)); h.scale.set(0.016, 0.11, 0.016); h.rotation.x = Math.PI / 2;
    const hoop = add(tray, mesh(G.cyl, IRON, x, 0.035, z - 0.09)); hoop.scale.set(0.019, 0.014, 0.019); hoop.rotation.x = Math.PI / 2;
  });
  // (the wooden mallet)
  const mallet = add(g, new Group()); mallet.position.set(-0.2, TOP, 0.2); mallet.rotation.y = -0.5;
  const head = add(mallet, mesh(G.cyl, 0xC9A06A, 0, 0.055, 0)); head.scale.set(0.055, 0.18, 0.055); head.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const end = add(mallet, mesh(G.cyl, 0x9A7448, s * 0.091, 0.055, 0)); end.scale.set(0.05, 0.004, 0.05); end.rotation.z = Math.PI / 2; }
  const shaft = add(mallet, mesh(G.cyl, WOOD_DARK, 0, 0.03, 0.18)); shaft.scale.set(0.016, 0.3, 0.016); shaft.rotation.x = Math.PI / 2;
  // (the ink pot: a carved block with its well and its wheel of line, the red line run out along the bench)
  const ink = add(g, new Group()); ink.position.set(0.25, TOP, 0.88);
  box(ink, 0x7A4A2E, 0, 0.03, 0, 0.08, 0.06, 0.18);
  add(ink, mesh(G.cyl, 0x15120F, 0, 0.061, -0.04)).scale.set(0.03, 0.004, 0.03);
  const wheel = add(ink, mesh(G.cyl, 0x9A7448, 0, 0.05, 0.06)); wheel.scale.set(0.045, 0.03, 0.045); wheel.rotation.z = Math.PI / 2;
  box(ink, 0xC0392B, -0.01, 0.003, -0.22, 0.004, 0.004, 0.26, false);
  // (the whetstone on its wooden base)
  box(g, WOOD, 0.22, TOP + 0.015, -0.8, 0.1, 0.03, 0.26);
  box(g, 0xC2B48C, 0.22, TOP + 0.045, -0.8, 0.075, 0.035, 0.21);
  // (and shavings, where it's been planed)
  for (const [x, z, a] of [[0, 0.72, 0.3], [-0.12, 0.62, 1.9], [0.32, 0.3, 3.1], [-0.3, 0.95, 4.4]]) curl(g, x, TOP, z, a);

  // the tool rack on the wall behind it: two rails between posts, lashed on with rope, their pegs hung with a long pull
  // saw, a carpenter's square, a hammer, a coil of rope and a straw hat, and a paper notice pinned between
  const RX = CRAFT.x0 + 0.08, posts = [-1, 1].map(s => BENCH.z + s * (BENCH.d / 2 + 0.12));
  for (const z of posts) box(cellar, WOOD_DARK, CRAFT.x0 + 0.02, CY + 1.2, z, 0.1, 2.4, 0.1);
  for (const y of [1.45, 2.05]) {
    box(cellar, WOOD, RX, CY + y, BENCH.z, 0.07, 0.1, BENCH.d + 0.4);
    for (const z of posts) for (const dy of [-0.04, 0, 0.04]) box(cellar, HEMP, RX - 0.03, CY + y + dy, z, 0.13, 0.025, 0.13, false);
  }
  const peg = (y: number, z: number) => { const p = add(cellar, mesh(G.cyl, WOOD_DARK, RX + 0.08, CY + y, z)); p.scale.set(0.015, 0.1, 0.015); p.rotation.z = Math.PI / 2; };
  // (the long saw hung by its handle, its blade down in front of the lower rail)
  peg(2.05, BENCH.z - 0.75);
  add(cellar, mesh(G.cyl, 0xD8B98A, RX + 0.13, CY + 1.84, BENCH.z - 0.75)).scale.set(0.022, 0.36, 0.022);
  for (const y of [1.74, 1.84, 1.94]) add(cellar, mesh(G.cyl, 0x7A4E2A, RX + 0.13, CY + y, BENCH.z - 0.75)).scale.set(0.025, 0.03, 0.025);
  box(cellar, STEEL, RX + 0.13, CY + 1.44, BENCH.z - 0.75, 0.006, 0.42, 0.17);
  for (const s of [-1, 1]) box(cellar, STEEL_DARK, RX + 0.13, CY + 1.44, BENCH.z - 0.75 + s * 0.085, 0.007, 0.42, 0.012, false);
  // (the square: steel, an L, its long arm down)
  peg(2.05, BENCH.z - 0.2);
  box(cellar, STEEL, RX + 0.11, CY + 1.78, BENCH.z - 0.2, 0.006, 0.5, 0.025);
  box(cellar, STEEL, RX + 0.11, CY + 1.545, BENCH.z - 0.09, 0.006, 0.025, 0.25);
  // (the hammer, a steel head on a wooden handle, hung head up)
  peg(1.45, BENCH.z - 0.42);
  box(cellar, 0xB07A4A, RX + 0.11, CY + 1.24, BENCH.z - 0.42, 0.025, 0.36, 0.03);
  const hammer = add(cellar, mesh(G.cyl, IRON, RX + 0.11, CY + 1.43, BENCH.z - 0.42)); hammer.scale.set(0.03, 0.14, 0.03); hammer.rotation.x = Math.PI / 2;
  // (a coil of rope)
  peg(1.45, BENCH.z + 0.35);
  for (const r of [0.15, 0.12]) add(cellar, mesh(new TorusGeometry(r, 0.03, 5, 16), HEMP, RX + 0.12, CY + 1.3, BENCH.z + 0.35)).rotation.y = Math.PI / 2;
  // (a straw hat, crown out)
  peg(2.05, BENCH.z + 0.8);
  const hat = add(cellar, mesh(G.cone, STRAW, RX + 0.16, CY + 1.92, BENCH.z + 0.8, true)); hat.scale.set(0.24, 0.12, 0.24); hat.rotation.z = -Math.PI / 2;
  // (the notice: 火の用心, mind the fire, brushed down a sheet with a red seal, on a board nailed across the rails)
  box(cellar, 0x9A7448, RX - 0.005, CY + 1.75, BENCH.z + 0.3, 0.03, 0.6, 0.36);
  const notice = canvasTex(64, 96, (c, w, h) => {
    c.fillStyle = '#EFE6CF'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,90,50,.18)'; c.fillRect(0, h - 10, w, 10);
    c.fillStyle = '#1E1812'; c.font = `800 19px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['火', 'の', '用', '心'].forEach((k, i) => c.fillText(k, w / 2 - 4, 14 + i * 20));
    c.fillStyle = '#C0392B'; c.fillRect(w - 16, h - 22, 10, 10);
  });
  const sheet = add(cellar, new Mesh(new PlaneGeometry(0.22, 0.33), new MeshLambertMaterial({ map: notice.tex })));
  sheet.rotation.y = Math.PI / 2; sheet.position.set(RX + 0.012, CY + 1.75, BENCH.z + 0.3);
  // a lamp over the bench
  lantern(cellar, BENCH.x + 0.5, CY + 2.6, BENCH.z, false);

  // a short noren in the doorway from the hearth room, persimmon brown in three strips, a white ring on the middle one,
  // and a red lantern hung by it
  const t = door('craft'), span = t.x1 - t.x0 + 0.6, x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2 + 0.06;
  for (let i = -1; i <= 1; i++) {
    box(cellar, 0x7A3B1E, x + i * span / 3, CY + FRAME_H - 0.27, z, span / 3 - 0.04, 0.34, 0.02, false).receiveShadow = false;
  }
  add(cellar, mesh(new TorusGeometry(0.075, 0.02, 4, 16), 0xF4F1EA, x, CY + FRAME_H - 0.27, z + 0.015));
  lantern(cellar, t.x1 + 0.6, CY + 2.2, CRAFT.z0 + 0.15, true);

  // a tansu chest in the corner by the bench, dark wood with black iron: a long drawer over two short ones over another
  // long one, iron pulls on round plates, corner plates, a lock plate, and a carrying ring on each end
  const ch = add(cellar, new Group()); ch.position.set(TANSU.x, CY, TANSU.z);
  const TW = 0.9, TH = 0.66, TD = 0.42, front = TD / 2 + 0.006, ARC = new TorusGeometry(0.035, 0.008, 4, 10, Math.PI);
  box(ch, 0x3A1C12, 0, 0.03, 0, TW - 0.06, 0.06, TD - 0.06);
  box(ch, 0x5A2E1C, 0, 0.06 + TH / 2, 0, TW, TH, TD);
  box(ch, 0x4A2416, 0, 0.08 + TH, 0, TW + 0.04, 0.04, TD + 0.04);
  for (const [dx, y, w, pulls] of [[0, 0.58, 0.84, [-0.22, 0.22]], [-0.215, 0.38, 0.41, [0]], [0.215, 0.38, 0.41, [0]], [0, 0.17, 0.84, [-0.22, 0.22]]] as const) {
    box(ch, 0x6E3A24, dx, y, front, w, 0.17, 0.012);
    for (const px of pulls) {
      const plate = add(ch, mesh(G.cyl, BLACK_IRON, dx + px, y, front + 0.008)); plate.scale.set(0.03, 0.006, 0.03); plate.rotation.x = Math.PI / 2;
      add(ch, mesh(ARC, BLACK_IRON, dx + px, y + 0.005, front + 0.018)).rotation.z = Math.PI;
    }
  }
  box(ch, BLACK_IRON, 0, 0.58, front + 0.008, 0.1, 0.09, 0.008);
  box(ch, 0xC9A23A, 0, 0.58, front + 0.013, 0.02, 0.035, 0.004, false);
  for (const sx of [-1, 1]) for (const y of [0.09, TH + 0.03]) box(ch, BLACK_IRON, sx * (TW / 2 - 0.035), y, front + 0.01, 0.08, 0.06, 0.008);
  for (const sx of [-1, 1]) add(ch, mesh(new TorusGeometry(0.06, 0.012, 4, 12), BLACK_IRON, sx * (TW / 2 + 0.012), 0.5, 0)).rotation.y = Math.PI / 2;

  // fish crates from the dock against the north wall, two piles of them, each branded on its end: the fish market's 魚
  // in a red ring, and the shop's mark
  const brand = canvasTex(128, 48, (c, w, h) => {
    c.fillStyle = '#B88A5C'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,40,20,.35)'; for (const y of [15, 31]) c.fillRect(0, y, w, 2);
    c.strokeStyle = '#A32A1E'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, 17, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#A32A1E'; c.font = `800 26px ${FONT}`; c.fillText('魚', w / 2, h / 2 + 1);
    c.fillStyle = '#2A1A12'; c.font = `800 15px ${FONT}`; c.fillText('丸八', 22, h / 2 + 1); c.fillText('十二', w - 22, h / 2 + 1);
  });
  const ends: Matrix4[] = [];
  const crate = (x: number, y: number, z: number, turn: number) => {
    const k = add(cellar, new Group()); k.position.set(x, CY + y, z); k.rotation.y = turn;
    box(k, 0xA87B50, 0, 0.1, 0, 0.62, 0.2, 0.42);
    box(k, 0x8C6440, 0, 0.1, -0.212, 0.64, 0.2, 0.012, false);
    box(k, 0x2A1E17, 0, 0.199, 0, 0.56, 0.004, 0.36, false);
    ends.push(placed(x, CY + y, z, turn).multiply(placed(0, 0.1, 0.213)));
  };
  for (const [y, turn] of [[0, 0], [0.2, 0.03], [0.4, -0.04]]) crate(CRATES.x - 0.33, y, CRATES.z, turn);
  for (const [y, turn] of [[0, -0.02], [0.2, 0.08]]) crate(CRATES.x + 0.34, y, CRATES.z + 0.01, turn);
  pictures(new PlaneGeometry(0.6, 0.19), brand.tex, ends);

  // straw-wrapped sake barrels (komodaru) under the workshop's sign, roped, their lids showing, and the brewer's label
  // painted round the front: a red disc with a white 福 between indigo bands
  const label = canvasTex(128, 96, (c, w, h) => {
    c.fillStyle = '#EFE6CF'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2B3A67'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    c.fillStyle = '#C0392B'; c.beginPath(); c.arc(w / 2, h / 2, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#F4F1EA'; c.font = `800 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福', w / 2, h / 2 + 2);
    c.fillStyle = '#1E1812'; c.font = `800 13px ${FONT}`;
    ['上', '撰'].forEach((k, i) => { c.fillText(k, 14, 32 + i * 16); c.fillText(k, w - 14, 32 + i * 16); });
  });
  const BARREL = new CylinderGeometry(0.27, 0.27, 0.56, 14), BAND = new TorusGeometry(0.275, 0.018, 4, 18), RIM = new TorusGeometry(0.255, 0.035, 5, 16);
  const labels: Matrix4[] = [];
  for (const [dx, turn] of [[-0.31, 0.1], [0.31, -0.14]]) {
    const k = add(cellar, new Group()); k.position.set(SAKE.x + dx, CY, SAKE.z); k.rotation.y = turn;
    add(k, mesh(BARREL, STRAW, 0, 0.28, 0, true));
    add(k, mesh(G.cyl, 0xC9A06A, 0, 0.56, 0)).scale.set(0.24, 0.02, 0.24);
    add(k, mesh(RIM, 0xC4AE66, 0, 0.56, 0)).rotation.x = Math.PI / 2;
    for (const y of [0.1, 0.46]) add(k, mesh(BAND, 0x6B5236, 0, y, 0)).rotation.x = Math.PI / 2;
    for (const a of [0.95, 1.9, 2.8, -0.95, -1.9, -2.8]) box(k, 0x6B5236, Math.sin(a) * 0.275, 0.28, Math.cos(a) * 0.275, 0.02, 0.36, 0.02).rotation.y = a;
    labels.push(placed(SAKE.x + dx, CY + 0.28, SAKE.z, turn));
  }
  pictures(new CylinderGeometry(0.276, 0.276, 0.3, 8, 1, true, -0.62, 1.24), label.tex, labels);

  // timber stacked along the east wall, on bearers, and a net hung over the wall above it to dry, its floats along the
  // bottom
  for (let i = 0; i < 4; i++) box(cellar, i % 2 ? 0xB98B5A : 0xA67A4C, TIMBER.x + (i % 2 ? 0.05 : -0.05), CY + 0.1 + i * 0.1, TIMBER.z, 0.5, 0.09, 1.7);
  for (const dz of [-0.6, 0.6]) box(cellar, WOOD_DARK, TIMBER.x, CY + 0.03, TIMBER.z + dz, 0.6, 0.06, 0.1);
  const netting = canvasTex(128, 64, (c, w, h) => {
    c.strokeStyle = 'rgba(52,58,46,.95)'; c.lineWidth = 2;
    for (let i = -h; i < w + h; i += 12) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke();
      c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke();
    }
    c.fillStyle = '#8A6A44'; c.fillRect(0, 0, w, 5);
  });
  const net = add(cellar, new Mesh(new PlaneGeometry(1.7, 0.72), new MeshLambertMaterial({ map: netting.tex, alphaTest: 0.4, side: DoubleSide })));
  net.rotation.y = -Math.PI / 2; net.position.set(CRAFT.x1 + 0.17, CY + 0.8, TIMBER.z);
  for (const dz of [-0.6, 0, 0.55]) float(cellar, CRAFT.x1 + 0.1, CY + 0.5, TIMBER.z + dz, 0.07);

  // a beam being cut, across two low trestles: an ink line snapped along it, a mortise chiselled out with the chisel
  // left standing in it, a saw in the cut at its end, and shavings and sawdust under it
  const bm = add(cellar, new Group()); bm.position.set(BEAM.x, CY, BEAM.z);
  for (const dx of [-0.6, 0.6]) {
    box(bm, WOOD_DARK, dx, 0.3, 0, 0.12, 0.08, 0.62);
    for (const s of [-1, 1]) for (const e of [-1, 1]) box(bm, WOOD_DARK, dx + s * 0.06, 0.13, e * 0.22, 0.05, 0.3, 0.05).rotation.z = s * 0.25;
  }
  box(bm, 0xC9A06A, 0, 0.45, 0, 1.8, 0.22, 0.22);
  for (const s of [-1, 1]) box(bm, 0x9A7448, s * 0.901, 0.45, 0, 0.004, 0.2, 0.2, false);
  box(bm, 0x15120F, -0.05, 0.562, 0.04, 1.6, 0.003, 0.008, false);
  box(bm, 0x2A1A12, 0.25, 0.562, 0, 0.14, 0.003, 0.08, false);
  box(bm, STEEL, 0.25, 0.6, 0, 0.022, 0.08, 0.012).rotation.z = 0.15;
  const chisel = add(bm, mesh(G.cyl, 0xB07A4A, 0.24, 0.69, 0)); chisel.scale.set(0.016, 0.11, 0.016); chisel.rotation.z = 0.15;
  box(bm, STEEL, 0.75, 0.6, 0, 0.006, 0.22, 0.17);
  const sawGrip = add(bm, mesh(G.cyl, 0xD8B98A, 0.75, 0.82, 0)); sawGrip.scale.set(0.022, 0.3, 0.022); sawGrip.rotation.z = 0.08;
  for (const [x, z, a] of [[-0.4, 0.3, 0.5], [-0.1, 0.38, 2.2], [0.3, -0.34, 1.1], [0.55, 0.3, 3.6], [-0.7, -0.3, 5.0]]) curl(bm, x, 0, z, a);

  // along the south wall: coils of rope, one on another; a heap of old net with its glass floats; and the bucket of water
  // the whetstones soak in, a dipper across it
  for (const [x, y, r] of [[-0.33, 0, 0.27], [-0.33, 0.07, 0.22], [0.33, 0, 0.24]]) {
    for (let k = 0; k < 2; k++) {
      add(cellar, mesh(new TorusGeometry(r - k * 0.07, 0.035, 5, 18), HEMP, COILS.x + x, CY + 0.04 + y + k * 0.035, COILS.z, true)).rotation.x = Math.PI / 2;
    }
  }
  for (const [x, z, s] of [[-0.35, 0.05, 0.3], [0.1, -0.05, 0.36], [0.45, 0.08, 0.26]]) {
    add(cellar, mesh(G.sphere, 0x45503F, HEAP.x + x, CY + 0.06, HEAP.z + z, true)).scale.set(s, 0.16, s * 0.75);
  }
  for (const [x, z] of [[-0.25, -0.12], [0.2, 0.05], [0.5, -0.05]]) float(cellar, HEAP.x + x, CY + 0.2, HEAP.z + z, 0.08);
  add(cellar, mesh(new CylinderGeometry(0.2, 0.17, 0.32, 12), 0x9A6E44, BUCKET.x, CY + 0.16, BUCKET.z, true));
  for (const y of [0.07, 0.25]) add(cellar, mesh(new TorusGeometry(0.19, 0.014, 4, 16), 0x5A4A2E, BUCKET.x, CY + y, BUCKET.z)).rotation.x = Math.PI / 2;
  add(cellar, mesh(G.cyl, 0x2E4A55, BUCKET.x, CY + 0.29, BUCKET.z)).scale.set(0.18, 0.01, 0.18);
  const dipper = add(cellar, mesh(G.cyl, 0xC9A06A, BUCKET.x, CY + 0.34, BUCKET.z)); dipper.scale.set(0.012, 0.44, 0.012); dipper.rotation.set(Math.PI / 2, 0, 0.4);

  // sawdust under the beam, by the bench, and by the timber
  const dust = (c: CanvasRenderingContext2D, w: number, h: number) => {
    const hash = (i: number) => { const x = Math.sin(i * 45.17) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 260; i++) {
      const a = hash(i) * Math.PI * 2, d = Math.sqrt(hash(i + 300)) * w * 0.46;
      c.fillStyle = i % 3 ? 'rgba(232,200,150,.75)' : 'rgba(196,156,104,.7)';
      c.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d * 0.7, 2 + hash(i + 600) * 3, 2);
    }
  };
  onFloor(BEAM.x, BEAM.z, 2.2, 1.3, 0, dust);
  onFloor(BENCH.x + 0.75, BENCH.z + 0.9, 1.1, 0.9, 0.6, dust);
  onFloor(TIMBER.x - 0.6, TIMBER.z - 0.3, 0.9, 0.9, 1.2, dust);
}

// ---------- the grow room: dark earth, damp walls, and glowing toadstools in the corners ----------
{
  const SPORE = glow(0x9CE6C8, 0x2E9C7A);
  for (const [x, z] of [[GROW.x0 + 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z1 - 0.6], [GROW.x0 + 0.5, GROW.z1 - 2.2]]) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7, r = 0.15 + i * 0.07;
      add(parts.grow, mesh(G.cyl, 0xE6DCC8, x + Math.cos(a) * r, CY + 0.08 + i * 0.03, z + Math.sin(a) * r)).scale.set(0.03, 0.16 + i * 0.05, 0.03);
      add(parts.grow, mesh(G.sphere, SPORE, x + Math.cos(a) * r, CY + 0.18 + i * 0.06, z + Math.sin(a) * r)).scale.set(0.09, 0.05, 0.09);
    }
  }
  // dripping pipes along the back
  for (let x = GROW.x0 + 1; x < GROW.x1; x += 3.1) add(parts.grow, mesh(G.log, 0x4A5A5A, x, CY + 2.6, GROW.z0 + 0.2)).scale.set(0.6, 5, 0.6);
}

// ---------- the teppo post, where the sparring partner slaps ----------
log(cellar, 0x7A5236, TEPPO.x, CY + 1.3, TEPPO.z, 2.2, 2.6);

// ---------- Mr. Fugu's office ----------
/** Mr. Fugu, behind his desk (dohyo.ts puffs him up when the crowd roars). */
export const boss = new Fugu();
/** The fish in his tank: little ones, each its own colour, up and down the glass at their own depth and pace. */
export const tankFish = new Group();
const FISH = [0xE8833A, 0xF2C14E, 0x4FA3D9, 0xE85A6A, 0xF4F1EA, 0xE8833A].map((c, i) => {
  const f = add(tankFish, new Group());
  add(f, mesh(G.sphere, c)).scale.set(0.028, 0.038, 0.07);
  const tail = add(f, new Group()); tail.position.z = -0.065;
  const fin = add(tail, mesh(G.cone, c, 0, 0, -0.025)); fin.scale.set(0.006, 0.05, 0.045); fin.rotation.x = Math.PI / 2;
  f.userData = { tail, x: -0.13 + (i % 3) * 0.13, y: 1.06 + i * 0.075, pace: 0.45 + (i % 4) * 0.12, phase: i * 1.7 };
  return f;
});
let swimT = 0;
/** The tank's fish swimming the length of it and back, wagging their tails, turning at the ends. */
export function swimTank(dt: number) {
  swimT += dt;
  for (const f of FISH) {
    const u = f.userData, a = swimT * u.pace + u.phase, dz = Math.cos(a);
    f.position.set(u.x, u.y + Math.sin(a * 2.3) * 0.02, Math.sin(a) * 0.55);
    f.rotation.y += ((dz >= 0 ? 0 : Math.PI) - f.rotation.y) * Math.min(1, dt * 6);
    u.tail.rotation.y = Math.sin(swimT * 11 + u.phase) * 0.5;
  }
}
{
  // the dais the desk stands on, carpeted red
  const D = DAIS, dw = D.x1 - D.x0, dd = D.z1 - D.z0;
  box(cellar, 0x4A2A1C, (D.x0 + D.x1) / 2, CY + D.h / 2, (D.z0 + D.z1) / 2, dw, D.h, dd);
  box(cellar, 0x8E2B2B, (D.x0 + D.x1) / 2, CY + D.h + 0.005, (D.z0 + D.z1) / 2 + 0.05, dw - 0.2, 0.01, dd - 0.1, false);
  // the desk: a mahogany top, two pedestals of drawers with brass pulls, a front panel with a gold trim
  const g = add(cellar, new Group()); g.position.set(OFFICE.x, CY + D.h, OFFICE.z);
  const MAHOGANY = 0x5A2618, DESK = 0x6E3220, BRASS = 0xC9A23A;
  box(g, MAHOGANY, 0, 0.8, 0, 2.5, 0.08, 0.9);
  for (const s of [-1, 1]) {
    box(g, DESK, s * 0.85, 0.38, 0, 0.7, 0.76, 0.8);
    for (const y of [0.18, 0.42, 0.64]) box(g, BRASS, s * 0.85, y, 0.41, 0.18, 0.03, 0.02, false);
  }
  box(g, DESK, 0, 0.5, 0.36, 1.0, 0.5, 0.06);
  box(g, BRASS, 0, 0.74, 0.4, 2.4, 0.03, 0.02, false);
  // on it: a green banker's lamp, bricks of cash, gold coins, a black telephone, and the ledger
  box(g, BRASS, -0.85, 0.86, -0.2, 0.2, 0.04, 0.14);
  add(g, mesh(G.rope, BRASS, -0.85, 1.0, -0.2)).scale.set(1.2, 0.3, 1.2);
  const shade = add(g, mesh(new CylinderGeometry(0.12, 0.12, 0.34, 10, 1, false, 0, Math.PI), glow(0x2F7A4A, 0x1E5A34), -0.85, 1.16, -0.2));
  shade.rotation.set(0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    box(g, 0x5E9C5A, 0.35 + (i % 3) * 0.24, 0.88 + Math.floor(i / 3) * 0.07, -0.15, 0.22, 0.07, 0.12);
    box(g, 0xF4F1EA, 0.35 + (i % 3) * 0.24, 0.88 + Math.floor(i / 3) * 0.07, -0.15, 0.05, 0.075, 0.125, false);
  }
  for (let i = 0; i < 4; i++) add(g, mesh(G.cyl, 0xF2C14E, 0.95, 0.86 + i * 0.025, 0.15)).scale.set(0.07, 0.02, 0.07);
  box(g, 0x1B1A1E, -0.35, 0.89, -0.25, 0.26, 0.1, 0.18);
  const handset = box(g, 0x1B1A1E, -0.35, 0.97, -0.25, 0.32, 0.05, 0.07); handset.rotation.y = 0.1;
  box(g, 0x7A1E1E, -0.1, 0.86, 0.15, 0.36, 0.04, 0.26);
  box(g, 0xEFE3C4, -0.1, 0.885, 0.15, 0.32, 0.01, 0.22, false);
  // his chair: tall and red, a throne of a desk chair
  const c = add(cellar, new Group()); c.position.set(OFFICE.x, CY + D.h, OFFICE.z - 1.35);
  const LEATHER = 0x6B1E22;
  box(c, LEATHER, 0, 0.45, 0, 0.8, 0.14, 0.6);
  box(c, LEATHER, 0, 1.05, -0.24, 0.86, 1.2, 0.14);
  for (const s of [-1, 1]) box(c, LEATHER, s * 0.42, 0.65, 0, 0.12, 0.3, 0.5);
  add(c, mesh(G.cyl, 0x2A2A2E, 0, 0.2, 0)).scale.set(0.06, 0.4, 0.06);
  for (let i = 0; i < 5; i++) {
    const leg = box(c, 0x2A2A2E, Math.cos(i * 1.257) * 0.2, 0.04, Math.sin(i * 1.257) * 0.2, 0.4, 0.04, 0.05); leg.rotation.y = -i * 1.257;
  }
  for (let x = -0.33; x <= 0.34; x += 0.165) add(c, mesh(G.sphere, BRASS, x, 1.62, -0.16)).scale.setScalar(0.03);
  // and him, standing behind the desk in front of it, a size bigger than the people who work for him
  boss.position.set(OFFICE.x, CY + D.h, OFFICE.z - 0.8);
  boss.scale.setScalar(1.15);
  cellar.add(boss);

  // his safe: black iron, a gold wheel and a dial, turned a little to the room
  const safe = add(cellar, new Group()); safe.position.copy(VAULT); safe.rotation.y = -0.45;
  // (the body stops short of the iron bands, so their tops aren't level with its own)
  box(safe, 0x2E3238, 0, 0.7, 0, 1.1, 1.32, 1.0);
  box(safe, 0x3A3F46, 0, 0.7, 0.505, 0.94, 1.24, 0.02, false);
  add(safe, mesh(new TorusGeometry(0.2, 0.035, 6, 16), BRASS, 0.1, 0.7, 0.53));
  for (let i = 0; i < 4; i++) { const spoke = box(safe, BRASS, 0.1, 0.7, 0.53, 0.4, 0.03, 0.02, false); spoke.rotation.z = i * Math.PI / 4; }
  const dial = add(safe, mesh(G.cyl, 0xE8E4D8, -0.28, 0.95, 0.53)); dial.scale.set(0.09, 0.03, 0.09); dial.rotation.x = Math.PI / 2;
  for (const y of [0.05, 1.36]) box(safe, 0x1E2024, 0, y, 0, 1.14, 0.08, 1.04);

  // the visitors' chairs, facing the desk, on the rug from the door (in the middle of the wall, facing the desk)
  const door = DOORS.find(t => t.b === 'office')!;
  box(cellar, 0xC9A23A, (door.x0 + door.x1) / 2, CY + 0.01, (DAIS.z1 + OFFICE_ROOM.z1) / 2, 3.0, 0.02, OFFICE_ROOM.z1 - DAIS.z1 - 0.2, false);
  box(cellar, 0x8E2B2B, (door.x0 + door.x1) / 2, CY + 0.02, (DAIS.z1 + OFFICE_ROOM.z1) / 2, 2.8, 0.02, OFFICE_ROOM.z1 - DAIS.z1 - 0.4, false);
  for (const at of GUESTS) {
    const ch = add(cellar, new Group()); ch.position.set(at.x, CY, at.z); ch.rotation.y = Math.PI;
    for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) box(ch, WOOD_DARK, x, 0.22, z, 0.06, 0.44, 0.06);
    box(ch, 0xA8322D, 0, 0.47, 0, 0.52, 0.08, 0.5);
    box(ch, WOOD_DARK, 0, 0.8, -0.23, 0.52, 0.6, 0.06);
  }
  // the filing cabinet, with a lucky cat on it, waving
  const cab = add(cellar, new Group()); cab.position.set(CABINET.x, CY, CABINET.z);
  box(cab, 0x5B4636, 0, 0.7, 0, 0.6, 1.4, 0.8);
  for (const y of [0.35, 0.8, 1.2]) box(cab, BRASS, -0.31, y, 0, 0.02, 0.05, 0.22, false);
  add(cab, mesh(G.sphere, 0xF4F1EA, 0, 1.55, 0)).scale.set(0.15, 0.16, 0.13);
  add(cab, mesh(G.sphere, 0xF4F1EA, 0, 1.76, 0)).scale.setScalar(0.12);
  for (const s of [-1, 1]) add(cab, mesh(G.cone, 0xF4F1EA, 0, 1.86, s * 0.07)).scale.set(0.04, 0.07, 0.04);
  add(cab, mesh(G.sphere, 0xF4F1EA, -0.02, 1.8, 0.14)).scale.set(0.05, 0.08, 0.05);
  add(cab, mesh(G.cyl, 0xC0392B, 0, 1.66, 0)).scale.set(0.12, 0.02, 0.12);
  add(cab, mesh(G.cyl, 0xF2C14E, -0.12, 1.55, 0)).scale.set(0.06, 0.02, 0.06);
  // a fish tank on a cabinet against the west wall, with a little puffer in it
  const tank = add(cellar, new Group()); tank.position.set(TANK.x, CY, TANK.z);
  box(tank, 0x3E2418, 0, 0.42, 0, 0.6, 0.84, 1.5);
  box(tank, 0xC9B98E, 0, 0.9, 0, 0.5, 0.08, 1.4, false);
  const glass = add(tank, mesh(G.box, new MeshLambertMaterial({ color: 0x7FC4E8, emissive: 0x1E4A66, transparent: true, opacity: 0.45, depthWrite: false }), 0, 1.2, 0));
  glass.scale.set(0.52, 0.66, 1.42); glass.renderOrder = 1;
  box(tank, 0x1B1A1E, 0, 1.55, 0, 0.56, 0.05, 1.46, false);
  // a weed or two, and the little puffer on the sand (the swimmers are tankFish, below)
  add(tank, mesh(G.sphere, 0xEBD38E, 0.05, 1.04, 0.3)).scale.setScalar(0.07);
  for (const [z, h] of [[0.45, 0.25], [0.55, 0.18], [-0.5, 0.22]]) add(tank, mesh(G.cone, 0x5E9C5A, 0.08, 0.94 + h / 2, z)).scale.set(0.04, h, 0.04);
  tankFish.position.copy(tank.position);
  cellar.add(tankFish);
  // a plant in the corner, and the coat rack by the door with his spare hat
  const plant = add(cellar, new Group()); plant.position.set(PLANT.x, CY, PLANT.z);
  add(plant, mesh(new CylinderGeometry(0.28, 0.22, 0.5, 12), 0x8E4A2E, 0, 0.25, 0, true));
  for (const [x, y, z, r] of [[0, 0.8, 0, 0.32], [0.15, 1.05, 0.05, 0.24], [-0.12, 1.0, -0.08, 0.22], [0, 1.25, 0, 0.18]]) {
    add(plant, mesh(G.sphere, 0x3E7A3E, x, y, z, true)).scale.setScalar(r);
  }
  const rack = add(cellar, new Group()); rack.position.set(RACK.x, CY, RACK.z);
  add(rack, mesh(G.cyl, WOOD_DARK, 0, 0.9, 0, true)).scale.set(0.04, 1.8, 0.04);
  for (let i = 0; i < 3; i++) { const foot = box(rack, WOOD_DARK, 0, 0.03, 0, 0.5, 0.04, 0.05); foot.rotation.y = i * Math.PI / 3; }
  // his spare, not another of the fedora he's wearing: a straw boater with a navy band, the same size (fugu.ts' brim, at
  // his 1.15), hung on the top of the pole
  const spare = add(rack, new Group()); spare.position.set(0.06, 1.84, 0); spare.rotation.set(0.12, 0, -0.2);
  add(spare, mesh(new CylinderGeometry(0.425, 0.425, 0.028, 20), STRAW, 0, 0, 0, true));
  add(spare, mesh(new TorusGeometry(0.425, 0.016, 5, 24), 0xC9AE62)).rotation.x = Math.PI / 2;
  add(spare, mesh(new CylinderGeometry(0.25, 0.26, 0.17, 18), STRAW, 0, 0.095, 0, true));
  add(spare, mesh(new CylinderGeometry(0.265, 0.265, 0.06, 18), 0x1F3A5F, 0, 0.045, 0));
  add(rack, mesh(G.box, 0xC49A5A, -0.1, 1.35, 0, true)).scale.set(0.12, 0.7, 0.3);
}

// ---------- the ladder up to the dock, in the daylight coming down through the hatch ----------
{
  const g = add(cellar, new Group()); g.position.copy(LADDER); g.rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) box(g, WOOD, s * 0.3, 3.4, 0, 0.08, 6.8, 0.08);
  for (let y = 0.35; y < 6.6; y += 0.42) box(g, WOOD, 0, y, 0, 0.6, 0.05, 0.06);
  const beam = add(g, mesh(new ConeGeometry(BEAM_R, 7.2, 20, 1, true), new MeshBasicMaterial({ color: 0xBFE3FF, transparent: true, opacity: 0.09, blending: AdditiveBlending, depthWrite: false })));
  beam.position.y = 3.6;
  beam.renderOrder = 2;
}

// ---------- the drummers' drums (the Underground Arena's) ----------
export const DRUMS = [V(-9.9, CY, RING.z - 2.6), V(-9.9, CY, RING.z + 2.6)];
for (const at of DRUMS) {
  const g = add(parts.drums, new Group()); g.position.set(at.x, CY, at.z);
  const d = add(g, mesh(new CylinderGeometry(0.42, 0.42, 0.55, 16), 0x7A3B2E, 0, 0.75, 0, true));
  d.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) add(g, mesh(new CylinderGeometry(0.43, 0.43, 0.02, 16), 0xF2E6CC, s * 0.28, 0.75, 0)).rotation.z = Math.PI / 2;
  box(g, WOOD_DARK, 0, 0.3, 0, 0.5, 0.6, 0.5);
}

/** Puts up the venue's tier `t` (0 to 3), and everything below it: the stands it adds, and its decorations. */
export function showVenue(t: number) {
  parts.bleachers.visible = t >= 1;
  parts.tier.visible = parts.drums.visible = t >= 2;
  parts.vip.visible = t >= 3;
}
/** The grow room is found: the prep hall's stone wall comes down, its gate open, and there it is. */
export function showGrowRoom(on = true) {
  parts.grow.visible = on;
  parts.hidden.visible = !on;
  found.grow = on;
  lights[7].intensity = on ? GROW_GLOW : 0;
}

// ---------- light ----------
/** The cellar's lights: the lamp over the ring, two lanterns' worth of warm light over the stands, the hearth's fire
 *  (lighting the hearth room), the hatch's daylight (the landing), the office's lamp, the dumbwaiter's lamp in the prep
 *  hall, (once it's found) the grow room's sickly glow, and the workshop's lamp. */
export const lights = [
  new PointLight(0xFFD7A0, 16, 15, 1.2), new PointLight(0xFF9A5A, 9, 10, 1.5), new PointLight(0xFF9A5A, 9, 10, 1.5),
  new PointLight(0xFF9A4A, 8, 8, 1.5), new PointLight(0xCFE8FF, 10, 7, 1.4), new PointLight(0xFFC77A, 8, 9, 1.4),
  new PointLight(0xFFD08A, 8, 9, 1.4), new PointLight(0x9CE6C8, 9, 11, 1.4), new PointLight(0xFFC98A, 7, 8, 1.4),
];
lights[0].position.set(RING.x, CY + 5.4, RING.z);
lights[1].position.set(RING.x, CY + 3.4, ARENA.z0 + 1.5);
lights[2].position.set(ARENA.x0 + 1.5, CY + 3.4, RING.z + 1);
lights[3].position.set(HEARTH.x, CY + 1.1, HEARTH.z + 1.3);
lights[4].position.set(LADDER.x - 1.2, CY + 4, LADDER.z + 0.8);
lights[5].position.set(OFFICE.x + 1.5, CY + 3.4, OFFICE.z + 1.2);
lights[6].position.set((PREP.x0 + PREP.x1) / 2 + 1, CY + 3.2, (PREP.z0 + PREP.z1) / 2);
lights[7].position.set((GROW.x0 + GROW.x1) / 2, CY + 3.0, (GROW.z0 + GROW.z1) / 2);
lights[8].position.set(BENCH.x + 2.2, CY + 2.8, BENCH.z);
const GROW_GLOW = lights[7].intensity;
lights[7].intensity = 0;
lights.forEach(l => { l.visible = false; scene.add(l); });
/** The cellar's sky: near-black brown, warm low light, as stage.ts's day and dusk are for the world above. */
export const CELLAR_SKY = { bg: new Color(0x1B1512), sky: 0xFFD7A8, grd: 0x4A3428, hemi: 0.4, sun: 0xFFC98F, sunI: 0.34 };

/** Shows the cellar (stage 3). */
export function showCellar() { cellar.visible = true; }
/** The cellar's lights on while the player's down there, off above (each light costs every material in the scene). */
// (the grow room's glow is there all along, dark till it's found: lighting a new light mid-bout would recompile every
// material in the scene)
export function cellarLights(on: boolean) { lights.forEach(l => { l.visible = on; }); }

// ---------- walking ----------
/** What a walker can't walk through down here, as boxes (centre and half-sizes, a walker's width included): the ring,
 *  the stands, the soup bar, the sake barrels, the gong and the cashier's window, the hearth and the counter, the
 *  dumbwaiter and its bins, the machines built so far, the teppo post, the office's furniture, and what the venue's
 *  tiers add. (The rooms' walls are where the floor ends: layout.ts.) */
export function cellarBoxes(machines: Record<'rice' | 'fish' | 'mush', number> = { rice: 0, fish: 0, mush: 0 }) {
  const t = parts.tier.visible;
  const boxes: [cx: number, cz: number, hx: number, hz: number][] = [
    [RING.x, RING.z, RING_HALF + RING_FOOT + 0.2, RING_HALF + RING_FOOT + 0.2],
    [(BACK.a0 + BACK.a1) / 2, BACK.wall + (t ? 1.5 : 1.1), (BACK.a1 - BACK.a0) / 2 + 0.2, t ? 1.65 : 1.2],
    ...BAR_BOXES,
    [GONG.x, GONG.z, 0.45, 1.15],
    [CASHIER.x, CASHIER.z, 0.65, 1.3],
    [TEPPO.x, TEPPO.z, 0.5, 0.5],
    [KOMO.x, KOMO.z, 0.5, 1.45],
    // the hearth room: the hearth and the counter behind it, and the bowl counter
    [HEARTH.x, (KITCHEN.z0 + HEARTH.z + HEARTH.d / 2 + 0.6) / 2, HEARTH.w / 2 + 0.3, (HEARTH.z + HEARTH.d / 2 + 0.6 - KITCHEN.z0) / 2 + 0.3],
    [COUNTER.x, COUNTER.z, 0.75, 0.95],
    // the prep hall: the sacks (what comes down the dumbwaiters is all behind the east wall)
    [SACKS.x, SACKS.z, 0.75, 0.75],
    ...KITCHEN_BINS.map((b): [number, number, number, number] => [b.x, b.z, 0.65, 0.65]),
    // the workshop: the bench, the tansu, the fish crates, the sake barrels, the timber, the beam on its trestles, the
    // rope, the heap of net and the bucket
    [BENCH.x, BENCH.z, BENCH.w / 2 + 0.1, BENCH.d / 2 + 0.1],
    [TANSU.x, TANSU.z, 0.7, 0.5],
    [CRATES.x, CRATES.z, 0.95, 0.45],
    [SAKE.x, SAKE.z, 0.85, 0.5],
    [TIMBER.x, TIMBER.z, 0.4, 0.95],
    [BEAM.x, BEAM.z, 1.15, 0.45],
    [COILS.x, COILS.z, 0.75, 0.4],
    [HEAP.x, HEAP.z, 0.85, 0.45],
    [BUCKET.x, BUCKET.z, 0.45, 0.45],
    // the office: the dais and the desk, the safe, the visitors' chairs, the cabinet, the fish tank, the plant and the rack
    [(DAIS.x0 + DAIS.x1) / 2, (DAIS.z0 + DAIS.z1) / 2, (DAIS.x1 - DAIS.x0) / 2 + 0.3, (DAIS.z1 - DAIS.z0) / 2 + 0.3],
    [VAULT.x, VAULT.z, 0.9, 0.85],
    ...GUESTS.map((g): [number, number, number, number] => [g.x, g.z, 0.5, 0.5]),
    [CABINET.x, CABINET.z, 0.6, 0.7],
    [TANK.x, TANK.z, 0.6, 1.05],
    [PLANT.x, PLANT.z, 0.55, 0.55],
    [RACK.x, RACK.z, 0.4, 0.4],
  ];
  for (const k of ['rice', 'fish', 'mush'] as const) {
    if (k === 'mush' && !found.grow) continue;
    for (let i = 0; i < Math.min(MAX_MACHINES, machines[k]); i++) {
      const m = machineAt(k, i);
      boxes.push(k === 'mush' ? [m.x, m.z, 1.25, 0.65] : [m.x, m.z, 0.5, 0.5]);
    }
  }
  if (parts.bleachers.visible) boxes.push([WEST.wall + (t ? 1.5 : 1.1), (WEST.a0 + WEST.a1) / 2, t ? 1.65 : 1.2, (WEST.a1 - WEST.a0) / 2 + 0.2]);
  if (parts.vip.visible) boxes.push([RING.x, VIP_Z + 0.05, 3.75, 0.5]);
  if (parts.drums.visible) for (const d of DRUMS) boxes.push([d.x, d.z, 0.6, 0.6]);
  return boxes;
}
/** Keeps the player out of everything in the cellar they can't walk through: out by the nearest side that's clear of
 *  every box and still on the floor. (Pushed out of each box in turn, two that touch, or one against a wall, would
 *  bounce them back and forth between, a frame each.) */
export function collideCellar(p: XZ, machines?: Record<'rice' | 'fish' | 'mush', number>) {
  const boxes = cellarBoxes(machines), floors = walkable();
  const inside = (x: number, z: number, [cx, cz, hx, hz]: (typeof boxes)[number], e = 1e-6) => Math.abs(x - cx) < hx - e && Math.abs(z - cz) < hz - e;
  const blocked = (x: number, z: number) => boxes.some(b => inside(x, z, b));
  if (!blocked(p.x, p.z)) return;
  let bx = 0, bz = 0, bd = Infinity;
  for (const b of boxes) {
    if (!inside(p.x, p.z, b, 0)) continue;
    const [cx, cz, hx, hz] = b;
    for (const [x, z] of [[cx - hx, p.z], [cx + hx, p.z], [p.x, cz - hz], [p.x, cz + hz]]) {
      const q = { x, z }; keepOnFloor(q, floors);
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (q.x === x && q.z === z && d < bd && !blocked(x, z)) { bd = d; bx = x; bz = z; }
    }
  }
  if (bd < Infinity) { p.x = bx; p.z = bz; return; }
  for (const [cx, cz, hx, hz] of boxes) pushOutOfBox(p, cx, cz, hx, hz);
}

// ---------- one mesh for the furniture ----------
/** The vertex-coloured material the furniture's baked with, by side. */
const bakedMats = new Map<Facing, MeshLambertMaterial>();
const bakedMat = (side: Facing) => bakedMats.get(side) ?? bakedMats.set(side, new MeshLambertMaterial({ vertexColors: true, side })).get(side)!;
/** Whether a mesh is plain furniture: one flat colour, nothing drawn on it, not glowing, not see-through. */
const plain = (m: Material | Material[]): m is MeshLambertMaterial => !Array.isArray(m) && m instanceof MeshLambertMaterial
  && !m.map && !m.transparent && m.opacity === 1 && !m.vertexColors && m.emissive.getHex() === 0;
/**
 * Bakes the still furniture under `root` into a few meshes: every plain one that's shown is merged, its colour as a
 * vertex colour, into one mesh per side and shadow setting, in `root`'s own space (so a part popping in still pops).
 * What moves or changes (`keep`) is left as it is. The cellar has nearly two thousand meshes, and a phone can't draw
 * that many one by one with a boss's crowd on the floor.
 */
function bakeStill(root: Object3D, keep: Set<Object3D>) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), m4 = new Matrix4();
  const bins = new Map<string, BufferGeometry[]>(), baked: Mesh[] = [];
  const walk = (o: Object3D) => {
    for (const c of o.children) {
      if (keep.has(c) || !c.visible) continue;
      const m = c as Mesh;
      if (!m.isMesh || (m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || c.children.length || !plain(m.material)) { walk(c); continue; }
      const g = m.geometry.index ? m.geometry.toNonIndexed() : copyGeo(m.geometry);
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      m4.multiplyMatrices(toRoot, m.matrixWorld);
      g.applyMatrix4(m4);
      // (mirrored, its triangles turn inside out: turned back)
      if (m4.determinant() < 0) {
        for (const a of [g.attributes.position, g.attributes.normal]) {
          for (let i = 0; i < a.count; i += 3) for (let j = 0; j < a.itemSize; j++) { const t = a.array[(i + 1) * a.itemSize + j]; a.array[(i + 1) * a.itemSize + j] = a.array[(i + 2) * a.itemSize + j]; a.array[(i + 2) * a.itemSize + j] = t; }
        }
      }
      paint(g, m.material.color.getHex());
      const key = `${+m.castShadow}${+m.receiveShadow}${m.material.side}`;
      (bins.get(key) ?? bins.set(key, []).get(key)!).push(g);
      baked.push(m);
    }
  };
  walk(root);
  for (const m of baked) m.removeFromParent();
  for (const [key, geos] of bins) {
    const o = new Mesh(mergeGeometries(geos)!, bakedMat(Number(key[2]) as Facing));
    o.castShadow = key[0] === '1'; o.receiveShadow = key[1] === '1';
    root.add(o);
    geos.forEach(g => g.dispose());
  }
}
// (the gong's disc swings, the pot's stew changes colour, Mr. Fugu puffs up; and the venue's parts and the grow room
// come and go, so each is baked on its own)
bakeStill(cellar, new Set<Object3D>([gongDisc, potMesh, boss, tankFish, ...Object.values(parts)]));
for (const g of Object.values(parts)) bakeStill(g, new Set());
