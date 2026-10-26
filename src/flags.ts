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

// Cooking Hazard's arcade cabinet on the casino yacht (casinoArcade.ts), while its game is being built: on in the dev
// server, the tests and the playtest build (VITE_FUGU_DEMO=1), off in the live game (VITE_ARCADE=on or off at build
// time overrides that). A device switches it on with ?arcade=on in the address, for good (?arcade=off switches it back
// off). With it off, the salon has its two guests' slot machines by the door, as before.
const ARCADE = 'floe-market-arcade';
const builtArcade = import.meta.env.VITE_ARCADE as string | undefined;
let arcade = builtArcade ? builtArcade === 'on' : import.meta.env.DEV || import.meta.env.VITE_FUGU_DEMO === '1';
try {
  const asked = new URLSearchParams(location.search).get('arcade');
  if (asked === 'on') localStorage.setItem(ARCADE, '1');
  if (asked === 'off') localStorage.removeItem(ARCADE);
  arcade ||= localStorage.getItem(ARCADE) === '1';
} catch { /* storage unavailable: as built */ }

/** Whether the arcade cabinet stands in the casino yacht's salon on this device. */
export const arcadeOn = () => arcade;
