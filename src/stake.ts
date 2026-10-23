// The yardstick the Undertow's hosts measure the player by (stage 3): the next boss's stake (fight.ts's BOSSES), about
// a minute of what the stall takes in his stretch on the tuned run. It moves only when a boss is beaten, never with
// how the last few minutes went (boss prizes and rushes come in lumps), and it's held from when the player walks into
// the Undertow, so nothing changes under them mid-deal. Tommy's table takes up to one (monte.ts), Harry lends up to
// five (loan.ts), and Eddie charges the boss's own a tenth (fight.ts's fixFee).
import { BOSSES, nextBoss } from './fight';

/** The stake now, in chips: the next boss's, or (all of them beaten) the last one's. */
export const stakeNow = () => (nextBoss() ?? BOSSES[BOSSES.length - 1]).stake;
/** The stake as it was when the player walked in (holdStake). */
let held: number | null = null;
/** Works out the stake and holds it there (on walking into the Undertow: loanDesk.ts). */
export function holdStake() { held = stakeNow(); return held; }
/** The stake the hosts go by, in chips: as it was held, or now if it never was. */
export const heldStake = () => held ?? holdStake();
