// Slot machine rules: three reels on one strip of 20 symbols, one pay line across the middle. Three of a kind pays
// by the symbol, and two cherries pay double, for a return of about 97% (like the roulette wheel's). A round is played
// here, free of the machine and the wallet, so it's easy to test: the machine animates it and applies the money it moves.
import type { Moves } from './round';

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

/** What a line returns per unit staked, stake included; 0 for nothing. */
export function lineMultiplier(syms: readonly Sym[]) {
  if (syms.every(s => s === syms[0])) return THREE[syms[0]];
  return syms.filter(s => s === '🍒').length === 2 ? TWO_CHERRIES : 0;
}

/**
 * One pull of the machine. Where the reels stop is picked as the round starts, so the win is known (and owed) from
 * the first moment; it's paid when the round settles: when the last reel stops, or at once if the player walks away.
 */
export interface SlotsRound {
  readonly stake: number;
  /** Where each reel stops on the strip. */
  readonly stops: readonly number[];
  /** The symbols on the pay line. */
  readonly line: readonly Sym[];
  /** What the round returns, stake included: 0 for nothing. */
  readonly win: number;
  /** Pays out what's owed. Settling again pays nothing more. */
  settle(): Moves;
}

/**
 * Starts a round of `stake` for a player holding `cash`, with the reels stopped by `rng` (left to right). Returns the
 * round and the money starting it moves, or null if the stake is nothing or more than the player has.
 */
export function startRound(stake: number, cash: number, rng: () => number = Math.random): { round: SlotsRound; moves: Moves } | null {
  if (!(stake > 0 && stake <= cash)) return null;
  const stops = [0, 1, 2].map(() => Math.floor(rng() * REEL.length));
  const line = stops.map(i => REEL[i]);
  const win = stake * lineMultiplier(line);
  let owed = win;
  const settle = (): Moves => { const pay = owed; owed = 0; return { owed: 0, pay }; };
  return { round: { stake, stops, line, win, settle }, moves: { take: stake, owed } };
}
