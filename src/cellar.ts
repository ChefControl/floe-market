// The cellar under the dock (stage 3): Mr. Fugu's sumo ring and the stew kitchen that feeds its fans, in rooms side by
// side, with thin walls and doorways between them. The arena: a big clay dohyo under lanterns in the middle, crates and
// planks for stands along the back and west walls, the soup bar by the hearth room's door, the gong out on the floor
// south-west of the ring, and the cashier's window against the east wall. Down the middle, Mr. Fugu's office (his desk
// on a dais), the landing with the ladder up to the hatch in the dock, and the hearth room: the big pot, its ledge and
// the bowl counter. To the east the prep hall, where the dumbwaiter from the restaurant's kitchen comes down beside the
// racks and barrels, and behind its stone north wall the grow room, which nobody knows is there until the first boss is
// beaten. It's built CELLAR_Y under the dock, out of the camera's sight from up there, dug into the earth. Only the
// back walls along the very back of the cellar go up high, all to one height: every other wall is low, all to one
// height too, so the camera sees into every room, and the earth round the rooms comes up level with their tops.
// This module is the rooms and their furniture; where things are is cellarPlan.ts, and the kitchen's lines, the bouts
// and the swarm draw themselves (ringKitchen.ts, dohyo.ts, swarm.ts).
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry,
  type Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, PointLight, type Side as Facing, TorusGeometry,
  TubeGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  ARCH_HALF, ARCHES, BAR, BAR_STOOLS, BARRELS, BENCH, BIN_PADS, BINS, BOOTHS, CASHIER, GUARDS, MID_BOOTH, CLUB_DOOR, CLUB_WAY, DEN_BAR, DEN_TABLES, DESKS, LEDGER, SNUG, STAGE, CHUTE, chuteY, COUNTER, GONG, HEARTH, LIFTS, machineAt, MAX_MACHINES, POT, STORES, TEPPO, TUNNEL_D, TUNNEL_W, TUNNELS,
} from './cellarPlan';
import { Fugu } from './fugu';
import { apart, Build, dice, K, quietly, rbox, shade, shadowsOf, tube } from './kit';
import { ARENA, CARDS, CELLAR_Y, type CellarRoom, CRAFT, DEN, DOORS, found, GROW, keepOnFloor, KITCHEN, LANDING, LIFT_ROOM, LOANS, OFFICE_ROOM, PASSAGE, PREP, pushOutOfBox, ROOMS, VIP, walkable } from './layout';
import { type CanvasTex, canvasTex, copyGeo, type Draw, FONT, G, mat, mesh, OFF, paint, rr, scene } from './render';
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
const SACKS = { x: PREP.x1 - 0.42, z: (BIN_PADS.rice.z + BIN_PADS.fish.z) / 2 };

// ---------- materials ----------
const WOOD = 0x8A5A3B, WOOD_DARK = 0x5B3424, PILE = 0x4A3A30, STRAW = 0xD9C47E;
const IRON = 0x2E2E33, STEEL_DARK = 0x4B5257;
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

// The cellar's rooms and furniture are built the first time they're needed (stage 3 reached: buildCellar), not as the
// game loads: they were well over a third of its loading, for a stage most players never see, or not for hours.
/** What's built then, in order. */
const toBuild: (() => void)[] = [];
/** Puts off building `f` till then. */
const later = (f: () => void) => { toBuild.push(f); };
/** A texture that tiles, drawn the first time it's asked for. */
function tiling(w: number, h: number, draw: Draw) {
  let t: CanvasTex | null = null;
  return () => {
    if (!t) { t = canvasTex(w, h, draw); t.tex.wrapS = t.tex.wrapT = 1000; } // RepeatWrapping
    return t;
  };
}

/** The whole cellar, hidden until stage 3. Everything in it is placed in world coordinates (y from CY). */
export const cellar = new Group();
cellar.visible = false;
scene.add(cellar);
/** Parts that come with the venue's tiers, shown when they're bought: the bleachers (the Back-Alley Ring), the upper
 *  tier and the taiko drums (the Underground Arena), and the VIP boxes (the Grand Hall Below). And the grow room, with
 *  the doorway into it, found when the first boss is beaten (until then, `hidden`: the prep hall's tall back wall); and
 *  the Undertow and its tunnel, found when the second is (until then, `denHidden`: the arena's wall across its mouth). */
export const parts = {
  bleachers: new Group(), tier: new Group(), vip: new Group(), drums: new Group(), grow: new Group(), hidden: new Group(),
  // (the Undertow's made on dice of their own, so loading draws from the game's luck just what it did before it: see
  // BUILT_WITH)
  ...apart(() => ({ den: new Group(), denHidden: new Group() }), dice(0xDE4)),
};
Object.values(parts).forEach(g => { g.visible = false; cellar.add(g); });
parts.hidden.visible = parts.denHidden.visible = true;

// ---------- the rooms ----------
const earth = tiling(256, 256, (c, w, h) => {
  c.fillStyle = '#6A5444'; c.fillRect(0, 0, w, h);
  // blotches scattered by a fixed hash (no Math.random: that's the game's; and no steady step, which lines them up
  // in stripes)
  const hash = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 260; i++) {
    c.fillStyle = i % 2 ? 'rgba(40,28,20,.16)' : 'rgba(150,120,90,.10)';
    c.beginPath(); c.arc(hash(i) * w, hash(i + 500) * h, 3 + hash(i + 1000) * 12, 0, Math.PI * 2); c.fill();
  }
});
/** A board floor, for the kitchen. */
const boards = tiling(256, 256, (c, w, h) => {
  for (let i = 0; i < 8; i++) {
    c.fillStyle = ['#8A6244', '#93694A', '#80593D', '#8E6546'][i % 4]; c.fillRect(0, i * h / 8, w, h / 8);
    c.fillStyle = 'rgba(40,24,14,.5)'; c.fillRect(0, i * h / 8, w, 2);
    c.fillRect(((i * 97) % 200) + 20, i * h / 8, 2, h / 8);
  }
});
/** Stone flags, for the landing: grey slabs of a few sizes, in rows, with dark joints. */
const flags = tiling(256, 256, (c, w, h) => {
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
/** Dark basket-weave parquet, for Mr. Fugu's office: squares of four strips, each square turned from the last. */
const parquet = tiling(256, 256, (c, w, h) => {
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
/** Near-black boards, for the Undertow: narrow, polished, a cold sheen along them. */
const denBoards = tiling(256, 256, (c, w, h) => {
  for (let i = 0; i < 12; i++) {
    c.fillStyle = ['#1C1D22', '#211F24', '#19191E', '#1F1E22'][i % 4]; c.fillRect(0, i * h / 12, w, h / 12);
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, i * h / 12, w, 2);
    c.fillRect(((i * 97) % 200) + 20, i * h / 12, 2, h / 12);
    c.fillStyle = 'rgba(140,210,210,.06)'; c.fillRect(((i * 53) % 180) + 30, i * h / 12 + 6, 80, 3);
  }
});
const SIDE = mat(0x3A2C22);
/** A floor over `r`, out to the middle of its walls, of earth or boards, its texture repeating every 4 m. */
function floor(r: Rect, tex: CanvasTex, pad = 0.3, parent: Object3D = cellar) {
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
  // (only along this room's own side: the arena's west wall is in line with the club's, south of it)
  const alongside = (t: (typeof DOORS)[number]) => side === 'n' || side === 's' ? t.x1 > r.x0 && t.x0 < r.x1 : t.z1 > r.z0 && t.z0 < r.z1;
  return DOORS.filter(t => alongside(t) && (side === 'n' ? on(t.z1, r.z0) : side === 's' ? on(t.z0, r.z1) : side === 'w' ? on(t.x1, r.x0) : on(t.x0, r.x1)))
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
const stone = tiling(256, 256, (c, w, h) => {
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
    const tex = stone().tex.clone(); tex.repeat.set((a1 - a0) / 2, WALL / 2); tex.needsUpdate = true;
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
  // (its cap the piles' walls' own, as high and as deep, so the three run on as one along the top; a moulding under it)
  box(cellar, WOOD_DARK, mid, CY + TALL - 0.1, line(r, 'n', 0.75), len, 0.2, 1.1, false);
  box(cellar, WOOD_DARK, mid, CY + TALL - 0.3, z + 0.14, len, 0.16, 0.12, false);
  // a timber post at each end, from the piles' planks either side out past its own face, so nothing shows behind it and
  // no face of the walls either side is flush with one of its own (two faces in one place flicker)
  const front = z + 0.32, rear = line(r, 'n', 0.95);
  for (const x of [x0, x1]) box(cellar, PILE, x, CY + (TALL - 0.2) / 2, (front + rear) / 2, 0.4, TALL - 0.2, front - rear, false);
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
  for (const [a0, a1] of spans(r, side)) planks(parent, along, at, a0, a1);
}
/** A stretch of plank wall from `a0` to `a1` along x (`along`) or z, standing at `at`. */
function planks(parent: Object3D, along: boolean, at: number, a0: number, a1: number) {
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
/** How high the Undertow's back walls stand: the club's behind the bar and the arches, Harry's office's behind his desk
 *  and his shelves, and Tommy's and Eddie's rooms' behind them (they hide nothing but earth: the rest are low like the cellar's
 *  others, so the camera sees in). */
const DEN_TALL = 2.9;
/** One of the Undertow's walls: dark panelling on a footing under an iron rail, tall along the very back (the club's
 *  north wall, the office's north and west ones, and the west ones of Tommy's and Eddie's rooms) and low everywhere else,
 *  iron posts along the low ones (the club's west and south walls low too, between it and the side rooms); along the
 *  club's front, a pink tube on its rail. */
function denWall(r: Rect, side: Side) {
  const between = (r === DEN && (side === 'w' || side === 's')) || (r === LOANS && side === 's'), off = side === 'n' || between ? 0.3 : 0.1, along = side === 'n' || side === 's', at = line(r, side, off);
  stands(r, side, off);
  for (const [a0, a1] of spans(r, side)) {
    const tall = side === 'n' || ((r === LOANS || r === VIP || r === CARDS) && side === 'w'), h = tall ? DEN_TALL : WALL, mid = (a0 + a1) / 2, len = a1 - a0;
    const put = (y: number, l: number, hh: number, t: number, c: number | Material, cast = true) =>
      along ? box(parts.den, c, mid, CY + y, at, l, hh, t, cast) : box(parts.den, c, at, CY + y, mid, t, hh, l, cast);
    put(0.08, len, 0.16, 0.22, 0x2A2F33);
    put(h / 2, len, h, 0.12, 0x1A2024);
    put(h + 0.04, len + 0.1, 0.08, 0.2, 0x262E33);
    if (tall) put(WALL, len, 0.05, 0.16, 0x262E33);
    else {
      const n = Math.max(1, Math.round(len / 1.8));
      for (let k = 0; k <= n; k++) {
        const a = a0 + (len * k) / n;
        along ? box(parts.den, 0x262E33, a, CY + WALL / 2, at, 0.1, WALL + 0.1, 0.16) : box(parts.den, 0x262E33, at, CY + WALL / 2, a, 0.16, WALL + 0.1, 0.1);
      }
    }
    if (r === DEN && side === 's') box(parts.den, glow(0xFFA8D0, 0xFF2E86), mid, CY + WALL + 0.1, at, len - 0.5, 0.035, 0.035, false);
  }
}
later(() => {
  // the ground under it all, so nothing shows the void past a floor's edge
  box(cellar, 0x2A201A, (LOANS.x0 + LIFT_ROOM.x1) / 2, CY - 0.3, (ARENA.z0 + DEN.z1) / 2, LIFT_ROOM.x1 - LOANS.x0 + 4, 0.5, DEN.z1 - ARENA.z0 + 4, false);
  // the rooms: floors, and their walls (tall at the very back, thin and low everywhere else)
  // (each room its own: packed earth round the ring and in the grow room, stone flags in the landing and the prep hall,
  // parquet in the office, boards in the hearth room)
  floor(ARENA, earth()); floor(LANDING, flags()); floor(OFFICE_ROOM, parquet()); floor(KITCHEN, boards()); floor(PREP, flags());
  tallWall(ARENA, 'n'); tallWall(ARENA, 'w'); wall(ARENA, 's');
  officeWall(); wall(OFFICE_ROOM, 'w', 0.3); wall(OFFICE_ROOM, 'e', 0.3);
  wall(LANDING, 'n', 0.3); wall(LANDING, 'w', 0.3); wall(LANDING, 'e', 0.3);
  wall(KITCHEN, 'n', 0.3); wall(KITCHEN, 'w', 0.3); wall(KITCHEN, 'e', 0.3); wall(KITCHEN, 's', 0.3);
  // the cookware shop, through the hearth room's south wall
  floor(CRAFT, boards()); wall(CRAFT, 'w'); wall(CRAFT, 'e', 0.3); wall(CRAFT, 's');
  wall(PREP, 'e', 0.3); wall(PREP, 's');
  // the lift room behind the prep hall's east wall, where nobody goes: just the dumbwaiters
  floor(LIFT_ROOM, flags()); wall(LIFT_ROOM, 'n', 0.3); wall(LIFT_ROOM, 'e'); wall(LIFT_ROOM, 's', 0.3);
  // the prep hall's back: a stone wall with a locked gate the player walks past every day, until the gate opens on the
  // grow room behind
  stoneWall();
  wall(PREP, 'n', 0.3, parts.grow);
  { // the gate, swung open into the grow room
    const t = DOORS.find(d => d.b === 'grow')!;
    bars(parts.grow, (t.x0 + t.x1) / 2, PREP.z0 - 0.4, t.x1 - t.x0 + 0.1, 1.75, Math.PI / 2 - 0.15);
  }
  floor(GROW, earth(), 0.3, parts.grow); tallWall(GROW, 'n', parts.grow); wall(GROW, 'e', 0.1, parts.grow);
  // the Undertow: a tunnel through the arena's south wall, into the Family's back room dug into the rock in front of the
  // arena. Until the second boss is beaten, the arena's wall runs on across the tunnel's mouth, and there's only earth
  // behind it (denHidden).
  {
    const t = DOORS.find(d => d.b === 'passage')!;
    planks(parts.denHidden, true, line(ARENA, 's', 0.1), t.x0 - 0.3, t.x1 + 0.3);
  }
  // (the tunnel's dug back to the arena's own wall, and its floor runs from the arena's to the room's)
  stands(PASSAGE, 'n', PASSAGE.z0 - line(ARENA, 's', 0.1));
  floor({ x0: PASSAGE.x0, x1: PASSAGE.x1, z0: ARENA.z1 + 0.4, z1: PASSAGE.z1 + 0.1 }, earth(), 0.1, parts.den);
  wall(PASSAGE, 'w', 0.1, parts.den); wall(PASSAGE, 'e', 0.1, parts.den); wall(PASSAGE, 's', 0.1, parts.den);
  // (the short way through the rock from the tunnel to the club's doors: boarded, and walled either side)
  floor(CLUB_WAY, denBoards(), 0.1, parts.den);
  for (const z of [CLUB_WAY.z0 - 0.1, CLUB_WAY.z1 + 0.1]) planks(parts.den, true, z, CLUB_WAY.x0 + 0.1, CLUB_WAY.x1 - 0.1);
  floor(DEN, denBoards(), 0.3, parts.den);
  for (const side of ['n', 'w', 'e', 's'] as const) denWall(DEN, side);
  // Harry's office, through the club's west wall (the club's wall between them)
  floor(LOANS, parquet(), 0.3, parts.den);
  for (const side of ['n', 'w', 's'] as const) denWall(LOANS, side);
  // Tommy's card room, through the club's west wall south of the office (the club's wall and the office's between)
  floor(CARDS, denBoards(), 0.3, parts.den);
  for (const side of ['w', 's'] as const) denWall(CARDS, side);
  // Eddie's room, through the club's south wall (the club's wall between them)
  floor(VIP, parquet(), 0.3, parts.den);
  for (const side of ['w', 'e', 's'] as const) denWall(VIP, side);
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
});

// ---------- the earth the cellar's dug into ----------
// Everything round the rooms is solid ground, so past a wall there's never an edge of the world: cut level with the low
// walls in front (just under their rails, so each shows as a rim round its room and the two never flicker), and banked
// up to the tall walls' caps behind them, with a rock face where the two meet. It's one mesh over the whole cellar and
// far out past it, with each room left open out to its walls' middles. As in the dungeons of a game seen from above,
// the rooms are the only lit places down here: a step out from a wall the ground turns to rough, broken rock with
// boulders lying about on it, and a few metres out it's gone into the dark, the same near-black as the cellar's murk,
// so there's no edge to see, only the lit rooms in the dark. The fans' tunnels run under the bank, which stays whole
// over them (no rock face cuts across one). While the grow room's a secret, its place is ground like the rest
// (parts.hidden), and it opens up when it's found; the same for the Undertow and its tunnel (parts.denHidden). Nothing
// in it moves: it's drawn as it is, with no shadows.
/** The earth's top: in front, under the low walls' rails, and behind the back walls, under their caps. */
export const GROUND = { cut: WALL + 0.06, bank: TALL - 0.02 };
/** The rock round the rooms: dark broken stone, cracked, with flat-topped chips catching the light, drawn wrapped round
 *  so it tiles. */
const dirt = tiling(256, 256, (c, w, h) => {
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
/** The earth's meshes, once it's built: round the rooms (near the Undertow, lit once it's found and dark till then), and
 *  the secret rooms' places while they're secrets; the crags, and the kerbs round the rooms, round the grow room, round
 *  the Undertow, and along the arena's wall across the tunnel's mouth while it's a secret. */
export const ground = {} as Record<'open' | 'nearDen' | 'nearDenShut' | 'hidden' | 'denHidden' | 'rocks' | 'kerb' | 'growKerb' | 'denKerb' | 'mouthKerb', Mesh>;
later(() => {
  // (both sides drawn: a rock face seen from behind, past a wall's end, still shows as rock; and no light of the rooms'
  // on it at all, so none ever seems to come through a wall: its light is drawn into it, a facet at a time, by `bake`)
  const EARTH = new MeshBasicMaterial({ map: dirt().tex, vertexColors: true, side: DoubleSide });
  const rooms = [...Object.values(ROOMS), LIFT_ROOM, CLUB_WAY], holes = rooms.map(dug);
  const grow = holes[rooms.indexOf(GROW)], den = [PASSAGE, DEN, CLUB_WAY, LOANS, VIP, CARDS].map(r => holes[rooms.indexOf(r)]);
  const A = dug(ARENA), O = dug(OFFICE_ROOM);
  /** The secret rooms: their holes, what they're shown in once found, and what covers them till then. */
  const secrets = [{ holes: [grow], open: parts.grow, shut: parts.hidden }, { holes: den, open: parts.den, shut: parts.denHidden }];
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
  /** The earth's top at a point (from CY), or null where a room's dug out: banked up, or cut low everywhere else (`shut`:
   *  as it is while the Undertow's a secret, its place still ground). */
  const top = (x: number, z: number, shut = false) => holes.some(b => !(shut && den.includes(b)) && within(b, x, z)) ? null
    : banks.some(b => within(b, x, z)) ? GROUND.bank : GROUND.cut;
  /** Which secret room's place a point is in, if any (and in no other room's). */
  const secretAt = (x: number, z: number) =>
    secrets.find(s => s.holes.some(b => within(b, x, z)) && !holes.some(b => !s.holes.includes(b) && within(b, x, z))) ?? null;
  const secret = (x: number, z: number) => secretAt(x, z) !== null;
  const bored = (x: number, z: number) => bores.some(b => within(b, x, z));
  const bb = holes.reduce((b, h) => ({ x0: Math.min(b.x0, h.x0), x1: Math.max(b.x1, h.x1), z0: Math.min(b.z0, h.z0), z1: Math.max(b.z1, h.z1) }));
  /** How far a point is from a box (0 inside it), and from the nearest room, and from the nearest bank. */
  const off = (b: Box, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  const nearest = (bs: Box[], x: number, z: number) => { let d = Infinity; for (const b of bs) d = Math.min(d, off(b, x, z)); return d; };
  const fromRoom = (x: number, z: number) => nearest(holes, x, z);
  const fromBank = (x: number, z: number) => nearest(banks, x, z);
  /** `f` worked out once for each point it's asked about (the squares' corners are shared, four squares to one, and a
   *  quad paints each of its corners twice: done over, they made the ground most of the cellar's building time). */
  const once = (f: (x: number, z: number) => number) => {
    const seen = new Map<number, Map<number, number>>();
    return (x: number, z: number) => {
      let row = seen.get(x);
      if (!row) seen.set(x, row = new Map());
      let v = row.get(z);
      if (v === undefined) row.set(z, v = f(x, z));
      return v;
    };
  };
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
  const rough = once((x, z) => ease(0.35, 2.5, fromRoom(x, z)) * ease(0.3, 1.2, fromBank(x, z)));
  const roughHidden = (x: number, z: number) => ease(0.35, 2.5, Math.max(0, ...holes.filter(b => within(b, x, z)).map(b => Math.min(x - b.x0, b.x1 - x, z - b.z0, b.z1 - z))));
  // (the rise in front of the rooms is the same whether the Undertow's found or not, so that once it is, nothing in
  // front of it stands up into the camera's sight of it; but the ground round it is only lit once it's found: near it,
  // the earth's drawn twice, lit in parts.den and dark in parts.denHidden)
  const lit = holes.filter(b => b !== grow), litShut = lit.filter(b => !den.includes(b));
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
        for (let d = 0; d < most; d += 0.25) for (const b of lit) if (within(b, x + dx * d, z + dz * d)) return d;
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
  const rise = once((x, z) => {
    const t = before(x, z);
    if (t === Infinity) return 0;
    const up = Math.max(0, t - 1) * SLOPE * ease(1, 3, t) * (0.65 + 0.35 * lumps(x * 0.6 + 21, z * 0.6 - 7));
    return Math.min(up, 3.8 + 1.2 * lumps(x * 0.4 - 5, z * 0.4 + 13));
  });
  /** The ground's height at a corner, on its square's level: the cut ground lumpy, rising and dipping as it goes out, and
   *  rising toward the camera in front of the rooms. */
  const lift = (x: number, z: number, h: number, inGrow = false) =>
    h === GROUND.cut ? h + (inGrow ? roughHidden(x, z) : rough(x, z)) * (lumps(x, z) - 0.32) * 1.1 + (inGrow ? 0 : rise(x, z)) : h;
  // not lit by the rooms at all (their lights stay inside their walls): just made out right by a wall, and gone into the
  // dark 4 m out, a little uneven; the grow room's place as dark as the rest while it's a secret. The rise in front of
  // the rooms never quite goes: its slope and ridge stay just made out, dark rock against the dark.
  const DARK = 4;
  const fromLit = (x: number, z: number, found: boolean) => nearest(found ? lit : litShut, x, z);
  const shading = (found: boolean) => once((x, z) => {
    const k = 1 - ease(0, DARK, fromLit(x, z, found)), t = before(x, z);
    const near = k * k * (0.75 + 0.5 * lumps(x + 9, z - 4)) * 0.45;
    return t === Infinity ? near : Math.max(near, 0.2 * ease(1.5, 4, t) * (0.7 + 0.6 * lumps(x - 3, z + 8)));
  });
  const shadeShut = shading(false), shadeFound = shading(true);
  const shade = (x: number, z: number, found = false) => (found ? shadeFound : shadeShut)(x, z);
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
  const sheet = (inGrow = false, denFound = false) => {
    const pos: number[] = [], uv: number[] = [], col: number[] = [];
    const quad = (q: number[][], n: number[]) => {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z] = q[i], k = shade(x, z, denFound);
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
  const hiddenSheets = new Map(secrets.map(s => [s, sheet(true)]));
  /** The earth round the rooms: one sheet, but near the Undertow two, lit and dark (whichever's shown). */
  const far = sheet(), lit2 = sheet(false, true), dark2 = sheet();
  const nearDen = (x: number, z: number) => nearest(den, x, z) < DARK + 0.5;
  const open = {
    flat: (x0: number, x1: number, z0: number, z1: number, h: number) => {
      for (const sh of nearDen((x0 + x1) / 2, (z0 + z1) / 2) ? [lit2, dark2] : [far]) sh.flat(x0, x1, z0, z1, h);
    },
    face: (onX: boolean, at: number, a0: number, a1: number, y0: number, y1: number, s: number) => {
      const [x, z] = onX ? [at, (a0 + a1) / 2] : [(a0 + a1) / 2, at];
      for (const sh of nearDen(x, z) ? [lit2, dark2] : [far]) sh.face(onX, at, a0, a1, y0, y1, s);
    },
  };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x = (xs[i] + xs[i + 1]) / 2, z = (zs[j] + zs[j + 1]) / 2, h = top(x, z), s = h === null ? secretAt(x, z) : null;
      if (h !== null) open.flat(xs[i], xs[i + 1], zs[j], zs[j + 1], h);
      else if (s) hiddenSheets.get(s)!.flat(xs[i], xs[i + 1], zs[j], zs[j + 1], GROUND.cut);
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
  const rocks = add(cellar, new Mesh(mergeGeometries(crags)!, new MeshBasicMaterial({ map: dirt().tex, vertexColors: true })));
  crags.forEach(c => c.dispose());
  // the kerb: a course of rough-cut stone along the earth's edge just past each low wall's rail, the wall's top as seen
  // from above, each block its own length and a little its own height, lit like the rest out here but a good deal
  // lighter, so where every room stops reads at a glance (never along a bank, nor over a tunnel; round the grow room's
  // own walls only once it's found)
  // (and the stretch of the arena's own across the tunnel's mouth, while the Undertow's a secret)
  const kerbs = new Map<Object3D, BufferGeometry[]>([[cellar, []], [parts.grow, []], [parts.den, []], [parts.denHidden, []]]);
  for (const h of holes) {
    const own = h === grow ? parts.grow : den.includes(h) ? parts.den : cellar;
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
        const clear = (shut: boolean) => [at(b0, o0), at(b1, o0), at(b0, o1), at(b1, o1)].every(([x, z]) => top(x, z, shut) === GROUND.cut && !bored(x, z) && fromBank(x, z) >= 0.2);
        const into = clear(false) ? kerbs.get(own)! : own === cellar && clear(true) ? kerbs.get(parts.denHidden)! : null;
        if (!into) continue;
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
  const [kerb, growKerb, denKerb, mouthKerb] = [...kerbs].map(([parent, gs]) => {
    const m = add(parent, new Mesh(mergeGeometries(gs)!, KERB));
    gs.forEach(g => g.dispose());
    return m;
  });
  const [hidden, denHidden] = secrets.map(s => hiddenSheets.get(s)!.mesh(s.shut));
  Object.assign(ground, { open: far.mesh(cellar), nearDen: lit2.mesh(parts.den), nearDenShut: dark2.mesh(parts.denHidden), hidden, denHidden, rocks, kerb, growKerb, denKerb, mouthKerb });
});

// the doorways: a timber frame in the wall, posts and a lintel
/** Whether a doorway's wall runs east-west (between rooms one behind the other), or north-south (side by side). */
const acrossX = (t: (typeof DOORS)[number]) => !Object.values(ROOMS).some(r => Math.abs(r.x1 - t.x0) < 0.01 || Math.abs(r.x0 - t.x1) < 0.01);
later(() => {
  for (const t of DOORS) {
    // (the club's doors hang in a frame of their own: doorway.ts)
    if (t.b === 'den') continue;
    const ax = acrossX(t), cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, w = (ax ? t.x1 - t.x0 : t.z1 - t.z0) + 0.6;
    const g = t.b === 'grow' ? parts.grow : t.b === 'passage' || t.b === 'loans' || t.b === 'vip' || t.b === 'cards' ? parts.den : cellar;
    for (const s of [-1, 1]) {
      ax ? box(g, WOOD_DARK, cx + s * w / 2, CY + FRAME_H / 2, cz, 0.2, FRAME_H, 0.22) : box(g, WOOD_DARK, cx, CY + FRAME_H / 2, cz + s * w / 2, 0.22, FRAME_H, 0.2);
    }
    ax ? box(g, WOOD_DARK, cx, CY + FRAME_H, cz, w + 0.3, 0.2, 0.26) : box(g, WOOD_DARK, cx, CY + FRAME_H, cz, 0.26, 0.2, w + 0.3);
  }
});
/**
 * A room's name on a plaque facing the camera, `w` wide: on the room's back wall (standing on a low one's rail, or high
 * on a tall one), so each room's name is on its own side of the wall it's on; and the office's over its door.
 */
function sign(text: string, x: number, y: number, z: number, parent: Object3D = cellar, w = 1.3) {
  const h = w * 0.3, tex = canvasTex(256, 77, (c, cw, ch) => {
    c.fillStyle = '#15181D'; rr(c, 4, 4, cw - 8, ch - 8, 16); c.fill();
    c.fillStyle = '#F2C14E'; c.font = '800 44px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    // (a long name's squeezed to fit)
    const k = Math.min(1, (cw - 30) / c.measureText(text).width);
    c.save(); c.translate(cw / 2, ch / 2 + 3); c.scale(k, 1); c.fillText(text, 0, 0); c.restore();
  });
  const edge = mat(0x15181D);
  const m = add(parent, new Mesh(new BoxGeometry(w, h, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge]));
  m.position.set(x, CY + y, z);
}
/** On a low wall along a room's back (`off` 0.3: between two rooms), standing on its rail; and just in front of a tall
 *  one's front beams. */
const onLow = (r: Rect) => r.z0 - 0.3 + 0.1, onTall = (r: Rect) => r.z0 - 0.1, onRail = WALL + 0.08 + 0.2;
const mid = (r: Rect) => (r.x0 + r.x1) / 2;
const door = (to: CellarRoom) => DOORS.find(t => t.b === to)!;
later(() => {
  sign('RING', mid(ARENA), 2.85, onTall(ARENA), cellar, 2.2);
  sign('KITCHEN', KITCHEN.x1 - 0.95, onRail, onLow(KITCHEN) - 0.1);
  // (the cookware shop's between its doorway and the bowl counter, over the crates of crockery: any further east and it
  // stands in front of the counter's bowls)
  sign('COOKWARE', 8.45, onRail, onLow(CRAFT) - 0.1, cellar, 1.6);
  // (the prep hall's stands on the rail of its back wall, the stone one or the plank one after it: the two are as high)
  sign('PREP', mid(PREP) - 1.5, onRail, onLow(PREP) - 0.1);
  sign('GROW ROOM', mid(GROW), 2.85, onTall(GROW), parts.grow, 2.2);
  sign('OFFICE', (door('office').x0 + door('office').x1) / 2, FRAME_H + 0.3, LANDING.z0 - 0.15, cellar, 1.15);
  // (the Undertow's high on its back wall, over the bar's shelves)
  sign('THE UNDERTOW', (DEN_BAR.x0 + DEN_BAR.x1) / 2, 2.3, onLow(DEN) + 0.06, parts.den, 1.9);
  sign('LOANS', mid(LOANS) + 1.05, 2.45, onLow(LOANS) + 0.06, parts.den, 1.2);
});

// ---------- lanterns along the walls ----------
function lantern(parent: Object3D, x: number, y: number, z: number, red: boolean) {
  const g = add(parent, new Group()); g.position.set(x, y, z);
  add(g, mesh(G.sphere, red ? LANTERN_RED : LANTERN_PAPER)).scale.set(0.24, 0.31, 0.24);
  for (const s of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, 0, s * 0.29, 0)).scale.set(0.13, 0.05, 0.13);
  add(g, mesh(G.rope, 0x1B2430, 0, 0.6, 0)).scale.y = 0.6;
}
later(() => {
  for (let x = ARENA.x0 + 1.5, i = 0; x <= ARENA.x1 - 1; x += 2.4, i++) lantern(cellar, x, CY + 3.6, ARENA.z0 + 0.1, i % 2 === 0);
  for (let z = ARENA.z0 + 1.5, i = 0; z <= ARENA.z1 - 1; z += 2.4, i++) lantern(cellar, ARENA.x0 + 0.1, CY + 3.6, z, i % 2 === 1);
});

// ---------- the ring: the back-alley pit ----------
// Mr. Fugu's ring is whatever was to hand at the dock: rice bales stacked two high and roped into a square, packed dirt
// tamped down on top (his name sprayed in a corner, a chalk puffer, the night's tallies), and the ring marked out by an
// old ship's hawser instead of straw, the two white lines they crouch behind chalked across the middle. Pallets make the
// steps east and west, where the wrestlers come up (and where the loser goes off). One green dish lamp hangs on its
// chain over the middle (the cellar's lamp over the ring, lights[0]), its light falling in a cone; a chain on steel pipes
// round its foot keeps the crowd back, open east and west, and a sign leans on it. Salt in a tin bucket and water in
// another, on the corners. (Built with the scenery's own dice: kit.ts.)
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
/** A point every 1/`n` of the way along a string hung from `a` to `b`, sagging `drop` in the middle. */
const sag = (a: Vector3, b: Vector3, drop: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, p = a.clone().lerp(b, t); p.y -= drop * 4 * t * (1 - t); return p;
});
/** The pallets up to the ring, east and west: each one's middle, out from the ring's edge, and how high its top is. */
export const PIT_STEPS = [{ out: 0.28, top: 0.42 }, { out: 0.74, top: 0.22 }];
/** Where the chain round the ring's foot stands, out from its middle, each side. */
const CORDON = RING_HALF + RING_FOOT + 0.15;
/** The dirt on the ring's top, `PIT_PX` pixels a metre. */
const PIT_PX = 512 / (RING_HALF * 2);
later(() => quietly(() => {
  const g = add(cellar, new Group()); g.position.copy(RING);
  const b = new Build(), thin = new Build();
  const R = RING_TOP;
  // the mound, and the bales round its sides, two rows, bound in rope
  b.add(rbox(RING_HALF * 2 - 0.2, R - 0.02, RING_HALF * 2 - 0.2, 0.04), 0x4A3826, 0, (R - 0.02) / 2, 0);
  const BALE_LEN = 2.15, baleGeo = new CylinderGeometry(0.15, 0.15, BALE_LEN, 10), band = new TorusGeometry(0.152, 0.022, 4, 12);
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2, nx = Math.cos(a), nz = Math.sin(a), out = RING_HALF - 0.08;
    // (lying along the side: along z on the east and west, along x on the north and south)
    const alongZ = side % 2 === 0, rot: [number, number, number] = alongZ ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
    const bandRot: [number, number, number] = alongZ ? [0, 0, 0] : [0, Math.PI / 2, 0];
    for (const [row, alongs] of [[0, [-2.2, 0, 2.2]], [1, [-1.1, 1.1]]] as const) {
      alongs.forEach((s, i) => {
        const x = nx * out - nz * s, z = nz * out + nx * s, y = 0.15 + row * 0.29;
        b.add(baleGeo, (i + row + side) % 2 ? STRAW : 0xC9AE68, x, y, z, rot);
        for (const k of [-0.7, 0, 0.7]) b.add(band, 0x6E5530, x - nz * k, y, z + nx * k, bandRot);
      });
    }
  }
  // the hawser: two strands twisted round each other, round the ring
  for (const ph of [0, Math.PI]) {
    const pts = Array.from({ length: 480 }, (_, i) => {
      const a = (i / 480) * Math.PI * 2, tw = a * 90 + ph;
      return V(Math.cos(a) * (RING_R + 0.055 * Math.cos(tw)), R + 0.07 + 0.055 * Math.sin(tw), Math.sin(a) * (RING_R + 0.055 * Math.cos(tw)));
    });
    b.add(new TubeGeometry(new CatmullRomCurve3(pts, true), 720, 0.07, 6, true), ph ? 0x9C8050 : 0xB79A62, 0, 0, 0);
  }
  // the chalk lines they crouch behind
  for (const s of [-1, 1]) thin.add(rbox(0.08, 0.012, 0.7, 0.004), 0xEDE6D8, s * 0.42, R + 0.008, 0);
  // the pallets up to it, east and west: slats on bearers
  for (const s of [-1, 1]) for (const { out, top } of PIT_STEPS) {
    const x = s * (RING_HALF + out);
    b.add(rbox(0.42, top - 0.05, 1.25, 0.02), 0x6A4E32, x, (top - 0.05) / 2, 0);
    for (let j = 0; j < 5; j++) b.add(rbox(0.44, 0.04, 0.2, 0.01), j % 2 ? 0x9A7A52 : 0xA88760, x, top - 0.02, -0.6 + j * 0.3);
  }
  // salt in a tin bucket, water in another, on the corners
  const c = RING_HALF - 0.55;
  b.add(tube(0.2, 0.17, 0.32, 12), 0x8A9096, c, R + 0.16, -c);
  thin.add(tube(0.18, 0.18, 0.02, 12), 0xF4F1EA, c, R + 0.31, -c);
  b.add(tube(0.21, 0.18, 0.3, 12), 0x8A9096, -c, R + 0.15, c);
  thin.add(tube(0.19, 0.19, 0.02, 12), 0x3C6E8F, -c, R + 0.29, c);
  b.add(tube(0.015, 0.015, 0.5, 5), WOOD, -c + 0.1, R + 0.4, c, [0, 0, 0.5]);
  // the chain round its foot, on steel pipes, open east and west for the wrestlers
  const H = CORDON, posts: [number, number][] = [[-H, -1], [-H, -H], [0, -H], [H, -H], [H, -1], [H, 1], [H, H], [0, H], [-H, H], [-H, 1]];
  for (const [x, z] of posts) {
    b.add(tube(0.045, 0.045, 1, 8), 0x6A6E72, x, 0.5, z);
    b.add(K.ball, 0x6A6E72, x, 1.0, z, null, 0.06);
  }
  for (let i = 0; i < posts.length; i++) {
    const [x0, z0] = posts[i], [x1, z1] = posts[(i + 1) % posts.length];
    if (x0 === x1 && Math.abs(x0) === H && Math.abs(z0) === 1 && Math.abs(z1) === 1) continue; // (the gaps)
    const pts = Array.from({ length: 11 }, (_, k) => { const t = k / 10; return V(x0 + (x1 - x0) * t, 0.95 - 0.25 * 4 * t * (1 - t), z0 + (z1 - z0) * t); });
    thin.add(new TubeGeometry(new CatmullRomCurve3(pts), 16, 0.022, 4), 0x9AA0A6, 0, 0, 0);
  }
  // the dish lamp, on its chain, over the middle
  b.add(new ConeGeometry(0.75, 0.45, 24, 1, true), 0x3D5A45, 0, 5.75, 0);
  b.add(tube(0.02, 0.02, 3.4, 5), 0x555555, 0, 7.6, 0);
  add(g, b.mesh(true)); add(g, thin.mesh(false));
  add(g, mesh(G.sphere, LANTERN_PAPER, 0, 5.57, 0)).scale.setScalar(0.16);
  // (the dish's inside, dark, so it reads as a dish from below the rim)
  add(g, mesh(new ConeGeometry(0.74, 0.44, 24, 1, true), new MeshLambertMaterial({ color: 0x24302A, side: BackSide }), 0, 5.75, 0));
  const beam = add(g, mesh(new ConeGeometry(3.3, 5.5, 32, 1, true), new MeshBasicMaterial({ color: 0xFFE2A0, transparent: true, opacity: 0.045, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })));
  beam.position.y = 5.55 - 2.75; beam.renderOrder = 2;
  // the dirt on top: Mr. Fugu's name sprayed in a corner, a chalk puffer in another, the tallies, scuffs and stones
  const dirt = canvasTex(512, 512, (cx, w, h) => {
    cx.fillStyle = '#7A5A3E'; cx.fillRect(0, 0, w, h);
    const r = RING_R * PIT_PX, ring = cx.createRadialGradient(w / 2, h / 2, r * 0.5, w / 2, h / 2, r);
    ring.addColorStop(0, 'rgba(160,125,90,.25)'); ring.addColorStop(1, 'rgba(160,125,90,0)');
    cx.fillStyle = ring; cx.fillRect(0, 0, w, h);
    const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 0.7) * 43758.5453; return x - Math.floor(x); };
    cx.fillStyle = 'rgba(30,18,8,.25)';
    for (let i = 0; i < 60; i++) { cx.beginPath(); cx.ellipse(rnd(i * 3) * w, rnd(i * 7) * h, 6 + rnd(i) * 14, 4 + rnd(i + 1) * 8, rnd(i + 2) * 3, 0, Math.PI * 2); cx.fill(); }
    for (let i = 0; i < 1600; i++) { cx.fillStyle = i % 3 ? 'rgba(40,25,12,.18)' : 'rgba(220,190,150,.16)'; cx.fillRect(rnd(i + 0.5) * w, rnd(i + 0.25) * h, 2, 2); }
    cx.save(); cx.translate(w * 0.84, h * 0.84); cx.rotate(-0.5); cx.fillStyle = 'rgba(200,40,30,.75)'; cx.font = `800 46px ${MINCHO}`; cx.textAlign = 'center'; cx.fillText('河豚', 0, 0); cx.restore();
    cx.strokeStyle = 'rgba(240,235,225,.65)'; cx.lineWidth = 4; cx.beginPath(); cx.arc(w * 0.16, h * 0.16, 22, 0, Math.PI * 2); cx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cx.beginPath(); cx.moveTo(w * 0.16 + Math.cos(a) * 22, h * 0.16 + Math.sin(a) * 22); cx.lineTo(w * 0.16 + Math.cos(a) * 31, h * 0.16 + Math.sin(a) * 31); cx.stroke(); }
    cx.strokeStyle = 'rgba(240,235,225,.5)'; cx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = w * 0.72 + (i % 5) * 9, y = h * 0.12 + Math.floor(i / 5) * 30; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + (i % 5 === 4 ? -36 : 0), y + 22); cx.stroke(); }
  });
  const top = add(g, new Mesh(new PlaneGeometry(RING_HALF * 2 - 0.24, RING_HALF * 2 - 0.24), new MeshLambertMaterial({ map: dirt.tex })));
  top.rotation.x = -Math.PI / 2; top.position.y = R + 0.002; top.receiveShadow = true;
  // a sign leaning on the chain, south, for the crowd
  const sign = canvasTex(256, 96, (cx, w, h) => {
    cx.fillStyle = '#B79363'; cx.fillRect(0, 0, w, h);
    cx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 24) cx.fillRect(0, y, w, 2);
    cx.fillStyle = '#B5281E'; cx.font = `800 40px ${FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('NO REFUNDS', w / 2, h / 2 + 4);
  });
  const board = add(g, new Mesh(new PlaneGeometry(1.3, 0.5), new MeshLambertMaterial({ map: sign.tex, side: DoubleSide })));
  board.position.set(1.6, 0.62, CORDON + 0.06); board.rotation.x = -0.25;
}));

// ---------- the stands: crates and planks, in tiers, with a straw mat along each ----------
/** A seat in the stands: where a fan sits (on the plank), which way they face, and which part it's in (swarm.ts). */
export interface Place { pos: Vector3; h: number; part: 'base' | 'bleachers' | 'tier' | 'vip' }
export const places: Place[] = [];
/** A stand's tiers: three when it's all built, the highest at the back wall, stepping down towards the ring. */
const TIERS = 3;
/** The seats: a long straw goza mat bound in black along each tier, as the crowds sat on in the timber huts of Edo
 *  sumo. */
const GOZA = 0xC8B47A, GOZA_EDGE = 0x24242A;
/** The same number for the same board, between 0 and 1 (not the luck). */
const seatHash = (i: number) => { const x = Math.sin(i * 12.9898 + 0.31) * 43758.5453; return x - Math.floor(x); };
/** A tier's top, `len` long along `along` at (cx, top, cz), `out` towards the ring: three boards, and a goza mat along
 *  them with a seat every `gap` from `first`. */
function benchTop(g: Object3D, along: 'x' | 'z', cx: number, top: number, cz: number, len: number, out: number, first: number, gap: number, k: number) {
  const ax = along === 'x', at = (u: number, v: number): [number, number] => (ax ? [cx + u, cz + v * out] : [cx + v * out, cz + u]);
  for (let j = 0; j < 3; j++) {
    const [x, z] = at(0, -0.28 + j * 0.28);
    box(g, shade(WOOD, 0.88 + seatHash(k + j) * 0.2), x, top + 0.01, z, ax ? len : 0.27, 0.02, ax ? 0.27 : len, false);
  }
  const [x, z] = at(0, 0);
  box(g, GOZA, x, top + 0.024, z, ax ? len - 0.1 : 0.5, 0.012, ax ? 0.5 : len - 0.1, false);
  for (const s of [-1, 1]) { const [ex, ez] = at(0, s * 0.245); box(g, GOZA_EDGE, ex, top + 0.026, ez, ax ? len - 0.1 : 0.03, 0.012, ax ? 0.03 : len - 0.1, false); }
  // (the mat's weave, a faint line between seats)
  for (let u = first + gap / 2; u < len / 2 - 0.1; u += gap) { const [wx, wz] = at(u, 0); box(g, shade(GOZA, 0.86), wx, top + 0.031, wz, ax ? 0.012 : 0.46, 0.004, ax ? 0.46 : 0.012, false); }
}
/** Builds `tiers` of a stand along one wall, from tier `from` (counted out from the wall), into `g`, with a seat
 *  every `gap` along each; or with no `g`, lays out the places only (they're there from the start, built or not). */
function stand(g: Group | null, part: Place['part'], along: 'x' | 'z', a0: number, a1: number, wall: number, out: number, from: number, tiers: number, gap: number) {
  for (let i = from; i < from + tiers; i++) {
    const h = 0.3 + (TIERS - 1 - i) * 0.42, at = wall + out * (0.45 + i * 0.85), len = Math.abs(a1 - a0), mid = (a0 + a1) / 2;
    const [cx, cz] = along === 'x' ? [mid, at] : [at, mid];
    if (g) {
      box(g, i % 2 ? 0x6E4A33 : 0x7A5238, cx, CY + h / 2, cz, along === 'x' ? len : 0.85, h, along === 'x' ? 0.85 : len);
      // the boards nailed over the crates: a seam along the top, and one along the face towards the ring
      box(g, WOOD_DARK, cx, CY + h + 0.002, cz, along === 'x' ? len : 0.02, 0.004, along === 'x' ? 0.02 : len, false);
      const [fx, fz] = along === 'x' ? [cx, cz + out * 0.426] : [cx + out * 0.426, cz];
      box(g, WOOD_DARK, fx, CY + h * 0.55, fz, along === 'x' ? len : 0.02, 0.02, along === 'x' ? 0.02 : len, false);
      benchTop(g, along, cx, CY + h, cz, len, out, -len / 2 + 0.4, gap, i * 7 + (along === 'x' ? 0 : 50));
      // the crates' slats, on the face towards the ring
      for (let k = -len / 2 + 0.6; k < len / 2; k += 2.1) {
        const [bx, bz] = along === 'x' ? [cx + k, cz + out * 0.43] : [cx + out * 0.43, cz + k];
        box(g, WOOD_DARK, bx, CY + h / 2, bz, along === 'x' ? 0.6 : 0.02, h - 0.02, along === 'x' ? 0.02 : 0.6, false);
      }
    }
    const face = along === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let k = -len / 2 + 0.4, n = 0; k < len / 2 - 0.2; k += gap, n++) {
      const [px, pz] = along === 'x' ? [cx + k, cz] : [cx, cz + k];
      if (!g) places.push({ pos: V(px, CY + h, pz), h: face, part });

    }
  }
}
// the back stands (the two back tiers to start, the lowest, front one with the upper tier), and the west stands (the
// bleachers)
const BACK = { a0: RING.x - 5.6, a1: RING.x + 5.6, wall: ARENA.z0 + 0.1 };
const WEST = { a0: RING.z - 3.7, a1: RING.z + 3.7, wall: ARENA.x0 + 0.1 };
/** The stands' places (with no `base`), or the stands themselves: the back ones into `base`, the rest into the venue's
 *  parts. */
const seating = (base: Group | null) => {
  stand(base, 'base', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 0, 2, 0.62);
  stand(base && parts.bleachers, 'bleachers', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 0, 2, 0.62);
  stand(base && parts.tier, 'tier', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 2, 1, 0.62);
  stand(base && parts.tier, 'tier', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 2, 1, 0.62);
};
seating(null);
later(() => seating(add(cellar, new Group())));
// the VIP boxes: box seats (masu-seki) right by the ring, on its south side: a low platform hung with a stained canvas,
// split by rails into a box for each pair, a straw mat for each seat, and a bottle and two cups in every other box
const VIP_Z = RING.z + RING_HALF + RING_FOOT + 0.7;
later(() => {
  const H = 0.4, w = 7.2;
  box(parts.vip, WOOD_DARK, RING.x, CY + H / 2, VIP_Z, w, H, 0.9);
  box(parts.vip, WOOD, RING.x, CY + H + 0.01, VIP_Z, w - 0.04, 0.02, 0.86, false);
  box(parts.vip, 0x5E5443, RING.x, CY + H * 0.55, VIP_Z + 0.455, w - 0.1, H * 0.6, 0.02, false);
  for (const s of [-1, 1]) box(parts.vip, WOOD_DARK, RING.x, CY + H + 0.07, VIP_Z + s * 0.42, w, 0.14, 0.06);
  for (let j = 0; j <= 4; j++) box(parts.vip, WOOD_DARK, RING.x - w / 2 + j * 1.8, CY + H + 0.07, VIP_Z, 0.06, 0.14, 0.9);
  for (let j = 0; j < 4; j += 2) {
    const x = RING.x - 2.7 + j * 1.8;
    add(parts.vip, mesh(G.cyl, 0x3E2A1C, x, CY + H + 0.12, VIP_Z - 0.25)).scale.set(0.06, 0.22, 0.06);
    for (const s of [-1, 1]) add(parts.vip, mesh(G.cyl, 0x9A8A70, x + s * 0.14, CY + H + 0.04, VIP_Z - 0.25)).scale.set(0.035, 0.05, 0.035);
  }
});
for (let i = 0; i < 8; i++) places.push({ pos: V(RING.x - 3.15 + i * 0.9, CY + 0.25, VIP_Z - 0.05), h: Math.PI, part: 'vip' });
later(() => {
  for (let i = 0; i < 8; i++) {
    box(parts.vip, GOZA, RING.x - 3.15 + i * 0.9, CY + 0.415, VIP_Z + 0.05, 0.6, 0.012, 0.6, false);
    for (const s of [-1, 1]) box(parts.vip, GOZA_EDGE, RING.x - 3.15 + i * 0.9 + s * 0.29, CY + 0.417, VIP_Z + 0.05, 0.03, 0.012, 0.6, false);
  }
});
/** Keeps a spectator's place hidden until it's built. */
export const placeBuilt = (p: Place) => p.part === 'base' || parts[p.part].visible;

// ---------- the arena: the soup square, the gong (out on the floor) and the cashier's window ----------
// The soup square, after the street-food counters of Pompeii: two counters of plastered clay at right angles, closing
// in the arena's corner by the hearth room's doorway (the walls are its other two sides), where the player stands to
// serve (like the sushi chefs inside their belt upstairs). Their tops are pale hinoki planks, two staggered rows of
// places on them, one for each bowl (ringKitchen.ts sets the bowls out); their sides painted
// like a temple fair's poster, inside and out, ochre panels framed in Pompeian red over a black dado: a wrestler in his
// stance, Mr. Fugu as a puffer in his shades, a steaming bowl. Boards on the floor inside; a bamboo pole at each
// corner, the ring's lanterns strung round three sides (none across the front, the camera's), and the square's name
// board over the back.
/** A painting on a counter's side, `w` by `h` pixels: a panel for each of `panels`, side by side. */
type Panel = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
function fresco(w: number, h: number, panels: Panel[]) {
  return canvasTex(w, h, c => {
    c.fillStyle = '#9E2F22'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1E1612'; c.fillRect(0, h * 0.82, w, h * 0.18);
    c.fillStyle = '#E9D9B8'; c.fillRect(0, 0, w, h * 0.07);
    c.fillStyle = '#C9A23A'; c.fillRect(0, h * 0.07, w, 4); c.fillRect(0, h * 0.82 - 4, w, 4);
    const n = panels.length, gap = w * 0.025, pw = (w - gap * (n + 1)) / n, py = h * 0.11, ph = h * 0.69;
    panels.forEach((draw, i) => {
      const x = gap + i * (pw + gap);
      c.fillStyle = '#D9A441'; c.fillRect(x, py, pw, ph);
      c.strokeStyle = '#1E1612'; c.lineWidth = 4; c.strokeRect(x + 5, py + 5, pw - 10, ph - 10);
      // (each figure with a dark edge on its lower side, so it reads from the camera)
      c.save(); c.beginPath(); c.rect(x + 7, py + 7, pw - 14, ph - 14); c.clip();
      c.shadowColor = '#1E1612'; c.shadowOffsetX = 4; c.shadowOffsetY = 4;
      draw(c, x, py, pw, ph);
      c.restore();
    });
    // chips and scuffs in the plaster
    for (let i = 0; i < 70; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 43758.5453;
      c.fillStyle = i % 2 ? 'rgba(255,240,220,.12)' : 'rgba(0,0,0,.12)'; c.fillRect((a - Math.floor(a)) * w, (b - Math.floor(b)) * h, 3, 2);
    }
  });
}
/** A wrestler squatting in his stance, hands on his knees. */
const rikishi: Panel = (c, x, y, w, h) => {
  const cx = x + w / 2, cy = y + h * 0.5, r = h * 0.25, SKIN = '#E8B48A';
  c.fillStyle = SKIN; c.beginPath(); c.ellipse(cx, cy, r * 1.05, r, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(cx, cy - r * 1.05, r * 0.42, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1E1612'; c.beginPath(); c.ellipse(cx, cy - r * 1.5, r * 0.16, r * 0.1, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(cx - r * 0.15, cy - r * 1.1, r * 0.08, r * 0.05); c.fillRect(cx + r * 0.07, cy - r * 1.1, r * 0.08, r * 0.05);
  c.fillStyle = '#2B3A67'; c.fillRect(cx - r, cy + r * 0.35, r * 2, r * 0.32);
  c.strokeStyle = SKIN; c.lineCap = 'round'; c.lineWidth = r * 0.36;
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(cx + s * r * 0.7, cy + r * 0.7); c.lineTo(cx + s * r * 1.4, cy + r * 0.95); c.lineTo(cx + s * r * 1.5, cy + r * 1.35); c.stroke();
    c.beginPath(); c.moveTo(cx + s * r * 0.9, cy - r * 0.4); c.lineTo(cx + s * r * 1.45, cy + r * 0.25); c.stroke();
  }
};
/** Mr. Fugu as a puffer: spines out, in his shades and gold chain, grinning. */
const puffer: Panel = (c, x, y, w, h) => {
  const cx = x + w * 0.48, cy = y + h * 0.52, r = h * 0.3, SKIN = '#F2D27A';
  c.fillStyle = SKIN;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
    c.lineTo(cx + Math.cos(a + 0.12) * r * 1.3, cy + Math.sin(a + 0.12) * r * 1.3); c.lineTo(cx + Math.cos(a + 0.3) * r * 0.9, cy + Math.sin(a + 0.3) * r * 0.9); c.fill();
  }
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#F4ECD8'; c.beginPath(); c.ellipse(cx, cy + r * 0.35, r * 0.75, r * 0.5, 0, 0, Math.PI); c.fill();
  c.fillStyle = SKIN; c.beginPath(); c.moveTo(cx + r * 0.95, cy); c.lineTo(cx + r * 1.55, cy - r * 0.45); c.lineTo(cx + r * 1.55, cy + r * 0.45); c.fill();
  c.fillStyle = '#1E1612'; c.fillRect(cx - r * 0.75, cy - r * 0.35, r * 0.6, r * 0.22); c.fillRect(cx - r * 0.2, cy - r * 0.32, r * 0.1, r * 0.06);
  c.strokeStyle = '#1E1612'; c.lineWidth = 3; c.beginPath(); c.arc(cx - r * 0.55, cy + r * 0.15, r * 0.18, 0.2, 2.6); c.stroke();
  c.fillStyle = '#C9A23A'; c.beginPath(); c.arc(cx - r * 0.3, cy + r * 0.62, r * 0.12, 0, Math.PI * 2); c.fill();
};
/** A bowl of chanko, steaming, its name under it. */
const steaming: Panel = (c, x, y, w, h) => {
  const cx = x + w / 2, cy = y + h * 0.62, r = h * 0.3;
  c.strokeStyle = 'rgba(80,60,50,.55)'; c.lineWidth = 5; c.lineCap = 'round';
  for (const dx of [-0.4, 0, 0.4]) {
    c.beginPath(); c.moveTo(cx + dx * r, cy - r * 0.55);
    c.bezierCurveTo(cx + dx * r - 14, cy - r * 0.9, cx + dx * r + 14, cy - r * 1.1, cx + dx * r, cy - r * 1.5); c.stroke();
  }
  c.fillStyle = '#C98A3E'; c.beginPath(); c.ellipse(cx, cy - r * 0.3, r * 1.15, r * 0.28, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#A8322D'; c.beginPath(); c.moveTo(cx - r * 1.2, cy - r * 0.3); c.quadraticCurveTo(cx, cy + r * 1.2, cx + r * 1.2, cy - r * 0.3); c.fill();
  c.fillStyle = '#6FAF4F'; c.fillRect(cx - r * 0.5, cy - r * 0.42, r * 0.3, r * 0.14);
  c.fillStyle = '#F4F1EA'; c.fillRect(cx + r * 0.15, cy - r * 0.45, r * 0.25, r * 0.2);
  c.fillStyle = '#1E1612'; c.font = `800 ${Math.round(h * 0.16)}px ${MINCHO}`; c.textAlign = 'center'; c.fillText('ちゃんこ', cx, y + h * 0.95);
};
/** A counter's top, `w` by `d` metres: pale hinoki planks along its length (along x, or z if `alongZ`), each a
 *  slightly different tone, with fine grain and thin dark seams, drawn at the same pixels a metre whatever its shape (so
 *  the planks are as wide on every counter). */
const TOP_PX = 256, PLANK = 0.13;
function woodTop(w: number, d: number, alongZ: boolean) {
  return canvasTex(Math.round(TOP_PX * w), Math.round(TOP_PX * d), (c, cw, ch) => {
    // (drawn as if along x; turned for a counter along z)
    const L = alongZ ? ch : cw, A = alongZ ? cw : ch, n = Math.ceil(A / (PLANK * TOP_PX)), pw = A / n;
    const plank = (x: number, y: number, len: number, wid: number) => alongZ ? c.fillRect(y, x, wid, len) : c.fillRect(x, y, len, wid);
    const tones = ['#E2CDA6', '#DCC59C', '#E6D2AE', '#D8C096'];
    for (let i = 0; i < n; i++) {
      c.fillStyle = tones[i % tones.length]; plank(0, i * pw, L, pw);
      // fine grain: long faint streaks along the plank
      for (let k = 0; k < 9; k++) {
        const r = Math.sin((i * 9 + k) * 12.9898) * 43758.5453, f = r - Math.floor(r);
        c.fillStyle = k % 3 ? 'rgba(150,110,60,.10)' : 'rgba(255,245,225,.18)';
        plank(0, i * pw + 3 + f * (pw - 6), L, 1.5);
      }
      // the seam between planks
      c.fillStyle = 'rgba(90,60,30,.45)'; plank(0, i * pw, L, 1.5);
    }
  });
}
later(() => {
  const { x0, x1, z0, z1, d, top: TOP } = BAR, g = add(cellar, new Group()), plaster = mat(0xD9C3A0), rim = mat(0xC9A97A);
  const painted = (panels: Panel[], len: number) => new MeshLambertMaterial({ map: fresco(Math.round(330 * len), 300, panels).tex });
  /** A counter from (ax0, az0) to (ax1, az1), its sides' materials (+x, -x, +z, -z). */
  const counter = (ax0: number, ax1: number, az0: number, az1: number, sides: Material[]) => {
    const w = ax1 - ax0, dd = az1 - az0, cx = (ax0 + ax1) / 2, cz = (az0 + az1) / 2;
    const body = add(g, new Mesh(new BoxGeometry(w, TOP - 0.06, dd), [sides[0], sides[1], plaster, plaster, sides[2], sides[3]]));
    body.position.set(cx, CY + (TOP - 0.06) / 2, cz); body.castShadow = true; body.receiveShadow = true;
    // (its top a little bigger all round)
    const tw = w + 0.08, td = dd + 0.08;
    const slab = add(g, new Mesh(new BoxGeometry(tw, 0.07, td), [rim, rim, new MeshLambertMaterial({ map: woodTop(tw, td, dd > w).tex }), rim, rim, rim]));
    slab.position.set(cx, CY + TOP - 0.03, cz); slab.castShadow = true; slab.receiveShadow = true;
    box(g, 0x1E1612, cx, CY + 0.04, cz, w + 0.04, 0.08, dd + 0.04);
  };
  const front: Panel[] = [rikishi, puffer, steaming];
  // the north counter, from the corner to the hearth room's wall, and the west one, from it to the south wall (each
  // painted inside, where the camera looks, and out, where the fans stand)
  const west = z1 - z0 - d;
  counter(x0, x1, z0, z0 + d, [plaster, painted([steaming], d), painted(front, x1 - x0), painted(front, x1 - x0)]);
  counter(x0, x0 + d, z0 + d, z1, [painted([puffer, rikishi, steaming], west), painted([steaming, puffer, rikishi], west), plaster, plaster]);
  // boards on the floor inside, out to the walls
  const fz0 = z0 + d + 0.02, fz1 = ARENA.z1 + 0.06;
  for (let i = 0, x = x0 + d + 0.02; x < ARENA.x1 + 0.2; x += 0.24, i++) {
    // (thin, and under the drop-off's marker on them: ringKitchen.ts lays it at 0.012)
    box(g, i % 2 ? 0x7A5638 : 0x6E4C30, Math.min(x + 0.11, ARENA.x1 + 0.09), CY + 0.004, (fz0 + fz1) / 2, 0.22, 0.004, fz1 - fz0, false).receiveShadow = true;
  }
  // a bamboo pole at each corner, in lengths with a knot at each joint (the south two against the south wall)
  const POLE = 2.7, SEG = POLE / 3, C = [V(x0 + 0.08, 0, z0 + 0.08), V(x1 - 0.14, 0, z0 + 0.08), V(x1 - 0.14, 0, z1 - 0.12), V(x0 + 0.08, 0, z1 - 0.12)];
  for (const p of C) {
    for (let k = 0; k < 3; k++) {
      add(g, mesh(G.cyl, k % 2 ? 0x8FA552 : 0x7E9446, p.x, CY + (k + 0.5) * SEG, p.z, true)).scale.set(0.06, SEG, 0.06);
      add(g, mesh(G.cyl, 0x5E6E30, p.x, CY + (k + 1) * SEG, p.z)).scale.set(0.072, 0.04, 0.072);
    }
  }
  // the lanterns strung between them round the back three sides, red and paper by turns, and a crossbar along the back
  const tops = C.map(p => V(p.x, CY + POLE - 0.1, p.z)), lit: Record<'red' | 'paper', BufferGeometry[]> = { red: [], paper: [] };
  for (const [i, j] of [[3, 0], [0, 1], [1, 2]]) {
    const along = sag(tops[i], tops[j], 0.3, 10);
    add(g, mesh(new TubeGeometry(new CatmullRomCurve3(along), 20, 0.012, 4), 0x1A1614));
    for (let k = 2; k < 10; k += 2) {
      const p = along[k], ball = copyGeo(G.sphere);
      ball.scale(0.14, 0.18, 0.14); ball.translate(p.x, p.y - 0.22, p.z);
      lit[(k / 2 + i) % 2 ? 'red' : 'paper'].push(ball);
      for (const s of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, p.x, p.y - 0.22 + s * 0.175, p.z)).scale.set(0.07, 0.03, 0.07);
    }
  }
  add(g, new Mesh(mergeGeometries(lit.red)!, LANTERN_RED));
  add(g, new Mesh(mergeGeometries(lit.paper)!, LANTERN_PAPER));
  lit.red.concat(lit.paper).forEach(b => b.dispose());
  const bar = add(g, mesh(G.cyl, 0x7E9446, (x0 + x1) / 2, CY + POLE - 0.04, z0 + 0.08));
  bar.scale.set(0.05, x1 - x0 - 0.1, 0.05); bar.rotation.z = Math.PI / 2;
  // its name board, standing on the crossbar, facing the room
  const name = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#9E2F22'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(80,50,20,.15)'; for (let i = 0; i < 6; i++) c.fillRect(0, (i + 0.5) * h / 6, w, 2);
    c.fillStyle = '#F7EFE0'; c.font = `800 ${Math.round(h * 0.55)}px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ちゃんこ', w / 2, h / 2 + 2);
  });
  const edge = mat(WOOD_DARK);
  add(g, new Mesh(new BoxGeometry(1.1, 0.41, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: name.tex }), edge])).position.set((x0 + x1) / 2, CY + POLE + 0.2, z0 + 0.1);
  // a short indigo curtain in the doorway from the hearth room, a white crest on its middle strip, like the landing's
  const t = DOORS.find(o => o.a === 'kitchen' && o.b === 'arena')!, span = t.z1 - t.z0 + 0.6, cz = (t.z0 + t.z1) / 2, cx = (t.x0 + t.x1) / 2 - 0.06;
  for (let i = -1; i <= 1; i++) box(g, 0x2B3A67, cx, CY + FRAME_H - 0.35, cz + i * span / 3, 0.02, 0.5, span / 3 - 0.04, false).receiveShadow = false;
  box(g, 0xF4F1EA, cx - 0.02, CY + FRAME_H - 0.32, cz, 0.01, 0.16, 0.16, false);
});
/** The soup square, for walking round: its two counters, a walker's width out all round (the walls are its other sides). */
const BAR_BOXES: [number, number, number, number][] = (() => {
  const { x0, x1, z0, z1, d } = BAR, W = 0.22;
  return [
    [(x0 + x1) / 2, z0 + d / 2, (x1 - x0) / 2 + W, d / 2 + W],
    [x0 + d / 2, (z0 + z1) / 2, d / 2 + W, (z1 - z0) / 2 + W],
  ];
})();
/** Straw-wrapped sake barrels (komodaru), stacked against the east wall between the landing's door and the soup bar, the
 *  way a shrine stacks the ones it's given. */
const KOMO = { x: ARENA.x1 - 0.35, z: 1.95 };
later(() => {
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
});
/** The gong: a bronze disc hung in a black frame, its face to the near wall (gong.ts swings it, and lights it up when
 *  it's struck). */
export const gongDisc = new Group();
/** Its bronze (made with it, not as the cellar loads: a material's id takes numbers from the luck). */
export let gongBronze: MeshLambertMaterial | null = null;
later(() => {
  gongBronze = new MeshLambertMaterial({ color: 0xC9A23A, emissive: 0x5A3A0A });
  const g = add(cellar, new Group()); g.position.set(GONG.x, CY, GONG.z);
  for (const s of [-1, 1]) box(g, 0x1B1A1E, s * 0.85, 1.25, 0, 0.12, 2.5, 0.12);
  box(g, 0x1B1A1E, 0, 2.5, 0, 1.95, 0.14, 0.16);
  box(g, 0x8E2B2B, 0, 2.62, 0, 2.1, 0.08, 0.22);
  gongDisc.position.set(0, 2.38, 0);
  g.add(gongDisc);
  const disc = add(gongDisc, mesh(new CylinderGeometry(0.62, 0.62, 0.05, 24), gongBronze, 0, -0.95, 0, true));
  disc.rotation.x = Math.PI / 2;
  add(gongDisc, mesh(new TorusGeometry(0.62, 0.04, 6, 24), 0x8A6A1E, 0, -0.95, 0));
  add(gongDisc, mesh(G.cyl, 0xE0BE5A, 0, -0.95, 0.03)).scale.set(0.2, 0.02, 0.2);
  for (const s of [-1, 1]) add(gongDisc, mesh(G.rope, 0x3A2A20, s * 0.3, -0.17, 0)).scale.y = 0.32;
  // the mallet, leaning on the frame
  const m = add(g, new Group()); m.position.set(1.05, 0.55, 0.1); m.rotation.z = 0.25;
  add(m, mesh(G.rope, WOOD, 0, 0, 0)).scale.set(1.4, 1.1, 1.4);
  add(m, mesh(G.sphere, 0xC0392B, 0, 0.58, 0)).scale.setScalar(0.12);
});
/** The cashier's window, where the chips go: a cage window like a bookie's, its counter stacked with Fugu Chips. */
later(() => {
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
});

// ---------- the hearth room: the hearth and its pot, the ledge, the bowl counter ----------
later(() => {
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
});
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
later(() => {
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
});

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
later(() => {
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
  // rice in tawara against the east wall, between the two trays' circles (in the corner, it was in the grow room's way):
  // straw bales lying on their sides, two and one on top, each bound with three straw ropes and capped at its ends
  const k = add(cellar, new Group()); k.position.set(SACKS.x, CY, SACKS.z);
  const BALE = new CylinderGeometry(0.2, 0.2, 0.62, 12), BAND = new TorusGeometry(0.205, 0.022, 5, 14), CAP = new CylinderGeometry(0.17, 0.17, 0.04, 12);
  for (const [z, y] of [[-0.21, 0.2], [0.21, 0.2], [0, 0.54]]) {
    const b = add(k, mesh(BALE, STRAW, 0, y, z, true)); b.rotation.z = Math.PI / 2;
    for (const x of [-0.2, 0, 0.2]) add(k, mesh(BAND, 0xA8894E, x, y, z)).rotation.y = Math.PI / 2;
    for (const x of [-0.32, 0.32]) add(k, mesh(CAP, 0xB89A5C, x, y, z)).rotation.z = Math.PI / 2;
  }
  // a chalk board by the door, ruled into the three lines
  box(cellar, 0x23302A, PREP.x0 + 0.2, CY + 1.5, 2.6, 0.06, 0.9, 1.3, false);
});

// ---------- the cookware shop: the shop counter, and a dōgu-ya's stock, as on Kappabashi street ----------
/** Where the shop's things stand, for walking round them (the way from its doorway to the counter's square is kept
 *  clear): a tansu chest by the counter; crates of crockery and a pallet of clay pots against the north wall, east of
 *  the doorway; shelves of bowls along the east wall; a showcase of food samples in the middle; and along the south
 *  wall, towers of bamboo steamers, stock pots, and a crock of long spoons and ladles. */
const TANSU = { x: CRAFT.x0 + 0.95, z: CRAFT.z0 + 0.25 }, CRATES = { x: 8.3, z: CRAFT.z0 + 0.42 }, DONABE = { x: 9.95, z: CRAFT.z0 + 0.4 };
const SHELF = { x: CRAFT.x1 - 0.45, z: 9.75 }, SHOWCASE = { x: 8.85, z: 10.05 };
const STEAMERS = { x: 6.3, z: CRAFT.z1 - 0.4 }, POTS = { x: 8.7, z: CRAFT.z1 - 0.4 }, CROCK = { x: CRAFT.x0 + 0.4, z: CRAFT.z1 - 0.3 };
/** The same picture on several faces, as one mesh: `geo` (facing +z) moved into place by each of `at`. */
function pictures(geo: BufferGeometry, map: CanvasTex['tex'], at: Matrix4[]) {
  return add(cellar, new Mesh(mergeGeometries(at.map(m => copyGeo(geo).applyMatrix4(m)))!, new MeshLambertMaterial({ map })));
}
const placed = (x: number, y: number, z: number, turn = 0) => new Matrix4().makeRotationY(turn).setPosition(x, y, z);
/** Hemp rope, black iron, glazes and the shop's metals. */
const HEMP = 0x8A6A44, BLACK_IRON = 0x1E1E22, PORCELAIN = 0xF2EEE6, INDIGO = 0x2B3A67, LACQUER_RED = 0xB0302A;
const ALUMINIUM = 0xC8CED2, POT_STEEL = 0xB8C4CC, COPPER = 0xB86B3A, CLAY_GLAZE = 0x4A3428;
/** The shop's see-through glass. */
const SHOP_GLASS = new MeshLambertMaterial({ color: 0xCFE8F0, transparent: true, opacity: 0.2, depthWrite: false });
later(() => {
  /** A bowl, a plate, a pot's body, a seiro's ring: shapes the stock is made of, sized by scale. */
  const BOWL = tube(1, 0.6, 0.6, 12), PLATE = tube(1, 0.8, 0.1, 14), POT_BODY = tube(1, 1, 1, 16), CUP = tube(1, 0.75, 1, 10);
  // everything small in the shop baked into two meshes: what casts a shadow, and what's too small to
  const b = new Build(), f = new Build(), Y = CY;
  const stack = (x: number, y: number, z: number, n: number, c: number | number[], r = 0.1) => {
    for (let i = 0; i < n; i++) b.add(BOWL, Array.isArray(c) ? c[i % c.length] : c, x, y + 0.035 + i * 0.035, z, null, [r, 0.07, r]);
  };
  const plates = (x: number, y: number, z: number, n: number, c: number, r = 0.13) => {
    for (let i = 0; i < n; i++) b.add(PLATE, c, x, y + 0.008 + i * 0.016, z, null, [r, 1, r]);
  };

  // the shop counter, where everything down here is bought: a merchant's counter of dark wood, panelled on the side
  // you stand at, its top pale hinoki; on it a glass case of knives, the abacus, the ledger, and a hand bell
  const { w: W, d: D } = BENCH, TOP = 0.85, X = BENCH.x, Z = BENCH.z, FRONT = X + W / 2;
  b.add(G.box, 0x2A1810, X, Y + 0.04, Z, null, [W - 0.08, 0.08, D - 0.08]);
  b.add(rbox(W, TOP - 0.13, D, 0.02), 0x4A2416, X, Y + 0.08 + (TOP - 0.13) / 2, Z);
  for (const dz of [-0.8, 0, 0.8]) f.add(rbox(0.012, TOP - 0.32, 0.66, 0.004), 0x5E3020, FRONT + 0.006, Y + 0.08 + (TOP - 0.13) / 2, Z + dz);
  b.add(rbox(W + 0.08, 0.05, D + 0.08, 0.015), HINOKI, X, Y + TOP - 0.025, Z);
  // (the case: a dark cloth with four knives laid on it, under glass in a chrome frame)
  const CZ = Z - 0.45, CW = 0.5, CD = 0.95, CH = 0.24;
  f.add(G.box, 0x1E1E22, X, Y + TOP + 0.01, CZ, null, [CW - 0.04, 0.02, CD - 0.04]);
  for (let i = 0; i < 4; i++) {
    const z = CZ - 0.33 + i * 0.22, len = 0.22 + (i % 2) * 0.05;
    f.add(G.box, 0xD5DEE5, X + 0.06, Y + TOP + 0.024, z, null, [len, 0.006, 0.045 - (i % 2) * 0.012]);
    f.add(G.box, i === 2 ? 0x2A1810 : 0x6A4A32, X - 0.13 + (0.22 - len) / 2, Y + TOP + 0.03, z, null, [0.12, 0.02, 0.026]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.add(G.box, 0xD5DEE5, X + sx * CW / 2, Y + TOP + CH / 2, CZ + sz * CD / 2, null, [0.02, CH, 0.02]);
  for (const s of [-1, 1]) {
    f.add(G.box, 0xD5DEE5, X, Y + TOP + CH, CZ + s * CD / 2, null, [CW, 0.02, 0.02]);
    f.add(G.box, 0xD5DEE5, X + s * CW / 2, Y + TOP + CH, CZ, null, [0.02, 0.02, CD]);
  }
  add(cellar, mesh(G.box, SHOP_GLASS, X, Y + TOP + CH / 2, CZ)).scale.set(CW, CH, CD);
  // (the abacus: a dark frame, its beam, and a row of beads on each rod)
  const AX = X + 0.15, AZ = Z + 0.3;
  for (const s of [-1, 1]) {
    f.add(G.box, 0x2A1810, AX + s * 0.08, Y + TOP + 0.015, AZ, null, [0.02, 0.03, 0.46]);
    f.add(G.box, 0x2A1810, AX, Y + TOP + 0.015, AZ + s * 0.22, null, [0.17, 0.03, 0.02]);
  }
  f.add(G.box, 0x2A1810, AX - 0.035, Y + TOP + 0.017, AZ, null, [0.012, 0.03, 0.44]);
  for (let i = 0; i < 9; i++) for (const dx of [-0.058, 0, 0.025, 0.05]) f.add(K.dot, 0x6A2E1E, AX + dx, Y + TOP + 0.02, AZ - 0.18 + i * 0.045, null, [0.011, 0.012, 0.018]);
  // (the hand bell, brass on a wooden handle)
  f.add(K.dome, 0xC9A23A, X + 0.2, Y + TOP, Z + 0.85, null, [0.05, 0.07, 0.05]);
  f.add(G.cyl, 0x5A3418, X + 0.2, Y + TOP + 0.1, Z + 0.85, null, [0.012, 0.08, 0.012]);
  // the ledger (a merchant's daifukuchō), fat and string-bound, lying open-side up by the bell
  b.add(G.box, 0xEFE6CF, X - 0.12, Y + TOP + 0.03, Z + 0.78, [0, 0.2, 0], [0.2, 0.06, 0.28]);
  const ledger = canvasTex(64, 96, (c, w, h) => {
    c.fillStyle = '#E6D6AE'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1E1812'; c.font = `800 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['大', '福', '帳'].forEach((k, i) => c.fillText(k, w / 2, 20 + i * 27));
  });
  const cover = add(cellar, new Mesh(new PlaneGeometry(0.18, 0.26), new MeshLambertMaterial({ map: ledger.tex })));
  cover.rotation.set(-Math.PI / 2, 0, 0.2); cover.position.set(X - 0.12, Y + TOP + 0.061, Z + 0.78);

  // on the wall behind it, the rails the shop hangs its wares on: up top a wok, a bamboo zaru and a frying pan; below,
  // a row of steel ladles and a copper tamagoyaki pan; and a paper notice pinned between
  const RX = CRAFT.x0 + 0.08, posts = [-1, 1].map(s => Z + s * (D / 2 + 0.12));
  for (const z of posts) b.add(G.box, WOOD_DARK, CRAFT.x0 + 0.02, Y + 1.2, z, null, [0.1, 2.4, 0.1]);
  for (const y of [1.45, 2.05]) {
    b.add(G.box, WOOD, RX, Y + y, Z, null, [0.07, 0.1, D + 0.4]);
    for (const z of posts) for (const dy of [-0.04, 0, 0.04]) f.add(G.box, HEMP, RX - 0.03, Y + y + dy, z, null, [0.13, 0.025, 0.13]);
  }
  const peg = (y: number, z: number) => f.add(G.cyl, WOOD_DARK, RX + 0.08, Y + y, z, [0, 0, Math.PI / 2], [0.015, 0.1, 0.015]);
  // (the wok, hung by its handle, the inside of its bowl to the room)
  peg(2.05, Z - 0.8);
  b.add(K.dome, IRON, RX + 0.1, Y + 1.75, Z - 0.8, [0, 0, -Math.PI / 2], [0.23, 0.08, 0.23]);
  f.add(G.cyl, WOOD_DARK, RX + 0.12, Y + 2.02, Z - 0.8, null, [0.016, 0.1, 0.016]);
  // (the zaru: a round bamboo sieve, its rim bound)
  peg(2.05, Z - 0.25);
  b.add(G.cyl, BAMBOO, RX + 0.1, Y + 1.82, Z - 0.25, [0, 0, Math.PI / 2], [0.18, 0.02, 0.18]);
  f.add(K.ring, BAMBOO_DARK, RX + 0.11, Y + 1.82, Z - 0.25, [0, Math.PI / 2, 0], [0.18, 0.18, 0.25]);
  // (the frying pan, handle up)
  peg(2.05, Z + 0.85);
  b.add(G.cyl, STEEL_DARK, RX + 0.1, Y + 1.7, Z + 0.85, [0, 0, Math.PI / 2], [0.16, 0.03, 0.16]);
  f.add(G.box, WOOD_DARK, RX + 0.1, Y + 1.98, Z + 0.85, null, [0.025, 0.26, 0.03]);
  // (the ladles, hung by their hooked handles, their bowls down)
  for (let i = 0; i < 5; i++) {
    const z = Z - 1.0 + i * 0.19;
    peg(1.45, z);
    f.add(G.cyl, POT_STEEL, RX + 0.11, Y + 1.27, z, null, [0.01, 0.34, 0.01]);
    b.add(K.ball, POT_STEEL, RX + 0.12, Y + 1.08, z, null, [0.055, 0.04, 0.055]);
  }
  // (the copper tamagoyaki pan, square, handle up)
  peg(1.45, Z + 0.05);
  b.add(G.box, COPPER, RX + 0.1, Y + 1.15, Z + 0.05, null, [0.03, 0.17, 0.16]);
  f.add(G.box, WOOD_DARK, RX + 0.1, Y + 1.36, Z + 0.05, null, [0.025, 0.2, 0.03]);
  // (the notice: 火の用心, mind the fire, brushed down a sheet with a red seal, on a board nailed across the rails)
  b.add(G.box, 0x9A7448, RX - 0.005, Y + 1.75, Z + 0.3, null, [0.03, 0.6, 0.36]);
  const notice = canvasTex(64, 96, (c, w, h) => {
    c.fillStyle = '#EFE6CF'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,90,50,.18)'; c.fillRect(0, h - 10, w, 10);
    c.fillStyle = '#1E1812'; c.font = `800 19px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['火', 'の', '用', '心'].forEach((k, i) => c.fillText(k, w / 2 - 4, 14 + i * 20));
    c.fillStyle = '#C0392B'; c.fillRect(w - 16, h - 22, 10, 10);
  });
  const sheet = add(cellar, new Mesh(new PlaneGeometry(0.22, 0.33), new MeshLambertMaterial({ map: notice.tex })));
  sheet.rotation.y = Math.PI / 2; sheet.position.set(RX + 0.012, Y + 1.75, Z + 0.3);
  // a lamp over the counter
  lantern(cellar, BENCH.x + 0.5, CY + 2.6, BENCH.z, false);

  // the shop's noren in the doorway from the hearth room: indigo, in three strips, 道 and 具 (tools, for the kitchen)
  // on the outer two in white and a white ring on the middle one; and a red lantern hung by it
  const t = door('craft'), span = t.x1 - t.x0 + 0.6, x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2 + 0.06, ny = CY + FRAME_H - 0.27;
  for (let i = -1; i <= 1; i++) {
    const m = box(cellar, INDIGO, x + i * span / 3, ny, z, span / 3 - 0.04, 0.34, 0.02, false); m.receiveShadow = false;
  }
  add(cellar, mesh(new TorusGeometry(0.075, 0.02, 4, 16), PORCELAIN, x, ny, z + 0.015));
  for (const [i, k] of [[-1, '道'], [1, '具']] as const) {
    const letter = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#F4F1EA'; c.font = `800 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k, w / 2, h / 2 + 2);
    });
    const m = add(cellar, new Mesh(new PlaneGeometry(0.22, 0.22), new MeshLambertMaterial({ map: letter.tex, transparent: true })));
    m.position.set(x + i * span / 3, ny, z + 0.012);
  }
  lantern(cellar, t.x1 + 0.6, CY + 2.2, CRAFT.z0 + 0.15, true);

  // a tansu chest in the corner by the counter, dark wood with black iron: a long drawer over two short ones over another
  // long one, iron pulls on round plates, corner plates, a lock plate, and a carrying ring on each end; a lucky cat on
  // it, waving the customers in
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
  {
    // (the cat: white, sat up, a red collar with a gold bell, its left paw raised)
    const cx = TANSU.x + 0.22, cy = Y + 0.1 + TH, cz = TANSU.z + 0.05;
    b.add(K.ball, PORCELAIN, cx, cy + 0.11, cz, null, [0.1, 0.12, 0.09]);
    b.add(K.ball, PORCELAIN, cx, cy + 0.29, cz + 0.01, null, [0.095, 0.085, 0.085]);
    for (const s of [-1, 1]) f.add(G.cone, PORCELAIN, cx + s * 0.06, cy + 0.37, cz, [0, 0, -s * 0.3], [0.03, 0.06, 0.025]);
    for (const s of [-1, 1]) f.add(G.cone, 0xE07A7A, cx + s * 0.058, cy + 0.365, cz + 0.012, [0, 0, -s * 0.3], [0.017, 0.04, 0.01]);
    f.add(K.ring, LACQUER_RED, cx, cy + 0.205, cz + 0.005, [Math.PI / 2, 0, 0], [0.075, 0.075, 0.3]);
    f.add(K.dot, 0xE8C14A, cx, cy + 0.19, cz + 0.08, null, 0.022);
    f.add(K.ball, PORCELAIN, cx - 0.09, cy + 0.3, cz + 0.03, null, [0.035, 0.05, 0.035]);
    f.add(K.ball, PORCELAIN, cx + 0.06, cy + 0.09, cz + 0.08, null, [0.03, 0.03, 0.035]);
    for (const s of [-1, 1]) f.add(K.dot, 0x1E1812, cx + s * 0.035, cy + 0.3, cz + 0.083, null, [0.012, 0.006, 0.006]);
  }

  // crates of crockery against the north wall, two piles of them, each branded on its end with the potters' 器 in a
  // red ring and their marks; straw packing in the top ones, and bowls showing in it
  const brand = canvasTex(128, 48, (c, w, h) => {
    c.fillStyle = '#B88A5C'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,40,20,.35)'; for (const y of [15, 31]) c.fillRect(0, y, w, 2);
    c.strokeStyle = '#A32A1E'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, 17, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#A32A1E'; c.font = `800 26px ${FONT}`; c.fillText('器', w / 2, h / 2 + 1);
    c.fillStyle = '#2A1A12'; c.font = `800 15px ${FONT}`; c.fillText('有田', 22, h / 2 + 1); c.fillText('瀬戸', w - 22, h / 2 + 1);
  });
  const ends: Matrix4[] = [];
  const crate = (x: number, y: number, z: number, turn: number, top: boolean) => {
    const k = add(cellar, new Group()); k.position.set(x, CY + y, z); k.rotation.y = turn;
    box(k, 0xA87B50, 0, 0.1, 0, 0.62, 0.2, 0.42);
    box(k, 0x8C6440, 0, 0.1, -0.212, 0.64, 0.2, 0.012, false);
    box(k, top ? 0xC9B271 : 0x2A1E17, 0, 0.199, 0, 0.56, 0.004, 0.36, false);
    if (top) for (const [dx, dz, c] of [[-0.16, -0.05, PORCELAIN], [0.04, 0.06, INDIGO], [0.19, -0.07, PORCELAIN]] as const) {
      add(k, mesh(BOWL, c, dx, 0.2, dz)).scale.set(0.09, 0.05, 0.09);
    }
    ends.push(placed(x, CY + y, z, turn).multiply(placed(0, 0.1, 0.213)));
  };
  for (const [y, turn, top] of [[0, 0, false], [0.2, 0.03, false], [0.4, -0.04, true]] as const) crate(CRATES.x - 0.33, y, CRATES.z, turn, top);
  for (const [y, turn, top] of [[0, -0.02, false], [0.2, 0.08, true]] as const) crate(CRATES.x + 0.34, y, CRATES.z + 0.01, turn, top);
  pictures(new PlaneGeometry(0.6, 0.19), brand.tex, ends);

  // under the shop's sign, a pallet of donabe: clay pots, dark brown glaze running cream round the lid, a knob on top,
  // and a price tag on a string
  b.add(G.box, WOOD_DARK, DONABE.x, Y + 0.04, DONABE.z, null, [1.0, 0.08, 0.5]);
  for (const [dx, s] of [[-0.27, 1], [0.27, 0.88]] as const) {
    const x = DONABE.x + dx, y = Y + 0.08;
    b.add(K.ball, CLAY_GLAZE, x, y + 0.13 * s, DONABE.z, null, [0.22 * s, 0.14 * s, 0.22 * s]);
    b.add(K.dome, 0x6E4A34, x, y + 0.19 * s, DONABE.z, null, [0.2 * s, 0.09 * s, 0.2 * s]);
    f.add(K.ring, 0xD8C8A8, x, y + 0.195 * s, DONABE.z, [Math.PI / 2, 0, 0], [0.2 * s, 0.2 * s, 0.3]);
    f.add(K.ball, 0xD8C8A8, x, y + 0.29 * s, DONABE.z, null, [0.035, 0.025, 0.035]);
    for (const e of [-1, 1]) f.add(G.box, CLAY_GLAZE, x + e * 0.22 * s, y + 0.15 * s, DONABE.z, null, [0.05, 0.03, 0.08]);
    f.add(G.box, 0xF4F1EA, x + 0.1 * s, y + 0.12 * s, DONABE.z + 0.22 * s, [0, 0, 0.2], [0.06, 0.035, 0.004]);
  }

  // shelves of crockery along the east wall: donburi, rice bowls in stacks, plates, teapots and sake flasks
  {
    const sx = SHELF.x, sz = SHELF.z, L = 1.74, DEP = 0.44;
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) b.add(G.box, WOOD_DARK, sx + ex * (DEP / 2 - 0.02), Y + 0.9, sz + ez * (L / 2 - 0.02), null, [0.04, 1.8, 0.04]);
    const shelves = [0.12, 0.6, 1.08, 1.56];
    for (const y of shelves) b.add(G.box, WOOD, sx, Y + y, sz, null, [DEP, 0.03, L]);
    b.add(G.box, shade(WOOD_DARK, 0.8), sx + DEP / 2 - 0.01, Y + 0.9, sz, null, [0.02, 1.7, L - 0.04]);
    const on = (k: number) => Y + shelves[k] + 0.015;
    [-0.6, -0.2, 0.2, 0.6].forEach((dz, i) => stack(sx - 0.03, on(0), sz + dz, 3, i % 2 ? 0x1E1E22 : LACQUER_RED, 0.14));
    [-0.66, -0.33, 0, 0.33, 0.66].forEach((dz, i) => stack(sx - 0.04, on(1), sz + dz, 4, [PORCELAIN, INDIGO, 0x8FB8A0][i % 3], 0.1));
    for (const dz of [-0.55, 0.05]) plates(sx - 0.02, on(2), sz + dz, 6, dz < 0 ? PORCELAIN : 0x8FB8A0, 0.15);
    for (const dz of [-0.25, 0.4, 0.68]) {
      const x = sx - 0.04, y = on(2), z = sz + dz;
      b.add(K.ball, dz > 0.5 ? 0x5A3A2A : 0x2E4A3A, x, y + 0.08, z, null, [0.09, 0.08, 0.09]);
      f.add(K.dot, 0x1E1E22, x, y + 0.165, z, null, 0.02);
      f.add(G.cyl, dz > 0.5 ? 0x5A3A2A : 0x2E4A3A, x - 0.1, y + 0.1, z, [0, 0, 0.9], [0.015, 0.09, 0.015]);
      f.add(G.cyl, WOOD_DARK, x, y + 0.09, z + 0.1, [Math.PI / 2, 0, 0], [0.012, 0.09, 0.012]);
    }
    for (let i = 0; i < 6; i++) {
      const x = sx - 0.05 + (i % 2) * 0.08, y = on(3), z = sz - 0.68 + i * 0.27;
      b.add(K.ball, i % 3 === 1 ? INDIGO : PORCELAIN, x, y + 0.08, z, null, [0.06, 0.08, 0.06]);
      f.add(G.cyl, i % 3 === 1 ? INDIGO : PORCELAIN, x, y + 0.18, z, null, [0.022, 0.06, 0.022]);
    }
    // (a price card hung off each shelf's edge)
    for (const [k, dz] of [[0, -0.4], [1, 0.16], [2, -0.25], [3, 0.4]] as const) {
      f.add(G.box, 0xF4F1EA, sx - DEP / 2 - 0.004, Y + shelves[k] - 0.035, sz + dz, null, [0.004, 0.05, 0.09]);
      f.add(K.dot, 0xC0392B, sx - DEP / 2 - 0.007, Y + shelves[k] - 0.035, sz + dz - 0.025, null, 0.01);
    }
  }

  // the showcase in the middle of the shop: a wooden cabinet with a glass case on it, and in the case, on white steps,
  // food samples (the wax and plastic dishes Kappabashi is known for): a bowl of ramen, a board of nigiri, an omurice,
  // a plate of tempura and a parfait, each with its price card
  {
    const x0 = SHOWCASE.x, z0 = SHOWCASE.z, L = 1.7, DEP = 0.6, BASE = 0.7, GH = 0.36;
    b.add(G.box, 0x2A1810, x0, Y + 0.04, z0, null, [L - 0.06, 0.08, DEP - 0.06]);
    b.add(rbox(L, BASE - 0.08, DEP, 0.02), 0x4A2416, x0, Y + 0.08 + (BASE - 0.08) / 2, z0);
    for (const dx of [-0.56, 0, 0.56]) f.add(rbox(0.5, BASE - 0.26, 0.012, 0.004), 0x5E3020, x0 + dx, Y + 0.08 + (BASE - 0.08) / 2, z0 + DEP / 2 + 0.006);
    b.add(rbox(L + 0.04, 0.03, DEP + 0.04, 0.01), HINOKI, x0, Y + BASE + 0.015, z0);
    // (the white steps: a low front one, a higher back one)
    const S = Y + BASE + 0.03;
    b.add(G.box, 0xF4F4EE, x0, S + 0.02, z0 + 0.1, null, [L - 0.08, 0.04, 0.3]);
    b.add(G.box, 0xF4F4EE, x0, S + 0.06, z0 - 0.14, null, [L - 0.08, 0.12, 0.22]);
    const front = S + 0.04, back = S + 0.12;
    // (ramen: a red bowl, the broth, noodles, a halved egg, chashu, a slice of naruto and a sheet of nori)
    {
      const x = x0 - 0.6, z = z0 + 0.1, y = front;
      b.add(BOWL, LACQUER_RED, x, y + 0.045, z, null, [0.13, 0.09, 0.13]);
      f.add(G.cyl, 0xC98A4A, x, y + 0.085, z, null, [0.115, 0.006, 0.115]);
      for (const [dx, dz] of [[-0.04, -0.03], [0, 0.03], [0.04, -0.02]]) f.add(G.box, 0xF1D57A, x + dx, y + 0.09, z + dz, [0, dx * 9, 0], [0.09, 0.008, 0.012]);
      f.add(K.ball, 0xF4F1EA, x + 0.05, y + 0.095, z + 0.045, null, [0.03, 0.015, 0.022]);
      f.add(K.dot, 0xF2A33A, x + 0.05, y + 0.106, z + 0.045, null, [0.014, 0.006, 0.012]);
      f.add(G.cyl, 0x9A5A3A, x - 0.05, y + 0.093, z + 0.04, null, [0.04, 0.008, 0.04]);
      f.add(G.cyl, 0xF4EDE8, x - 0.03, y + 0.094, z - 0.06, null, [0.025, 0.006, 0.025]);
      f.add(G.box, 0x1F3A2A, x + 0.02, y + 0.13, z - 0.1, [0.25, 0, 0], [0.07, 0.09, 0.004]);
    }
    // (nigiri on a little wooden board)
    {
      const x = x0 - 0.18, z = z0 - 0.14, y = back;
      b.add(G.box, HINOKI, x, y + 0.015, z, null, [0.34, 0.03, 0.14]);
      [0xFF8A5C, 0xD8394B, 0xFFD24A, 0xFF8A5C].forEach((c, i) => {
        const dx = -0.12 + i * 0.08;
        f.add(G.box, 0xF4F1EA, x + dx, y + 0.045, z, null, [0.05, 0.03, 0.08]);
        f.add(G.box, c, x + dx, y + 0.065, z, null, [0.058, 0.014, 0.09]);
      });
    }
    // (omurice: an oval plate, the egg, a line of ketchup)
    {
      const x = x0 + 0.12, z = z0 + 0.1, y = front;
      b.add(G.cyl, PORCELAIN, x, y + 0.006, z, null, [0.16, 0.012, 0.11]);
      b.add(K.ball, 0xF6D35A, x, y + 0.02, z, null, [0.11, 0.05, 0.065]);
      f.add(G.box, 0xC0392B, x, y + 0.07, z, [0, 0.3, 0], [0.12, 0.006, 0.014]);
    }
    // (tempura: two prawns and a leaf on a plate)
    {
      const x = x0 + 0.5, z = z0 + 0.1, y = front;
      b.add(PLATE, 0x2B2B30, x, y + 0.006, z, null, [0.13, 1, 0.13]);
      for (const [dz, r] of [[-0.03, 0.3], [0.04, -0.2]]) {
        f.add(K.ball, 0xE3A84A, x, y + 0.035, z + dz, [0, r, 0], [0.11, 0.028, 0.03]);
        f.add(G.cone, 0xE0533A, x + 0.11 * Math.cos(r), y + 0.04, z + dz - 0.11 * Math.sin(r), [0, r, -Math.PI / 2], [0.025, 0.04, 0.01]);
      }
      f.add(K.ball, 0x6E9A4A, x - 0.06, y + 0.03, z - 0.05, null, [0.04, 0.008, 0.03]);
    }
    // (the parfait: a tall glass of layers, cream on top, a cherry and a wafer)
    {
      const x = x0 + 0.42, z = z0 - 0.14, y = back;
      [[0xF4E6C8, 0.05], [0xE89AA8, 0.05], [0x6E3A22, 0.04], [0xF4E6C8, 0.04]].reduce((at, [c, h]) => {
        b.add(CUP, c, x, at + h / 2, z, null, [0.05 + (at - y) * 0.15, h, 0.05 + (at - y) * 0.15]);
        return at + h;
      }, y);
      f.add(K.dome, 0xFBF8F0, x, y + 0.18, z, null, [0.055, 0.05, 0.055]);
      f.add(K.dot, 0xC0182B, x, y + 0.235, z, null, 0.018);
      f.add(G.box, 0xD9A25A, x + 0.03, y + 0.24, z - 0.01, [0, 0, 0.3], [0.012, 0.09, 0.03]);
    }
    // (the price cards along the front step)
    for (const dx of [-0.6, -0.18, 0.12, 0.42, 0.5]) f.add(G.box, 0xFFFDF5, x0 + dx, front + 0.02, z0 + 0.235, [-0.3, 0, 0], [0.08, 0.04, 0.004]);
    // (the glass case on it, in a chrome frame)
    const gy = Y + BASE + 0.03;
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) f.add(G.box, 0xD5DEE5, x0 + ex * (L / 2 - 0.01), gy + GH / 2, z0 + ez * (DEP / 2 - 0.01), null, [0.02, GH, 0.02]);
    for (const s of [-1, 1]) {
      f.add(G.box, 0xD5DEE5, x0, gy + GH, z0 + s * (DEP / 2 - 0.01), null, [L, 0.02, 0.02]);
      f.add(G.box, 0xD5DEE5, x0 + s * (L / 2 - 0.01), gy + GH, z0, null, [0.02, 0.02, DEP]);
    }
    add(cellar, mesh(G.box, SHOP_GLASS, x0, gy + GH / 2, z0)).scale.set(L - 0.02, GH, DEP - 0.02);
  }

  // along the south wall: two towers of bamboo steamers (seiro), lidded; stock pots, one on another, and a stack of
  // yukihira pans with their wooden handles; and a crock of long wooden spoons, ladles and cooking chopsticks
  for (const [dx, n] of [[-0.3, 5], [0.3, 3]] as const) {
    const x = STEAMERS.x + dx, z = STEAMERS.z;
    for (let i = 0; i < n; i++) {
      b.add(POT_BODY, BAMBOO, x, Y + 0.05 + i * 0.1, z, null, [0.22, 0.09, 0.22]);
      f.add(K.ring, BAMBOO_DARK, x, Y + 0.095 + i * 0.1, z, [Math.PI / 2, 0, 0], [0.222, 0.222, 0.2]);
    }
    b.add(K.dome, BAMBOO, x, Y + n * 0.1, z, null, [0.22, 0.05, 0.22]);
    f.add(G.cyl, BAMBOO_DARK, x, Y + n * 0.1 + 0.05, z, null, [0.04, 0.02, 0.04]);
  }
  {
    const x = POTS.x, z = POTS.z;
    const pot = (px: number, y: number, r: number, h: number) => {
      b.add(POT_BODY, POT_STEEL, px, y + h / 2, z, null, [r, h, r]);
      f.add(K.ring, shade(POT_STEEL, 0.85), px, y + h, z, [Math.PI / 2, 0, 0], [r, r, 0.2]);
      for (const e of [-1, 1]) f.add(G.box, shade(POT_STEEL, 0.8), px + e * (r + 0.02), y + h * 0.8, z, null, [0.04, 0.02, 0.08]);
      return y + h;
    };
    const lid = (px: number, y: number, r: number) => {
      b.add(K.dome, POT_STEEL, px, y, z, null, [r, 0.05, r]);
      f.add(K.dot, 0x1E1E22, px, y + 0.055, z, null, [0.03, 0.015, 0.03]);
    };
    lid(x - 0.38, pot(x - 0.38, Y, 0.25, 0.42), 0.25);
    lid(x + 0.12, pot(x + 0.12, pot(x + 0.12, Y, 0.2, 0.28), 0.16, 0.22), 0.16);
    for (let i = 0; i < 3; i++) {
      const y = Y + 0.035 + i * 0.05, r = 0.13 - i * 0.012, turn = 0.5 - i * 0.35;
      b.add(POT_BODY, ALUMINIUM, x + 0.52, y, z, null, [r, 0.06, r]);
      f.add(G.cyl, WOOD, x + 0.52 + Math.sin(turn) * (r + 0.09), y + 0.02, z + Math.cos(turn) * (r + 0.09), [Math.PI / 2, turn, 0], [0.016, 0.18, 0.016]);
    }
  }
  {
    const x = CROCK.x, z = CROCK.z;
    b.add(tube(0.17, 0.14, 0.42, 14), 0x6E3A22, x, Y + 0.21, z);
    f.add(K.ring, 0xD8C8A8, x, Y + 0.36, z, [Math.PI / 2, 0, 0], [0.165, 0.165, 0.4]);
    // (standing in it, leaning out a little each: wooden spoons, a ladle, a spatula and a bundle of long chopsticks)
    for (const [dx, dz, lean, turn, k] of [
      [-0.06, -0.04, 0.12, 0.4, 'spoon'], [0.05, -0.05, 0.1, 2.2, 'spoon'], [0.04, 0.05, 0.16, -0.8, 'ladle'],
      [-0.05, 0.05, 0.14, 3.6, 'spatula'], [0, 0, 0.05, 1.2, 'sticks'],
    ] as const) {
      const ox = Math.sin(turn) * lean, oz = Math.cos(turn) * lean, len = k === 'sticks' ? 0.62 : 0.56;
      const rot: [number, number, number] = [oz, 0, -ox];
      const tx = x + dx + ox * len, tz = z + dz + oz * len, ty = Y + 0.15 + len;
      if (k === 'sticks') for (const e of [-0.012, 0, 0.012]) f.add(G.box, 0xD9B98A, x + dx + e + ox * len / 2, Y + 0.15 + len / 2, z + dz + oz * len / 2, rot, [0.008, len, 0.008]);
      else f.add(G.cyl, k === 'ladle' ? POT_STEEL : 0xC9A06A, x + dx + ox * len / 2, Y + 0.15 + len / 2, z + dz + oz * len / 2, rot, [0.012, len, 0.012]);
      if (k === 'spoon') b.add(K.ball, 0xC9A06A, tx, ty + 0.02, tz, rot, [0.035, 0.06, 0.015]);
      if (k === 'ladle') b.add(K.ball, POT_STEEL, tx, ty + 0.02, tz, rot, [0.05, 0.035, 0.05]);
      if (k === 'spatula') b.add(G.box, 0xC9A06A, tx, ty + 0.03, tz, rot, [0.08, 0.1, 0.012]);
    }
  }

  add(cellar, b.mesh());
  add(cellar, f.mesh(false));
});

// ---------- the grow room: dark earth, damp walls, and glowing toadstools in the corners ----------
later(() => {
  const SPORE = glow(0x9CE6C8, 0x2E9C7A);
  for (const [x, z] of [[GROW.x0 + 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z1 - 0.6], [GROW.x0 + 0.5, GROW.z1 - 2.2]]) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7, r = 0.15 + i * 0.07;
      add(parts.grow, mesh(G.cyl, 0xE6DCC8, x + Math.cos(a) * r, CY + 0.08 + i * 0.03, z + Math.sin(a) * r)).scale.set(0.03, 0.16 + i * 0.05, 0.03);
      add(parts.grow, mesh(G.sphere, SPORE, x + Math.cos(a) * r, CY + 0.18 + i * 0.06, z + Math.sin(a) * r)).scale.set(0.09, 0.05, 0.09);
    }
  }
  // two water pipes down the back wall, either side of its sign: iron, flanged at the joints, coming out of the wall up
  // high and stopping over a bucket that catches what drips
  const z = GROW.z0 + 0.15;
  for (const x of [GROW.x0 + 1.2, GROW.x1 - 1.2]) {
    add(parts.grow, mesh(G.cyl, STEEL_DARK, x, CY + 2.2, z)).scale.set(0.05, 3.7, 0.05);
    add(parts.grow, mesh(G.cyl, STEEL_DARK, x, CY + 4.05, z - 0.25, false)).rotation.x = Math.PI / 2;
    parts.grow.children[parts.grow.children.length - 1].scale.set(0.05, 0.5, 0.05);
    for (const y of [1.2, 2.4, 3.6]) add(parts.grow, mesh(G.cyl, IRON, x, CY + y, z, false)).scale.set(0.075, 0.06, 0.075);
    add(parts.grow, mesh(G.sphere, STEEL_DARK, x, CY + 4.05, z, false)).scale.setScalar(0.07);
    add(parts.grow, mesh(G.cyl, WOOD, x, CY + 0.13, z + 0.02, true)).scale.set(0.16, 0.26, 0.16);
    add(parts.grow, mesh(G.cyl, 0x3E5A66, x, CY + 0.255, z + 0.02, false)).scale.set(0.14, 0.01, 0.14);
  }
});

// ---------- the Undertow: the Family's club ----------
// A dark club dug out of the rock in front of the arena, after a gangster's bar in a city's undercity: near-black boards,
// iron and neon. The way in is a long dark tunnel shored up like a mine's, out of the arena's south wall and down past
// the club, pipes along its wall and beams overhead, to a pair of heavy doors in its side at the far end (the doors, the
// doorman behind them and the tunnel's lights: doorway.ts). Along the club's back, under a tall dark wall, the bar at
// the west end (its front lit by tubes of amber and pink, bottles on shelves behind it among slanted green tubes, pipes
// along the top, the club's name over it), then three pointed iron arches hung with red velvet, iron columns between
// them with teal lamps at their tops: the regulars' booth in the first, Slick Eddie's own booth in the middle (a curved
// velvet banquette round a little round table, his telephone, his fight card and a carnation on it, his chalkboard of the
// card behind), and the singer's little round stage in the last. Through a doorway in the west wall, Hammerhead Harry
// has an office of his own, a bookkeeper's back room: his desk, filing cabinets and shelves of ledgers, a safe, his
// bookkeeper's corner, and a board of IOUs pinned up behind him. Through another doorway in it, south of the office,
// Three-Card Tommy has a card room of his own: sat behind a half-moon card table by a green-shaded lamp, a folding screen
// behind him and his card on an easel by it. Round the room: a high table, a round iron table with stools, a square table whose top glows pink, barrels in the
// corner, a red rug down the middle and a pink tube along the front wall. (The barman and the regulars: regulars.ts.)
/** The club's stools (for walking round). */
const DEN_STOOLS: XZ[] = [];
later(() => {
  /** The club's neon and lamps: teal, pink, amber and green tubes. */
  const TEAL = glow(0xA8F7F0, 0x2FC9C0), PINK = glow(0xFFA8D0, 0xFF2E86), AMBER = glow(0xFFE2A8, 0xFFA43A), GREEN = glow(0xA8FFBA, 0x2EE070);
  /** Red velvet, in folds, cut to a pointed arch (for the curtains in the arches). */
  const velvet = canvasTex(128, 192, (c, w, h) => {
    const spring = h * (1 - 1.5 / 2.55);
    c.beginPath(); c.moveTo(0, h); c.lineTo(0, spring);
    c.quadraticCurveTo(0, spring * 0.25, w / 2, 0); c.quadraticCurveTo(w, spring * 0.25, w, spring); c.lineTo(w, h); c.closePath();
    c.clip();
    const g = c.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? '#5A0F1C' : '#8E1E2E');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const top = c.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, 'rgba(10,0,4,.55)'); top.addColorStop(0.4, 'rgba(10,0,4,0)'); top.addColorStop(1, 'rgba(10,0,4,.35)');
    c.fillStyle = top; c.fillRect(0, 0, w, h);
  });
  /** A square table's top, glowing pink, with rings round its middle. */
  const pinkTop = canvasTex(128, 128, (c, w) => {
    c.fillStyle = '#FF4F96'; c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(120,0,50,.55)'; c.lineWidth = 4;
    for (const r of [14, 30, 46]) { c.beginPath(); c.arc(w / 2, w / 2, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeRect(6, 6, w - 12, w - 12);
  });
  /** The card on the table of the booth kept for Eddie. */
  const reserved = canvasTex(96, 40, (c, w, h) => {
    c.fillStyle = '#F2EEE2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8E1E2E'; c.font = `800 15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RESERVED', w / 2, h / 2 + 1);
  });
  /** VIP, in pink neon, over the door of Eddie's room. */
  const vipSign = canvasTex(160, 64, (c, w, h) => {
    c.fillStyle = 'rgba(20,10,16,.85)'; rr(c, 4, 4, w - 8, h - 8, 10); c.fill();
    c.font = `800 40px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#FF2E86'; c.shadowBlur = 14; c.fillStyle = '#FFB0D6'; c.fillText('VIP', w / 2, h / 2 + 2); c.fillText('VIP', w / 2, h / 2 + 2);
  });
  /** A champagne bottle's gold foil. */
  const GOLD_FOIL = glow(0xE8C46A, 0x5A4010);
  /** Eddie's chalkboard of the card: the five bosses down it, and the odds he's giving on each. */
  const theCard = canvasTex(192, 128, (c, w, h) => {
    c.fillStyle = '#5A3A22'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1F2A24'; c.fillRect(7, 7, w - 14, h - 14);
    c.fillStyle = '#E8E4D8'; c.font = `800 17px ${FONT}`; c.textAlign = 'center'; c.fillText('THE CARD', w / 2, 26);
    c.font = `600 14px ${FONT}`;
    ['🐙 2-1', '🦀 3-1', '🐀 4-1', '🦈 6-1', '🐡 10-1'].forEach((t, i) => { c.textAlign = 'left'; c.fillText(t, 22 + (i % 2) * 82, 50 + Math.floor(i / 2) * 24); });
    c.strokeStyle = 'rgba(232,228,216,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, 33); c.lineTo(w - 20, 33); c.stroke();
  });
  /** Harry's board: cork, with IOUs pinned all over it. */
  const iouBoard = canvasTex(192, 112, (c, w, h) => {
    c.fillStyle = '#6A4A2A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#B88A55'; c.fillRect(6, 6, w - 12, h - 12);
    const hash = (i: number) => { const x = Math.sin(i * 45.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 14; i++) {
      const x = 14 + hash(i) * (w - 54), y = 12 + hash(i + 20) * (h - 44);
      c.save(); c.translate(x + 18, y + 13); c.rotate((hash(i + 40) - 0.5) * 0.5);
      c.fillStyle = i % 3 ? '#F4F1EA' : '#E8DDB8'; c.fillRect(-18, -13, 36, 26);
      c.fillStyle = '#4A3A30'; c.font = `700 9px ${FONT}`; c.textAlign = 'center'; c.fillText('IOU', 0, -2);
      c.fillStyle = '#9B2F2A'; c.font = `700 8px ${FONT}`; c.fillText(`🐡${(1 + Math.floor(hash(i + 60) * 9)) * 10}`, 0, 9);
      c.fillStyle = '#C0392B'; c.beginPath(); c.arc(0, -10, 2.4, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  });
  /** Tommy's card, on the easel by his table. */
  const ladySign = canvasTex(128, 80, (c, w, h) => {
    c.fillStyle = '#C9A877'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2A1E18'; c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.fillText('FIND', w / 2, 28); c.fillText('THE LADY', w / 2, 52);
    c.fillStyle = '#B23A2E'; c.font = '16px serif'; c.fillText('♥', w / 2, 72);
  });
  /** The panels of Tommy's screen: lacquer red in a gold border, a suit on each. */
  const screenPanels = ['♠', '♥', '♣'].map(suit => canvasTex(64, 192, (c, w, h) => {
    c.fillStyle = '#5A0F1C'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#C9A23A'; c.lineWidth = 3; c.strokeRect(5, 5, w - 10, h - 10);
    c.lineWidth = 1.5; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#E2BC5C'; c.font = '40px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(suit, w / 2, h * 0.42);
    c.font = '14px serif'; c.fillText(suit, w / 2, h * 0.16); c.fillText(suit, w / 2, h * 0.72);
  }).tex);
  const p = parts.den, BRASS = 0xC9A23A, LEATHER = 0x6B1E22, IRONS = 0x262E33, PIPE = 0x3A454C, MAHOGANY = 0x5A2618;
  const face = line(DEN, 'n', 0.3) + 0.07;
  // ---- the tunnel ----
  // shoring: a frame of timber every so often along it, beams across the top, a lantern at its mouth, and pipes along its
  // east wall (one of them leaking steam: doorway.ts)
  for (let z = PASSAGE.z0 + 0.5; z < PASSAGE.z1 - 0.3; z += 1.25) {
    // (none in front of the doors)
    if (z > CLUB_DOOR.z0 - 0.25 && z < CLUB_DOOR.z1 + 0.25) continue;
    for (const x of [PASSAGE.x0 + 0.05, PASSAGE.x1 - 0.05]) box(p, WOOD_DARK, x, CY + FRAME_H / 2, z, 0.18, FRAME_H, 0.18);
    box(p, WOOD_DARK, (PASSAGE.x0 + PASSAGE.x1) / 2, CY + FRAME_H, z, PASSAGE.x1 - PASSAGE.x0 + 0.3, 0.18, 0.22);
  }
  lantern(p, PASSAGE.x0 - 0.1, CY + 2.3, ARENA.z1 + 0.5, true);
  for (const [y, r] of [[1.35, 0.05], [1.55, 0.035]] as const) {
    const pipe = add(p, mesh(G.cyl, PIPE, PASSAGE.x1 - 0.12, CY + y, (PASSAGE.z0 + PASSAGE.z1) / 2)); pipe.scale.set(r, PASSAGE.z1 - PASSAGE.z0, r); pipe.rotation.x = Math.PI / 2;
  }
  for (let z = PASSAGE.z0 + 1.1; z < PASSAGE.z1; z += 2.4) add(p, mesh(new CylinderGeometry(0.075, 0.075, 0.08, 10), IRONS, PASSAGE.x1 - 0.12, CY + 1.35, z)).rotation.x = Math.PI / 2;
  // a brass plate by the doors: members only
  box(p, BRASS, PASSAGE.x0 + 0.02, CY + 1.55, CLUB_DOOR.z0 - 0.45, 0.02, 0.14, 0.32, false);
  // ---- the club's back wall: the columns and the three arches, each with its curtain ----
  const cols = [ARCHES[0] - ARCH_HALF, ...ARCHES.map(x => x + ARCH_HALF)];
  for (const x of cols) {
    box(p, IRONS, x, CY + DEN_TALL / 2, face + 0.05, 0.18, DEN_TALL, 0.1);
    box(p, IRONS, x, CY + 0.15, face + 0.08, 0.26, 0.3, 0.16);
    const ring = add(p, mesh(new TorusGeometry(0.15, 0.028, 6, 18), IRONS, x, CY + 2.3, face + 0.11)); ring.castShadow = false;
    add(p, mesh(new CylinderGeometry(0.12, 0.12, 0.03, 16), TEAL, x, CY + 2.3, face + 0.11)).rotation.x = Math.PI / 2;
    box(p, TEAL, x, CY + 1.65, face + 0.115, 0.035, 0.9, 0.035, false);
  }
  /** One side of a pointed arch, from its spring `w` out from the middle (straight up from there) round to its point,
   *  as a tube: an arc of a circle twice as wide as the arch, as a Gothic arch's are, squashed to rise from y0 to y1. */
  const archSide = (x: number, s: number, w: number, y0: number, y1: number, r: number) => {
    const end = Math.PI / 3, pts = Array.from({ length: 8 }, (_, i) => {
      const a = end * i / 7;
      return new Vector3(x + s * (w - 2 * w * (1 - Math.cos(a))), CY + y0 + (y1 - y0) * Math.sin(a) / Math.sin(end), face + 0.12);
    });
    add(p, mesh(new TubeGeometry(new CatmullRomCurve3(pts), 16, r, 6), IRONS));
  };
  const curtain = new MeshLambertMaterial({ map: velvet.tex, alphaTest: 0.5 });
  for (const x of ARCHES) {
    for (const s of [-1, 1]) { archSide(x, s, ARCH_HALF - 0.09, 1.5, 2.6, 0.04); archSide(x, s, ARCH_HALF - 0.25, 1.5, 2.38, 0.018); }
    const rose = add(p, mesh(new TorusGeometry(0.07, 0.014, 5, 14), IRONS, x, CY + 2.24, face + 0.12)); rose.castShadow = false;
    add(p, new Mesh(new PlaneGeometry(2 * (ARCH_HALF - 0.09), 2.55), curtain)).position.set(x, CY + 1.275, face + 0.02);
  }
  // ---- the bar ----
  // its counter, lit down its front by tubes of amber and pink, a brass rail along its top edge and another at its foot
  const B = DEN_BAR, bw = B.x1 - B.x0, bx = (B.x0 + B.x1) / 2, bz = B.front - B.d / 2;
  box(p, 0x221816, bx, CY + (B.h - 0.06) / 2, bz, bw, B.h - 0.06, B.d);
  box(p, 0x2C2522, bx, CY + B.h - 0.03, bz + 0.03, bw + 0.1, 0.06, B.d + 0.12);
  box(p, BRASS, bx, CY + B.h - 0.03, B.front + 0.095, bw + 0.1, 0.03, 0.02, false);
  box(p, BRASS, bx, CY + 0.15, B.front + 0.16, bw - 0.1, 0.03, 0.03, false);
  const tubes = Math.round(bw / 0.42);
  for (let i = 0; i < tubes; i++) box(p, i % 3 === 1 ? PINK : AMBER, B.x0 + (i + 0.5) * bw / tubes, CY + B.h / 2, B.front + 0.015, 0.035, B.h - 0.3, 0.035, false);
  // a duckboard behind it for the barman to stand on (regulars.ts), so he's seen over his counter
  box(p, 0x1E1614, bx, CY + 0.11, (face + B.front - B.d) / 2 + 0.1, bw - 0.1, 0.22, B.front - B.d - face - 0.25);
  // behind it, against the wall: a cabinet, shelves of bottles with slanted green tubes among them, the club's name
  // over them (sign(), with the rooms'), and pipes along the top of the wall, one coming down to the counter
  box(p, 0x1E1614, bx, CY + 0.45, face + 0.14, bw, 0.9, 0.28);
  const BOTTLES = [0x7A3B1E, 0x2E6A4A, 0xC9A23A, 0x8E2B26, 0x6FA8B8, 0x3E2418, 0xD9C27A];
  for (const [j, y] of [1.2, 1.62].entries()) {
    box(p, 0x2C2522, bx, CY + y, face + 0.12, bw, 0.04, 0.24);
    for (let i = 0; i < 14; i++) {
      const x = B.x0 + 0.15 + (i + (j % 2) * 0.5) * (bw - 0.3) / 14;
      add(p, mesh(G.cyl, BOTTLES[(i * 3 + j) % BOTTLES.length], x, CY + y + 0.13, face + 0.12, false)).scale.set(0.035, 0.22, 0.035);
      add(p, mesh(G.cyl, BOTTLES[(i * 3 + j) % BOTTLES.length], x, CY + y + 0.28, face + 0.12, false)).scale.set(0.012, 0.08, 0.012);
    }
  }
  for (let i = 0; i < 4; i++) box(p, GREEN, B.x0 + 0.5 + i * (bw - 1) / 3, CY + 1.42, face + 0.02, 0.03, 0.5, 0.03, false).rotation.z = i % 2 ? 0.45 : -0.45;
  for (const [y, r] of [[2.68, 0.05], [2.8, 0.035]] as const) {
    const pipe = add(p, mesh(G.cyl, PIPE, bx, CY + y, face + 0.1)); pipe.scale.set(r, bw + 0.3, r); pipe.rotation.z = Math.PI / 2;
  }
  const drop = B.x1 - 0.2;
  add(p, mesh(G.cyl, PIPE, drop, CY + (B.h + 2.68) / 2, face + 0.1)).scale.set(0.05, 2.68 - B.h, 0.05);
  add(p, mesh(new CylinderGeometry(0.07, 0.07, 0.03, 14), 0xE8E0CC, drop, CY + 1.9, face + 0.16, false)).rotation.x = Math.PI / 2;
  // the bar's stools, and a lamp hung over its west end
  const stool = (x: number, z: number, h = 0.72) => {
    add(p, mesh(new CylinderGeometry(0.18, 0.18, 0.03, 14), IRONS, x, CY + 0.015, z, false));
    add(p, mesh(G.cyl, IRONS, x, CY + h / 2, z)).scale.set(0.03, h, 0.03);
    add(p, mesh(new CylinderGeometry(0.17, 0.15, 0.07, 14), LEATHER, x, CY + h + 0.035, z));
    DEN_STOOLS.push({ x, z });
  };
  for (const s of BAR_STOOLS) stool(s.x, s.z, 0.78);
  add(p, mesh(G.rope, 0x1B1A1E, B.x0 + 0.6, CY + 2.55, B.front - 0.25)).scale.y = 0.6;
  add(p, mesh(new CylinderGeometry(0.06, 0.2, 0.16, 14, 1, true), IRONS, B.x0 + 0.6, CY + 2.2, B.front - 0.25));
  add(p, mesh(G.sphere, AMBER, B.x0 + 0.6, CY + 2.13, B.front - 0.25)).scale.setScalar(0.06);
  // ---- the regulars' booth under the first arch: a high-backed leather seat, a little round table ----
  /** A booth's high-backed seat against the wall, buttoned, on a dark wood base, `w` wide, at (x, z). */
  const seat = (x: number, z: number, w: number) => {
    box(p, WOOD_DARK, x, CY + 0.2, z - 0.32, w, 0.4, 0.5);
    box(p, LEATHER, x, CY + 0.45, z - 0.3, w - 0.04, 0.12, 0.46);
    box(p, LEATHER, x, CY + 0.95, z - 0.52, w, 1.0, 0.16);
    for (const s of [-1, 1]) box(p, LEATHER, x + s * (w / 2 + 0.03), CY + 0.8, z - 0.32, 0.12, 0.7, 0.52);
    for (let k = -w / 2 + 0.25; k <= w / 2 - 0.2; k += 0.3) add(p, mesh(G.sphere, 0x4A1216, x + k, CY + 1.15, z - 0.43)).scale.setScalar(0.025);
  };
  seat(SNUG.x, SNUG.z, 1.7);
  // ---- the booth under the middle arch, Eddie's till he took a room of his own: a curved velvet banquette round the
  // back of a little round table, kept for him (a card on the table says so) ----
  /** A curved banquette round the back of a round table at (0, 0) in `g`, facing +z. */
  const banquette = (g: Object3D) => {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + 0.7 * i / 6), r = 0.95, seat = add(g, new Group());
      seat.position.set(-Math.cos(a) * r, 0, -Math.sin(a) * r); seat.rotation.y = Math.PI / 2 - a;
      box(seat, WOOD_DARK, 0, 0.2, 0, 0.5, 0.4, 0.46);
      box(seat, LEATHER, 0, 0.45, 0.02, 0.5, 0.12, 0.44);
      box(seat, LEATHER, 0, 0.85, -0.22, 0.5, 0.8, 0.14);
    }
  };
  /** A little round table on a pedestal at (0, 0) in `g`, its top `h` up. */
  const pedestal = (g: Object3D, r: number, h: number) => {
    add(g, mesh(new CylinderGeometry(0.24, 0.28, 0.04, 14), IRONS, 0, 0.02, 0, false));
    add(g, mesh(G.cyl, IRONS, 0, h / 2, 0)).scale.set(0.05, h, 0.05);
    add(g, mesh(new CylinderGeometry(r, r, 0.05, 22), MAHOGANY, 0, h, 0));
  };
  {
    const M = MID_BOOTH, g = add(p, new Group()); g.position.set(M.x, CY, M.z);
    banquette(g); pedestal(g, M.r, M.h);
    const card = add(g, new Mesh(new PlaneGeometry(0.24, 0.1), new MeshLambertMaterial({ map: reserved.tex, side: DoubleSide })));
    card.position.set(0, M.h + 0.07, 0.05); card.rotation.x = -0.35;
  }
  // ---- Slick Eddie's room, through the club's south wall ----
  // over its doorway on the club's side, two brass posts with a velvet rope looped from each to the wall, and over it on
  // the room's, VIP in pink neon; inside, a red carpet with a gold edge, and at its far end his banquette round his
  // table (on it his telephone, the fight card, a stack of chips and a carnation in a glass), his chalkboard of the card
  // on the wall over him, his two bodyguards either side of him (guards.ts); a champagne bucket on a stand by the
  // table, and in the corners by the door a brass standard lamp and a potted palm
  {
    const E = DESKS.eddie, EB = BOOTHS.eddie, t = DOORS.find(d => d.b === 'vip')!, wallZ = line(DEN, 's', 0.3);
    for (const x of [t.x0 - 0.3, t.x1 + 0.3]) {
      const z = wallZ - 0.45;
      add(p, mesh(new CylinderGeometry(0.11, 0.13, 0.03, 14), BRASS, x, CY + 0.015, z, false));
      add(p, mesh(G.cyl, BRASS, x, CY + 0.45, z)).scale.set(0.025, 0.9, 0.025);
      add(p, mesh(G.sphere, BRASS, x, CY + 0.92, z, false)).scale.setScalar(0.045);
      const rope = new CatmullRomCurve3([V(x, CY + 0.86, z), V(x, CY + 0.66, (z + wallZ) / 2), V(x, CY + 0.84, wallZ - 0.08)]);
      add(p, mesh(new TubeGeometry(rope, 10, 0.02, 6, false), 0x8E1E2E, 0, 0, 0, false));
    }
    const neon = add(p, new Mesh(new PlaneGeometry(0.9, 0.36), new MeshBasicMaterial({ map: vipSign.tex, transparent: true })));
    neon.position.set((t.x0 + t.x1) / 2, CY + FRAME_H + 0.32, wallZ + 0.1);
    box(p, 0x6A1A1E, (VIP.x0 + VIP.x1) / 2, CY + 0.012, (VIP.z0 + VIP.z1) / 2, VIP.x1 - VIP.x0 - 0.5, 0.02, VIP.z1 - VIP.z0 - 0.5, false);
    box(p, 0xB8862E, (VIP.x0 + VIP.x1) / 2, CY + 0.01, (VIP.z0 + VIP.z1) / 2, VIP.x1 - VIP.x0 - 0.35, 0.02, VIP.z1 - VIP.z0 - 0.35, false);
    // (his table and banquette, turned to face the door)
    const g = add(p, new Group()); g.position.set(E.x, CY, E.z); g.rotation.y = EB.face;
    banquette(g); pedestal(g, E.r, E.h);
    const top = E.h + 0.025;
    box(g, 0x1B1A1E, -0.22, top + 0.05, -0.1, 0.22, 0.1, 0.16);
    box(g, 0x1B1A1E, -0.22, top + 0.13, -0.1, 0.28, 0.05, 0.07).rotation.y = 0.15;
    box(g, 0xEFE3C4, 0.1, top + 0.005, 0.12, 0.3, 0.01, 0.2, false).rotation.y = -0.25;
    for (let i = 0; i < 5; i++) add(g, mesh(G.cyl, i % 2 ? 0xC0392B : 0xF4F1EA, 0.24, top + 0.012 + i * 0.022, -0.14)).scale.set(0.055, 0.02, 0.055);
    add(g, mesh(new CylinderGeometry(0.03, 0.025, 0.12, 10), glow(0xD8EEF2, 0x203038), -0.02, top + 0.06, -0.22));
    add(g, mesh(G.cyl, 0x2E6A2E, -0.02, top + 0.17, -0.22)).scale.set(0.005, 0.12, 0.005);
    add(g, mesh(G.sphere, 0xC8323A, -0.02, top + 0.24, -0.22)).scale.setScalar(0.03);
    const west = line(VIP, 'w', 0.1) + 0.07;
    const chalk = add(p, new Mesh(new PlaneGeometry(0.9, 0.6), new MeshLambertMaterial({ map: theCard.tex })));
    chalk.position.set(west + 0.06, CY + 1.72, E.z); chalk.rotation.y = Math.PI / 2;
    // (the champagne: a silver bucket on a stand, a bottle's neck up out of the ice)
    const bx = E.x + 0.25, bz = E.z + E.r + 0.55;
    add(p, mesh(G.cyl, 0x8A8F96, bx, CY + 0.32, bz)).scale.set(0.02, 0.64, 0.02);
    add(p, mesh(new CylinderGeometry(0.16, 0.18, 0.02, 12), 0x8A8F96, bx, CY + 0.01, bz, false));
    add(p, mesh(new CylinderGeometry(0.13, 0.1, 0.2, 14), new MeshLambertMaterial({ color: 0xC9CDD2, emissive: 0x2A2C30 }), bx, CY + 0.74, bz));
    add(p, mesh(new CylinderGeometry(0.045, 0.05, 0.16, 10), 0x1E4A2A, bx + 0.02, CY + 0.88, bz, false)).rotation.z = -0.2;
    add(p, mesh(new CylinderGeometry(0.022, 0.03, 0.06, 8), GOLD_FOIL, bx + 0.04, CY + 0.98, bz, false)).rotation.z = -0.2;
    // (the lamp, and the palm)
    const lx = VIP.x1 - 0.35, lz = VIP.z0 + 0.35;
    add(p, mesh(new CylinderGeometry(0.14, 0.16, 0.04, 14), BRASS, lx, CY + 0.02, lz, false));
    add(p, mesh(G.cyl, BRASS, lx, CY + 0.8, lz)).scale.set(0.016, 1.6, 0.016);
    add(p, mesh(new CylinderGeometry(0.12, 0.2, 0.22, 16, 1, true), glow(0xF2C79A, 0x8A4A1A), lx, CY + 1.66, lz));
    const px = VIP.x1 - 0.42, pz = VIP.z1 - 0.42;
    add(p, mesh(new CylinderGeometry(0.2, 0.15, 0.36, 12), 0x5A2618, px, CY + 0.18, pz));
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, frond = box(p, 0x3E7A3E, px + Math.sin(a) * 0.18, CY + 0.95, pz + Math.cos(a) * 0.18, 0.12, 0.02, 0.5, false);
      frond.rotation.set(Math.cos(a) * 0.5, a, 0);
    }
    add(p, mesh(G.cyl, 0x6E4A2A, px, CY + 0.6, pz)).scale.set(0.035, 0.7, 0.035);
  }
  // ---- the stage under the last arch: a low round dais ringed in pink, a microphone on a stand at its front ----
  add(p, mesh(new CylinderGeometry(STAGE.r, STAGE.r + 0.05, 0.22, 28), 0x231A18, STAGE.x, CY + 0.11, STAGE.z));
  const ring = add(p, mesh(new TorusGeometry(STAGE.r + 0.02, 0.025, 6, 40), PINK, STAGE.x, CY + 0.2, STAGE.z, false)); ring.rotation.x = Math.PI / 2;
  const mic = { x: STAGE.x + 0.4, z: STAGE.z + 0.45 };
  add(p, mesh(new CylinderGeometry(0.12, 0.12, 0.02, 12), IRONS, mic.x, CY + 0.23, mic.z, false));
  add(p, mesh(G.cyl, 0xB9C2C9, mic.x, CY + 0.95, mic.z)).scale.set(0.012, 1.45, 0.012);
  add(p, mesh(G.sphere, 0x2A2A2E, mic.x, CY + 1.7, mic.z)).scale.set(0.045, 0.06, 0.045);
  // ---- Hammerhead Harry's office, through the club's west wall: a bookkeeper's back room ----
  // a dark green carpet; his desk side on to the door (its drawers towards him, a panel with a brass trim towards you),
  // on it his cash box, his ledger open, a pile of IOUs, a banker's lamp and an adding machine, and a green-shaded lamp
  // hung low over it; behind him, on the tall west wall, his board of IOUs and a clock; along the back wall the filing
  // cabinets, ledgers in rows on two shelves over them, and the safe in the corner; his bookkeeper's little desk in the
  // south-west corner, piled with ledgers, an adding machine with its paper curling down to the floor; a hat stand and
  // a water cooler by the door, a potted kelp in the corner; and over the door, on the club's side, his name in gold on
  // frosted glass
  const L = LOANS, lwest = line(L, 'w', 0.1) + 0.07, H = DESKS.harry, hx = H.x, hz = H.z, K = LEDGER;
  box(p, 0x1F3A2E, (L.x0 + L.x1) / 2, CY + 0.012, (L.z0 + L.z1) / 2, L.x1 - L.x0 - 0.35, 0.02, L.z1 - L.z0 - 0.35, false);
  box(p, 0x2E5A44, (L.x0 + L.x1) / 2, CY + 0.014, (L.z0 + L.z1) / 2, L.x1 - L.x0 - 0.55, 0.02, L.z1 - L.z0 - 0.55, false);
  box(p, MAHOGANY, hx, CY + H.h, hz, H.w, 0.06, H.d);
  for (const s of [-1, 1]) {
    box(p, 0x6E3220, hx, CY + H.h / 2 - 0.02, hz + s * (H.d / 2 - 0.22), H.w - 0.06, H.h - 0.04, 0.42);
    for (const y of [0.2, 0.42, 0.62]) box(p, BRASS, hx - H.w / 2 + 0.02, CY + y, hz + s * (H.d / 2 - 0.22), 0.02, 0.03, 0.14, false);
  }
  box(p, 0x6E3220, hx + H.w / 2 - 0.04, CY + 0.5, hz, 0.05, 0.5, H.d - 0.86);
  box(p, BRASS, hx + H.w / 2 - 0.01, CY + H.h - 0.05, hz, 0.02, 0.03, H.d - 0.1, false);
  const ht = CY + H.h + 0.03;
  box(p, 0x3A4650, hx - 0.05, ht + 0.07, hz - 0.42, 0.24, 0.14, 0.34);
  box(p, BRASS, hx + 0.07, ht + 0.1, hz - 0.42, 0.01, 0.04, 0.06, false);
  box(p, 0x7A1E1E, hx, ht + 0.015, hz + 0.05, 0.22, 0.03, 0.3).rotation.y = 0.1;
  box(p, 0xF4F1EA, hx + 0.01, ht + 0.033, hz + 0.05, 0.2, 0.006, 0.28, false).rotation.y = 0.1;
  for (let i = 0; i < 6; i++) box(p, i % 2 ? 0xF4F1EA : 0xE8DDB8, hx + 0.12 - (i % 3) * 0.06, ht + 0.004 + i * 0.006, hz + 0.42 + (i % 2) * 0.05, 0.13, 0.005, 0.18, false).rotation.y = (i * 0.9) % 1 - 0.5;
  box(p, 0x2A2A2E, hx - 0.15, ht + 0.04, hz + 0.45, 0.2, 0.08, 0.22);
  add(p, mesh(G.cyl, BRASS, hx - 0.2, ht + 0.12, hz - 0.08)).scale.set(0.012, 0.22, 0.012);
  const shade = add(p, mesh(new CylinderGeometry(0.1, 0.1, 0.3, 10, 1, false, 0, Math.PI), glow(0x2F7A4A, 0x1E5A34), hx - 0.16, ht + 0.24, hz - 0.08));
  shade.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  // the lamp hung over the desk: a cord down from the dark, a green enamel shade, its bulb glowing under it
  add(p, mesh(G.cyl, 0x15181D, hx, CY + 2.6, hz, false)).scale.set(0.01, 0.7, 0.01);
  add(p, mesh(new ConeGeometry(0.26, 0.2, 16, 1, true), glow(0x2F7A4A, 0x14402A), hx, CY + 2.18, hz));
  add(p, mesh(G.sphere, AMBER, hx, CY + 2.1, hz, false)).scale.setScalar(0.06);
  const board = add(p, new Mesh(new PlaneGeometry(1.25, 0.73), new MeshLambertMaterial({ map: iouBoard.tex })));
  board.position.set(lwest + 0.02, CY + 1.85, hz); board.rotation.y = Math.PI / 2;
  // the clock over the bookkeeper's corner: a white face in a dark rim, its hands at ten to five
  const clock = add(p, new Group()); clock.position.set(lwest + 0.03, CY + 2.15, K.clerk.z - 0.2); clock.rotation.y = Math.PI / 2;
  add(clock, mesh(new CylinderGeometry(0.17, 0.17, 0.04, 20), 0x23282C, 0, 0, 0)).rotation.x = Math.PI / 2;
  add(clock, mesh(new CylinderGeometry(0.145, 0.145, 0.045, 20), 0xF2EEE2, 0, 0, 0.002, false)).rotation.x = Math.PI / 2;
  for (const [len, a] of [[0.1, -1.05], [0.07, 0.5]]) { const hand = box(clock, 0x15181D, Math.sin(a) * len / 2, Math.cos(a) * len / 2, 0.028, 0.012, len, 0.006, false); hand.rotation.z = -a; }
  // the filing cabinets along the back wall, each with its four drawers, and two shelves of ledgers over them
  const F = K.files, fw = 0.52, fx1 = F.x + (F.n - 1) * (fw + 0.06);
  for (let i = 0; i < F.n; i++) {
    const x = F.x + i * (fw + 0.06);
    box(p, 0x4A4F55, x, CY + 0.62, F.z, fw, 1.24, 0.5);
    for (let k = 0; k < 4; k++) {
      box(p, 0x3A3F45, x, CY + 0.17 + k * 0.29, F.z + 0.251, fw - 0.06, 0.012, 0.004, false);
      box(p, 0x8A9098, x, CY + 0.3 + k * 0.29, F.z + 0.26, 0.12, 0.02, 0.02, false);
    }
  }
  const SPINES = [0x7A1E1E, 0x1F3A5A, 0x2E4A2A, 0x5A3A1E, 0x3A2A4A, 0x6A5A2A];
  for (const [j, y] of [1.5, 1.95].entries()) {
    box(p, WOOD_DARK, (F.x + fx1) / 2, CY + y, face + 0.13, fx1 - F.x + fw + 0.2, 0.04, 0.26);
    for (let x = F.x - fw / 2 + 0.03, k = j * 3; x < fx1 + fw / 2 - 0.05; k++) {
      const w = 0.05 + (k * 7 % 3) * 0.01, hh = 0.26 + (k * 5 % 4) * 0.015;
      box(p, SPINES[k % SPINES.length], x + w / 2, CY + y + 0.02 + hh / 2, face + 0.13, w - 0.005, hh, 0.2, false);
      x += w + (k % 7 === 6 ? 0.08 : 0);
    }
  }
  // the safe: squat and dark green, its brass dial and handle towards the room
  const S = K.safe;
  box(p, 0x2C3A34, S.x, CY + 0.42, S.z, 0.62, 0.84, 0.6);
  box(p, 0x24302B, S.x, CY + 0.42, S.z + 0.31, 0.5, 0.72, 0.02);
  add(p, mesh(new CylinderGeometry(0.07, 0.07, 0.03, 16), BRASS, S.x + 0.08, CY + 0.52, S.z + 0.33)).rotation.x = Math.PI / 2;
  box(p, BRASS, S.x - 0.14, CY + 0.36, S.z + 0.33, 0.12, 0.03, 0.03, false);
  // the bookkeeper's desk: ledgers piled up on it, one open, an adding machine with its paper tape curling to the floor
  const C = K.desk, ct = CY + C.h;
  box(p, 0x5A3A26, C.x, ct, C.z, C.w, 0.05, C.d);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(p, 0x3A2618, C.x + sx * (C.w / 2 - 0.04), CY + C.h / 2, C.z + sz * (C.d / 2 - 0.04), 0.05, C.h, 0.05);
  for (let i = 0; i < 5; i++) box(p, SPINES[(i + 2) % SPINES.length], C.x - 0.05 + (i % 2) * 0.03, ct + 0.04 + i * 0.045, C.z - C.d / 2 + 0.2, 0.28, 0.04, 0.22).rotation.y = (i % 3 - 1) * 0.12;
  box(p, 0xF4F1EA, C.x - 0.02, ct + 0.035, C.z + 0.05, 0.26, 0.01, 0.34, false);
  box(p, 0x2A2A2E, C.x + 0.05, ct + 0.06, C.z + 0.3, 0.2, 0.08, 0.2);
  box(p, 0xF4F1EA, C.x + C.w / 2 + 0.01, CY + (C.h + 0.04) / 2, C.z + 0.3, 0.005, C.h + 0.04, 0.05, false);
  box(p, 0xF4F1EA, C.x + C.w / 2 + 0.14, CY + 0.004, C.z + 0.3, 0.26, 0.005, 0.05, false).rotation.y = 0.3;
  // the hat stand by the door, a fedora on it
  const stand = add(p, new Group()); stand.position.set(K.hats.x, CY, K.hats.z);
  add(stand, mesh(G.cyl, WOOD_DARK, 0, 0.9, 0, true)).scale.set(0.035, 1.8, 0.035);
  for (let i = 0; i < 3; i++) box(stand, WOOD_DARK, 0, 0.03, 0, 0.44, 0.04, 0.05).rotation.y = i * Math.PI / 3;
  add(stand, mesh(new CylinderGeometry(0.26, 0.26, 0.02, 16), 0x2E2B33, 0.03, 1.84, 0, true)).rotation.z = -0.2;
  add(stand, mesh(new CylinderGeometry(0.14, 0.16, 0.13, 14), 0x2E2B33, 0.03, 1.91, 0, true)).rotation.z = -0.2;
  // the water cooler: a pale cabinet, a blue bottle upside down on it, paper cones in a holder
  const W = K.cooler;
  box(p, 0xD8D8D0, W.x, CY + 0.45, W.z, 0.3, 0.9, 0.3);
  add(p, mesh(G.cyl, new MeshLambertMaterial({ color: 0x7AB8E0, transparent: true, opacity: 0.75 }), W.x, CY + 1.1, W.z)).scale.set(0.13, 0.36, 0.13);
  add(p, mesh(G.sphere, new MeshLambertMaterial({ color: 0x7AB8E0, transparent: true, opacity: 0.75 }), W.x, CY + 0.95, W.z, false)).scale.set(0.13, 0.08, 0.13);
  box(p, 0xF4F1EA, W.x - 0.16, CY + 0.7, W.z, 0.02, 0.2, 0.06, false);
  // the potted kelp, tall ribbons of it up out of a clay pot
  const Kp = K.kelp;
  add(p, mesh(new CylinderGeometry(0.2, 0.15, 0.36, 12), 0x9A5A3A, Kp.x, CY + 0.18, Kp.z));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, leaf = box(p, 0x3A7A3A, Kp.x + Math.sin(a) * 0.07, CY + 0.36 + 0.5, Kp.z + Math.cos(a) * 0.07, 0.07, 1.0 - (i % 3) * 0.15, 0.015, false);
    leaf.rotation.set(Math.cos(a) * 0.18, a, Math.sin(a) * 0.18);
  }
  // over the doors of the office and the card room, on the club's side: frosted glass, the name in gold
  for (const [to, name] of [['loans', 'H. HAMMERHEAD · LOANS'], ['cards', 'THREE-CARD TOMMY']] as const) {
    const t = DOORS.find(d => d.b === to)!, plate = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#B9C6C2'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, 0, w, h / 2);
      c.fillStyle = '#C9A23A'; c.font = `800 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(name, w / 2, h / 2 + 1);
    });
    const glass = add(p, new Mesh(new PlaneGeometry(1.3, 0.32), new MeshLambertMaterial({ map: plate.tex })));
    glass.position.set(line(DEN, 'w', 0.3) + 0.12, CY + FRAME_H + 0.32, (t.z0 + t.z1) / 2); glass.rotation.y = Math.PI / 2;
  }
  // ---- Three-Card Tommy's card room, through the club's west wall ----
  // a round green rug; a half-moon card table, its straight edge his (his three cards on it: monteTable.ts),
  // green baize inside a padded rail round its curved edge, a tray of chips and a deck at his elbows, on three turned legs;
  // his bentwood chair; a folding screen behind him, a suit on each panel; a green-shaded lamp leant over the table; and
  // his card on an easel by it
  const T = DESKS.tommy, TB = BOOTHS.tommy, R = T.w / 2, back = T.z - T.d / 2;
  const half = (r: number, h: number, open = false) => new CylinderGeometry(r, r, h, 24, 1, open, -Math.PI / 2, Math.PI);
  add(p, mesh(new CylinderGeometry(1.08, 1.08, 0.02, 32), 0x1E3A2C, T.x, CY + 0.014, T.z - 0.2, false));
  add(p, mesh(new CylinderGeometry(1.15, 1.15, 0.018, 32), 0xB8862E, T.x, CY + 0.012, T.z - 0.2, false));
  add(p, mesh(half(R, 0.05), MAHOGANY, T.x, CY + T.h - 0.025, back));
  add(p, mesh(half(R - 0.03, 0.1, true), MAHOGANY, T.x, CY + T.h - 0.1, back));
  box(p, MAHOGANY, T.x, CY + T.h - 0.07, back + 0.012, T.w - 0.02, 0.1, 0.025);
  add(p, mesh(half(R - 0.06, 0.012), 0x1F6A3A, T.x, CY + T.h + 0.003, back, false));
  const rail = add(p, mesh(new TorusGeometry(R - 0.035, 0.035, 6, 24, Math.PI), LEATHER, T.x, CY + T.h + 0.012, back)); rail.rotation.x = Math.PI / 2;
  for (const [dx, dz] of [[-R + 0.14, 0.1], [R - 0.14, 0.1], [0, R - 0.14]]) add(p, mesh(G.cyl, MAHOGANY, T.x + dx, CY + (T.h - 0.1) / 2, back + dz)).scale.set(0.03, T.h - 0.1, 0.03);
  box(p, 0x2A1E18, T.x + 0.36, CY + T.h + 0.018, back + 0.13, 0.26, 0.03, 0.1, false);
  [0xB23A2E, 0x2E5AA8, 0xEDE6D2, 0x1B1A1E].forEach((c, i) => {
    const n = 3 - (i % 2);
    add(p, mesh(new CylinderGeometry(0.026, 0.026, 0.012 * n, 12), c, T.x + 0.27 + i * 0.06, CY + T.h + 0.033 + 0.006 * n, back + 0.13, false));
  });
  box(p, 0x8E2B26, T.x - 0.38, CY + T.h + 0.022, back + 0.15, 0.09, 0.03, 0.13, false).rotation.y = 0.3;
  // (his chair: a round seat on four legs, a hoop for its back)
  add(p, mesh(new CylinderGeometry(0.2, 0.19, 0.04, 16), MAHOGANY, TB.x, CY + 0.47, TB.z));
  for (const a of [0.8, 2.35, 3.95, 5.5]) add(p, mesh(G.cyl, MAHOGANY, TB.x + Math.sin(a) * 0.14, CY + 0.23, TB.z + Math.cos(a) * 0.14, false)).scale.set(0.018, 0.46, 0.018);
  for (const s of [-1, 1]) add(p, mesh(G.cyl, MAHOGANY, TB.x + s * 0.16, CY + 0.66, TB.z - 0.17, false)).scale.set(0.016, 0.38, 0.016);
  add(p, mesh(new TorusGeometry(0.16, 0.018, 6, 16, Math.PI), MAHOGANY, TB.x, CY + 0.85, TB.z - 0.17));
  // (the screen: three panels hinged together, the outer two folded forward round him)
  const screen = add(p, new Group()); screen.position.set(TB.x, CY, TB.z - 0.62);
  screenPanels.forEach((tex, i) => {
    const s = i - 1, hinge = add(screen, new Group()), PW = 0.55;
    hinge.position.x = s * PW / 2; hinge.rotation.y = -s * 0.5;
    const x = s * PW / 2;
    box(hinge, MAHOGANY, x, 0.9, 0, PW, 1.7, 0.04);
    const face = add(hinge, new Mesh(new PlaneGeometry(PW - 0.06, 1.62), new MeshLambertMaterial({ map: tex })));
    face.position.set(x, 0.9, 0.022);
    for (const fx of [-0.2, 0.2]) box(hinge, MAHOGANY, x + fx, 0.03, 0, 0.06, 0.06, 0.1, false);
  });
  // (the lamp: a brass standard lamp by the screen's west end, its green enamel shade leant out over the table, its bulb
  // glowing under it; not hung over the table, where it'd hide him from the camera up high)
  const lx = T.x - 0.95, lz = TB.z - 0.1;
  add(p, mesh(new CylinderGeometry(0.15, 0.17, 0.04, 14), BRASS, lx, CY + 0.02, lz, false));
  add(p, mesh(G.cyl, BRASS, lx, CY + 0.8, lz)).scale.set(0.016, 1.6, 0.016);
  const arm = add(p, mesh(G.cyl, BRASS, lx + 0.14, CY + 1.62, lz + 0.05, false)); arm.scale.set(0.012, 0.32, 0.012); arm.rotation.set(0.3, 0, -1.1);
  add(p, mesh(new ConeGeometry(0.2, 0.16, 16, 1, true), glow(0x2F7A4A, 0x14402A), lx + 0.29, CY + 1.62, lz + 0.1));
  add(p, mesh(G.sphere, AMBER, lx + 0.29, CY + 1.56, lz + 0.1, false)).scale.setScalar(0.05);
  // (the easel, on the far side from the door: two legs splayed in front, one behind, his card on its ledge)
  const easel = add(p, new Group()); easel.position.set(T.x - R - 0.4, CY, T.z + 0.15); easel.rotation.y = 0.5;
  for (const s of [-1, 1]) { const leg = add(easel, mesh(G.cyl, MAHOGANY, s * 0.17, 0.42, 0.04, false)); leg.scale.set(0.014, 0.86, 0.014); leg.rotation.set(-0.12, 0, -s * 0.12); }
  const hind = add(easel, mesh(G.cyl, MAHOGANY, 0, 0.38, -0.12, false)); hind.scale.set(0.014, 0.8, 0.014); hind.rotation.x = 0.35;
  box(easel, MAHOGANY, 0, 0.47, 0.07, 0.46, 0.025, 0.05, false);
  const card = add(easel, new Mesh(new PlaneGeometry(0.42, 0.26), new MeshLambertMaterial({ map: ladySign.tex })));
  card.position.set(0, 0.62, 0.05); card.rotation.x = -0.12;
  // (the Family, each at his place: undertow.ts)
  // ---- round the room ----
  // a red rug down the middle of the floor
  // (from in front of the regulars' booth to the east; and from the booths' tables nearly to the front wall)
  const rugX0 = DEN.x0 + 3.4, rugX1 = DEN.x0 + 9.1, rugZ0 = MID_BOOTH.z + MID_BOOTH.r - 0.05, rugZ1 = DEN.z1 - 0.75;
  box(p, 0x6A1A1E, (rugX0 + rugX1) / 2, CY + 0.012, (rugZ0 + rugZ1) / 2, rugX1 - rugX0, 0.02, rugZ1 - rugZ0, false);
  box(p, 0xB8862E, (rugX0 + rugX1) / 2, CY + 0.01, (rugZ0 + rugZ1) / 2, rugX1 - rugX0 + 0.15, 0.02, rugZ1 - rugZ0 + 0.15, false);
  // round iron tables, each on a pedestal with an iron rim round its dark top
  const ironTable = (at: XZ, r = 0.38, h = 0.76) => {
    add(p, mesh(new CylinderGeometry(0.24, 0.28, 0.04, 14), IRONS, at.x, CY + 0.02, at.z, false));
    add(p, mesh(G.cyl, IRONS, at.x, CY + h / 2, at.z)).scale.set(0.045, h, 0.045);
    add(p, mesh(new CylinderGeometry(r, r, 0.04, 20), 0x1E2226, at.x, CY + h, at.z));
    const rim = add(p, mesh(new TorusGeometry(r, 0.018, 5, 24), IRONS, at.x, CY + h + 0.01, at.z)); rim.rotation.x = Math.PI / 2;
  };
  const D = DEN_TABLES;
  ironTable(SNUG.table, 0.35); ironTable(D.south); ironTable(D.west); ironTable(D.coat, 0.3, 1.05);
  for (const at of [D.south, D.west]) { stool(at.x - 0.62, at.z); stool(at.x + 0.62, at.z); }
  // the pink table: a dark square table whose top glows pink
  box(p, IRONS, D.pink.x, CY + 0.37, D.pink.z, 0.1, 0.74, 0.1);
  box(p, IRONS, D.pink.x, CY + 0.02, D.pink.z, 0.5, 0.04, 0.5, false);
  box(p, 0x1E2226, D.pink.x, CY + 0.74, D.pink.z, 0.8, 0.05, 0.8);
  const lit = add(p, new Mesh(new PlaneGeometry(0.72, 0.72), new MeshBasicMaterial({ map: pinkTop.tex })));
  lit.position.set(D.pink.x, CY + 0.768, D.pink.z); lit.rotation.x = -Math.PI / 2;
  stool(D.pink.x - 0.66, D.pink.z); stool(D.pink.x + 0.66, D.pink.z);
  // barrels in the corner, standing in a pair, iron hoops round them
  for (const dz of [-0.36, 0.36]) {
    const z = BARRELS.z + dz;
    add(p, mesh(new CylinderGeometry(0.27, 0.27, 0.85, 14), 0x5A3A26, BARRELS.x, CY + 0.425, z));
    for (const y of [0.12, 0.42, 0.72]) add(p, mesh(new CylinderGeometry(0.285, 0.285, 0.035, 14), IRONS, BARRELS.x, CY + y, z, false));
  }
});

// ---------- the teppo post, where the sparring partner slaps ----------
later(() => { log(cellar, 0x7A5236, TEPPO.x, CY + 1.3, TEPPO.z, 2.2, 2.6); });

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
later(() => {
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
});

// ---------- the ladder up to the dock, in the daylight coming down through the hatch ----------
later(() => {
  const g = add(cellar, new Group()); g.position.copy(LADDER); g.rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) box(g, WOOD, s * 0.3, 3.4, 0, 0.08, 6.8, 0.08);
  for (let y = 0.35; y < 6.6; y += 0.42) box(g, WOOD, 0, y, 0, 0.6, 0.05, 0.06);
  const beam = add(g, mesh(new ConeGeometry(BEAM_R, 7.2, 20, 1, true), new MeshBasicMaterial({ color: 0xBFE3FF, transparent: true, opacity: 0.09, blending: AdditiveBlending, depthWrite: false })));
  beam.position.y = 3.6;
  beam.renderOrder = 2;
});

// ---------- the drummers' drums (the Underground Arena's) ----------
export const DRUMS = [V(-9.9, CY, RING.z - 2.6), V(-9.9, CY, RING.z + 2.6)];
later(() => {
  for (const at of DRUMS) {
    const g = add(parts.drums, new Group()); g.position.set(at.x, CY, at.z);
    const d = add(g, mesh(new CylinderGeometry(0.42, 0.42, 0.55, 16), 0x7A3B2E, 0, 0.75, 0, true));
    d.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) add(g, mesh(new CylinderGeometry(0.43, 0.43, 0.02, 16), 0xF2E6CC, s * 0.28, 0.75, 0)).rotation.z = Math.PI / 2;
    box(g, WOOD_DARK, 0, 0.3, 0, 0.5, 0.6, 0.5);
  }
});

/** Puts up the venue's tier `t` (0 to 3), and everything below it: the stands it adds, and its decorations. */
export function showVenue(t: number) {
  parts.bleachers.visible = t >= 1;
  parts.tier.visible = parts.drums.visible = t >= 2;
  parts.vip.visible = t >= 3;
}
/** Whether the club's doors are shut (doorway.ts opens and shuts them): shut, they're in the way. */
export const denDoor = { shut: true };
/** The Undertow's found: the arena's wall across the tunnel's mouth comes down, and through it the Family's back room.
 *  (Its lamps' light is there all along, dark till then, as the grow room's is.) */
export function showDen(on = true) {
  parts.den.visible = on;
  parts.denHidden.visible = !on;
  found.den = on;
  lights[9].intensity = on ? DEN_GLOW[0] : 0;
  lights[10].intensity = on ? DEN_GLOW[1] : 0;
  lights[11].intensity = on ? DEN_GLOW[2] : 0;
  lights[12].intensity = on ? DEN_GLOW[3] : 0;
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
 *  hall, (once it's found) the grow room's sickly glow, the cookware shop's lamp, and (once it's found) the Undertow's
 *  cold light over the room and its bar's warm glow. */
export const lights = [
  new PointLight(0xFFD7A0, 16, 15, 1.2), new PointLight(0xFF9A5A, 9, 10, 1.5), new PointLight(0xFF9A5A, 9, 10, 1.5),
  new PointLight(0xFF9A4A, 8, 8, 1.5), new PointLight(0xCFE8FF, 10, 7, 1.4), new PointLight(0xFFC77A, 8, 9, 1.4),
  new PointLight(0xFFD08A, 8, 9, 1.4), new PointLight(0x9CE6C8, 9, 11, 1.4), new PointLight(0xFFC98A, 7, 8, 1.4),
  // (the Undertow's, on dice of their own, as its parts are: the club's teal over the room, the bar's amber, Harry's
  // lamp's warm light over his desk, and a low rosy one in Eddie's room)
  ...apart(() => [new PointLight(0xB8E6DE, 12, 13, 1.3), new PointLight(0xFFA27A, 7, 8, 1.4), new PointLight(0xFFD9A0, 7, 7, 1.4), new PointLight(0xFFC4A8, 7, 7, 1.4)], dice(0xDE11)),
];
lights[0].position.set(RING.x, CY + 5.35, RING.z);
lights[1].position.set(RING.x, CY + 3.4, ARENA.z0 + 1.5);
lights[2].position.set(ARENA.x0 + 1.5, CY + 3.4, RING.z + 1);
lights[3].position.set(HEARTH.x, CY + 1.1, HEARTH.z + 1.3);
lights[4].position.set(LADDER.x - 1.2, CY + 4, LADDER.z + 0.8);
lights[5].position.set(OFFICE.x + 1.5, CY + 3.4, OFFICE.z + 1.2);
lights[6].position.set((PREP.x0 + PREP.x1) / 2 + 1, CY + 3.2, (PREP.z0 + PREP.z1) / 2);
lights[7].position.set((GROW.x0 + GROW.x1) / 2, CY + 3.0, (GROW.z0 + GROW.z1) / 2);
lights[8].position.set(BENCH.x + 2.2, CY + 2.8, BENCH.z);
lights[9].position.set((DEN.x0 + DEN.x1) / 2 + 1, CY + 3.0, DEN.z0 + 3.2);
lights[10].position.set(DEN_BAR.x0 + 1.5, CY + 2.3, DEN.z0 + 3.4);
lights[11].position.set(DESKS.harry.x + 0.6, CY + 2.3, DESKS.harry.z + 0.5);
lights[12].position.set(DESKS.eddie.x + 1.0, CY + 2.3, DESKS.eddie.z);
const GROW_GLOW = lights[7].intensity, DEN_GLOW = [lights[9].intensity, lights[10].intensity, lights[11].intensity, lights[12].intensity];
lights[7].intensity = lights[9].intensity = lights[10].intensity = lights[11].intensity = lights[12].intensity = 0;
lights.forEach(l => { l.visible = false; scene.add(l); });
/** The cellar's sky: near-black brown, warm low light, as stage.ts's day and dusk are for the world above. */
export const CELLAR_SKY = { bg: new Color(0x1B1512), sky: 0xFFD7A8, grd: 0x4A3428, hemi: 0.4, sun: 0xFFC98F, sunI: 0.34 };

/** Shows the cellar (stage 3), building it first if it's not built yet. */
export function showCellar() { buildCellar(); cellar.visible = true; }
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
    [GONG.x, GONG.z, 1.15, 0.45],
    [CASHIER.x, CASHIER.z, 0.65, 1.3],
    [TEPPO.x, TEPPO.z, 0.5, 0.5],
    [KOMO.x, KOMO.z, 0.5, 1.45],
    // the hearth room: the hearth and the counter behind it, and the bowl counter
    [HEARTH.x, (KITCHEN.z0 + HEARTH.z + HEARTH.d / 2 + 0.6) / 2, HEARTH.w / 2 + 0.3, (HEARTH.z + HEARTH.d / 2 + 0.6 - KITCHEN.z0) / 2 + 0.3],
    [COUNTER.x, COUNTER.z, 0.75, 0.95],
    // the prep hall: the sacks (what comes down the dumbwaiters is all behind the east wall)
    [SACKS.x, SACKS.z, 0.45, 0.6],
    ...KITCHEN_BINS.map((b): [number, number, number, number] => [b.x, b.z, 0.65, 0.65]),
    // the cookware shop: the counter, the tansu, the crates of crockery, the clay pots, the shelves, the showcase, the
    // steamers, the stock pots and the crock
    [BENCH.x, BENCH.z, BENCH.w / 2 + 0.1, BENCH.d / 2 + 0.1],
    [TANSU.x, TANSU.z, 0.7, 0.5],
    [CRATES.x, CRATES.z, 0.95, 0.45],
    [DONABE.x, DONABE.z, 0.85, 0.5],
    [SHELF.x, SHELF.z, 0.4, 0.95],
    [SHOWCASE.x, SHOWCASE.z, 1.15, 0.45],
    [STEAMERS.x, STEAMERS.z, 0.75, 0.4],
    [POTS.x, POTS.z, 0.85, 0.45],
    [CROCK.x, CROCK.z, 0.45, 0.45],
    // the office: the dais and the desk, the safe, the visitors' chairs, the cabinet, the fish tank, the plant and the rack
    [(DAIS.x0 + DAIS.x1) / 2, (DAIS.z0 + DAIS.z1) / 2, (DAIS.x1 - DAIS.x0) / 2 + 0.3, (DAIS.z1 - DAIS.z0) / 2 + 0.3],
    [VAULT.x, VAULT.z, 0.9, 0.85],
    ...GUESTS.map((g): [number, number, number, number] => [g.x, g.z, 0.5, 0.5]),
    [CABINET.x, CABINET.z, 0.6, 0.7],
    [TANK.x, TANK.z, 0.6, 1.05],
    [PLANT.x, PLANT.z, 0.55, 0.55],
    [RACK.x, RACK.z, 0.4, 0.4],
  ];
  // the Undertow, once it's found: the booths under the arches from the wall to the front of their tables, Eddie's room
  // (his banquette and table, his bodyguards, the champagne, the lamp and the palm), Harry's office, Tommy's card room (his
  // table, him behind it, his screen, his easel), the bar, the stools, the tables, the stage and the barrels; and the
  // club's doors while they're shut
  if (found.den) {
    const E = DESKS.eddie, H = DESKS.harry, T = DESKS.tommy;
    /** A box from z0 to z1, `hx` either side of x. */
    const along = (x: number, hx: number, z0: number, z1: number): [number, number, number, number] => [x, (z0 + z1) / 2, hx, (z1 - z0) / 2];
    const M = MID_BOOTH;
    boxes.push(along(M.x, ARCH_HALF - 0.05, DEN.z0, M.z + M.r + 0.2), along(SNUG.x, 0.95, DEN.z0, SNUG.table.z + 0.55));
    boxes.push([(VIP.x0 + E.x + E.r + 0.2) / 2, E.z, (E.x + E.r + 0.2 - VIP.x0) / 2, 1.15]);
    for (const g of GUARDS) boxes.push([g.x, g.z, 0.32, 0.32]);
    boxes.push([E.x + 0.25, E.z + E.r + 0.55, 0.25, 0.25], [VIP.x1 - 0.35, VIP.z0 + 0.35, 0.3, 0.3], [VIP.x1 - 0.42, VIP.z1 - 0.42, 0.4, 0.4]);
    // (Harry's office: his desk and him behind it, the cabinets and the safe along the back wall, his bookkeeper's desk
    // and him, the hat stand, the water cooler and the kelp)
    const K = LEDGER, fx1 = K.files.x + (K.files.n - 1) * 0.58 + 0.26;
    boxes.push([H.x, H.z, H.w / 2 + 0.2, H.d / 2 + 0.2], along(LOANS.x0 + 0.5, 0.55, H.z - H.d / 2 - 0.1, H.z + H.d / 2 + 0.1));
    boxes.push([(LOANS.x0 + fx1) / 2, LOANS.z0 + 0.28, (fx1 - LOANS.x0) / 2 + 0.2, 0.48]);
    boxes.push(along((LOANS.x0 + K.desk.x + K.desk.w / 2) / 2, (K.desk.x + K.desk.w / 2 - LOANS.x0) / 2 + 0.2, K.desk.z - K.desk.d / 2 - 0.2, LOANS.z1));
    boxes.push([K.hats.x, K.hats.z, 0.32, 0.32], [K.cooler.x, K.cooler.z, 0.36, 0.36], [K.kelp.x, K.kelp.z, 0.4, 0.4]);
    boxes.push(along(T.x, T.w / 2 + 0.2, BOOTHS.tommy.z - 0.75, T.z + T.d / 2 + 0.2));
    boxes.push([T.x - T.w / 2 - 0.4, T.z + 0.15, 0.3, 0.3]);
    const B = DEN_BAR;
    boxes.push([(B.x0 + B.x1) / 2, (DEN.z0 + B.front) / 2, (B.x1 - B.x0) / 2 + 0.25, (B.front - DEN.z0) / 2 + 0.2]);
    for (const s of DEN_STOOLS) boxes.push([s.x, s.z, 0.38, 0.38]);
    for (const t of Object.values(DEN_TABLES)) boxes.push([t.x, t.z, 0.6, 0.6]);
    boxes.push([STAGE.x, STAGE.z, STAGE.r + 0.2, STAGE.r + 0.2], [BARRELS.x, BARRELS.z, 0.5, 0.85]);
    if (denDoor.shut) boxes.push(along(CLUB_DOOR.x, 0.2, CLUB_DOOR.z0, CLUB_DOOR.z1));
  }
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

// ---------- building it ----------
// Built as the game loaded, the cellar drew 16616 numbers from the game's luck (with the 2052 the clay ring before this
// one took) and 376 from the scenery's dice. Loading still draws them all, so everything after is as it was: what it
// makes now that's shared with what's built after it, up in the world, as building it made it then (its plain colours,
// and the shadows of the kit's shapes it used first), so that's found made, as it was, rather than made and drawn for;
// and the rest of the numbers, BUILT_WITH.
/** What building the cellar drew that loading doesn't otherwise, from the luck and from the scenery's dice. */
const BUILT_WITH = { luck: 15536, scenery: 364 };
/** Every colour the cellar's plain furniture is (render.ts' mat), in the order building it first uses them. */
const ITS_COLOURS = [
  0x2A201A, 0x4A3A30, 0x5B3424, 0x4E4A46, 0x8A5A3B, 0x3A1418, 0x3E2418, 0x4E2E1E, 0x2A1810, 0xC9A23A, 0xF4F1EA,
  0x1B1A1E, 0xB8862E, 0x3A3530, 0x5E574E, 0x2E2E33, 0x8A8F96, 0x9AA4AC, 0x1B2430, 0x2A1A12, 0x15181D, 0x9C6644,
  0x8E2B2B, 0x2B3A67, 0xF2C14E, 0xC0392B, 0xD9C3A0, 0xC9A97A, 0x1E1612, 0x6E4C30, 0x7A5638, 0x7E9446, 0x5E6E30,
  0x8FA552, 0x1A1614, 0x8A6A1E, 0xE0BE5A, 0x3A2A20, 0x6B4130, 0xE8B04A, 0x9A5B3E, 0x5E3B2C, 0x7E4A33, 0x3E2A20,
  0x1E1410, 0xE6CFA0, 0xE59A6B, 0xC9CDD2, 0x8FC46A, 0x2A1E17, 0xB98B5A, 0xA67A4C, 0xC9A86A, 0xA88850, 0xCDB56C,
  0x3A2A1E, 0xD9B98A, 0xD9C47E, 0xD8EBF0, 0xF4F4EE, 0x3F7A3A, 0x4E8C45, 0xA8894E, 0xB89A5C, 0x23302A, 0xF2EEE6,
  0x3A1C12, 0x5A2E1C, 0x4A2416, 0x6E3A24, 0x1E1E22, 0xA87B50, 0x8C6440, 0xC9B271, 0xE6DCC8, 0x4B5257, 0x3E5A66,
  0x7A5236, 0x4A2A1C, 0x5A2618, 0x6E3220, 0x5E9C5A, 0x7A1E1E, 0xEFE3C4, 0x6B1E22, 0x2A2A2E, 0x2E3238, 0x3A3F46,
  0xE8E4D8, 0x1E2024, 0xA8322D, 0x5B4636, 0xC9B98E, 0xEBD38E, 0x8E4A2E, 0x3E7A3E, 0xC9AE62, 0x1F3A5F, 0xC49A5A,
  0x7A3B2E, 0xF2E6CC,
];
for (const c of ITS_COLOURS) mat(c);
shadowsOf(K.ball, K.dome, G.cyl);
for (let i = 0; i < BUILT_WITH.luck; i++) Math.random();
quietly(() => { for (let i = 0; i < BUILT_WITH.scenery; i++) Math.random(); });
let built = false;
/**
 * Builds the cellar's rooms and furniture, the first time it's called: on dice of its own, off the game's luck and the
 * scenery's (how it looks never depends on what they throw: they only name what three.js makes). What the cellar's
 * other modules put in it as they loaded (the kitchen's lines and bowls, the bins, the gong's pads) is left as it is.
 */
export function buildCellar() {
  if (built) return;
  built = true;
  const theirs = [cellar, ...Object.values(parts)].flatMap(g => g.children);
  apart(() => {
    for (const f of toBuild) f();
    // (the gong's disc swings, the pot's stew changes colour, Mr. Fugu puffs up; and the venue's parts, the grow room
    // and the Undertow come and go, so each is baked on its own)
    bakeStill(cellar, new Set<Object3D>([gongDisc, potMesh, boss, tankFish, ...Object.values(parts), ...theirs]));
    for (const g of Object.values(parts)) bakeStill(g, new Set(theirs));
  }, dice(0xCE11A));
}
