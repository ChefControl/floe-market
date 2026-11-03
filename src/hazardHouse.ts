// Cooking Hazard's safe house (hazardPlay.ts shows it, hazardRoom.ts builds its room): what the chef keeps between runs,
// in Floe Market's save (save.ts) and so in its cloud copy, wiped by Restart with the rest. The pantry (ingredients by
// taste and grade), the cookware found, the cooked batches on the shelf, the arcade tickets and what they've bought,
// the recipe book's techniques, the bests, and the next run's specials' tickets, rolled ahead for the van's map. And its
// rules: cooking a batch at a counter (the timing tap: a dish's recipe code, twice through, each move pressed as it
// crosses the line), what a run pays in tickets, packing the van, and bringing a run home.
import {
  DISHES, GUNS, TASTE_LIST, haul, type Dir, type DishId, type Food, type Grade, type GunId, type Loadout, type Run,
  type RunOptions, type Taste,
} from './hazard';
import { dice } from './kit';

// ---------- counters and recipes ----------
export type CounterId = 'stove' | 'oven' | 'pantry';
/** The three kitchens: the Stove (hot) is open from the start; the Oven (pastry) and the Pantry (the cold kitchen:
 *  pickling, curing) open with their cookware, from a gold crate. */
export const COUNTERS: Record<CounterId, { name: string; icon: string; opens: string | null }> = {
  stove: { name: 'Stove', icon: '♨️', opens: null },
  oven: { name: 'Oven', icon: '🔥', opens: 'Baking tray' },
  pantry: { name: 'Pantry', icon: '🍶', opens: 'Pickling crock' },
};
/** Where each dish is cooked, and how many ingredients of its taste a batch takes (stand-ins till the real recipes). */
export const RECIPES: Record<DishId, { counter: CounterId; needs: number }> = {
  chiliPot: { counter: 'stove', needs: 2 }, bait: { counter: 'stove', needs: 2 },
  syrup: { counter: 'oven', needs: 2 }, lemon: { counter: 'pantry', needs: 2 },
};
/** A batch's strength (its dish's damage and size, times) from its ingredients' grades: wilted, fresh, premium. */
export const QUALITY = [0.8, 1, 1.25];

/** A batch cooked and on the shelf: its dish, the servings left, and its strength. */
export interface Batch { dish: DishId; servings: number; quality: number }

// ---------- what tickets buy ----------
/** The bag's size and the chef's health at each level of the van's cargo and armour; the gun's damage at each level. */
export const BAGS = [8, 10, 12], SUITS = [100, 125, 150], DAMAGE = [1, 1.15, 1.3, 1.5];
/** What things cost in tickets: the guns to unlock, dish slots 3 and 4, each level of damage, cargo and armour. */
export const PRICES = {
  gun: { spud: 0, salt: 40, chili: 60 } as Record<GunId, number>,
  slot: [50, 100], damage: [30, 60, 90], cargo: [40, 80], armour: [40, 80],
};
export type Buy = { kind: 'gun'; gun: GunId } | { kind: 'damage'; gun: GunId } | { kind: 'slot' | 'cargo' | 'armour' };

// ---------- the house ----------
export interface House {
  /** Ingredients by `taste:grade`, and cookware by name. */
  pantry: Record<string, number>;
  cookware: Record<string, number>;
  batches: Batch[];
  tickets: number;
  guns: GunId[]; gun: GunId;
  /** Damage levels bought, by gun. */
  damage: Partial<Record<GunId, number>>;
  slots: number; cargo: number; armour: number;
  /** The batches packed in the van for the next run, by their place on the shelf. */
  packed: number[];
  /** The techniques popped so far (TECHNIQUES' keys): the recipe book's page fills in. */
  found: string[];
  best: { haul: number; time: number };
  /** The first-time hint at the Stove's been shown. */
  hinted: boolean;
  /** The next run's specials' tickets, for the van's map. */
  next: Taste[][];
}

/** What a new player starts with: enough for two batches at the Stove, the Spud Rifle and a few tickets. */
export function freshHouse(): House {
  return {
    pantry: { 'spicy:1': 4, 'umami:1': 4 }, cookware: {}, batches: [], tickets: 20,
    guns: ['spud'], gun: 'spud', damage: {}, slots: 2, cargo: 0, armour: 0, packed: [],
    found: [], best: { haul: 0, time: 0 }, hinted: false, next: [],
  };
}
/** The safe house in play (save.ts loads it and saves it). */
export const house: House = freshHouse();

const key = (t: Taste, g: Grade) => `${t}:${g}`;
/** How many of `taste` are in the pantry, every grade. */
export const have = (taste: Taste) => ([0, 1, 2] as Grade[]).reduce<number>((n, g) => n + (house.pantry[key(taste, g)] ?? 0), 0);
export const counterOpen = (c: CounterId) => !COUNTERS[c].opens || (house.cookware[COUNTERS[c].opens!] ?? 0) > 0;
/** Whether a batch of `dish` can be cooked now: its counter's open and the pantry has what it takes. */
export const canCook = (dish: DishId) => counterOpen(RECIPES[dish].counter) && have(DISHES[dish].taste) >= RECIPES[dish].needs;

/** The stars a cook's score earns, 0 to 1 (perfect moves count whole, good ones half): the servings it makes. */
export const starsFor = (score: number) => (score >= 0.85 ? 3 : score >= 0.5 ? 2 : 1);

/** Cooks a batch of `dish` for `stars`: takes the pantry's best of its taste, and shelves the batch. */
export function cook(dish: DishId, stars: number): Batch | null {
  if (!canCook(dish)) return null;
  const taste = DISHES[dish].taste, used: Grade[] = [];
  for (const g of [2, 1, 0] as Grade[]) {
    while (used.length < RECIPES[dish].needs && (house.pantry[key(taste, g)] ?? 0) > 0) { house.pantry[key(taste, g)]--; used.push(g); }
  }
  const batch = { dish, servings: Math.max(1, Math.min(3, stars)), quality: used.reduce<number>((q, g) => q + QUALITY[g], 0) / used.length };
  house.batches.push(batch);
  return batch;
}

// ---------- the timing tap ----------
/** One move of the code going by: when it reaches the line, and how it was pressed. */
export interface Note { dir: Dir; at: number; hit: 'perfect' | 'good' | 'miss' | null }
export interface Cooking { dish: DishId; t: number; notes: Note[] }
/** How long before the first move reaches the line, and between moves; how near the line a press is perfect, or good. */
export const LEAD = 1.4, GAP = 0.8, PERFECT = 0.1, GOOD = 0.25;

/** A cook of `dish`: its recipe code twice through. */
export function startCooking(dish: DishId): Cooking {
  const code = DISHES[dish].code;
  return { dish, t: 0, notes: [...code, ...code].map((dir, i) => ({ dir, at: LEAD + i * GAP, hit: null })) };
}
/** A move pressed: the next move still to go, if it's near the line, is perfect, good or (the wrong move) missed. */
export function pressCook(c: Cooking, dir: Dir) {
  const n = c.notes.find(o => !o.hit);
  if (!n || Math.abs(n.at - c.t) > GOOD) return null;
  n.hit = n.dir !== dir ? 'miss' : Math.abs(n.at - c.t) <= PERFECT ? 'perfect' : 'good';
  return n.hit;
}
/** Time goes by: a move that's gone past the line unpressed is missed. Returns whether the cook's done. */
export function stepCooking(c: Cooking, dt: number) {
  c.t += dt;
  for (const n of c.notes) if (!n.hit && c.t - n.at > GOOD) n.hit = 'miss';
  return c.notes.every(n => n.hit);
}
export const cookScore = (c: Cooking) => c.notes.reduce((s, n) => s + (n.hit === 'perfect' ? 1 : n.hit === 'good' ? 0.5 : 0), 0) / c.notes.length;

// ---------- tickets ----------
/** What something costs now, or null when there's no more of it to buy. */
export function price(b: Buy): number | null {
  if (b.kind === 'gun') return house.guns.includes(b.gun) ? null : PRICES.gun[b.gun];
  if (b.kind === 'damage') return PRICES.damage[house.damage[b.gun] ?? 0] ?? null;
  if (b.kind === 'slot') return PRICES.slot[house.slots - 2] ?? null;
  return PRICES[b.kind][house[b.kind]] ?? null;
}
/** Buys it with tickets, if there are enough. Returns whether it did. */
export function buy(b: Buy) {
  const p = price(b);
  if (p === null || house.tickets < p) return false;
  house.tickets -= p;
  if (b.kind === 'gun') { house.guns.push(b.gun); house.gun = b.gun; }
  else if (b.kind === 'damage') house.damage[b.gun] = (house.damage[b.gun] ?? 0) + 1;
  else if (b.kind === 'slot') house.slots++;
  else house[b.kind]++;
  return true;
}
/** The tickets a run wins: one for every four zombies, one for each technique, and fifteen for getting out. */
export const ticketsFor = (run: Run) => Math.floor(run.kills / 4) + run.cooked + (run.extracted ? 15 : 0);

// ---------- the van ----------
/** Rolls the next run's specials' tickets (two different tastes each), for the van's map. */
export function rollNext(rng: () => number = dice(Date.now() >>> 0)) {
  house.next = Array.from({ length: 3 }, () => {
    const a = TASTE_LIST[Math.floor(rng() * 6)], rest = TASTE_LIST.filter(t => t !== a);
    return [a, rest[Math.floor(rng() * rest.length)]];
  });
}
/** Packs batch `i` into the van, or takes it out (as many as there are dish slots). */
export function pack(i: number) {
  if (house.packed.includes(i)) house.packed = house.packed.filter(j => j !== i);
  else if (house.packed.length < house.slots && house.batches[i]) house.packed.push(i);
}
/** Leaves in the van: the packed batches go with it (off the shelf), the upgrades into the run. */
export function depart(): { loadout: Loadout; opts: RunOptions } {
  const taken = house.packed.map(i => house.batches[i]).filter(Boolean);
  house.batches = house.batches.filter(b => !taken.includes(b));
  house.packed = [];
  return {
    loadout: { gun: house.gun, dishes: taken.map(b => b.dish), servings: taken.map(b => b.servings), quality: taken.map(b => b.quality) },
    opts: { bag: BAGS[house.cargo], hp: SUITS[house.armour], dmg: DAMAGE[house.damage[house.gun] ?? 0], tickets: house.next, intro: true },
  };
}

/** What a run brought home, for the result. */
export interface Homecoming { tickets: number; haul: number; bestHaul: boolean; bestTime: boolean; techniques: string[] }
/** The van's back (or the chef isn't): what was carried goes in the pantry and the servings left back on the shelf (only
 *  for getting out), the run's tickets and techniques go in, bests are kept, and the next run's specials are rolled. */
export function homecoming(run: Run, rng: () => number = dice(Date.now() >>> 0)): Homecoming {
  const got = haul(run), time = Math.floor(run.t), tickets = ticketsFor(run);
  const bestHaul = got > house.best.haul, bestTime = time > house.best.time;
  if (run.extracted) {
    for (const f of run.bag as Food[]) house.pantry[key(f.taste, f.grade)] = (house.pantry[key(f.taste, f.grade)] ?? 0) + 1;
    for (const c of run.cookware) house.cookware[c.name] = (house.cookware[c.name] ?? 0) + 1;
    run.loadout.dishes.forEach((dish, i) => {
      if (run.servings[i] > 0) house.batches.push({ dish, servings: run.servings[i], quality: run.quality[i] });
    });
  }
  const techniques = run.found.filter(k => !house.found.includes(k));
  house.found.push(...techniques);
  house.tickets += tickets;
  if (bestHaul) house.best.haul = got;
  if (bestTime) house.best.time = time;
  rollNext(rng);
  return { tickets, haul: got, bestHaul, bestTime, techniques };
}

// ---------- in the save ----------
/** What step 4's runs kept on the device before the safe house kept it in the save: moved over once. */
const OLD = { pantry: 'floe-market-hazard-pantry', haul: 'floe-market-hazard-haul', best: 'floe-market-hazard-best' };

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const counts = (v: unknown) => Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([, n]) => num(n) > 0).map(([k, n]) => [k, num(n)]));
const isGun = (g: unknown): g is GunId => typeof g === 'string' && g in GUNS;
const isDish = (d: unknown): d is DishId => typeof d === 'string' && d in DISHES;

/** Puts the safe house as `raw` has it (a save's, from any version), or a fresh one; a save from before it gets what the
 *  device kept from step 4's runs. */
export function loadHouse(raw: unknown) {
  const h = freshHouse();
  if (raw && typeof raw === 'object') {
    const r = raw as Partial<Record<keyof House, unknown>>;
    h.pantry = counts(r.pantry); h.cookware = counts(r.cookware);
    h.batches = (Array.isArray(r.batches) ? r.batches : [])
      .filter((b): b is Batch => !!b && isDish(b.dish) && num(b.servings) > 0)
      .map(b => ({ dish: b.dish, servings: num(b.servings), quality: num(b.quality, 1) }));
    h.tickets = num(r.tickets, h.tickets);
    const guns = (Array.isArray(r.guns) ? r.guns : []).filter(isGun);
    h.guns = guns.includes('spud') ? guns : ['spud', ...guns];
    h.gun = isGun(r.gun) && h.guns.includes(r.gun) ? r.gun : 'spud';
    h.damage = counts(r.damage) as House['damage'];
    h.slots = Math.min(4, Math.max(2, num(r.slots, 2)));
    h.cargo = Math.min(2, num(r.cargo)); h.armour = Math.min(2, num(r.armour));
    h.found = (Array.isArray(r.found) ? r.found : []).filter((k): k is string => typeof k === 'string');
    const best = (r.best ?? {}) as Record<string, unknown>;
    h.best = { haul: num(best.haul), time: num(best.time) };
    h.hinted = r.hinted === true;
    h.next = (Array.isArray(r.next) ? r.next : []).filter((t): t is Taste[] => Array.isArray(t) && t.length === 2 && t.every(x => TASTE_LIST.includes(x)));
  } else {
    try {
      const old = JSON.parse(localStorage.getItem(OLD.pantry) ?? '{}') as { food?: unknown; cookware?: unknown };
      for (const [k, n] of Object.entries(counts(old.food))) h.pantry[k] = (h.pantry[k] ?? 0) + n;
      h.cookware = counts(old.cookware);
      h.best = { haul: num(Number(localStorage.getItem(OLD.haul))), time: num(Number(localStorage.getItem(OLD.best))) };
      forgetOldHouse();
    } catch { /* no storage: a fresh house */ }
  }
  h.packed = [];
  Object.assign(house, h);
  if (!house.next.length) rollNext();
}

/** Clears what step 4's runs kept on the device (once it's in the save, or for Restart). */
export function forgetOldHouse() {
  try { for (const k of Object.values(OLD)) localStorage.removeItem(k); } catch { /* storage unavailable */ }
}

/** The safe house as the save keeps it. */
export const houseSave = (): House => JSON.parse(JSON.stringify({ ...house, packed: [] })) as House;
