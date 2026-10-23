// The front: in stage 3, Floe Sushi upstairs carries on as the respectable face of the ring under the dock. Its diners
// still eat and its crew still works, but until the player buys Mr. Fugu out, its takings are his: the ring's rent.
// The playtest tries a second way of doing it, switched with ?front=trickle in the page's address (in the dev server and
// the demo build only): a slow trickle of the takings (laundered money) reaches the till instead of none. Reviews of the
// restaurant stop counting in stage 3: upstairs just ticks over for Mr. Fugu while the player's below, where there's no
// rating at all.
import { stage } from './layout';
import { addReview } from './rating';
import { addMoney } from './wallet';

export type FrontMode = 'rent' | 'trickle';
/** How much of the takings the trickle lets through. */
export const TRICKLE = 0.2;

export const front = {
  mode: (readMode() as FrontMode),
  /** Mr. Fugu has been bought out: the till is the player's again. */
  boughtOut: false,
  /** The cash the player had upstairs when they bought into the ring. It waits in the restaurant's till, out of reach,
   *  till they buy Mr. Fugu out: the cellar starts from no chips, whatever stage 2 made. */
  till: 0,
};

function readMode(): FrontMode {
  // (a playtest switch: the live game is always rent)
  if (!import.meta.env.DEV && import.meta.env.MODE !== 'demo') return 'rent';
  try { return new URLSearchParams(location.search).get('front') === 'trickle' ? 'trickle' : 'rent'; } catch { return 'rent'; }
}

/** The share of the restaurant's and the kiosk's takings that reaches their tills, 0 to 1. */
export function tillShare() {
  if (stage.n < 3 || front.boughtOut) return 1;
  return front.mode === 'trickle' ? TRICKLE : 0;
}

/** Bills for `values`, cut down to what reaches the till (none at all, while it's all rent). */
export const toTill = (values: number[]) => {
  for (const v of values) taken += v;
  const k = tillShare();
  return k === 1 ? values : values.map(v => Math.round(v * k)).filter(v => v > 0);
};

// ---------- with the player down in the cellar ----------
// While the player's down in the cellar, the world up top holds still and isn't drawn (game.ts, levelCull.ts), as the
// cellar does while they're up there (ring.ts). What its tills would take comes in at a steady rate instead: what its
// customers have paid a second, over the last few minutes it was running, of which the player's share (tillShare:
// none while it's Mr. Fugu's rent, all of it once he's bought out). Not kept in the save: a game loaded in the cellar
// pays from the tills once it's been up top for a while.
/** Dollars paid at the tills up top since the last second's count; each second's, over the last WINDOW; and what's
 *  owed the player down below. */
let taken = 0, takenT = 0, owed = 0;
const seconds: number[] = [], WINDOW = 180;
/** Dollars a second the tills up top take, by the last few minutes up there. */
export const tillRate = () => (seconds.length ? seconds.reduce((a, b) => a + b, 0) / seconds.length : 0);
/** Each frame, `away` while the world up top's holding still: counts what its tills take while it runs, or pays the
 *  player their share of that rate while it doesn't. */
export function updTills(dt: number, away: boolean) {
  if (!away) {
    owed = 0;
    if ((takenT += dt) < 1) return;
    takenT -= 1;
    seconds.push(taken); taken = 0;
    if (seconds.length > WINDOW) seconds.shift();
    return;
  }
  owed += tillRate() * tillShare() * dt;
  if (owed < 1) return;
  const whole = Math.floor(owed);
  addMoney(whole); owed -= whole;
}

/** A customer's review of the restaurant or the kiosk: it only counts before the ring. */
export function frontReview(stars: number) {
  if (stage.n < 3) addReview(stars);
}
