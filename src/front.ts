// The front: in stage 3, Floe Sushi upstairs carries on as the respectable face of the ring under the dock. Its diners
// still eat and its crew still works, but until the player buys Mr. Fugu out, its takings are his: the ring's rent.
// The playtest tries a second way of doing it, switched with ?front=trickle in the page's address: a slow trickle of
// the takings (laundered money) reaches the till instead of none. Reviews of the restaurant stop counting in stage 3:
// upstairs just ticks over for Mr. Fugu while the player's below, where there's no rating at all.
import { stage } from './layout';
import { addReview } from './rating';

export type FrontMode = 'rent' | 'trickle';
/** How much of the takings the trickle lets through. */
export const TRICKLE = 0.2;

export const front = {
  mode: (readMode() as FrontMode),
  /** Mr. Fugu has been bought out: the till is the player's again. */
  boughtOut: false,
};

function readMode(): FrontMode {
  try { return new URLSearchParams(location.search).get('front') === 'trickle' ? 'trickle' : 'rent'; } catch { return 'rent'; }
}

/** The share of the restaurant's and the kiosk's takings that reaches their tills, 0 to 1. */
export function tillShare() {
  if (stage.n < 3 || front.boughtOut) return 1;
  return front.mode === 'trickle' ? TRICKLE : 0;
}

/** Bills for `values`, cut down to what reaches the till (none at all, while it's all rent). */
export const toTill = (values: number[]) => {
  const k = tillShare();
  return k === 1 ? values : values.map(v => Math.round(v * k)).filter(v => v > 0);
};

/** A customer's review of the restaurant or the kiosk: it only counts before the ring. */
export function frontReview(stars: number) {
  if (stage.n < 3) addReview(stars);
}
