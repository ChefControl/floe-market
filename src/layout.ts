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
/** Mr. Fugu's hatch in the dock (there from the start, shut till stage 3), the way down to the cellar: out towards the water, so that meeting him
 *  there has the sea behind him, and his tile fits between it and the restaurant. */
export const HATCH_AT = { x: 6.0, z: -5.1 };

/** The cellar's rooms, under the dock, side by side like one building with thin walls between: the arena (the ring,
 *  its stands, the soup square and the gong) to the west; down the middle Mr. Fugu's office, the landing at the foot of
 *  the ladder from his hatch, the hearth room (the pot) and through it the cookware shop; and to the east the prep hall, where the dumbwaiters'
 *  trays peek in through the east wall beside the racks and barrels, and behind it the grow room, hidden until the first boss is beaten. Floors,
 *  inside their walls (the walls stand in the gaps). */
export const ARENA = { x0: -13.5, x1: 3.5, z0: -9.5, z1: 7.4 };
export const OFFICE_ROOM = { x0: 4.1, x1: 11.0, z0: -9.5, z1: -4.1 };
export const LANDING = { x0: 4.1, x1: 11.0, z0: -3.5, z1: 0.3 };
export const KITCHEN = { x0: 4.1, x1: 11.0, z0: 0.9, z1: 7.4 };
/** The cookware shop, through the hearth room's south wall: the shop counter, where everything down here is bought. */
export const CRAFT = { x0: 4.1, x1: 11.0, z0: 8.0, z1: 11.6 };
export const PREP = { x0: 11.6, x1: 20.6, z0: 0.9, z1: 8.9 };
export const GROW = { x0: 11.6, x1: 20.6, z0: -9.5, z1: 0.3 };
/** The lift room, behind the prep hall's east wall: just the two dumbwaiters, and nobody walks in it (it's no room of
 *  ROOMS's): what comes down them slides down a wooden chute each into a store, which keeps a tray by the wall full,
 *  handed over it to whoever stands at the circle on the hall's side. */
export const LIFT_ROOM = { x0: 21.2, x1: 24.8, z0: 1.9, z1: 7.9 };
/** Mama Moray's, the Family's chanko restaurant out front (resto.ts), open from the first night: through the arena's
 *  south wall, between the ring and the soup square. Its front hall (the counter, the belt round it from the soup
 *  square, and tables), the dining wing round the back of the cookware shop, and in the hall's far corner, against the
 *  club's wall, the restroom: two stalls, and the one that's out of order is the way into the Undertow. */
export const RESTO = { x0: -2.9, x1: 3.5, z0: 8.0, z1: 11.6 };
export const WING = { x0: 1.0, x1: 10.6, z0: 12.2, z1: 16.2 };
export const LOO = { x0: -2.9, x1: 0.4, z0: 12.2, z1: 16.2 };
/** The Undertow, the Family's club, nobody knows is there until the second boss is beaten: a big smoky room dug into
 *  the rock in front of the arena (the camera's side, like the cookware shop), from a little west of the arena's west
 *  wall, and deep, its east wall back to back with the restroom's. */
export const DEN = { x0: -15.5, x1: -3.4, z0: 10.2, z1: 22.0 };
/** Hammerhead Harry's office, a side room through the club's west wall: where the loans are made and the books kept. */
export const LOANS = { x0: DEN.x0 - 5.1, x1: DEN.x0 - 0.6, z0: DEN.z0, z1: DEN.z0 + 4.4 };
/** Slick Eddie's private room, through the club's south wall (on the camera's side): his banquette and his table, and his
 *  two bodyguards either side of him. */
export const VIP = { x0: DEN.x0 + 3.3, x1: DEN.x0 + 8.7, z0: DEN.z1 + 0.6, z1: DEN.z1 + 4.2 };
/** Three-Card Tommy's card room, through the club's west wall south of Harry's office: his table and his screen. */
export const CARDS = { x0: LOANS.x0, x1: LOANS.x1, z0: LOANS.z1 + 0.6, z1: LOANS.z1 + 4.0 };
export type CellarRoom = 'arena' | 'landing' | 'office' | 'kitchen' | 'prep' | 'grow' | 'craft' | 'resto' | 'wing' | 'loo' | 'den' | 'loans' | 'vip' | 'cards';
export const ROOMS: Record<CellarRoom, typeof ARENA> = {
  arena: ARENA, landing: LANDING, office: OFFICE_ROOM, kitchen: KITCHEN, prep: PREP, grow: GROW, craft: CRAFT, resto: RESTO, wing: WING, loo: LOO,
  den: DEN, loans: LOANS, vip: VIP, cards: CARDS,
};
/** The doorways through the walls: the two rooms each joins, and its floor (across the wall). */
export const DOORS: { a: CellarRoom; b: CellarRoom; x0: number; x1: number; z0: number; z1: number }[] = [
  { a: 'landing', b: 'arena', x0: ARENA.x1, x1: LANDING.x0, z0: -1.2, z1: 0 },
  { a: 'landing', b: 'kitchen', x0: 4.7, x1: 5.9, z0: LANDING.z1, z1: KITCHEN.z0 },
  { a: 'landing', b: 'office', x0: (OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2 - 0.6, x1: (OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2 + 0.6, z0: OFFICE_ROOM.z1, z1: LANDING.z0 },
  // (into the soup square in the arena, closed in by its counters: the way out to serve, not to the ring)
  { a: 'kitchen', b: 'arena', x0: ARENA.x1, x1: KITCHEN.x0, z0: 4.9, z1: 6.1 },
  { a: 'kitchen', b: 'prep', x0: KITCHEN.x1, x1: PREP.x0, z0: 4.4, z1: 5.6 },
  // (towards the west end of the hearth room's south wall, so it opens straight onto the shop counter's square)
  { a: 'kitchen', b: 'craft', x0: 6.0, x1: 7.2, z0: KITCHEN.z1, z1: CRAFT.z0 },
  // (at the east end of the prep hall's back wall, past the racks along it)
  { a: 'prep', b: 'grow', x0: 18.5, x1: 19.7, z0: GROW.z1, z1: PREP.z0 },
  // (Mama Moray's: its front door through the arena's south wall, the wide way through to its dining wing, the
  // restroom's door off the wing, and the out-of-order stall's back, through to the Undertow, which the doorman opens:
  // southDoor.ts)
  { a: 'arena', b: 'resto', x0: -1.9, x1: -0.7, z0: ARENA.z1, z1: RESTO.z0 },
  { a: 'resto', b: 'wing', x0: WING.x0, x1: RESTO.x1, z0: RESTO.z1, z1: WING.z0 },
  { a: 'wing', b: 'loo', x0: LOO.x1, x1: WING.x0, z0: LOO.z0 + 1.3, z1: LOO.z0 + 2.5 },
  // (and from the dining wing into the cookware shop, through its south wall, right below the shop counter's square)
  { a: 'wing', b: 'craft', x0: 5.7, x1: 6.9, z0: CRAFT.z1, z1: WING.z0 },
  { a: 'loo', b: 'den', x0: DEN.x1, x1: LOO.x0, z0: LOO.z1 - 2.25, z1: LOO.z1 - 1.05 },
  // (Harry's office, through the club's west wall, south of the bar)
  { a: 'den', b: 'loans', x0: LOANS.x1, x1: DEN.x0, z0: DEN.z0 + 2.4, z1: DEN.z0 + 3.6 },
  // (Tommy's card room, through the club's west wall south of Harry's office, near the front)
  { a: 'den', b: 'cards', x0: CARDS.x1, x1: DEN.x0, z0: CARDS.z1 - 2.0, z1: CARDS.z1 - 0.8 },
  // (Eddie's room, through the club's south wall, at its east end)
  { a: 'den', b: 'vip', x0: VIP.x1 - 2.55, x1: VIP.x1 - 1.35, z0: DEN.z1, z1: VIP.z0 },
];
/** Whether `p` is in the Undertow: the club, or one of its side rooms (Harry's office, Tommy's card room, Eddie's room). */
export const inUndertow = (p: { x: number; z: number }) =>
  [DEN, LOANS, VIP, CARDS].some(r => p.x > r.x0 - 0.5 && p.x < r.x1 + 0.5 && p.z > r.z0 - 0.5 && p.z < r.z1 + 0.5);
/** Which of the cellar's rooms have been found: the grow room once the first boss is beaten, the Undertow (and its side
 *  rooms) once the doorman lets you in. */
export const found = { grow: false, den: false };
const shown = (r: CellarRoom) => (r !== 'grow' || found.grow) && ((r !== 'den' && r !== 'loans' && r !== 'vip' && r !== 'cards') || found.den);
/** How far a walker's middle keeps from a cellar wall: about their width, so they stop at its face, not halfway in. */
const BODY = 0.2;
const cellarFloors = () => [
  ...(Object.entries(ROOMS) as [CellarRoom, typeof ARENA][]).filter(([k]) => shown(k))
    .map(([, r]) => ({ x0: r.x0 + BODY, x1: r.x1 - BODY, z0: r.z0 + BODY, z1: r.z1 - BODY })),
  // a doorway reaches that far into the rooms either side (across the wall it's in: its narrow way), to meet them
  ...DOORS.filter(d => shown(d.a) && shown(d.b)).map(d => d.x1 - d.x0 < d.z1 - d.z0
    ? { x0: d.x0 - BODY, x1: d.x1 + BODY, z0: d.z0, z1: d.z1 }
    : { x0: d.x0, x1: d.x1, z0: d.z0 - BODY, z1: d.z1 + BODY }),
].map(r => ({ ...r, y: CELLAR_Y }));

export interface Area { x0: number; x1: number; z0: number; z1: number; y: number }
const area = (x0: number, x1: number, z0: number, z1: number, y = FY): Area => ({ x0, x1, z0, z1, y });

/** Stage 1: the whole dock, inside its fences. */
const DECK = area(-7.4, 7.4, -6.25, 7.3);

/**
 * The pier (world.ts), in every stage: an upside-down L of the dock's own boards, out north from the dock's water edge
 * (`edge`) and then west along the water. Its stem is `x0` to `x1`, three boards wide; its arm `arm.z1` (the dock's
 * side) to `arm.z0`, from `arm.x0` to the stem's far side. It stands a step over the dock (`y`), clear of the fish's backs in the
 * water under it, its first two rows of boards a ramp up to it (`ramp`, how far out it runs). The voting boat moors
 * along the arm's far side.
 */
const ROW = 14.5 / 32; // one row of the dock's boards (world.ts deck)
export const PIER = {
  edge: -6.5, row: ROW, x0: 3.75 - 1.5 * ROW, x1: 3.75 + 1.5 * ROW, ramp: 2 * ROW, y: FY + 0.15,
  arm: { x0: 0.6, z1: -6.5 - 12 * ROW, z0: -6.5 - 15 * ROW },
};
/** Where the player can walk on the pier: up its stem (overlapping the dock's edge) and along its arm. */
const PIER_AREAS = [
  area(PIER.x0 + 0.25, PIER.x1 - 0.25, PIER.arm.z0 + 0.25, DECK.z0 + 0.25),
  area(PIER.arm.x0 + 0.25, PIER.x1 - 0.25, PIER.arm.z0 + 0.25, PIER.arm.z1 - 0.25),
];
/** The pier's ground: up its ramp from the dock's level, then its own. */
const pierY = (p: XZ) => FY + (PIER.y - FY) * Math.max(0, Math.min(1, (PIER.edge - p.z) / PIER.ramp));
/** On the pier (anywhere up top), or null. */
const onPier = (p: XZ) => PIER_AREAS.some(a => inside(a, p)) && p.z < DECK.z0;

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

// ---------- the casino harbor ----------
/**
 * The casino harbor (casino.ts), in both stages, once the 'roulette' unlock opens it: the dock carries on west along
 * the shore as a wide quay, its stone wall in line with the dock's edge at the water, and a casino yacht is moored
 * along it, bow towards the dock. A gangway takes you aboard onto its foredeck, at the foot of a staircase up to the
 * salon on its upper deck, where the games are.
 */
export const QUAY = { x0: -24.6, x1: -8.0, z0: -6.5, z1: -3.7 };
/** The yacht: its middle, half its length (along x) to the transom, and half its beam (along z). The bow points east,
 *  its sides running straight as far as `sides` and then drawing in to the stem at `bow`, all from the middle. */
export const SHIP = { x: -17.5, z: -9.95, half: 8.6, beam: 3.3, sides: 2.5, bow: 8.7 };
/** The hull's half-width `x` along it from the middle: full beam back to the transom, narrowing to a point at the bow. */
export const hullHalf = (x: number) =>
  x <= SHIP.sides ? SHIP.beam : SHIP.beam * Math.max(0, 1 - ((x - SHIP.sides) / (SHIP.bow - SHIP.sides)) ** 2);
/** How high the upper deck is; the main deck is level with the quay. */
export const UPPER = FY + 2.1;
/** Along the ship, from its middle (+ towards the bow): the upper deck's ends, the staircase (its top at `x0`) and the gangway. */
export const DECKS = { stern: -8.3, front: 3.6, stairs: { x0: 3.6, x1: 5.6, half: 0.75 }, gangway: 6.1 };
/** The salon walled in on the upper deck (casinoSalon.ts), from the ship's middle: its ends along it, its walls'
 *  distance either side, and how tall it is. */
export const SALON = { x0: DECKS.stern + 0.05, x1: DECKS.front - 0.05, side: SHIP.beam - 0.18, h: 2.35 };
export const casinoBoat = { open: false };
const along = (x: number) => SHIP.x + x, across = (z: number) => SHIP.z + z;
/** Where you stand to play each game, in the salon in front of its table: the tables and the machines stand along
 *  the back wall, leaving the floor open between them and the door. */
export const GAMES = {
  roulette: { x: along(-4.8), y: UPPER, z: across(0) },
  blackjack: { x: along(-2.2), y: UPPER, z: across(0) },
  slots: { x: along(0.4), y: UPPER, z: across(0) },
};
const QUAY_FLOOR = area(QUAY.x0 + 0.3, QUAY.x1 + 0.6, QUAY.z0 + 0.3, QUAY.z1 - 0.2);
/** How far out the foredeck goes at the gangway: inside the hull's sides where they draw in towards the bow. */
const FOREDECK_EDGE = hullHalf(DECKS.gangway + 0.4) - 0.35;
const GANGWAY = area(along(DECKS.gangway) - 0.35, along(DECKS.gangway) + 0.35, across(FOREDECK_EDGE), QUAY.z0 + 0.4);
const FOREDECK = area(along(DECKS.stairs.x1 - 0.2), along(DECKS.gangway + 0.4), across(-0.7), across(FOREDECK_EDGE));
const STAIRS = area(along(DECKS.stairs.x0), along(DECKS.stairs.x1), across(-DECKS.stairs.half), across(DECKS.stairs.half), UPPER);
const UPPER_DECK = area(along(DECKS.stern), along(DECKS.front), across(-SHIP.beam + 0.5), across(SHIP.beam - 0.5), UPPER);
const casinoAreas = () => casinoBoat.open ? [QUAY_FLOOR, GANGWAY, FOREDECK, STAIRS, UPPER_DECK] : [];
/** Height of the harbor's floor at `p`: the quay and the main deck, the stairs climbing, or the upper deck; null off it. */
function casinoY(p: XZ) {
  if (!casinoBoat.open) return null;
  if (inside(STAIRS, p)) return FY + (UPPER - FY) * (STAIRS.x1 - p.x) / (STAIRS.x1 - STAIRS.x0);
  if (inside(UPPER_DECK, p)) return UPPER;
  return [QUAY_FLOOR, GANGWAY, FOREDECK].some(a => inside(a, p)) ? FY : null;
}
/** On the harbor's boards: the quay or anywhere aboard (for footsteps on wood). */
export const onHarbor = (p: XZ) => casinoY(p) !== null;
/** Aboard the yacht (never from down in the cellar, wherever under it the player is). */
export const aboard = (p: XZ) => !level.down &&
  Math.abs(p.x - SHIP.x) < SHIP.half + 0.5 && Math.abs(p.z - SHIP.z) < SHIP.beam + 0.1;
/** In the salon: aboard, on the upper deck. */
export const inSalon = (p: XZ & { y: number }) => aboard(p) && p.y > FY + 1.0;

// ---------- the voting boat ----------
/**
 * The voting boat (votingBoat.ts), for Israel's election day only: a white houseboat moored alongside the pier's arm,
 * on its far side, its bow west towards the open water, so it sails off forwards. A short gangway crosses from the pier to its side deck, in
 * front of the cabin's door: the cabin is the polling room. Its walls, from the outside: `x0` to `x1`, and `z1` (the
 * pier's side) to `z0`. The hull runs `hull` along and across. It's laid out as if alongside the dock's edge, bow
 * east, and moored `dz` further out along the pier, turned end for end along its arm (`voteX`).
 */
const DZ = PIER.arm.z0 - PIER.edge;
/** Where `x` on the boat, laid out bow east, lies with it moored: turned end for end, its bow west, along the arm. */
export const voteX = (x: number) => 1.1 + 7.35 - x - 1.7;
export const VOTE_BOAT = {
  dz: DZ,
  hull: { x0: voteX(7.35), x1: voteX(1.1), z0: -10.45 + DZ, z1: -6.85 + DZ },
  cabin: { x0: voteX(6.4), x1: voteX(1.6), z0: -10.1 + DZ, z1: -7.75 + DZ, h: 2.2 },
  /** The gangway's width along the pier, and the door it leads to, straight across the side deck. */
  gangway: { x0: voteX(4.1), x1: voteX(3.4) },
  /** The side deck between the bulwark and the cabin, along the pier's side (queue ropes either side of the landing). */
  deck: { z0: -7.65 + DZ, z1: -7.05 + DZ },
  /** How high its deck is: level with the pier, clear of the fish's backs in the water under it. The gangway crosses
   *  to it from the pier's edge (`ramp`, the gangway's foot on the pier). */
  y: PIER.y, ramp: -6.15 + DZ,
};
export const voteBoat = { open: false };
const VB = VOTE_BOAT, WALL_T = 0.08;
const VOTE_AREAS = [
  // the way in: from the dock's edge over the gangway, across the side deck between the ropes and through the door
  area(VB.gangway.x0 + 0.1, VB.gangway.x1 - 0.1, VB.cabin.z1 - WALL_T - 0.3, -6.0 + VB.dz),
  // the polling room, inside its walls
  area(VB.cabin.x0 + WALL_T + 0.22, VB.cabin.x1 - WALL_T - 0.22, VB.cabin.z0 + WALL_T + 0.22, VB.cabin.z1 - WALL_T - 0.22),
];
const voteAreas = () => voteBoat.open ? VOTE_AREAS : [];
/** On the voting boat: the way in or the polling room (never from down in the cellar). */
export const onVoteBoat = (p: XZ) => voteBoat.open && !level.down && VOTE_AREAS.some(a => inside(a, p));
/** The ground on the voting boat's way in: the pier's, over the gangway, then its deck. */
const voteY = (p: XZ) => PIER.y + (VB.y - PIER.y) * Math.max(0, Math.min(1, (VB.ramp - p.z) / (VB.ramp - VB.deck.z1)));
/** In the polling room, inside the cabin's walls. */
export const inPollingRoom = (p: XZ) => voteBoat.open && !level.down && inside(VOTE_AREAS[1], p);

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
  : stage.n === 1 ? [DECK, ...PIER_AREAS, ...casinoAreas(), ...voteAreas(), housePath(), YARD]
  : [DOCK2, ...PIER_AREAS, ...casinoAreas(), ...voteAreas(), HALL, GATEWAY, GARDEN, BRIDGE, PATH, ...FIELDS, ...(shedYard.open ? [SHED_YARD] : []),
    ...(kioskBooth.open ? [BOOTH] : []), housePath(), YARD];

const inside = (a: Area, p: XZ) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1;

/** Height of the ground people stand on at `p`: the deck and restaurant floor, terraces, or the snow; or the cellar's
 *  floor, for someone `down` there (the player, on its level: everyone else in the world stays up in it). */
export function groundY(p: XZ, down = false) {
  if (down) return CELLAR_Y;
  const casino = casinoY(p);
  if (casino !== null) return casino;
  if (onVoteBoat(p)) return voteY(p);
  if (onPier(p)) return pierY(p);
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
