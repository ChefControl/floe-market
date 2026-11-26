// The Steam demo (#183), its own free app on Steam, built from the same code with VITE_STEAM_DEMO=on
// (desktop/build.mjs --demo): all of stage 1, and stage 2 up to the second chef. Once he's hired, someone knocks under
// the dock, Mr. Fugu whispers through the crack (offer.ts), and the end card says the rest is in the full game, with
// Wishlist (the full game's store page, in Steam itself) and Keep playing. Nothing past the cut is ever on offer
// (unlocks.ts); standing on the hatch again brings the card back. The demo keeps its own save, and the full game starts
// from it if it has none of its own (desktop/main.mjs). The end card itself is demoEnd.ts.
/** Whether this is the demo build. */
export const steamDemo = () => import.meta.env.VITE_STEAM_DEMO === 'on';

/** Stage 2's upgrades in the demo, in the game's order; the last one ends it. */
export const DEMO_STAGE2 = ['paddy', 'farmer', 'seats', 'chef'] as const;
const IN_DEMO = new Set<string>(DEMO_STAGE2);

/** Whether an upgrade is in this build: everything in the full game; in the demo, stage 1's and the cut of stage 2's. */
export const inBuild = (t: { id: string; stage: number; gold?: boolean }) =>
  !steamDemo() || t.stage === 1 || (t.stage === 2 && !t.gold && IN_DEMO.has(t.id));

/** The full game's store page, in Steam (desktop/main.mjs hands steam:// to Steam). Its id comes from the build. */
const STORE = import.meta.env.VITE_STEAM_STORE_ID as string | undefined;
export const storeLink = () => STORE ? `steam://store/${STORE}` : null;
