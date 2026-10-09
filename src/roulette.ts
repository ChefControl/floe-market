// European roulette rules: one zero, 37 pockets. The casino boat's table takes colour bets only: red or black at
// even money, or green (the zero) at 35 to 1. Kept free of game state so they're easy to test.

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

export const wins = (bet: Bet, n: number) => colorOf(n) === bet;

/** What a winning bet returns per unit staked, stake included (green, a single pocket, pays 35 to 1). */
export const multiplier = (bet: Bet) => bet === 'green' ? 36 : 2;

/** Total returned for a bet on pocket `n`: stake × multiplier on a win, 0 on a loss. */
export const payout = (bet: Bet, stake: number, n: number) => wins(bet, n) ? stake * multiplier(bet) : 0;

/** Picks the winning pocket. */
export const spinWheel = (rng: () => number = Math.random) => WHEEL[Math.floor(rng() * WHEEL.length)];
