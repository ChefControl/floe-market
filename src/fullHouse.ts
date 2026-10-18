// The yardstick the Undertow's hosts measure the player by (stage 3): what a local fight takes at a full house, its
// fans with a plain bowl each, at what a bowl sells for now. It only moves with an upgrade, and it's worked out as the
// player walks into the Undertow and held while they're in, so nothing changes under them mid-deal. Harry lends up to
// four of them (loan.ts), Tommy plays up to one (monte.ts).
import { bowlPrice, crowdNow } from './fight';

/** A local fight's takings at a full house now, in chips. */
export const fullFight = () => crowdNow() * bowlPrice(false);
/** The full house as it was when the player walked in (holdFullHouse). */
let held: number | null = null;
/** Works out the full house and holds it there (on walking into the Undertow: loanDesk.ts). */
export function holdFullHouse() { held = fullFight(); return held; }
/** The full house the hosts go by, in chips: as it was held, or now if it never was. */
export const heldFight = () => held ?? holdFullHouse();
