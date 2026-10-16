// Where everything is down in the cellar (stage 3), as plain floor positions (x, z; the floor is CELLAR_Y): the stations
// of the kitchen's lines, the pot and its ledge, the bowl counter, the soup square, the gong, and the way between rooms.
// Kept apart from the cellar's meshes (cellar.ts) so the fight night's simulation (fight.ts) can use it without them.
import { ARENA, type CellarRoom, CRAFT, DEN, DOORS, GROW, KITCHEN, LIFT_ROOM, LOANS, OFFICE_ROOM, PASSAGE, PREP, ROOMS } from './layout';
import type { XZ } from './util';

export type Ing = 'rice' | 'fish' | 'mush';
/** A place to stand, and how close counts as standing there. */
export interface Pad extends XZ { r: number }
const pad = (x: number, z: number, r: number): Pad => ({ x, z, r });

// ---------- the prep hall: the dumbwaiter, the racks along the north wall, the barrels along the south ----------
/** The lift room's stores, rice on one line and fish on the other, all behind the prep hall's east wall, out of the
 *  way: the dumbwaiter from the restaurant's kitchen against its far wall; the wooden store its chute slides down into
 *  (a banded cedar tub for the rice, a slatted crate on ice and salt for the fish); and the tray at the store's foot,
 *  just over the wall (BINS). Where to stand to take from a tray is a circle against the wall, on the hall's side
 *  (peeking out under it): only someone who walks right up to the wall is there, not anyone passing by. */
const LINE_Z = { rice: 3.0, fish: 6.8 };
const each = (x: number) => ({ rice: { x, z: LINE_Z.rice }, fish: { x, z: LINE_Z.fish } });
export const LIFTS: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x1 - 0.6);
export const STORES: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x0 + 0.95);
export const BINS: Record<'rice' | 'fish', XZ> = each(LIFT_ROOM.x0 + 0.15);
export const BIN_PADS: Record<'rice' | 'fish', Pad> = { rice: pad(PREP.x1 - 0.1, LINE_Z.rice, 0.55), fish: pad(PREP.x1 - 0.1, LINE_Z.fish, 0.55) };
/** Each wooden chute, along x, sloping down: its bed's top from under the dumbwaiter's hatch, where the trays tip their
 *  load onto it (y0 up), to its lip over the store's mouth (y1), steep enough that what lands on it slides. */
export const CHUTE = { from: LIFTS.rice.x - 0.48, to: STORES.rice.x + 0.17, y0: 1.48, y1: 0.92 };
/** The height of a chute's bed `x` along. */
export const chuteY = (x: number) => CHUTE.y1 + ((x - CHUTE.to) / (CHUTE.from - CHUTE.to)) * (CHUTE.y0 - CHUTE.y1);
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

// ---------- the arena: the soup square, the gong and its window, the watch spot ----------
/** The soup square: two painted clay counters at right angles, closing in a corner of the arena against the hearth
 *  room's wall and the arena's south wall, the doorway from the hearth room opening into it (DOORS' kitchen-arena door
 *  now leads only in there). The north counter runs from the west one to the hearth room's wall, the west one from the
 *  north one to the south wall. The player serves from inside, like the sushi chefs inside their belt upstairs; the
 *  fans buy from outside, along the north and west. Its outer edges, how deep each counter is, and how high it stands;
 *  x and z are its middle. (The east and south sides are the walls: the counters run on to them, past the arena's
 *  edge.) */
export const BAR = (() => {
  const x0 = 0.2, x1 = ARENA.x1 + 0.2, z0 = 3.65, z1 = ARENA.z1 + 0.04;
  return { x0, x1, z0, z1, d: 0.7, top: 0.95, x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
})();
/** Where to stand to set the bowls out: the square's floor, inside its counters. */
export const BAR_PAD = pad(2.2, 5.6, 0.8);
/** How far a point is from the square's outside (0 on or inside it). */
export const fromBar = (p: XZ) => Math.hypot(Math.max(BAR.x0 - p.x, 0, p.x - BAR.x1), Math.max(BAR.z0 - p.z, 0, p.z - BAR.z1));
/** The nearest point of the square's outside to `p` (where a fan waiting there looks). */
export const nearBar = (p: XZ): XZ => ({ x: Math.min(BAR.x1, Math.max(BAR.x0, p.x)), z: Math.min(BAR.z1, Math.max(BAR.z0, p.z)) });
/** Whether `p` is on the square's floor, inside its counters (or in its doorway). */
export const inSquare = (p: XZ) => p.x > BAR.x0 + BAR.d - 0.1 && p.x < KITCHEN.x0 - 0.05 && p.z > BAR.z0 + BAR.d - 0.1 && p.z < BAR.z1 + 0.1;
/** The places on the counters' tops where the bowls are set out, in the order they're filled: along the west counter
 *  from the south wall, then along the north one from the corner to the hearth room's wall. Each counter has two rows
 *  of them, staggered (the corner's the north one's). (No mark where a bowl isn't: an empty place looks empty.) */
export const BAR_PLACES: XZ[] = (() => {
  const { x0, x1, z0, z1, d } = BAR, ROWS = 0.17, GAP = 0.4;
  /** `n` places a row, from `a` on, the second row half a gap on. */
  const rows = (n: number, a: number, dir: number, at: (t: number, side: number) => XZ) =>
    Array.from({ length: n * 2 }, (_, i) => at(a + dir * (Math.floor(i / 2) * GAP + (i % 2) * GAP / 2), i % 2 ? 1 : -1));
  return [
    ...rows(7, z1 - 0.15, -1, (z, s) => ({ x: x0 + d / 2 + s * ROWS, z })),
    ...rows(8, x0 + 0.15, 1, (x, s) => ({ x, z: z0 + d / 2 + s * ROWS })),
  ].filter(h => h.x < x1 - 0.1);
})();
/** Where round the square the fans step up to buy their bowl: a little out from its counters, along its north and west
 *  sides, each spot an arm's length from the next (swarm.ts sends each fan to a free one). */
export const BAR_SPOTS: XZ[] = (() => {
  // (none on the north side's east end: the sake barrels stand there)
  const { x0, z0 } = BAR, OUT = 0.35;
  return [
    ...[0.75, 1.45, 2.15].map(x => ({ x, z: z0 - OUT })),
    ...[4.25, 4.9, 5.55, 6.2, 6.85].map(z => ({ x: x0 - OUT, z })),
  ];
})();
/** The arena floor along the south wall, from the square across, where the fans queue and a boss's crowd floods in
 *  (swarm.ts crowds them round the square first, and keeps them off it and off where they buy). */
export const FLOOR = { x0: ARENA.x0 + 0.7, x1: ARENA.x1 - 0.5, z0: 3.9, z1: ARENA.z1 - 0.3 };
/** The gong, out on the floor south-west of the ring, facing the near wall (and the camera), and where to stand to
 *  ring it, in front of it; the cashier's window by the east wall. */
export const GONG = { x: -5.3, z: 4.3 };
export const GONG_PAD = pad(GONG.x, GONG.z + 1.3, 0.85);
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

// ---------- the cookware shop: the shop counter ----------
/** The shop counter (still BENCH: it was a crafting bench), against the shop's west wall (along it), and the square in
 *  front of it to stand on, which opens a menu of everything bought down here (shop.ts): the ring's upgrades, and each
 *  room's. */
export const BENCH = { x: CRAFT.x0 + 0.55, z: (CRAFT.z0 + CRAFT.z1) / 2, w: 1.0, d: 2.4 };
export const BENCH_PAD = { x: BENCH.x + 1.65, z: BENCH.z };
/** Each room whose upgrades the bench sells (all of them at the bench now, so a room's tiles point there). */
export type MenuRoom = 'prep' | 'grow' | 'hearth';
export const ROOM_MENUS: Record<MenuRoom, XZ> = { prep: BENCH_PAD, grow: BENCH_PAD, hearth: BENCH_PAD };

// ---------- the Undertow: the club, and the Family's three spread round it ----------
/** The three pointed arches along the club's back wall, east of the bar (their middles, west to east): a booth for the
 *  regulars, Eddie's booth, and the singer's stage; each 2·ARCH_HALF wide. */
export const ARCH_HALF = 1.0;
export const ARCHES = [DEN.x0 + 4.75, DEN.x0 + 6.75, DEN.x0 + 8.75];
export type Booth = 'eddie' | 'harry' | 'tommy';
/** Where each of the Family deals from, and which way he faces (0: out into the room, south; a quarter turn: east):
 *  Eddie sat in his booth under the middle arch, Harry behind his desk in his office through the club's west wall (its
 *  door on his right as he sits), and Tommy sat in a corner of his own, the south-west, behind his card table. */
export const BOOTHS: Record<Booth, XZ & { face: number }> = {
  eddie: { x: ARCHES[1], z: DEN.z0 + 0.62, face: 0 },
  harry: { x: LOANS.x0 + 0.75, z: LOANS.z0 + 2.1, face: Math.PI / 2 },
  tommy: { x: DEN.x0 + 2.0, z: DEN.z1 - 2.75, face: 0 },
};
/** What each deals across: Eddie's round table (`r`), Harry's desk and Tommy's half-moon card table, its straight edge
 *  towards him (`w` across x, `d` across z); each `h` high. */
export const DESKS = {
  eddie: { x: ARCHES[1], z: DEN.z0 + 1.45, r: 0.45, h: 0.76 },
  harry: { x: LOANS.x0 + 1.6, z: LOANS.z0 + 2.1, w: 0.7, d: 1.4, h: 0.78 },
  tommy: { x: DEN.x0 + 2.0, z: DEN.z1 - 2.15, w: 1.2, d: 0.6, h: 0.76 },
};
/** The pad in front of each, where you step up to deal with him. */
export const BOOTH_PADS: Record<Booth, Pad> = {
  eddie: pad(DESKS.eddie.x, DESKS.eddie.z + DESKS.eddie.r + 0.65, 0.6),
  harry: pad(DESKS.harry.x + DESKS.harry.w / 2 + 0.7, DESKS.harry.z, 0.6),
  tommy: pad(DESKS.tommy.x, DESKS.tommy.z + DESKS.tommy.d / 2 + 0.75, 0.6),
};
/** Harry's office (LOANS), round him: his bookkeeper's little desk in the south-west corner (him at its west end, facing
 *  east, as Harry does), the safe in the north-west corner, the filing cabinets along the back wall (`n` of them, from
 *  `x`), the hat stand and the water cooler by the door, and a potted kelp in the south-east corner. */
export const LEDGER = {
  clerk: { x: LOANS.x0 + 0.6, z: LOANS.z1 - 0.62 }, desk: { x: LOANS.x0 + 1.22, z: LOANS.z1 - 0.62, w: 0.55, d: 0.95, h: 0.74 },
  safe: { x: LOANS.x0 + 0.42, z: LOANS.z0 + 0.4 }, files: { x: LOANS.x0 + 1.25, n: 3, z: LOANS.z0 + 0.26 },
  hats: { x: LOANS.x1 - 0.32, z: LOANS.z0 + 0.38 }, cooler: { x: LOANS.x1 - 0.3, z: LOANS.z0 + 1.15 }, kelp: { x: LOANS.x1 - 0.38, z: LOANS.z1 - 0.36 },
};
/** The bar along the back wall west of the arches, facing the room: its counter (x0 to x1, `d` deep to its front at
 *  `front`, `h` high), and where the barman stands behind it, in front of the shelves on the wall. */
export const DEN_BAR = { x0: DEN.x0 + 0.25, x1: ARCHES[0] - ARCH_HALF - 0.15, front: DEN.z0 + 1.15, d: 0.55, h: 1.05 };
export const BARMAN = { x: (DEN_BAR.x0 + DEN_BAR.x1) / 2 + 0.3, z: DEN.z0 + 0.3 };
/** The bar's stools, along the front of its counter (the one at the east end is the blobfish's). */
export const BAR_STOOLS: XZ[] = [-1.45, -0.9, 0.85, 1.35].map(dx => ({ x: BARMAN.x + dx, z: DEN_BAR.front + 0.45 }));
/** Where you order a drink, in front of the barman; and where you buy the blobfish one, beside his stool. */
export const DRINK_PAD = pad(BARMAN.x, DEN_BAR.front + 0.95, 0.6);
export const BLOB_PAD = pad(BAR_STOOLS[3].x + 0.1, DEN_BAR.front + 1.35, 0.55);
/** The regulars' booth under the west arch (its seat, and the little table in front of it), and the singer's little
 *  round stage under the east one. */
export const SNUG = { x: ARCHES[0], z: DEN.z0 + 0.62, table: { x: ARCHES[0], z: DEN.z0 + 1.35 } };
export const STAGE = { x: ARCHES[2], z: DEN.z0 + 1.0, r: 0.85 };
/** Out on the floor: the trench coat's high table, the pink table, the round table, and the barrels in the corner. */
export const DEN_TABLES = {
  coat: { x: DEN.x1 - 1.6, z: DEN.z0 + 2.9 }, pink: { x: DEN.x0 + 4.6, z: DEN.z1 - 1.0 },
  south: { x: DEN.x0 + 8.4, z: DEN.z1 - 1.1 },
} satisfies Record<string, XZ>;
export const BARRELS = { x: DEN.x1 - 0.6, z: DEN.z1 - 0.8 };
/** The club's doors: a pair across the short way through the rock from near the far end of the tunnel to the club's
 *  east wall (`way`), hung at the tunnel's side (`x`), swinging in towards the club. */
export const CLUB_DOOR = { x: PASSAGE.x0 - 0.15, z0: PASSAGE.z1 - 1.8, z1: PASSAGE.z1 - 0.2 };
export const CLUB_WAY = { x0: DEN.x1, x1: PASSAGE.x0, z0: CLUB_DOOR.z0, z1: CLUB_DOOR.z1 };

// ---------- the landing and the office ----------
/** Stage 3's upgrade square: the shop counter's. */
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
/** The hearth room's doorway into the soup square: the only way in or out of it, and no way into the rest of the arena. */
const SQUARE_DOOR = DOORS.find(d => d.a === 'kitchen' && d.b === 'arena')!;
/** The rooms to walk through from one to another, fewest doorways first: the doorways in order (the arena reached
 *  round by the landing: the hearth room's doorway into it only leads into the soup square). */
function doorsBetween(from: CellarRoom, to: CellarRoom) {
  const prev = new Map<CellarRoom, [CellarRoom, (typeof DOORS)[number]] | null>([[from, null]]);
  const q: CellarRoom[] = [from];
  while (q.length) {
    const r = q.shift()!;
    if (r === to) break;
    for (const d of DOORS) {
      if (d === SQUARE_DOOR) continue;
      const other = d.a === r ? d.b : d.b === r ? d.a : null;
      if (other && !prev.has(other)) { prev.set(other, [r, d]); q.push(other); }
    }
  }
  const out: [CellarRoom, CellarRoom, (typeof DOORS)[number]][] = [];
  for (let r = to; prev.get(r); r = prev.get(r)![0]) out.unshift([prev.get(r)![0], r, prev.get(r)![1]]);
  return out;
}
/** The way from `a` to `b` down here, for someone walking it: through the doorways, room by room, then to `b` (into or
 *  out of the soup square through the hearth room). */
export function cellarWay(a: XZ, b: XZ): XZ[] {
  const inA = inSquare(a), inB = inSquare(b), hearth = mouth(SQUARE_DOOR, 'kitchen'), square = mouth(SQUARE_DOOR, 'arena');
  if (inB && !inA) return [...cellarWay(a, hearth), square, { x: b.x, z: b.z }];
  if (inA && !inB) return [square, hearth, ...cellarWay(hearth, b)];
  const way: XZ[] = [];
  for (const [r0, r1, d] of doorsBetween(roomAt(a), roomAt(b))) way.push(mouth(d, r0), mouth(d, r1));
  way.push({ x: b.x, z: b.z });
  return way;
}
