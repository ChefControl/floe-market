// The worst bet today, for the sign by the corner of tears (casinoRestroom.ts): the most a single round at the casino
// boat's games has lost the player today, and on what, kept on the device till the day's out. A player's idea (report
// 12): once a day, tease whoever made the dumbest bet. It's only ever the player's own.
import { wallet } from './wallet';

export type Game = 'roulette' | 'blackjack' | 'slots';
export interface WorstBet {
  /** The day it was, on the player's own calendar (`today`). */
  day: string;
  lost: number;
  game: Game;
  /** What it was on, if it was on something (roulette's red, black or green). */
  on?: string;
  /** Whether it left them with nothing. */
  broke: boolean;
}

const KEY = 'floe-market-worst-bet';
/** Today, on the player's own calendar. */
export const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function read(): WorstBet | null {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) ?? 'null') as WorstBet | null;
    return w && typeof w.day === 'string' && typeof w.lost === 'number' && w.lost > 0 ? w : null;
  } catch { return null; }
}
let worst = read();

/** Today's worst bet, or null if nothing's been lost today. */
export const worstToday = () => (worst && worst.day === today() ? worst : null);

/** A round at one of the boat's games is over: what it staked in all and what it paid back. Keeps it if it's the most
 *  lost today. True if it is. */
export function scoreBet(game: Game, staked: number, paid: number, on?: string) {
  const lost = staked - paid, now = worstToday();
  if (lost <= 0 || (now && now.lost >= lost)) return false;
  worst = { day: today(), lost, game, ...(on ? { on } : {}), broke: wallet.money <= 0 };
  try { localStorage.setItem(KEY, JSON.stringify(worst)); } catch { /* kept for this visit */ }
  return true;
}

/** For tests: forgets it. */
export function forgetWorst() {
  worst = null;
  try { localStorage.removeItem(KEY); } catch { /* nothing kept */ }
}
