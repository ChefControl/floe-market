// What things sell for, and how that grows. The economy follows idle games: upgrade prices grow exponentially
// (see the price list in unlocks.ts), and each stage has three repeatable upgrades, bought at its upgrade square
// (shop.ts): sale prices, how many customers come, and how fast things are made. Income grows exponentially too, but
// a little slower than prices, so each purchase takes a bit longer than the last until the stage's next big
// unlock. Each stage ends on an expensive capstone that takes most of your savings, and the next starts again
// from a few sales, with numbers about ten times bigger.

/** Base prices: stage 1's fish (walk-up counter, sled window), stage 2's plates and takeout boxes. */
export const FISH_PRICE = { walk: 4, sled: 6 };
export const SUSHI_PRICE = { plate: 30, box: 35 };
/** The premium menu's multiplier on sushi prices. */
export const PREMIUM = 1.6;

export type ModId = 'fillets' | 'marketing' | 'training' | 'specials' | 'promo' | 'crew' | 'fertilizer';
export interface Mod {
  id: ModId;
  stage: 1 | 2;
  kind: 'price' | 'customers' | 'speed' | 'growth';
  /** Bought at the fertilizer shed by the water wheel (shed.ts) rather than the upgrade square. */
  shed?: boolean;
  icon: string;
  name: string;
  /** What a level does, in a few words. */
  what: string;
  /** Names for each level (marketing campaigns), if they have them. */
  levels?: string[];
  /** Each level multiplies its effect by this. */
  per: number;
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
  { id: 'training', stage: 1, kind: 'speed', icon: '💪', name: 'Crew training', what: 'Fishing and chopping go faster', per: 1.15, cost: 80, step: 1.75, max: 8 },
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
    per: 1.2, cost: 20000, step: 2, max: 3,
  },
];
export const MOD = Object.fromEntries(MODS.map(m => [m.id, m])) as Record<ModId, Mod>;

/** Levels bought of each. */
export const mods: Record<ModId, number> = { fillets: 0, marketing: 0, training: 0, specials: 0, promo: 0, crew: 0, fertilizer: 0 };

/** How much an upgrade multiplies its effect by now (1 before the first level). */
export const boost = (id: ModId) => MOD[id].per ** mods[id];
/** The next level's price, or null when there are no more. */
export const modCost = (id: ModId) => {
  const m = MOD[id];
  return m.max !== undefined && mods[id] >= m.max ? null : Math.round(m.cost * m.step ** mods[id]);
};
/** A base price times multipliers, in whole dollars. */
export const priced = (base: number, k: number) => Math.round(base * k);
