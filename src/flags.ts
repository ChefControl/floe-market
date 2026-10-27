// Features that can be kept from players. Stage 3 (Mr. Fugu's hatch in the dock and the ring under it) is on in the
// dev server, the tests and the playtest build (VITE_FUGU_DEMO=1), and in the live game, which deploy.yml builds with
// VITE_STAGE3=on (VITE_STAGE3=on or off at build time overrides the build's own default, which is off). In a build
// with it off, a device is switched on by opening it with ?stage3=on in the address (?stage3=off switches it back
// off). A save that's already been down there switches it on too, so a game played on one device carries on on
// another, and keeps it if stage 3 is ever taken back.
const KEY = 'floe-market-stage3';

const built = import.meta.env.VITE_STAGE3 as string | undefined;
let on = built ? built === 'on' : import.meta.env.DEV || import.meta.env.VITE_FUGU_DEMO === '1';
try {
  const asked = new URLSearchParams(location.search).get('stage3');
  if (asked === 'on') localStorage.setItem(KEY, '1');
  if (asked === 'off') localStorage.removeItem(KEY);
  on ||= localStorage.getItem(KEY) === '1';
} catch { /* storage unavailable: as built */ }

/** Whether stage 3 is open on this device. */
export const stage3On = () => on;

/** Switches stage 3 on for this device, for good (a save that's been down there). */
export function keepStage3() {
  if (on) return;
  on = true;
  try { localStorage.setItem(KEY, '1'); } catch { /* on for this visit */ }
}

// ---------- the voting boat ----------
/** Israel's election day, 27 October 2026: the voting boat (votingBoat.ts) sails in to the dock when the game opens on
 *  it, by the device's own date, and sails away when it ends. */
export const ELECTION_DAYS = { from: '2026-10-27', to: '2026-10-27' };

/** ?vote= in the address: `on` brings the boat in on any date, for a look at it; `bye` too, and it sails away a minute
 *  after it's moored, for a look at that (for that visit only: nothing's kept). */
export function voteParam() {
  try { return new URLSearchParams(location.search).get('vote'); } catch { return null; } // no address: by date
}

/** Whether `now` is on election day, by the device's own date. */
export function electionDay(now = new Date()) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return day >= ELECTION_DAYS.from && day <= ELECTION_DAYS.to;
}

/** Whether the voting boat comes in, opening the game on `now`: on election day, or with ?vote=on or bye. */
export function votingBoatOn(now = new Date()) {
  const v = voteParam();
  return v === 'on' || v === 'bye' || electionDay(now);
}
