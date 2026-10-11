// Which stage the game is in, and the ground plan for each: where people can walk and how high the ground is.
// Stage 1 is the fish market on the dock. Stage 2 (after the gold 'sushi' tile) shrinks the dock to its north
// half and builds Floe Sushi south of it, with a front garden, and hot-spring rice terraces to the west.
import { FY, type XZ } from './util';

export const stage = { n: 1 as 1 | 2 };

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
/** How high the lounge's floor is: on top of the salon's roof. */
export const TOP = UPPER + SALON.h + 0.16;
/**
 * The blackjack lounge (casinoSalon.ts): a third floor on the aft half of the salon's roof, walled in like the salon
 * below it, with the jacuzzi deck on its roof. From the ship's middle: its ends along it, its walls' distance either
 * side, and how tall it is; its door, at the north end of its east wall; the staircase up to the roof outside, from
 * the foredeck beside the salon's stairs (its foot at `x1`) up through the hardtop over the salon's door (its head at
 * `x0`), between `z0` and `z1`, steep as a yacht's are; and the terrace on the roof from the stairs' head aft along
 * the north side, past the sky lounge, to the lounge's door.
 */
export const LOUNGE = {
  x0: SALON.x0, x1: -1.0, side: SALON.side, h: 2.3,
  door: { z0: -2.95, z1: -2.05 },
  stairs: { x0: 3.75, x1: 6.3, z0: -1.9, z1: -1.0 },
  terrace: { x0: -1.4, x1: 3.75, z0: -2.95, z1: -2.05 },
};
/** A level of the boat's floors: the lounge's, or anything below it. */
export const upTop = (p: { y: number }) => p.y > (UPPER + TOP) / 2;
/** How much the lounge is showing, 1 to 0: it goes with the salon's roof, which lifts away while the player's inside
 *  the salon (casinoSalon.ts keeps it up to date). */
export const loungeSeen = { k: 1 };
export const casinoBoat = { open: false };
const along = (x: number) => SHIP.x + x, across = (z: number) => SHIP.z + z;
/** Where you stand to play each game: roulette and the slot machines in the salon, in front of their table (in the
 *  middle of the back wall) and machines along it; blackjack up in the lounge, at the middle of the five seats round
 *  its table, whose dealer stands with their back to the stern. */
export const GAMES = {
  roulette: { x: along(-3.0), y: UPPER, z: across(0) },
  blackjack: { x: along(-5.1), y: TOP, z: across(0) },
  slots: { x: along(0.4), y: UPPER, z: across(0) },
};
const QUAY_FLOOR = area(QUAY.x0 + 0.3, QUAY.x1 + 0.6, QUAY.z0 + 0.3, QUAY.z1 - 0.2);
/** How far out the foredeck goes at the gangway: inside the hull's sides where they draw in towards the bow. */
const FOREDECK_EDGE = hullHalf(DECKS.gangway + 0.4) - 0.35;
const GANGWAY = area(along(DECKS.gangway) - 0.35, along(DECKS.gangway) + 0.35, across(FOREDECK_EDGE), QUAY.z0 + 0.4);
const LANDING = area(along(DECKS.stairs.x1 - 0.2), along(DECKS.gangway + 0.4), across(-0.7), across(FOREDECK_EDGE));
const STAIRS = area(along(DECKS.stairs.x0), along(DECKS.stairs.x1), across(-DECKS.stairs.half), across(DECKS.stairs.half), UPPER);
const UPPER_DECK = area(along(DECKS.stern), along(DECKS.front), across(-SHIP.beam + 0.5), across(SHIP.beam - 0.5), UPPER);
/** The lounge's staircase, climbing west from the salon's floor, and the lounge's floor. */
/** The stairs up to the roof (a little narrower than they are), the foredeck at their foot, the roof at their head
 *  (beside the sky lounge), the terrace aft from there to the lounge's door, and the lounge's floor. */
const { stairs: SKY, terrace: TER } = LOUNGE;
const SKY_STAIRS = area(along(SKY.x0), along(SKY.x1), across(SKY.z0 + 0.05), across(SKY.z1 - 0.05), TOP);
const SKY_FOOT = area(along(SKY.x1 - 0.05), along(SKY.x1 + 0.3), across(SKY.z0 + 0.05), across(-0.7));
const SKY_HEAD = area(along(SKY.x0 - 0.6), along(SKY.x0), across(TER.z0), across(SKY.z1 - 0.05), TOP);
const TERRACE = area(along(TER.x0), along(TER.x1), across(TER.z0), across(TER.z1), TOP);
const LOUNGE_FLOOR = area(along(LOUNGE.x0 + 0.3), along(LOUNGE.x1 - 0.3), across(-SHIP.beam + 0.5), across(SHIP.beam - 0.5), TOP);
const ROOF = [SKY_HEAD, TERRACE, LOUNGE_FLOOR];
/** Where the player can walk aboard: up top, only the roof and the lounge (and the stairs down); below, the rest. */
const casinoAreas = (p?: { y: number }) =>
  !casinoBoat.open ? [] : p && upTop(p) ? [SKY_STAIRS, ...ROOF]
  : [QUAY_FLOOR, GANGWAY, LANDING, SKY_FOOT, SKY_STAIRS, STAIRS, UPPER_DECK];
/** Up the stairs to the roof at `p`: from the foredeck at their foot to the roof at their head. */
const skyStep = (p: XZ) => FY + (TOP - FY) * (SKY_STAIRS.x1 - p.x) / (SKY_STAIRS.x1 - SKY_STAIRS.x0);
/** On the stairs up to the roof, outside the salon. */
export const onSkyStairs = (p: XZ) => casinoBoat.open && inside(SKY_STAIRS, p);
/**
 * Height of the harbor's floor at `p`: the quay and the main deck, the stairs climbing, the upper deck, or (for
 * someone up there, given their height) the lounge; null off it.
 */
function casinoY(p: XZ & { y?: number }) {
  if (!casinoBoat.open) return null;
  if (inside(SKY_STAIRS, p)) return skyStep(p);
  if (p.y !== undefined && upTop({ y: p.y }) && ROOF.some(a => inside(a, p))) return TOP;
  if (inside(STAIRS, p)) return FY + (UPPER - FY) * (STAIRS.x1 - p.x) / (STAIRS.x1 - STAIRS.x0);
  if (inside(UPPER_DECK, p)) return UPPER;
  return [QUAY_FLOOR, GANGWAY, LANDING, SKY_FOOT].some(a => inside(a, p)) ? FY : null;
}
/** On the harbor's boards: the quay or anywhere aboard (for footsteps on wood). */
export const onHarbor = (p: XZ) => casinoY(p) !== null;
/** Aboard the yacht. */
export const aboard = (p: XZ) =>
  Math.abs(p.x - SHIP.x) < SHIP.half + 0.5 && Math.abs(p.z - SHIP.z) < SHIP.beam + 0.1;

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

/** Where the player can walk in the current stage, from where they are (`p`): up in the lounge, only there. Earlier
 *  areas win where they overlap. */
export const walkable = (p?: { y: number }): Area[] =>
  p && casinoBoat.open && upTop(p) ? casinoAreas(p)
  : stage.n === 1 ? [DECK, ...casinoAreas(), housePath(), YARD]
  : [DOCK2, ...casinoAreas(), HALL, GATEWAY, GARDEN, BRIDGE, PATH, ...FIELDS, ...(shedYard.open ? [SHED_YARD] : []),
    ...(kioskBooth.open ? [BOOTH] : []), housePath(), YARD];

const inside = (a: Area, p: XZ) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1;

/** Height of the ground people stand on at `p`: the deck and restaurant floor, terraces, or the snow. Aboard the
 *  casino boat, `p`'s own height (if it has one) says which floor they're on, under the lounge or in it. */
export function groundY(p: XZ & { y?: number }) {
  const casino = casinoY(p);
  if (casino !== null) return casino;
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
