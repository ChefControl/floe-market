// Hammerhead Harry's loans (stage 3, the Undertow): the rules, on the cellar's state (fight.ts's F.den.loan); his desk
// (loanDesk.ts) is where they're made. He lends up to two bouts' takings at a full house (the fans a local bout brings
// in, a plain bowl each: it only moves when an upgrade does), worked out as you walk into the Undertow and held there
// while you're in. You pay back a fifth again on top, and he takes it out of your sales as they come in: three chips
// in every ten the stall takes (ring.ts), till it's paid. No deadline; pay off what's left at his desk any time. One
// loan at a time. The balance bot never borrows, so none of this touches its run.
import { bowlPrice, crowdNow, F } from './fight';

/** What's paid back for each chip lent; the share of the stall's sales he takes till it's paid; and how many bouts'
 *  takings at a full house he'll lend, at most. */
export const INTEREST = 1.2, SHARE = 0.3, BOUTS = 2;
/** The least he lends, and the steps a loan goes up in (in chips). */
export const LOAN_FLOOR = 10, LOAN_STEP = 5;

const L = () => F.den.loan;
/** What's owed now, in chips (0: nothing), and what was owed when the loan was made. */
export const owed = () => L().owed;
export const owedAtFirst = () => L().total;
/** A local bout's takings at a full house: its fans, a plain bowl each, at what a bowl sells for now. */
export const fullBout = () => crowdNow() * bowlPrice(false);

/** The most he'll lend, as it was worked out when you walked in (freezeLimit), in chips. */
let limit: number | null = null;
/** Works out the most he'll lend, and holds it there (on walking into the Undertow: loanDesk.ts). */
export function freezeLimit() {
  limit = Math.max(LOAN_FLOOR, Math.floor(BOUTS * fullBout() / LOAN_STEP) * LOAN_STEP);
  return limit;
}
export const maxLoan = () => limit ?? freezeLimit();
/** What a loan of `lent` chips is paid back with. */
export const payBack = (lent: number) => Math.ceil(lent * INTEREST);
/** Whether he'll lend `n` chips: nothing owed, and no more than his limit. */
export const canBorrow = (n: number) => L().owed <= 0 && n >= LOAN_FLOOR && n <= maxLoan();

/** Takes out a loan of `n` chips: what's lent (0 if he won't), with a fifth again on top owed. */
export function borrow(n: number) {
  n = Math.round(n);
  if (!canBorrow(n)) return 0;
  L().owed = L().total = payBack(n);
  return n;
}
/** Pays off what's still owed, given `have` chips to do it with: what was paid (0 if it's not enough, or nothing's owed). */
export function repay(have: number) {
  const due = L().owed;
  if (due <= 0 || have < due) return 0;
  L().owed = L().total = 0;
  return due;
}
/** His share of `chips` the stall's just taken, while something's owed: three in ten, up to what's still owed. */
export function collect(chips: number) {
  if (L().owed <= 0 || chips <= 0) return 0;
  const take = Math.min(L().owed, chips * SHARE);
  L().owed -= take;
  if (L().owed < 1e-6) L().owed = L().total = 0;
  return take;
}
