// European roulette: one zero, 37 pockets. The casino boat's table takes colour bets only: red or black at even
// money, or green (the zero) at 35 to 1. A round is played here, free of the table and the wallet, so it's easy to
// test: the table animates it and applies the money it moves.

/** Pocket order around the wheel, clockwise from zero. */
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = 'red' | 'black' | 'green';
export const colorOf = (n: number): PocketColor => n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';

/** A bet is the colour the ball should land on. */
export type Bet = PocketColor;

/** What a winning bet returns per unit staked, stake included (green, a single pocket, pays 35 to 1). */
export const multiplier = (bet: Bet) => bet === 'green' ? 36 : 2;

/**
 * The money a round moves, for whoever holds the wallet to apply: `take` comes out of the player's cash, `pay` goes
 * back into it, and `owed` is what the round has won but not yet shown (a save counts it as cash), as it stands now.
 */
export interface Moves { take?: number; owed?: number; pay?: number }

/**
 * One roulette round. The pocket is picked as the round starts, so the win is known (and owed) from the first moment;
 * it's paid when the round settles: when the ball has landed, or at once if the player walks away.
 */
export interface RouletteRound {
  readonly bet: Bet;
  readonly stake: number;
  /** The winning pocket. */
  readonly pocket: number;
  /** What the round returns, stake included: 0 on a loss. */
  readonly win: number;
  /** Pays out what's owed. Settling again pays nothing more. */
  settle(): Moves;
}

/**
 * Starts a round of `stake` on `bet` for a player holding `cash`, with the wheel spun by `rng`. Returns the round and
 * the money starting it moves, or null if the stake is nothing or more than the player has.
 */
export function startRound(bet: Bet, stake: number, cash: number, rng: () => number = Math.random): { round: RouletteRound; moves: Moves } | null {
  if (!(stake > 0 && stake <= cash)) return null;
  const pocket = WHEEL[Math.floor(rng() * WHEEL.length)];
  const win = colorOf(pocket) === bet ? stake * multiplier(bet) : 0;
  let owed = win;
  const settle = (): Moves => { const pay = owed; owed = 0; return { owed: 0, pay }; };
  return { round: { bet, stake, pocket, win, settle }, moves: { take: stake, owed } };
}
