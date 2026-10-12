// Where everything is down in the cellar (stage 3), as plain floor positions (x, z; the floor is CELLAR_Y): the stations
// of the kitchen's lines, the pot and its ledge, the bowl counter, the stall, the gong, and the way between rooms. Kept
// apart from the cellar's meshes (cellar.ts) so the fight night's simulation (fight.ts) can use it without them.
import { ARENA, type CellarRoom, CRAFT, DOORS, GROW, KITCHEN, LIFT_ROOM, OFFICE_ROOM, PREP, ROOMS } from './layout';
import type { XZ } from './util';

export type Ing = 'rice' | 'fish' | 'mush';
/** A place to stand, and how close counts as standing there. */
export interface Pad extends XZ { r: number }
const pad = (x: number, z: number, r: number): Pad => ({ x, z, r });

// ---------- the prep hall: the dumbwaiter, the racks along the north wall, the barrels along the south ----------
/** The lift room's machines, rice on one line and fish on the other, all behind the prep hall's east wall, out of the
 *  way: the dumbwaiter from the restaurant's kitchen against its far wall; the steel storage hopper its conveyor climbs
 *  up to and tips into; and the tray at the hopper's foot, just over the wall (BINS). Where to stand to take from a
 *  tray is a circle against the wall, on the hall's side (peeking out under it): only someone who walks right up to
 *  the wall is there, not anyone passing by. */
const LINE_Z = { rice: 3.0, fish: 6.8 };
const each = (x: number) => ({ rice: { x, z: LINE_Z.rice }, fish: { x, z: LINE_Z.fish } });
export const LIFTS: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x1 - 0.6);
export const HOPPERS: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x0 + 0.95);
export const BINS: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x0 + 0.15);
export const BIN_PADS: Record<'rice' | 'fish', Pad> = { rice: pad(PREP.x1 - 0.1, LINE_Z.rice, 0.55), fish: pad(PREP.x1 - 0.1, LINE_Z.fish, 0.55) };
/** Each conveyor, along x, climbing: from under the foot of its dumbwaiter's front, where the trays tip their load
 *  onto it (y0 up), to over the hopper's mouth (y1). */
export const BELT = { from: LIFTS.rice.x - 0.5, to: HOPPERS.rice.x + 0.1, y0: 0.62, y1: 1.4 };
/** Where each line's machines stand, and where to stand to use them: racks, barrels, and the grow room's beds. */
export const MAX_MACHINES = 6;
export function machineAt(k: Ing, i: number): XZ {
  if (k === 'rice') return { x: PREP.x0 + 1.0 + i * 1.0, z: PREP.z0 + 0.7 };
  if (k === 'fish') return { x: PREP.x0 + 1.0 + i * 1.0, z: PREP.z1 - 0.7 };
  return { x: GROW.x0 + 1.7 + (i % 3) * 2.8, z: GROW.z1 - 2.7 - Math.floor(i / 3) * 4.0 };
}
/** Where to stand to use machine `i` of a line of `n`: in front of each of the grow room's beds; and one spot for all
 *  of the prep hall's racks, and one for its barrels, in front of the first while there's one, moving along to the
 *  middle of the row as more are built, every one of them in reach from it (cellarHands.ts). */
export function machinePad(k: Ing, i: number, n = 1): Pad {
  if (k === 'mush') { const m = machineAt(k, i); return pad(m.x, m.z + 0.95, 0.75); }
  const first = machineAt(k, 0), x = first.x + (Math.min(MAX_MACHINES, Math.max(1, n)) - 1) / 2;
  return pad(x, k === 'rice' ? first.z + 1.0 : first.z - 1.0, 0.8);
}

// ---------- the hearth room: the pot, its ledge, the bowl counter ----------
export const HEARTH = { x: KITCHEN.x0 + 4.2, z: KITCHEN.z0 + 0.8, w: 3.2, d: 1.2, h: 0.75 };
export const POT = { x: HEARTH.x, z: HEARTH.z };
/** Where each ingredient waits on the ledge in front of the hearth. */
export const LEDGE: Record<Ing, XZ> = {
  rice: { x: HEARTH.x - 0.7, z: HEARTH.z + 1.0 }, fish: { x: HEARTH.x, z: HEARTH.z + 1.0 }, mush: { x: HEARTH.x + 0.7, z: HEARTH.z + 1.0 },
};
/** Where ingredients are dropped off, and where standing keeps the pot cooking (until there's a cook). */
export const POT_PAD = pad(HEARTH.x, HEARTH.z + 1.95, 0.9);
export const COOK_AT = { x: HEARTH.x + 1.45, z: HEARTH.z + 1.6 };
/** The counter the bowls come out on: a low table against the east wall, in the corner south of the prep hall's door,
 *  where nobody passes (the doorways and the pot are all north and west of it); and where to stand to pick them up, a
 *  small circle right against its side, so only someone who walks up to the counter takes any, not anyone going by. */
export const COUNTER = { x: KITCHEN.x1 - 0.65, z: KITCHEN.z1 - 0.75 };
export const COUNTER_PAD = pad(COUNTER.x - 0.95, COUNTER.z, 0.5);

// ---------- the arena: the bowl stall, the gong and its window, the watch spot ----------
/** The bowl stall, just inside the arena by the hearth room's door, facing the floor; where to stand behind it to set
 *  bowls out; and the arena floor in front of it, where the fans queue and a boss's crowd floods in. */
export const STALL = { x: ARENA.x1 - 1.9, z: 5.5 };
export const STALL_PAD = pad(ARENA.x1 - 0.85, 5.5, 0.8);
export const FLOOR = { x0: ARENA.x0 + 0.7, x1: STALL.x - 0.55, z0: 3.9, z1: ARENA.z1 - 0.3 };
/** The gong, against the east wall, and where to stand to ring it; the cashier's window beside it. */
export const GONG = { x: ARENA.x1 - 0.7, z: -2.9 };
export const GONG_PAD = pad(ARENA.x1 - 1.9, -2.9, 0.85);
export const CASHIER = { x: ARENA.x1 - 0.55, z: -5.2 };
/** The watch spot 👁️: stand on it and the camera closes in on the ring. */
export const WATCH = pad(0.7, -5.6, 0.7);
/** The teppo post the sparring partner slaps, and where the champion waits between bouts. */
export const TEPPO = { x: 2.6, z: -8.5 };
export const CORNER = { x: 1.0, z: -0.4 };
/** The fans' tunnels, through the arena's tall back walls (west, by the south corner, and north, by the west corner,
 *  clear of the stands): fans turn up deep in one, out of sight, come in through its doorway (the mouth, just inside
 *  the arena), and go home the same way. `at` is where along the wall it is; it's TUNNEL_W wide and TUNNEL_D deep. */
export const TUNNEL_W = 1.3, TUNNEL_D = 5;
export const TUNNELS = [
  { side: 'w' as const, at: 6.2, mouth: { x: ARENA.x0 + 0.5, z: 6.2 }, deep: { x: ARENA.x0 - TUNNEL_D + 0.6, z: 6.2 } },
  { side: 'n' as const, at: -11.9, mouth: { x: -11.9, z: ARENA.z0 + 0.5 }, deep: { x: -11.9, z: ARENA.z0 - TUNNEL_D + 0.6 } },
];

// ---------- the workshop: the crafting bench ----------
/** The crafting bench, against the workshop's west wall (along it), and the square in front of it to stand on, which
 *  opens a menu of everything bought down here (shop.ts): the ring's upgrades, and each room's. */
export const BENCH = { x: CRAFT.x0 + 0.55, z: (CRAFT.z0 + CRAFT.z1) / 2, w: 1.0, d: 2.4 };
export const BENCH_PAD = { x: BENCH.x + 1.65, z: BENCH.z };
/** Each room whose upgrades the bench sells (all of them at the bench now, so a room's tiles point there). */
export type MenuRoom = 'prep' | 'grow' | 'hearth';
export const ROOM_MENUS: Record<MenuRoom, XZ> = { prep: BENCH_PAD, grow: BENCH_PAD, hearth: BENCH_PAD };

// ---------- the landing and the office ----------
/** Stage 3's upgrade square: the crafting bench's. */
export const SHOP3 = BENCH_PAD;
export const OFFICE_DOOR = { x: (OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2, z: OFFICE_ROOM.z1 - 1.2 };

// ---------- where the crew stand when there's nothing to do ----------
export const HOME = {
  washer: { x: PREP.x0 + 0.9, z: PREP.z0 + 2.3 }, salter: { x: PREP.x0 + 0.9, z: PREP.z1 - 2.3 },
  picker: { x: (GROW.x0 + GROW.x1) / 2 + 1.6, z: GROW.z1 - 0.9 }, cook: COOK_AT, attendant: { x: COUNTER_PAD.x - 0.5, z: KITCHEN.z1 - 0.35 },
} as const;

// ---------- getting about ----------
type Rect = typeof ARENA;
/** Which room `p` is in: the one it's inside, or (in a doorway) the nearest. */
export function roomAt(p: XZ): CellarRoom {
  let best: CellarRoom = 'arena', bd = Infinity;
  for (const [k, r] of Object.entries(ROOMS) as [CellarRoom, Rect][]) {
    const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1), dz = Math.max(r.z0 - p.z, 0, p.z - r.z1);
    if (dx * dx + dz * dz < bd) { bd = dx * dx + dz * dz; best = k; }
  }
  return best;
}
/** Where a doorway opens into `room`: its middle, a step inside. */
function mouth(t: (typeof DOORS)[number], room: CellarRoom): XZ {
  const r = ROOMS[room], cl = (v: number, a: number, b: number) => Math.max(a + 0.5, Math.min(b - 0.5, v));
  return { x: cl((t.x0 + t.x1) / 2, r.x0, r.x1), z: cl((t.z0 + t.z1) / 2, r.z0, r.z1) };
}
/** The rooms to walk through from one to another, fewest doorways first: the doorways in order. */
function doorsBetween(from: CellarRoom, to: CellarRoom) {
  const prev = new Map<CellarRoom, [CellarRoom, (typeof DOORS)[number]] | null>([[from, null]]);
  const q: CellarRoom[] = [from];
  while (q.length) {
    const r = q.shift()!;
    if (r === to) break;
    for (const d of DOORS) {
      const other = d.a === r ? d.b : d.b === r ? d.a : null;
      if (other && !prev.has(other)) { prev.set(other, [r, d]); q.push(other); }
    }
  }
  const out: [CellarRoom, CellarRoom, (typeof DOORS)[number]][] = [];
  for (let r = to; prev.get(r); r = prev.get(r)![0]) out.unshift([prev.get(r)![0], r, prev.get(r)![1]]);
  return out;
}
/** The way from `a` to `b` down here, for someone walking it: through the doorways, room by room, then to `b`. */
export function cellarWay(a: XZ, b: XZ): XZ[] {
  const way: XZ[] = [];
  for (const [r0, r1, d] of doorsBetween(roomAt(a), roomAt(b))) way.push(mouth(d, r0), mouth(d, r1));
  way.push({ x: b.x, z: b.z });
  return way;
}
