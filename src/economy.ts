// What things sell for, and how that grows. The economy follows idle games: upgrade prices grow exponentially
// (see the price list in unlocks.ts), and each stage has three repeatable upgrades, bought at its upgrade square
// (shop.ts): sale prices, how many customers come, and how fast things are made. Income grows exponentially too, but
// a little slower than prices, so each purchase takes a bit longer than the last until the stage's next big
// unlock. Each stage ends on an expensive capstone that takes most of your savings, and the next starts again
// from a few sales, with numbers about ten times bigger.
import type { UnlockId } from './unlocks';

import type { StageN } from './layout';

/** Base prices: stage 1's fish (walk-up counter, sled window), stage 2's plates and takeout boxes. */
export const FISH_PRICE = { walk: 4, sled: 6 };
export const SUSHI_PRICE = { plate: 30, box: 35 };
/** The premium menu's multiplier on sushi prices. */
export const PREMIUM = 1.6;

export type ModId = 'fillets' | 'marketing' | 'training' | 'specials' | 'promo' | 'crew' | 'fertilizer' | 'bowls' | 'street' | 'cellarcrew';
export interface Mod {
  id: ModId;
  stage: StageN;
  kind: 'price' | 'customers' | 'speed' | 'growth';
  /** Bought at the fertilizer shed by the water wheel (shed.ts) rather than the upgrade square. */
  shed?: boolean;
  /** On sale only once this is bought: crew training needs a crew to train. */
  needs?: UnlockId;
  icon: string;
  name: string;
  /** What a level does, in a few words. */
  what: string;
  /** Names for each level (marketing campaigns), if they have them. */
  levels?: string[];
  /** Each level multiplies its effect by this (or, if `add`, adds this much less one of the base). */
  per: number;
  add?: boolean;
  /** The first level's price, and how much dearer each level is than the last. */
  cost: number;
  step: number;
  /** The most levels there are, if there's a limit. */
  max?: number;
}

/**
 * The repeatable upgrades, three a stage: a better product (sale prices), marketing (customers) and the crew
 * (how fast things are made). Prices have no limit; customers and speed stop where the game would stop keeping up.
 */
export const MODS: Mod[] = [
  { id: 'fillets', stage: 1, kind: 'price', icon: '🐟', name: 'Fine fillets', what: 'Fish sells for more', per: 1.25, cost: 40, step: 1.6 },
  {
    id: 'marketing', stage: 1, kind: 'customers', icon: '📣', name: 'Marketing', what: 'More customers, and longer queues',
    levels: ['Posters', 'Flyers', 'Radio ad', 'Social media', 'Billboard', 'Food blogger', 'Newspaper', 'TV ad'],
    per: 1.2, cost: 60, step: 1.75, max: 8,
  },
  { id: 'training', stage: 1, kind: 'speed', icon: '💪', name: 'Crew training', what: 'Fishing, chopping and the runners go faster', needs: 'runner', per: 1.15, cost: 80, step: 1.75, max: 8 },
  { id: 'specials', stage: 2, kind: 'price', icon: '🍣', name: "Chef's specials", what: 'Sushi sells for more', per: 1.25, cost: 500, step: 1.6 },
  {
    id: 'promo', stage: 2, kind: 'customers', icon: '📣', name: 'Marketing', what: 'More diners and drivers',
    levels: ['Menu boards', 'Lantern signs', 'Social media', 'Food critic', 'Magazine', 'Cooking show', 'Gourmet guide', 'World famous'],
    per: 1.2, cost: 800, step: 1.75, max: 8,
  },
  { id: 'crew', stage: 2, kind: 'speed', icon: '🧑‍🍳', name: 'Kitchen crew', what: 'Chefs, the runners and the farm work faster', per: 1.15, cost: 1000, step: 1.75, max: 8 },
  // Once all three terraces are planted there's nowhere left to grow more rice, and the takeout kiosk eats into it:
  // the fertilizer shed (open with the kiosk) makes the terraces ripen faster instead.
  {
    id: 'fertilizer', stage: 2, kind: 'growth', shed: true, icon: '🌿', name: 'Rice fertilizer', what: 'Rice ripens faster on the terraces',
    levels: ['Compost', 'Fish meal', 'Spring minerals'],
    per: 1.5, cost: 20000, step: 2, max: 3,
  },
  // stage 3, down in the cellar, priced in Fugu Chips (1 chip is $1,000): Pricier bowls adds a quarter of the base
  // price a level (fight.ts's listPrice), rather than multiplying it; like the other two, eight levels, two opened by
  // each boss (shopTree.ts's levelGate)
  { id: 'bowls', stage: 3, kind: 'price', icon: '🏷️', name: 'Pricier bowls', what: 'Each level adds 25% of a bowl\'s base price', per: 1.25, cost: 30_000, step: 1.6, add: true, max: 8 },
  {
    id: 'street', stage: 3, kind: 'customers', icon: '🔨', name: 'Fix up the arena', what: 'Each level fixes the arena up, and more fans come',
    // (named for how the arena's dressed up as the word gets round: cellarLooks.ts)
    levels: ['Scrap walls', 'Sawdust & pallets', 'Fixed up', 'Banners', 'Stone floor', 'Panelled hall', 'Purple seats', 'Tournament dohyo'],
    per: 1.105, cost: 20_000, step: 1.75, max: 8,
  },
  {
    id: 'cellarcrew', stage: 3, kind: 'speed', icon: '🧑‍🍳', name: 'Cellar crew', what: 'Hires walk and work faster',
    levels: ['Rags', 'Work clothes', 'Plaster walls', 'Crest hangings', 'Warm lamps', 'Chef whites', 'Stone floor', 'Panelled hall'],
    per: 1.12, cost: 150_000, step: 1.45, max: 8,
  },
];
export const MOD = Object.fromEntries(MODS.map(m => [m.id, m])) as Record<ModId, Mod>;

/** Levels bought of each. */
export const mods: Record<ModId, number> = { fillets: 0, marketing: 0, training: 0, specials: 0, promo: 0, crew: 0, fertilizer: 0, bowls: 0, street: 0, cellarcrew: 0 };

/** How much an upgrade multiplies its effect by now (1 before the first level). */
export const boost = (id: ModId) => (MOD[id].add ? 1 + (MOD[id].per - 1) * mods[id] : MOD[id].per ** mods[id]);
/** The next level's price, or null when there are no more. */
export const modCost = (id: ModId) => {
  const m = MOD[id];
  return m.max !== undefined && mods[id] >= m.max ? null : Math.round(m.cost * m.step ** mods[id]);
};
/** A base price times multipliers, in whole dollars. */
export const priced = (base: number, k: number) => Math.round(base * k);
