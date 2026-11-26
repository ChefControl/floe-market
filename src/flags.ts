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

// ---------- Ko-fi ----------
// "Buy me a coffee" in the settings and its one-time nudge (kofi.ts) are only in a game built (or served) with
// VITE_KOFI=on, as the live web game is (deploy.yml). Anything else, the default included, leaves the settings row, and
// with it the ko-fi.com link, out of the page itself (vite.config.ts), so a build that forgets the switch is safe. The
// Steam build (#160) must never set it on: Steam doesn't allow links to payment pages outside Steam.
const kofi = import.meta.env.VITE_KOFI === 'on';

/** Whether this build has the Ko-fi row and nudge (the live web game's do; the Steam build's don't). */
export const kofiOn = () => kofi;

// ---------- sound while testing ----------
// A game being tested starts silent: one a browser automation drives (Playwright, the Chrome DevTools MCP:
// navigator.webdriver), and a demo build (VITE_FUGU_DEMO=1 or `--mode demo`) opened at localhost, as the agents'
// previews on localhost:5177 and the mobile-test skill's emulators are. The owner's playtests of the demo build on a
// phone, at the computer's Wi-Fi address, keep their sound. ?sound=on in the address plays it anyway, and
// ?sound=off silences any game, for that visit only. It's the mix that's silenced (audio.ts), never the player's sound
// settings, so nothing of it is kept.
const HERE = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Whether the game's sound starts silent, for testing (see above), at the address `at`, `driven` by an automation. */
export function testSilent(at: Pick<Location, 'search' | 'hostname'> | undefined = globalThis.location,
  driven = !!globalThis.navigator?.webdriver) {
  const asked = at ? new URLSearchParams(at.search).get('sound') : null;
  if (asked === 'on') return false;
  if (asked === 'off' || driven) return true;
  const demo = import.meta.env.VITE_FUGU_DEMO === '1' || import.meta.env.MODE === 'demo';
  return demo && HERE.has(at?.hostname ?? '');
}
