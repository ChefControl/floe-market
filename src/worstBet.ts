// The player's worst bet: the most a single round at the casino boat's games has ever lost them, on what, and when,
// kept on the device. A player's idea (report 12): tease whoever made the dumbest bet. The wall of shame behind the bar
// (wallOfShame.ts) puts it up, and a signed-in player's goes online for everyone to see (cloud.ts).
import { wallet } from './wallet';

export type Game = 'roulette' | 'blackjack' | 'slots';
export interface WorstBet {
  lost: number;
  game: Game;
  /** What it was on, if it was on something (roulette's red, black or green). */
  on?: string;
  /** Whether it left them with nothing. */
  broke: boolean;
  /** When it was (ms since 1970). */
  at: number;
}

const KEY = 'floe-market-worst-bet';
const GAMES: readonly string[] = ['roulette', 'blackjack', 'slots'];

function read(): WorstBet | null {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) ?? 'null') as WorstBet | null;
    return w && typeof w.lost === 'number' && w.lost > 0 && GAMES.includes(w.game) && typeof w.at === 'number' ? w : null;
  } catch { return null; }
}
let worst = read();
/** Called with each new worst bet. */
const watchers: ((w: WorstBet) => void)[] = [];

/** The player's worst bet ever, or null if they've never lost a round. */
export const worstBet = () => worst;
/** Calls `f` whenever the player makes a worse bet than ever before. */
export const onWorse = (f: (w: WorstBet) => void) => { watchers.push(f); };

/** A round at one of the boat's games is over: what it staked in all and what it paid back. Keeps it if it's the most
 *  ever lost in one round. True if it is. */
export function scoreBet(game: Game, staked: number, paid: number, on?: string) {
  const lost = staked - paid;
  if (lost <= 0 || (worst && worst.lost >= lost)) return false;
  worst = { lost, game, ...(on ? { on } : {}), broke: wallet.money <= 0, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(worst)); } catch { /* kept for this visit */ }
  for (const f of watchers) f(worst);
  return true;
}

/** What it was on, for the wall: "on Black", "at the slots", "at blackjack". */
export function betOn(b: { game: Game; on?: string }) {
  if (b.on) return `on ${b.on[0].toUpperCase()}${b.on.slice(1)}`;
  return b.game === 'slots' ? 'at the slots' : `at ${b.game}`;
}

/** For tests: forgets it. */
export function forgetWorst() {
  worst = null;
  try { localStorage.removeItem(KEY); } catch { /* nothing kept */ }
}
