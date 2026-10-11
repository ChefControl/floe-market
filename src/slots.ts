// Slot machine rules: three reels on one strip of 20 symbols, one pay line across the middle. Three of a kind pays
// by the symbol, and two cherries pay double, for a return of about 97% (like the roulette wheel's).
// Kept free of game state so they're easy to test.

export type Sym = '🍒' | '🍋' | '🔔' | '🐟' | '💎' | '7';

/** Each reel's strip, top to bottom: 6 cherries, 5 lemons, 4 bells, 3 fish, a diamond and a seven, spread out. */
export const REEL: readonly Sym[] = [
  '🍒', '🍋', '🔔', '🍒', '🐟', '🍋', '🍒', '🔔', '7', '🍒',
  '🍋', '🐟', '🍒', '🔔', '🍋', '💎', '🍒', '🐟', '🔔', '🍋',
];

/** What three of a kind returns per unit staked, stake included. */
export const THREE: Record<Sym, number> = { '7': 100, '💎': 50, '🐟': 25, '🔔': 15, '🍋': 10, '🍒': 8 };
/** Two cherries on the line (and something else). */
export const TWO_CHERRIES = 2;

/** The symbols on the pay line for reels stopped at `stops`. */
export const line = (stops: readonly number[]) => stops.map(i => REEL[i]);

/** What a line returns per unit staked, stake included; 0 for nothing. */
export function lineMultiplier(syms: readonly Sym[]) {
  if (syms.every(s => s === syms[0])) return THREE[syms[0]];
  return syms.filter(s => s === '🍒').length === 2 ? TWO_CHERRIES : 0;
}

/** Total returned for `stake` with the reels stopped at `stops`. */
export const payout = (stops: readonly number[], stake: number) => stake * lineMultiplier(line(stops));

/** Where the three reels stop. */
export const pull = (rng: () => number = Math.random) => [0, 1, 2].map(() => Math.floor(rng() * REEL.length));
