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
 * the shore as a wide quay, its stone wall in line with the dock's edge at the water, and a riverboat is moored along it,
 * bow towards the dock. A gangway takes you aboard onto its foredeck, at the foot of a staircase up to the open
 * upper deck where the games are.
 */
export const QUAY = { x0: -24.6, x1: -8.0, z0: -6.5, z1: -3.7 };
/** The riverboat: its middle, half its length (along x) and half its beam (along z). The bow points east. */
export const SHIP = { x: -20, z: -9.45, half: 6, beam: 2.8 };
/** How high the upper deck is; the main deck is level with the quay. */
export const UPPER = FY + 2.1;
/** Along the ship, from its middle (+ towards the bow): the upper deck's ends, the staircase (its top at `x0`) and the gangway. */
export const DECKS = { stern: -5.6, front: 2.25, stairs: { x0: 2.25, x1: 4.4, half: 0.7 }, gangway: 4.7 };
export const casinoBoat = { open: false };
const along = (x: number) => SHIP.x + x, across = (z: number) => SHIP.z + z;
/** Where you stand to play each game, on the upper deck in front of its table. */
export const GAMES = {
  roulette: { x: along(-4.3), y: UPPER, z: across(0.75) },
  blackjack: { x: along(-1.7), y: UPPER, z: across(0.75) },
  slots: { x: along(0.9), y: UPPER, z: across(0.75) },
};
const QUAY_FLOOR = area(QUAY.x0 + 0.3, QUAY.x1 + 0.6, QUAY.z0 + 0.3, QUAY.z1 - 0.2);
const GANGWAY = area(along(DECKS.gangway) - 0.35, along(DECKS.gangway) + 0.35, across(SHIP.beam) - 0.5, QUAY.z0 + 0.4);
const LANDING = area(along(4.2), along(5.1), across(-0.7), across(SHIP.beam - 0.5));
const STAIRS = area(along(DECKS.stairs.x0), along(DECKS.stairs.x1), across(-DECKS.stairs.half), across(DECKS.stairs.half), UPPER);
const UPPER_DECK = area(along(DECKS.stern), along(DECKS.front), across(-SHIP.beam + 0.5), across(SHIP.beam - 0.5), UPPER);
const casinoAreas = () => casinoBoat.open ? [QUAY_FLOOR, GANGWAY, LANDING, STAIRS, UPPER_DECK] : [];
/** Height of the harbor's floor at `p`: the quay and the main deck, the stairs climbing, or the upper deck; null off it. */
function casinoY(p: XZ) {
  if (!casinoBoat.open) return null;
  if (inside(STAIRS, p)) return FY + (UPPER - FY) * (STAIRS.x1 - p.x) / (STAIRS.x1 - STAIRS.x0);
  if (inside(UPPER_DECK, p)) return UPPER;
  return [QUAY_FLOOR, GANGWAY, LANDING].some(a => inside(a, p)) ? FY : null;
}
/** On the harbor's boards: the quay or anywhere aboard (for footsteps on wood). */
export const onHarbor = (p: XZ) => casinoY(p) !== null;
/** Aboard the riverboat. */
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

/** Where the player can walk in the current stage. Earlier areas win where they overlap. */
export const walkable = (): Area[] =>
  stage.n === 1 ? [DECK, ...casinoAreas(), housePath(), YARD]
  : [DOCK2, ...casinoAreas(), HALL, GATEWAY, GARDEN, BRIDGE, PATH, ...FIELDS, ...(shedYard.open ? [SHED_YARD] : []),
    ...(kioskBooth.open ? [BOOTH] : []), housePath(), YARD];

const inside = (a: Area, p: XZ) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1;

/** Height of the ground people stand on at `p`: the deck and restaurant floor, terraces, or the snow. */
export function groundY(p: XZ) {
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
