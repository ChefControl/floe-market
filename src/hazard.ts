// Cooking Hazard, the arcade cabinet's game (casinoArcade.ts, hazardPlay.ts): the rules of a run, free of the screen,
// so they're easy to test; hazardPlay.ts feeds a run the player's keys, mouse or fingers, and hazardSet.ts draws it.
//
// A run: the van drops the chef off at the edge of the food quarter (hazardMap.ts). Crates open as the chef walks up,
// holding one to three ingredients, graded better as the clock climbs (or ammo, or in the gold crate, cookware); the chef
// takes what they want into a bag of eight, a full bag swapping its worst ingredient for a better one. The clock climbs
// Fresh, Stale, Expired, BIOHAZARD; the horde spawns just off the screen around the chef and finds its way round
// buildings to them. In the safe zone the chef radios the van (holding the use key a second), then holds the zone for
// 30 seconds, counted only while they're in its ring, with a rush coming; the van screeches in and waits ten seconds to
// be hopped into, then leaves (call it again). Getting in brings everything carried home; dying loses it all.
//
// The zombie is the dish. The chef's gun seasons zombies with a taste, and a dish thrown on top cooks them: a second,
// different taste on a coated zombie pops a technique (🔥 on ❄️ is Brûléed), which jumps once to the zombies around it
// wearing the same coat and drops a garnish that boosts the gun's next shots. Each taste is an element: three stick on
// the first hit (Fire, Poison, Acid) and three fill a ring at the zombie's feet until it goes off (Freeze, Electric,
// Lure). The horde only has HP, which grows with the clock (Fresh, Stale, Expired, BIOHAZARD); a special zombie has four
// times as much, and shows an order ticket of two tastes: shots wear it down like any zombie, but its ticket, hit in
// order, cooks it on the spot.

import { Nav, QUARTER, U, pushOut, wallAlong, type DropSpot, type Shop, type Spot, type Town, type ZoneSpot } from './hazardMap';

export type Taste = 'spicy' | 'bitter' | 'sour' | 'salty' | 'sweet' | 'umami';

export interface TasteInfo {
  /** The food it comes from and the element it is, as the player sees them. */
  food: string; icon: string; element: string;
  color: string;
  /** Fills a ring at the zombie's feet over several hits, and goes off once full (otherwise it sticks on the first). */
  builds: boolean;
}

export const TASTES: Record<Taste, TasteInfo> = {
  spicy: { food: '🌶️', icon: '🔥', element: 'Fire', color: '#e0392b', builds: false },
  bitter: { food: '☕', icon: '☠️', element: 'Poison', color: '#6a3fa0', builds: false },
  sour: { food: '🍋', icon: '🧪', element: 'Acid', color: '#6fa83a', builds: false },
  salty: { food: '🧂', icon: '⚡', element: 'Electric', color: '#7fc4e0', builds: true },
  sweet: { food: '🍬', icon: '❄️', element: 'Freeze', color: '#f08bb0', builds: true },
  umami: { food: '🍄', icon: '🧲', element: 'Lure', color: '#b0724a', builds: true },
};
export const TASTE_LIST = Object.keys(TASTES) as Taste[];

// ---------- loot ----------
/** An ingredient's grade: wilted, fresh or premium. */
export type Grade = 0 | 1 | 2;
export const GRADES = ['Wilted', 'Fresh', 'Premium'] as const;
/** One real ingredient for each taste, for now (the full list comes with the content). */
export const INGREDIENTS: Record<Taste, string> = {
  spicy: 'Chili', bitter: 'Coffee beans', sour: 'Lemon', salty: 'Sea salt', sweet: 'Sugar', umami: 'Mushroom',
};
/** The gold crate's jackpot (stand-ins, till the cookware's decided). */
export const COOKWARE = [{ name: 'Cast-iron pan', emoji: '🍳' }, { name: 'Wok', emoji: '🥘' }, { name: 'Stockpot', emoji: '🫕' }];
export interface Food { kind: 'food'; taste: Taste; grade: Grade; got: number }
export interface Cookware { kind: 'cookware'; name: string; emoji: string }
export interface Ammo { kind: 'ammo'; mags: number }
export type Item = Food | Cookware | Ammo;
export interface Crate { id: number; x: number; y: number; kind: 'food' | 'ammo' | 'gold'; shop: Shop; open: boolean; items: Item[] }
/** What a crate's shop mostly has (the rest of the time, anything). */
const SHOP_TASTES: Record<Shop, Taste[]> = {
  grocery: ['sour', 'spicy'], cafe: ['bitter', 'sweet'], butcher: ['umami', 'salty'], bakery: ['sweet', 'salty'],
  market: TASTE_LIST, any: TASTE_LIST,
};
/** The odds of a wilted, then of a wilted or fresh ingredient, at each word of the clock: they get better as it climbs. */
const GRADE_ODDS = [[0.6, 0.95], [0.35, 0.85], [0.15, 0.65], [0.05, 0.45]];
/** The bag's ingredients; spare magazines to start with, and at most. */
export const BAG = 8, SPARE_MAGS = 4, MAX_MAGS = 8;
/** How many food, ammo and gold crates a run has. */
const CRATES = { food: 14, ammo: 3, gold: 1 };

// ---------- tuning ----------
/** The arena: one street, in its own units (the screen scales it to fit). */
export const W = QUARTER.w, H = QUARTER.h;
/** How long a taste stays on a zombie without being topped up. */
export const COAT_TIME = 4;
/** How long a zombie can't be cooked again after a technique pops on it. */
export const IMMUNE_TIME = 1;
/** How near a zombie wearing the same coat has to be for a technique to jump to it. */
export const SPREAD_R = 140;
/** Each difficulty word lasts this long (a prototype's minute; the real game would take longer). */
export const LEVEL_TIME = 90;
export const LEVELS = ['Fresh', 'Stale', 'Expired', 'BIOHAZARD'] as const;
const LURE_R = 220, BITE_DPS = 6, CONTACT_DPS = 12, POP_DMG = 12, GARNISH_SHOTS = 5, GARNISH_K = 1.5;
const PLAYER_SPEED = 230, PLAYER_HP = 100, PLAYER_R = 18;
/** A crate's size, and how near the chef opens it (and can take from it). */
export const CRATE_R = 0.45 * U, OPEN_R = 1.5 * U;
/** The safe zone's ring; how long the use key's held to radio the van; how long the zone's held; how long the van waits;
 *  how near its doors the chef gets in; how long the drop-off takes. */
export const ZONE_R = 3 * U, RADIO_TIME = 1, HOLD_TIME = 30, VAN_WAIT = 10, VAN_R = 1.6 * U, DROP_TIME = 2;
/** How far from the chef the horde turns up: just off the screen. */
const SPAWN_NEAR = 14 * U, SPAWN_FAR = 24 * U;

// ---------- the loadout ----------
export type GunId = 'spud' | 'salt' | 'chili';
export interface Gun {
  name: string; emoji: string; taste: Taste | null;
  /** Shots a second, damage a pellet, pellets a shot, spread (radians), pellet speed, how far a pellet flies. */
  rate: number; dmg: number; pellets: number; spread: number; speed: number; range: number;
  mag: number; reload: number;
}
export const GUNS: Record<GunId, Gun> = {
  spud: { name: 'Spud Rifle', emoji: '🥔', taste: null, rate: 5, dmg: 10, pellets: 1, spread: 0.04, speed: 900, range: 700, mag: 24, reload: 1.2 },
  salt: { name: 'Rock Salt Shotgun', emoji: '🧂', taste: 'salty', rate: 1.5, dmg: 7, pellets: 6, spread: 0.35, speed: 800, range: 320, mag: 8, reload: 1.6 },
  chili: { name: 'Chili Sprayer', emoji: '🌶️', taste: 'spicy', rate: 14, dmg: 2.5, pellets: 1, spread: 0.18, speed: 520, range: 260, mag: 60, reload: 1.8 },
};

/** A step of a recipe code: an arrow, shown as a cooking move (← chop, → stir, ↑ flip, ↓ press). */
export type Dir = 'left' | 'right' | 'up' | 'down';
export const MOVES: Record<Dir, string> = { left: '🔪', right: '🥄', up: '🍳', down: '✋' };

export type DishId = 'chiliPot' | 'syrup' | 'lemon' | 'bait';
export interface Dish {
  name: string; emoji: string; taste: Taste;
  /** A bomb hits everything where it lands; a zone lingers there; bait lures. */
  kind: 'bomb' | 'zone' | 'bait';
  code: Dir[]; servings: number;
  r: number; dmg: number;
}
export const DISHES: Record<DishId, Dish> = {
  chiliPot: { name: 'Chili Pot', emoji: '🍲', taste: 'spicy', kind: 'bomb', code: ['left', 'right', 'right', 'up'], servings: 3, r: 100, dmg: 25 },
  syrup: { name: 'Syrup Spill', emoji: '🍯', taste: 'sweet', kind: 'zone', code: ['up', 'left', 'up'], servings: 3, r: 110, dmg: 0 },
  lemon: { name: 'Lemon Splash', emoji: '🍋', taste: 'sour', kind: 'bomb', code: ['right', 'down', 'left'], servings: 3, r: 110, dmg: 10 },
  bait: { name: 'Mushroom Bait', emoji: '🍄', taste: 'umami', kind: 'bait', code: ['down', 'down', 'right'], servings: 3, r: 90, dmg: 8 },
};

export interface Loadout { gun: GunId; dishes: DishId[] }

// ---------- a run ----------
export interface Zombie {
  id: number; x: number; y: number; r: number;
  hp: number; maxHp: number; speed: number;
  /** The taste it wears, how long that lasts, and (for the tastes that build) how full its ring is, 0 to 1. */
  coat: Taste | null; coatT: number; meter: number;
  burnT: number; burnSpreads: boolean; poison: number; poisonT: number; poisonFast: number;
  meltT: number; freezeT: number; twitchT: number; lureT: number; marinateT: number;
  immuneT: number; hasteT: number;
  /** A special zombie's order ticket, and how much of it's done. */
  ticket: Taste[] | null; step: number;
  dead: boolean;
}

export interface Shot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; taste: Taste | null }
export interface Zone { x: number; y: number; r: number; t: number; kind: 'smoke' | 'caramel' | 'battery' | 'syrup'; acc: number }
export interface Thrown { x: number; y: number; fromX: number; fromY: number; t: number; dish: DishId }
export interface Stamp { text: string; x: number; y: number; t: number; color: string }
export interface Garnish { x: number; y: number; t: number }

export interface Serving {
  slot: number;
  /** How many steps of its code are in, whether it's all in (in hand, to throw), and a slip's smudge, fading. */
  typed: number; ready: boolean; smudge: number;
}

export interface Run {
  loadout: Loadout;
  t: number; over: boolean;
  town: Town; nav: Nav;
  /** Till the van's called; holding the zone; the van waiting. */
  stage: 'run' | 'hold' | 'van';
  /** Seconds left of the drop-off (the clock waits). */
  dropT: number;
  zone: ZoneSpot; drop: DropSpot;
  radioT: number; holdT: number; vanT: number;
  /** Got into the van: everything carried comes home. */
  extracted: boolean;
  crates: Crate[];
  bag: Food[]; cookware: Cookware[];
  /** Spare magazines. */
  spare: number;
  /** Things taken so far (an ingredient's `got` is its place in that order). */
  got: number;
  player: { x: number; y: number; hp: number };
  ammo: number; reloadT: number; cooldown: number;
  servings: number[];
  serving: Serving | null;
  boost: number;
  zombies: Zombie[]; shots: Shot[]; zones: Zone[]; thrown: Thrown[]; stamps: Stamp[]; garnishes: Garnish[];
  spawnT: number; specialT: number; nextId: number;
  kills: number; cooked: number;
  rng: () => number;
}

export interface Input {
  move: { x: number; y: number };
  aim: { x: number; y: number };
  fire: boolean;
  /** The use key held (E, or the touch button): radioing the van from the safe zone. */
  use?: boolean;
}

export interface RunOptions {
  /** The map (the food quarter, unless it's for trying the rules out). */
  town?: Town;
  /** Where the chef starts (where the van drops them off, unless it's for trying the rules out). */
  at?: { x: number; y: number };
  /** With the van's drop-off first. */
  intro?: boolean;
}

const pick = <T>(rng: () => number, list: readonly T[]) => list[Math.floor(rng() * list.length)];
/** `n` of `list`, picked at random. */
function some<T>(rng: () => number, list: readonly T[], n: number) {
  const left = [...list], out: T[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}

export function newRun(loadout: Loadout, rng: () => number = Math.random, opts: RunOptions = {}): Run {
  const town = opts.town ?? QUARTER;
  // the safe zone, and a drop-off a good way from it
  const zone = pick(rng, town.zones), away = town.drops.filter(d => dist(d, zone) >= 25 * U);
  const drop = pick(rng, away.length ? away : town.drops), at = opts.at ?? drop.chef;
  let id = 1;
  const crates = (kind: Crate['kind'], spots: readonly Spot[], n: number): Crate[] =>
    some(rng, spots, n).map(s => ({ id: id++, x: s.x, y: s.y, kind, shop: s.shop, open: false, items: [] }));
  return {
    loadout, t: 0, over: false,
    town, nav: new Nav(town), stage: 'run', dropT: opts.intro ? DROP_TIME : 0,
    zone, drop, radioT: 0, holdT: 0, vanT: 0, extracted: false,
    crates: [...crates('food', town.crates, CRATES.food), ...crates('ammo', town.ammo, CRATES.ammo), ...crates('gold', town.gold, CRATES.gold)],
    bag: [], cookware: [], spare: SPARE_MAGS, got: 0,
    player: { x: at.x, y: at.y, hp: PLAYER_HP },
    ammo: GUNS[loadout.gun].mag, reloadT: 0, cooldown: 0,
    servings: loadout.dishes.map(d => DISHES[d].servings),
    serving: null, boost: 0,
    zombies: [], shots: [], zones: [], thrown: [], stamps: [], garnishes: [],
    spawnT: 1, specialT: 20, nextId: 1,
    kills: 0, cooked: 0,
    rng,
  };
}

/** The difficulty word for `t` seconds in (it stays on BIOHAZARD from then on), 0 to 3. */
export const level = (t: number) => Math.min(LEVELS.length - 1, Math.floor(t / LEVEL_TIME));
/** How far along the strip of words the clock is, in words: 1.5 is halfway through Stale. It stops at BIOHAZARD. */
export const stripPos = (t: number) => Math.min(LEVELS.length - 1, t / LEVEL_TIME);

/** A horde zombie's HP, `t` seconds in: it only gets tougher. */
export const hordeHp = (t: number) => Math.round(30 * (1 + 0.6 * t / LEVEL_TIME));
const hordeSpeed = (t: number) => Math.min(120, 55 + 0.25 * t);
const spawnGap = (t: number) => Math.max(0.35, 1.6 - 0.008 * t);

/** Where a zombie turns up: somewhere open just off the screen around the chef, that walks to them. */
function spawnAt(run: Run) {
  const p = run.player, nav = run.nav, { w, h } = run.town;
  for (let k = 0; k < 40; k++) {
    const a = run.rng() * Math.PI * 2, d = SPAWN_NEAR + run.rng() * (SPAWN_FAR - SPAWN_NEAR);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < U || y < U || x > w - U || y > h - U) continue;
    const i = nav.cell(x, y);
    if (nav.open[i] && nav.dist[i] > 0) return nav.middle(i);
  }
  // (hemmed in a corner: the farthest place that walks to them)
  let far = nav.cell(p.x, p.y);
  for (let i = 0; i < nav.dist.length; i++) if (nav.dist[i] > nav.dist[far]) far = i;
  return nav.middle(far);
}

function spawn(run: Run, special: boolean) {
  const { x, y } = spawnAt(run);
  const hp = special ? hordeHp(run.t) * 4 : hordeHp(run.t);
  let ticket: Taste[] | null = null;
  if (special) {
    const a = TASTE_LIST[Math.floor(run.rng() * 6)];
    const rest = TASTE_LIST.filter(t => t !== a);
    ticket = [a, rest[Math.floor(run.rng() * rest.length)]];
  }
  const z: Zombie = {
    id: run.nextId++, x, y, r: special ? 26 : 16, hp, maxHp: hp,
    speed: hordeSpeed(run.t) * (special ? 0.7 : 1),
    coat: null, coatT: 0, meter: 0,
    burnT: 0, burnSpreads: false, poison: 0, poisonT: 0, poisonFast: 0,
    meltT: 0, freezeT: 0, twitchT: 0, lureT: 0, marinateT: 0, immuneT: 0, hasteT: 0,
    ticket, step: 0, dead: false,
  };
  run.zombies.push(z);
  return z;
}

// ---------- hits ----------
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** How far `p` is from the segment (x0, y0)–(x1, y1). */
function toSegment(p: { x: number; y: number }, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
  const k = len2 ? Math.max(0, Math.min(1, ((p.x - x0) * dx + (p.y - y0) * dy) / len2)) : 0;
  return Math.hypot(p.x - (x0 + dx * k), p.y - (y0 + dy * k));
}
const near = (run: Run, at: { x: number; y: number }, r: number, but?: Zombie) =>
  run.zombies.filter(z => !z.dead && z !== but && dist(z, at) <= r + z.r);
/** The `n` nearest living zombies to `z`, within `r`. */
const nearest = (run: Run, z: Zombie, n: number, r: number) =>
  near(run, z, r, z).sort((a, b) => dist(a, z) - dist(b, z)).slice(0, n);

/** Pushes a circle at `p` (radius `r`) off a closed crate. */
function pushOff(p: { x: number; y: number }, r: number, c: Crate) {
  const d = dist(p, c), overlap = r + CRATE_R - d;
  if (overlap <= 0) return;
  // (right on top of it: off to one side)
  if (d < 1e-6) p.x += overlap;
  else { p.x += (p.x - c.x) / d * overlap; p.y += (p.y - c.y) / d * overlap; }
}

/** Takes `dmg` off `z`: half again with its armour melted (Acid). Down at 0. */
function hurt(run: Run, z: Zombie, dmg: number) {
  if (z.dead) return;
  if (z.meltT > 0) dmg *= 1.35;
  z.hp -= dmg;
  if (z.hp <= 0) { z.dead = true; run.kills++; }
}

/** How much damage fills a zombie's ring: tougher zombies take more. One good gun shot is about half of a fresh one's. */
export const ringNeed = (z: Zombie) => 12 + 0.25 * z.maxHp;

/**
 * A hit on `z` for `dmg`, in `taste` (none for a plain shot). `fill` is how much of a building taste's ring it fills
 * (a dish fills it at once; a shot by its damage). Returns the technique it popped, if any.
 */
export function hit(run: Run, z: Zombie, dmg: number, taste: Taste | null, fill = dmg / ringNeed(z)): string | null {
  if (z.dead) return null;
  if (z.ticket) return ticketHit(run, z, dmg, taste);
  // a big hit on a candied zombie shatters it
  if (z.freezeT > 0 && dmg >= 15) { z.freezeT = 0; hurt(run, z, dmg * 1.5); }
  else hurt(run, z, dmg);
  if (!taste || z.dead) return null;
  if (z.coat && z.coat !== taste) {
    if (z.immuneT > 0) return null;
    return cook(run, z, z.coat, taste, true);
  }
  z.coat = taste; z.coatT = COAT_TIME;
  switch (taste) {
    case 'spicy': z.burnT = 2; z.burnSpreads = true; break;
    case 'bitter': z.poison = Math.min(8, z.poison + 1); z.poisonT = 5; break;
    case 'sour': z.meltT = 4; break;
    default:
      z.meter += fill;
      if (z.meter >= 1) { z.meter = 0; goOff(run, z, taste); }
  }
  return null;
}

/** A building taste's ring is full: candied solid, a twitch that jumps to two more, or bait for the crowd. */
function goOff(run: Run, z: Zombie, taste: Taste) {
  if (taste === 'sweet') z.freezeT = 2.5;
  else if (taste === 'salty') {
    z.twitchT = 0.6;
    for (const o of nearest(run, z, 2, 120)) { o.twitchT = Math.max(o.twitchT, 0.3); hurt(run, o, 5); }
  } else z.lureT = 3;
}

/**
 * A hit on a special zombie: it hurts as on any zombie (it just has a lot more to get through), and the next taste on
 * its ticket ticks that off: the whole ticket cooks it on the spot. A taste that isn't next makes it hurry.
 */
function ticketHit(run: Run, z: Zombie, dmg: number, taste: Taste | null) {
  const ticket = z.ticket!;
  hurt(run, z, dmg);
  if (z.dead || !taste) return null;
  if (taste !== ticket[z.step]) { z.hasteT = 2; return null; }
  z.step++;
  if (z.step < ticket.length) return null;
  const name = cook(run, z, ticket[0], ticket[1], true);
  if (!z.dead) { z.dead = true; run.kills++; }
  return name;
}

// ---------- techniques ----------
interface Technique { name: string; does: (run: Run, z: Zombie) => void }

const blast = (run: Run, z: Zombie, r: number, dmg: number, then?: (o: Zombie) => void) => {
  for (const o of near(run, z, r)) { hurt(run, o, dmg); then?.(o); }
};
const zone = (run: Run, z: Zombie, kind: Zone['kind'], r: number, t: number) =>
  run.zones.push({ x: z.x, y: z.y, r, t, kind, acc: 0 });

/** The 15 techniques, one for each pair of tastes, either way round, keyed by the pair in TASTE_LIST's order. */
export const TECHNIQUES: Record<string, Technique> = {
  'spicy+bitter': { name: 'SMOKED!', does: (run, z) => zone(run, z, 'smoke', 110, 3) },
  'spicy+sour': { name: 'FLAMBÉED!', does: (run, z) => blast(run, z, 120, 25, o => { o.burnT = Math.max(o.burnT, 2); }) },
  'spicy+salty': { name: 'CRACKLED!', does: (run, z) => { for (const o of nearest(run, z, 6, 160)) hurt(run, o, 10); } },
  'spicy+sweet': { name: 'BRÛLÉED!', does: (run, z) => { hurt(run, z, 50); zone(run, z, 'caramel', 80, 3); } },
  'spicy+umami': { name: 'BARBECUED!', does: (run, z) => { for (const o of near(run, z, LURE_R)) o.burnT = Math.max(o.burnT, 3); } },
  'bitter+sour': { name: 'FERMENTED!', does: (_, z) => { z.poison = Math.min(8, z.poison * 2 + 2); z.poisonT = 5; z.poisonFast = 4; } },
  'bitter+salty': { name: 'CURED!', does: (run, z) => { for (const o of nearest(run, z, 2, 160)) { o.poison = Math.min(8, o.poison + 3); o.poisonT = 5; } } },
  'bitter+sweet': { name: 'TEMPERED!', does: (run, z) => { hurt(run, z, 20); for (const o of near(run, z, 100)) { o.poison = Math.min(8, o.poison + 3); o.poisonT = 5; } } },
  'bitter+umami': { name: 'STEWED!', does: (run, z) => { for (const o of near(run, z, 160)) { o.poison = Math.min(8, o.poison + 2); o.poisonT = 5; } z.lureT = Math.max(z.lureT, 2); } },
  'sour+salty': { name: 'PICKLED!', does: (run, z) => zone(run, z, 'battery', 150, 3) },
  'sour+sweet': { name: 'CRYSTALLIZED!', does: (run, z) => blast(run, z, 140, 8, o => { o.meltT = Math.max(o.meltT, 4); }) },
  'sour+umami': { name: 'MARINATED!', does: (_, z) => { z.meltT = Math.max(z.meltT, 4); z.lureT = 3; z.marinateT = 3; } },
  'salty+sweet': { name: 'CHURNED!', does: (run, z) => { z.freezeT = 2; for (const o of nearest(run, z, 2, 160)) o.freezeT = Math.max(o.freezeT, 2); } },
  'salty+umami': { name: 'BRINED!', does: (run, z) => { for (const o of near(run, z, 200)) o.twitchT = Math.max(o.twitchT, 1); } },
  'sweet+umami': { name: 'GLAZED!', does: (run, z) => {
    for (const o of near(run, z, 160, z)) {
      // pulled in against it, stuck there
      const d = dist(o, z) || 1, k = Math.max(0, d - z.r - o.r) / d;
      o.x -= (o.x - z.x) * k; o.y -= (o.y - z.y) * k; o.freezeT = Math.max(o.freezeT, 2);
    }
    z.freezeT = 2;
  } },
};
/** The key of a pair of tastes in TECHNIQUES, either way round. */
export const pair = (a: Taste, b: Taste) =>
  TASTE_LIST.indexOf(a) < TASTE_LIST.indexOf(b) ? `${a}+${b}` : `${b}+${a}`;
/** The technique two tastes make, either way round. */
export const technique = (a: Taste, b: Taste) => TECHNIQUES[pair(a, b)];

/**
 * `b` lands on `z` wearing `a`: the technique pops. It hurts the zombie, does its thing, spends the coat, stamps its
 * name, drops a garnish and (if `spreads`) jumps once to the zombies nearby wearing `a` too.
 */
function cook(run: Run, z: Zombie, a: Taste, b: Taste, spreads: boolean): string {
  const tech = technique(a, b);
  hurt(run, z, POP_DMG);
  tech.does(run, z);
  z.coat = null; z.coatT = 0; z.meter = 0; z.immuneT = IMMUNE_TIME;
  run.cooked++;
  if (spreads) {
    run.stamps.push({ text: tech.name, x: z.x, y: z.y - 40, t: 1.2, color: TASTES[b].color });
    run.garnishes.push({ x: z.x, y: z.y, t: 8 });
    for (const o of near(run, z, SPREAD_R, z)) if (o.coat === a && o.immuneT <= 0 && !o.ticket) cook(run, o, a, b, false);
  }
  return tech.name;
}

// ---------- serving a dish ----------
/** Starts serving the dish in `slot` (hold its key): the chef stops while its code goes in. */
export function startServe(run: Run, slot: number) {
  if (run.over || slot >= run.servings.length || run.servings[slot] <= 0) return false;
  if (run.serving?.ready) return false;
  run.serving = { slot, typed: 0, ready: false, smudge: 0 };
  return true;
}

/** An arrow while serving: the next step of the code, or a slip that smudges the ticket and starts it over. */
export function press(run: Run, dir: Dir): 'step' | 'done' | 'slip' | null {
  const s = run.serving;
  if (!s || s.ready) return null;
  const code = DISHES[run.loadout.dishes[s.slot]].code;
  if (code[s.typed] !== dir) { s.typed = 0; s.smudge = 0.4; return 'slip'; }
  s.typed++;
  if (s.typed < code.length) return 'step';
  s.ready = true;
  return 'done';
}

/** The dish's key is let go: a dish not all typed in is put back. */
export function letGo(run: Run) {
  if (run.serving && !run.serving.ready) run.serving = null;
}

/** Throws the dish in hand at `at` (as far as an arm reaches). */
export function throwDish(run: Run, at: { x: number; y: number }) {
  const s = run.serving;
  if (!s?.ready) return false;
  const p = run.player, d = Math.hypot(at.x - p.x, at.y - p.y), k = d > 420 ? 420 / d : 1;
  run.thrown.push({ x: p.x + (at.x - p.x) * k, y: p.y + (at.y - p.y) * k, fromX: p.x, fromY: p.y, t: 0.5, dish: run.loadout.dishes[s.slot] });
  run.servings[s.slot]--;
  run.serving = null;
  return true;
}

function land(run: Run, th: Thrown) {
  const dish = DISHES[th.dish];
  if (dish.kind === 'zone') { run.zones.push({ x: th.x, y: th.y, r: dish.r, t: 5, kind: 'syrup', acc: 0 }); return; }
  for (const z of near(run, th, dish.r)) hit(run, z, dish.dmg, dish.taste, 1);
}

// ---------- a step of the run ----------
/** The chef's melee (F): zombies close by are shoved off and hurt a little. */
export function shove(run: Run) {
  const p = run.player;
  for (const z of near(run, p, 60)) {
    const d = dist(z, p) || 1;
    z.x += (z.x - p.x) / d * 80; z.y += (z.y - p.y) / d * 80;
    hurt(run, z, 5);
  }
}

/** Reload (R), unless the magazine's full, it's already reloading, or there's no spare magazine left. */
export function reload(run: Run) {
  if (run.reloadT > 0 || run.ammo === GUNS[run.loadout.gun].mag || run.spare <= 0) return;
  run.reloadT = GUNS[run.loadout.gun].reload;
}

function fire(run: Run, aim: { x: number; y: number }) {
  const gun = GUNS[run.loadout.gun], p = run.player;
  if (run.cooldown > 0 || run.reloadT > 0) return;
  if (run.ammo <= 0) { reload(run); return; }
  run.ammo--;
  run.cooldown = 1 / gun.rate;
  const boosted = run.boost > 0;
  if (boosted) run.boost--;
  const a = Math.atan2(aim.y - p.y, aim.x - p.x);
  for (let i = 0; i < gun.pellets; i++) {
    const ang = a + (run.rng() - 0.5) * gun.spread;
    run.shots.push({
      x: p.x, y: p.y, vx: Math.cos(ang) * gun.speed, vy: Math.sin(ang) * gun.speed,
      life: gun.range / gun.speed, dmg: gun.dmg * (boosted ? GARNISH_K : 1), taste: gun.taste,
    });
  }
  if (run.ammo === 0) reload(run);
}

// ---------- crates ----------
/** What's in a crate, put in as it opens (so the later it's opened, the better the grades). */
function fill(run: Run, c: Crate) {
  const food = (taste: Taste): Food => {
    const odds = GRADE_ODDS[level(run.t)], r = run.rng();
    return { kind: 'food', taste, grade: r < odds[0] ? 0 : r < odds[1] ? 1 : 2, got: 0 };
  };
  const taste = () => (run.rng() < 0.7 ? pick(run.rng, SHOP_TASTES[c.shop]) : pick(run.rng, TASTE_LIST));
  if (c.kind === 'ammo') c.items = [{ kind: 'ammo', mags: 2 }];
  else if (c.kind === 'gold') c.items = [{ kind: 'cookware', ...pick(run.rng, COOKWARE) }, food(taste())];
  else c.items = Array.from({ length: 1 + Math.floor(run.rng() * 3) }, () => food(taste()));
}

/** The bag's worst ingredient (the lowest grade, and of those the one picked up first): what a swap gives up. */
export function worstInBag(run: Run) {
  let w = -1;
  run.bag.forEach((f, i) => { if (w < 0 || f.grade < run.bag[w].grade || (f.grade === run.bag[w].grade && f.got < run.bag[w].got)) w = i; });
  return w;
}

/** What taking item `i` of `c` would do: take it, swap the bag's worst for it, or nothing (the bag's full of better). */
export function wouldTake(run: Run, c: Crate, i: number): 'take' | 'swap' | 'full' {
  const it = c.items[i];
  if (it.kind !== 'food' || run.bag.length < BAG) return 'take';
  return run.bag[worstInBag(run)].grade < it.grade ? 'swap' : 'full';
}

/** The best thing in a crate (cookware, then the highest grade): what the use key takes. */
export function bestIn(c: Crate) {
  const worth = (it: Item) => (it.kind === 'cookware' ? 9 : it.kind === 'ammo' ? 5 : it.grade);
  let b = 0;
  c.items.forEach((it, i) => { if (worth(it) > worth(c.items[b])) b = i; });
  return c.items.length ? b : -1;
}

/** The open crate the chef's at with something in it, if any (the nearest). */
export function crateAt(run: Run) {
  let best: Crate | null = null;
  for (const c of run.crates) if (c.open && c.items.length && dist(c, run.player) <= OPEN_R + U && (!best || dist(c, run.player) < dist(best, run.player))) best = c;
  return best;
}

/** Takes item `i` of crate `c` (the chef has to be at it): into the bag (or the gun, or the cookware), swapping the
 *  bag's worst ingredient back into the crate when it's full. */
export function take(run: Run, c: Crate, i: number): 'took' | 'swapped' | 'full' | null {
  const it = c.items[i];
  if (!it || run.over || dist(c, run.player) > OPEN_R + U) return null;
  const how = wouldTake(run, c, i);
  if (how === 'full') return 'full';
  if (it.kind === 'ammo') run.spare = Math.min(MAX_MAGS, run.spare + it.mags);
  else if (it.kind === 'cookware') run.cookware.push(it);
  else if (how === 'swap') {
    const w = worstInBag(run);
    c.items[i] = run.bag[w];
    run.bag[w] = { ...it, got: run.got++ };
    return 'swapped';
  } else run.bag.push({ ...it, got: run.got++ });
  c.items.splice(i, 1);
  return 'took';
}

/** What a run brought home: a point for each grade of each ingredient (wilted 1, premium 3), ten for cookware. None if
 *  the chef didn't get out. */
export const haul = (run: Run) => (run.extracted ? run.bag.reduce((n, f) => n + f.grade + 1, 0) + run.cookware.length * 10 : 0);

export function step(run: Run, dt: number, input: Input) {
  if (run.over) return;
  // (the van's dropping the chef off: the clock waits)
  if (run.dropT > 0) { run.dropT = Math.max(0, run.dropT - dt); return; }
  run.t += dt;
  const p = run.player, gun = GUNS[run.loadout.gun], blocks = run.town.blocks;

  // the chef: stands still while a code goes in, otherwise walks and fires (a dish in hand is thrown instead)
  if (!run.serving || run.serving.ready) {
    const m = Math.hypot(input.move.x, input.move.y);
    if (m > 0) { p.x += input.move.x / m * PLAYER_SPEED * dt; p.y += input.move.y / m * PLAYER_SPEED * dt; }
    pushOut(p, PLAYER_R, blocks);
    for (const c of run.crates) if (!c.open) pushOff(p, PLAYER_R, c);
    p.x = Math.max(PLAYER_R, Math.min(run.town.w - PLAYER_R, p.x)); p.y = Math.max(PLAYER_R, Math.min(run.town.h - PLAYER_R, p.y));
  }
  // crates open as the chef walks up
  for (const c of run.crates) if (!c.open && dist(c, p) <= OPEN_R) { c.open = true; fill(run, c); }
  if (run.serving) run.serving.smudge = Math.max(0, run.serving.smudge - dt);
  run.cooldown = Math.max(0, run.cooldown - dt);
  if (run.reloadT > 0) { run.reloadT -= dt; if (run.reloadT <= 0) { run.reloadT = 0; run.ammo = gun.mag; run.spare--; } }
  if (input.fire && !run.serving) fire(run, input.aim);

  // the safe zone: radio the van, hold the ring till it comes, get in before it leaves
  const inZone = dist(p, run.zone) <= ZONE_R;
  if (run.stage === 'run') {
    run.radioT = input.use && inZone ? run.radioT + dt : 0;
    if (run.radioT >= RADIO_TIME) { run.stage = 'hold'; run.holdT = HOLD_TIME; run.radioT = 0; run.spawnT = 0; }
  } else if (run.stage === 'hold') {
    if (inZone) run.holdT -= dt;
    if (run.holdT <= 0) { run.stage = 'van'; run.vanT = VAN_WAIT; }
  } else {
    run.vanT -= dt;
    if (dist(p, run.zone) <= VAN_R) { run.extracted = true; run.over = true; return; }
    if (run.vanT <= 0) run.stage = 'run';
  }

  // the horde keeps coming, faster and tougher (and three times as fast while the zone's held); now and then a special
  run.nav.towards(p.x, p.y);
  run.spawnT -= dt;
  if (run.spawnT <= 0) { spawn(run, false); run.spawnT = spawnGap(run.t) / (run.stage === 'hold' ? 3 : 1); }
  run.specialT -= dt;
  if (run.specialT <= 0) { spawn(run, true); run.specialT = 40; }

  // shots fly till they hit something or run out of range (checked along the whole way they went this step, so a fast
  // one can't skip over a zombie between frames)
  for (const s of run.shots) {
    const x0 = s.x, y0 = s.y;
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    // (a wall stops it where it meets it)
    const wall = wallAlong(x0, y0, s.x, s.y, blocks);
    if (wall !== null) { s.x = x0 + (s.x - x0) * wall; s.y = y0 + (s.y - y0) * wall; }
    const z = run.zombies.find(o => !o.dead && toSegment(o, x0, y0, s.x, s.y) <= o.r + 4);
    if (z) { s.life = 0; hit(run, z, s.dmg, s.taste); } else if (wall !== null) s.life = 0;
  }
  run.shots = run.shots.filter(s => s.life > 0);

  // dishes in the air land
  for (const th of run.thrown) { th.t -= dt; if (th.t <= 0) land(run, th); }
  run.thrown = run.thrown.filter(th => th.t > 0);

  // zones linger: a smoke cloud poisons, the burnt caramel burns, the pickle battery zaps, the syrup candies
  for (const zn of run.zones) {
    zn.t -= dt; zn.acc += dt;
    if (zn.acc < 0.5) continue;
    zn.acc -= 0.5;
    const inside = near(run, zn, zn.r);
    if (zn.kind === 'smoke') for (const o of inside) { o.poison = Math.min(8, o.poison + 1); o.poisonT = 5; }
    if (zn.kind === 'caramel') for (const o of inside) o.burnT = Math.max(o.burnT, 1);
    if (zn.kind === 'battery') for (const o of inside.sort((a, b) => dist(a, zn) - dist(b, zn)).slice(0, 2)) { hurt(run, o, 6); o.twitchT = Math.max(o.twitchT, 0.3); }
    if (zn.kind === 'syrup') for (const o of inside) hit(run, o, 0, 'sweet', 0.4);
  }
  run.zones = run.zones.filter(zn => zn.t > 0);

  // the zombies: their tastes wear off and their burns and poisons tick; then they shamble at the chef, or at the bait
  const baits = run.zombies.filter(z => !z.dead && z.lureT > 0);
  for (const z of run.zombies) {
    if (z.dead) continue;
    z.coatT -= dt;
    if (z.coatT <= 0 && z.coat) { z.coat = null; z.meter = 0; }
    for (const k of ['immuneT', 'hasteT', 'meltT', 'freezeT', 'twitchT', 'lureT', 'marinateT', 'poisonFast'] as const) z[k] = Math.max(0, z[k] - dt);
    if (z.burnT > 0) {
      z.burnT -= dt; hurt(run, z, 4 * dt);
      // a burn from a hit catches on whoever it touches (theirs doesn't spread further)
      if (z.burnSpreads) for (const o of near(run, z, z.r + 2, z)) if (o.burnT <= 0) { o.burnT = 1; o.burnSpreads = false; }
    }
    if (z.poisonT > 0) { z.poisonT -= dt; hurt(run, z, 2 * z.poison * (z.poisonFast > 0 ? 2 : 1) * dt); if (z.poisonT <= 0) z.poison = 0; }
    if (z.dead) continue;

    const bait = z.lureT > 0 ? null : baits.find(b => !b.dead && b !== z && dist(b, z) < LURE_R);
    const target = bait ?? p;
    let speed = z.speed * (z.hasteT > 0 ? 1.6 : 1) * (z.coat === 'sweet' ? 1 - 0.5 * z.meter : 1);
    if (z.freezeT > 0 || z.twitchT > 0) speed = 0;
    // (a little past touching: they don't stand in each other, so they'd never quite get there)
    const d = dist(z, target), reach = z.r + (bait ? bait.r : 18) + 2;
    if (d > reach) {
      // straight at it when nothing's in the way; otherwise the shortest way round
      const way = bait || run.nav.clear(z, target) ? target : run.nav.next(z.x, z.y) ?? target, wd = dist(z, way) || 1;
      z.x += (way.x - z.x) / wd * speed * dt; z.y += (way.y - z.y) / wd * speed * dt;
    }
    else if (speed > 0) {
      if (bait) hurt(run, bait, BITE_DPS * (bait.marinateT > 0 ? 3 : 1) * dt);
      else p.hp -= CONTACT_DPS * dt;
    }
  }
  // (they don't stand in each other)
  const live = run.zombies.filter(z => !z.dead);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j], d = dist(a, b) || 0.01, overlap = a.r + b.r - d;
    if (overlap > 0) { const k = overlap / d / 2; a.x -= (b.x - a.x) * k; a.y -= (b.y - a.y) * k; b.x += (b.x - a.x) * k; b.y += (b.y - a.y) * k; }
  }
  // (nor in walls, cars or crates)
  for (const z of live) {
    pushOut(z, z.r, blocks);
    for (const c of run.crates) if (!c.open) pushOff(z, z.r, c);
  }
  run.zombies = run.zombies.filter(z => !z.dead);

  // garnishes wait to be picked up; stamps fade
  for (const g of run.garnishes) { g.t -= dt; if (dist(g, p) < 30) { g.t = 0; run.boost = GARNISH_SHOTS; } }
  run.garnishes = run.garnishes.filter(g => g.t > 0);
  for (const s of run.stamps) s.t -= dt;
  run.stamps = run.stamps.filter(s => s.t > 0);

  if (p.hp <= 0) { p.hp = 0; run.over = true; }
}
