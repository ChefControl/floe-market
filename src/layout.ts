// Which stage the game is in, and the ground plan for each: where people can walk and how high the ground is.
// Stage 1 is the fish market on the dock. Stage 2 (after the gold 'sushi' tile) shrinks the dock to its north
// half and builds Floe Sushi south of it, with a front garden, and hot-spring rice terraces to the west. Stage 3
// (after the gold 'dohyo' tile) adds the cellar under the dock, Mr. Fugu's sumo ring: a level of its own, CELLAR_Y
// down, under the dock, reached by the ladder down from his hatch. The restaurant upstairs carries on.
import { FY, type XZ } from './util';

export type StageN = 1 | 2 | 3;
export const stage = { n: 1 as StageN };
/** Which level the player is on: the world above, or (stage 3) the cellar under the dock. */
export const level = { down: false };

/** How far down the cellar's floor is. Under the dock, out of the way of everything above and out of the camera's
 *  sight while it looks down on the cellar. */
export const CELLAR_Y = -30;
/** Mr. Fugu's hatch in the dock (stage 2 on), the way down to the cellar. */
export const HATCH_AT = { x: 6.0, z: -3.3 };

/** The cellar's rooms, under the dock, side by side like one building with thin walls between: the arena (the ring,
 *  its stands, the bowl stall and the gong) to the west; down the middle Mr. Fugu's office, the landing at the foot of
 *  the ladder from his hatch, and the hearth room (the pot); and to the east the prep hall, where the dumbwaiter comes
 *  down beside the racks and barrels, and behind it the grow room, hidden until the first boss is beaten. Floors,
 *  inside their walls (the walls stand in the gaps). */
export const ARENA = { x0: -13.5, x1: 3.5, z0: -9.5, z1: 7.4 };
export const OFFICE_ROOM = { x0: 4.1, x1: 11.0, z0: -9.5, z1: -4.1 };
export const LANDING = { x0: 4.1, x1: 11.0, z0: -3.5, z1: 0.3 };
export const KITCHEN = { x0: 4.1, x1: 11.0, z0: 0.9, z1: 7.4 };
export const PREP = { x0: 11.6, x1: 20.6, z0: 0.9, z1: 8.9 };
export const GROW = { x0: 11.6, x1: 20.6, z0: -9.5, z1: 0.3 };
export type CellarRoom = 'arena' | 'landing' | 'office' | 'kitchen' | 'prep' | 'grow';
export const ROOMS: Record<CellarRoom, typeof ARENA> = { arena: ARENA, landing: LANDING, office: OFFICE_ROOM, kitchen: KITCHEN, prep: PREP, grow: GROW };
/** The doorways through the walls: the two rooms each joins, and its floor (across the wall). */
export const DOORS: { a: CellarRoom; b: CellarRoom; x0: number; x1: number; z0: number; z1: number }[] = [
  { a: 'landing', b: 'arena', x0: ARENA.x1, x1: LANDING.x0, z0: -1.2, z1: 0 },
  { a: 'landing', b: 'kitchen', x0: 4.7, x1: 5.9, z0: LANDING.z1, z1: KITCHEN.z0 },
  { a: 'landing', b: 'office', x0: (OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2 - 0.6, x1: (OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2 + 0.6, z0: OFFICE_ROOM.z1, z1: LANDING.z0 },
  { a: 'kitchen', b: 'arena', x0: ARENA.x1, x1: KITCHEN.x0, z0: 4.9, z1: 6.1 },
  { a: 'kitchen', b: 'prep', x0: KITCHEN.x1, x1: PREP.x0, z0: 4.4, z1: 5.6 },
  // (at the east end of the prep hall's back wall, past the racks along it)
  { a: 'prep', b: 'grow', x0: 18.5, x1: 19.7, z0: GROW.z1, z1: PREP.z0 },
];
/** Which of the cellar's rooms have been found: the grow room only once the first boss is beaten. */
export const found = { grow: false };
const shown = (r: CellarRoom) => r !== 'grow' || found.grow;
const cellarFloors = () => [
  ...(Object.entries(ROOMS) as [CellarRoom, typeof ARENA][]).filter(([k]) => shown(k)).map(([, r]) => r),
  ...DOORS.filter(d => shown(d.a) && shown(d.b)),
].map(r => ({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y: CELLAR_Y }));

export interface Area { x0: number; x1: number; z0: number; z1: number; y: number }
const area = (x0: number, x1: number, z0: number, z1: number, y = FY): Area => ({ x0, x1, z0, z1, y });

/** Stage 1: the whole dock, inside its fences. */
const DECK = area(-7.4, 7.4, -6.25, 7.3);

// ---------- stage 2 ----------
/** The restaurant's floor: x -10..10, z 1.5..15.5. */
export const HALL_BOX = { x0: -10, x1: 10, z0: 1.5, z1: 15.5 };
/** The farm door in the restaurant's west wall, and the front gate. */
export const FARM_DOOR = { z0: 2.4, z1: 4.0 };
export const GATE_W = 2.2;
/** Rice terraces, lowest first, stepping up the slope to the west. */
export const TERRACES = [
  { x0: -16.5, x1: -12.3, top: 0.35 },
  { x0: -20.7, x1: -16.5, top: 0.7 },
  { x0: -24.9, x1: -20.7, top: 1.05 },
];
export const TERRACE_Z = { z0: -3.4, z1: 5.0 };
/** The stepping-stone path along the bottom terrace, and the channel between it and the restaurant. */
export const PATH_X = { x0: -12.3, x1: -11.1 };
export const CHANNEL_X = -10.65;
/**
 * The fertilizer shed's yard (shed.ts): the walkable part of a plank deck south of the bottom terrace, off the end
 * of the path, beside the water wheel (the shed, its sacks and the planters take the rest). It's there once the shed
 * opens, with the takeout kiosk.
 */
export const SHED_YARD = { x0: -14.45, x1: PATH_X.x1, z0: 5.7, z1: 8.5, y: 0.12 };
export const shedYard = { open: false };

// ---------- her house ----------
/** The path to her house runs east along this line, from the market, across the road, to her front yard. */
export const HOUSE_PATH_Z = 6.05;
/** Her front yard, inside its picket fence. */
export const YARD = area(19.2, 23.7, HOUSE_PATH_Z - 2.3, HOUSE_PATH_Z + 2.3);
/** The door in the restaurant's east wall that the path leaves by in stage 2. */
export const EAST_DOOR = { z0: HOUSE_PATH_Z - 0.6, z1: HOUSE_PATH_Z + 0.6 };

/**
 * The takeout kiosk's booth (hall.ts): a room off the restaurant's east wall at its north end, in line with its north
 * wall and as far south as its first post, with the counter along its far side. It's there once the kiosk is built.
 */
export const KIOSK_BOOTH = { x0: HALL_BOX.x1, x1: 12.8, z0: HALL_BOX.z0, z1: 5.0 };
export const kioskBooth = { open: false };

const DOCK2 = area(-7.4, 7.4, -6.25, 1.9);
const HALL = area(HALL_BOX.x0 + 0.4, HALL_BOX.x1 - 0.4, 1.8, HALL_BOX.z1 - 0.4);
/** Inside the booth, up to the back of the counter. */
const BOOTH = area(HALL.x1 - 0.2, 11.5, KIOSK_BOOTH.z0 + 0.45, KIOSK_BOOTH.z1 - 0.45);
const GATEWAY = area(-GATE_W + 0.4, GATE_W - 0.4, 14.8, 16.6);
const GARDEN = area(-8.6, 8.6, 16.2, 22.6, 0.02);
const BRIDGE = area(PATH_X.x0, HALL.x0 + 0.2, FARM_DOOR.z0 + 0.3, FARM_DOOR.z1 - 0.3);
const PATH = area(PATH_X.x0, PATH_X.x1, TERRACE_Z.z0 - 0.4, TERRACE_Z.z1 + 1.2, 0.06);
// Each terrace's walkable area runs right up to the next one's, so you can step from one to the other; only the
// top one stops short of the hillside.
const FIELDS = TERRACES.map((t, i) =>
  area(t.x0 + (i === TERRACES.length - 1 ? 0.2 : 0), t.x1, TERRACE_Z.z0 + 0.2, TERRACE_Z.z1 - 0.2, t.top));

/** The path to her house: from a gap in the deck's east fence, or (stage 2) the restaurant's east door. */
const housePath = () => area(stage.n === 1 ? 7.3 : HALL.x1 - 0.2, YARD.x0 + 0.3, HOUSE_PATH_Z - 0.25, HOUSE_PATH_Z + 0.25);

/** Where the player can walk in the current stage. Earlier areas win where they overlap. */
export const walkable = (): Area[] =>
  level.down ? cellarFloors()
  : stage.n === 1 ? [DECK, housePath(), YARD]
  : [DOCK2, HALL, GATEWAY, GARDEN, BRIDGE, PATH, ...FIELDS, ...(shedYard.open ? [SHED_YARD] : []),
    ...(kioskBooth.open ? [BOOTH] : []), housePath(), YARD];

const inside = (a: Area, p: XZ) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1;

/** Height of the ground people stand on at `p`: the deck and restaurant floor, terraces, or the snow; or the cellar's
 *  floor, for someone `down` there (the player, on its level: everyone else in the world stays up in it). */
export function groundY(p: XZ, down = false) {
  if (down) return CELLAR_Y;
  const house = inside(housePath(), p) || inside(YARD, p);
  if (stage.n === 1) return inside(DECK, p) || house ? FY : 0;
  for (const a of FIELDS) if (inside(a, p)) return a.y;
  if (shedYard.open && inside(SHED_YARD, p)) return SHED_YARD.y;
  if (inHall(p) || inside(DOCK2, p) || inside(BRIDGE, p) || house || (kioskBooth.open && inside(BOOTH, p))) return FY;
  return inside(PATH, p) ? PATH.y : 0;
}

/** Inside the restaurant (stage 2), counting its walls. */
export const inHall = (p: XZ) =>
  p.x >= HALL_BOX.x0 && p.x <= HALL_BOX.x1 && p.z >= HALL_BOX.z0 && p.z <= HALL_BOX.z1;

/** Moves `p` to the nearest point inside any of the areas. */
export function keepOnFloor(p: XZ, areas: Area[]) {
  let bx = p.x, bz = p.z, bd = Infinity;
  for (const a of areas) {
    const x = Math.max(a.x0, Math.min(a.x1, p.x)), z = Math.max(a.z0, Math.min(a.z1, p.z));
    const d = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d < bd) { bd = d; bx = x; bz = z; }
  }
  p.x = bx; p.z = bz;
}

/** Pushes `p` out of a box (half-sizes already include the walker's radius) along its shallowest side. */
export function pushOutOfBox(p: XZ, cx: number, cz: number, hx: number, hz: number) {
  const px = hx - Math.abs(p.x - cx), pz = hz - Math.abs(p.z - cz);
  if (px <= 0 || pz <= 0) return;
  if (px < pz) p.x = cx + Math.sign(p.x - cx || 1) * hx;
  else p.z = cz + Math.sign(p.z - cz || 1) * hz;
}
