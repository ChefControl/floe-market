// Three-Card Tommy's monte (the Undertow, stage 3): three cards face down on his table, one of them the queen. He shows
// her, turns her down and swaps the cards about, and you tap where she went: find her and he pays half again. His game
// is straight, the queen's always on the table; the catch is his hands, quicker the more you stake: 4 slow swaps for a
// little, a blur of 12 at his table's limit. The house wins unless you find her two times in three. A round is played here, free of the table and the wallet, so it's easy to
// test: the table animates it and applies the money it moves. The swaps are rolled outside the cellar's fight sim, so
// the gong's forecast never sees them.
import type { Moves } from './round';

/** What finding the queen returns per chip staked, stake included. */
export const WIN = 1.5;
/** Swaps at the smallest stake, and at the table's limit. */
export const SWAPS = { min: 4, max: 12 };
/** Rounds he'll play with you a bout. */
export const ROUNDS = 3;
/** His table's limit: one fight's takings at a full house (fullHouse.ts), in steps of this many chips, and never less
 *  than this many. */
export const LIMIT_FIGHTS = 1, LIMIT_STEP = 5, LIMIT_FLOOR = 20;
/** Where the queen starts: in the middle, where he shows her. */
export const START = 1;

/** His table's limit, in chips, for a player whose fights take `fullFight` chips at a full house. */
export const limitFor = (fullFight: number) => Math.max(LIMIT_FLOOR, Math.floor(LIMIT_FIGHTS * fullFight / LIMIT_STEP) * LIMIT_STEP);
/** How many swaps he makes for `stake` at a table whose limit is `limit` (both in the same money). */
export const swapsFor = (stake: number, limit: number) =>
  SWAPS.min + Math.round((SWAPS.max - SWAPS.min) * Math.max(0, Math.min(1, stake / Math.max(1, limit))));

/** The three ways to swap two of the three places: left and middle, middle and right, the ends. */
const PAIRS: readonly (readonly [number, number])[] = [[0, 1], [1, 2], [0, 2]];

/** One round. The swaps (and so where she ends up) are picked as it starts; what it pays waits on the player's pick. */
export interface MonteRound {
  readonly stake: number;
  /** The places he swaps, in order. */
  readonly swaps: readonly (readonly [number, number])[];
  /** Where the queen is once he's done. */
  readonly queen: number;
  /** The place the player picked, or -1 till they do. */
  readonly picked: number;
  /** Picks place `i` (0 left, 1 middle, 2 right) and settles: what it pays. A second pick pays nothing more. */
  pick(i: number): Moves;
  /** Whether the player found her (false till they pick). */
  readonly won: boolean;
}

/**
 * Starts a round of `stake` for a player holding `cash` at a table whose limit is `limit`, with the swaps picked by
 * `rng`. Returns the round and the money starting it moves, or null if the stake is nothing, more than the player has,
 * or over the limit.
 */
export function startRound(stake: number, cash: number, limit: number, rng: () => number = Math.random): { round: MonteRound; moves: Moves } | null {
  if (!(stake > 0 && stake <= cash && stake <= limit)) return null;
  const swaps = Array.from({ length: swapsFor(stake, limit) }, () => PAIRS[Math.min(2, Math.floor(rng() * 3))]);
  let queen = START;
  for (const [a, b] of swaps) queen = queen === a ? b : queen === b ? a : queen;
  let picked = -1;
  const round: MonteRound = {
    stake, swaps, queen,
    get picked() { return picked; },
    get won() { return picked === queen; },
    pick(i) {
      if (picked >= 0 || !(i >= 0 && i <= 2)) return {};
      picked = Math.floor(i);
      return { pay: picked === queen ? stake * WIN : 0 };
    },
  };
  return { round, moves: { take: stake } };
}

/** Where each card is after the first `n` swaps: `at[c]` is card c's place (card 1 is the queen; all start in order). */
export function placesAfter(swaps: readonly (readonly [number, number])[], n: number) {
  const at = [0, 1, 2];
  for (const [a, b] of swaps.slice(0, n)) {
    const ca = at.indexOf(a), cb = at.indexOf(b);
    at[ca] = b; at[cb] = a;
  }
  return at;
}
