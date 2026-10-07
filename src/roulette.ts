// European roulette rules: one zero, 37 pockets. Kept free of game state so they're easy to test.

/** Pocket order around the wheel, clockwise from zero. */
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = 'red' | 'black' | 'green';
export const colorOf = (n: number): PocketColor => n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';

export type EvenBet = 'red' | 'black' | 'odd' | 'even' | 'low' | 'high';
export type Bet = { kind: EvenBet } | { kind: 'number'; n: number };

export function wins(bet: Bet, n: number): boolean {
  switch (bet.kind) {
    case 'number': return n === bet.n;
    case 'red': case 'black': return colorOf(n) === bet.kind;
    case 'odd': return n % 2 === 1;
    case 'even': return n !== 0 && n % 2 === 0;
    case 'low': return n >= 1 && n <= 18;
    case 'high': return n >= 19;
  }
}

/** What a winning bet returns per unit staked, stake included (single number pays 35 to 1). */
export const multiplier = (bet: Bet) => bet.kind === 'number' ? 36 : 2;

/** Total returned for a bet on pocket `n`: stake × multiplier on a win, 0 on a loss. */
export const payout = (bet: Bet, stake: number, n: number) => wins(bet, n) ? stake * multiplier(bet) : 0;

/** Picks the winning pocket. */
export const spinWheel = (rng: () => number = Math.random) => WHEEL[Math.floor(rng() * WHEEL.length)];
