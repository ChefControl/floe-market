// Features still being made, kept from players until they're ready. Stage 3 (Mr. Fugu's hatch in the dock and the
// ring under it) is on in the dev server, the tests and the playtest build (VITE_FUGU_DEMO=1); in the live game, only
// on a device switched on by opening it with ?stage3=on in the address (?stage3=off switches it back off). A save
// that's already been down there switches it on too, so a game played on one device carries on on another.
// VITE_STAGE3=on or off at build time overrides the build's own default (a playtest of the live game: off).
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
