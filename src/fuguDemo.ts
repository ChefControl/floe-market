// The demo build of Mr. Fugu's offer (VITE_FUGU_DEMO=1): Floe Sushi fully built, so he knocks at once, and the arrow
// points the way. Or, with ?cellar in the address, down in his cellar (stage 3) with chips to spend, to try fight
// night (&chips=N for N chips, not 2,000; &beaten=N with N of the bosses beaten already, and what they open open: from
// 2, Mr. Fugu with his matchbook for the out-of-order stall in Mama Moray's restroom, or with &south already through
// it; &pot to start at the pot, for its cooking game; &gong on the gong's pad; &full with all of the cellar bought, the
// Grand Hall's stands and every hand, line and level, for the biggest crowd: beaten=4&full is Fukure's rush, for timing
// the graphics). Or ?stage=1 for a stage 1 market instead (the 🛠 panel's buttons, demo.ts, open these), or ?upto=ID
// for Floe Sushi built up to the upgrade ID, the rest still to buy (upto=farmer: the rice porter's tile next).
// Nothing is kept, so every visit starts over, the tutorial included.
import { GONG_PAD, MAX_MACHINES, POT_PAD } from './cellarPlan';
import { F, LEDGE_CAP } from './fight';
import { player } from './player';
import { REGISTER } from './restaurant';
import { deviceStore, load } from './save';
import { forgetLessons } from './tutorial';
import { tiles } from './unlocks';
import { FY } from './util';

export const DEMO = import.meta.env.VITE_FUGU_DEMO === '1';

/** A cellar with all of it bought (&full): every hand, six of each machine upgraded, the slide, the Grand Hall's stands. */
const FULL = (beaten: number) => ({
  beaten, tier: 3, slide: true, fast: true, mama: beaten >= 2, hall: beaten >= 5, resto: 3, pantry: { rice: LEDGE_CAP, fish: LEDGE_CAP, mush: LEDGE_CAP },
  hires: { washer: true, salter: true, picker: true, attendant: true, cook: true },
  lines: { rice: { n: MAX_MACHINES, up: 1 }, fish: { n: MAX_MACHINES, up: 1 }, mush: { n: MAX_MACHINES, up: 1 } },
  den: { book: beaten >= 2, way: beaten >= 2, door: beaten >= 2, met: { eddie: beaten >= 2, harry: beaten >= 2, tommy: beaten >= 2 } },
});

/** A market game for the 🛠 panel (demo.ts): stage 1 built (Floe Sushi to come), or stages 1 and 2 with none of the
 *  ring's tiles (they wait for Mr. Fugu's offer). */
export function marketSave(stage: 1 | 2) {
  const done = (t: { id: string; stage: number }) => (stage === 2 ? t.stage < 3 && t.id !== 'dohyo' : t.stage === 1 && t.id !== 'sushi');
  return JSON.stringify({
    v: 7, savedAt: Date.now(), money: stage === 2 ? 3_000_000 : 9_000, best: 3_000_000,
    tiles: tiles.map(t => ({ id: t.id, paid: done(t) ? t.cost : 0, done: done(t), open: true })),
    mods: stage === 2 ? { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8 } : { fillets: 4, marketing: 5, crew: 3 },
    reviews: Array(20).fill(5), pile: 20, back: 0, backRice: 0, c1: 5, c1c: 0, c2: 4, c2c: 0, fish: 8, rice: 8, plates: 6,
    cash: 0, boxes: 2, tcash: 0, field: 6, season: 0, seasonT: 30, presents: 2, presentPaid: 0,
    learnt: ['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'harpoon', 'stars'],
  });
}

export function startDemo() {
  // (and the tutorial's lessons from a visit before, which the device keeps apart from the save)
  forgetLessons();
  const q = new URLSearchParams(location.search), cellar = q.has('cellar');
  // (?stage=1: a stage 1 market instead, from the 🛠 panel)
  if (!cellar && q.get('stage') === '1') { deviceStore.write(marketSave(1)); load(); return; }
  // (&chips=0 is broke, as coming down from the buy-in leaves you)
  const c = q.get('chips'), chips = Math.max(0, c !== null && c !== '' && Number.isFinite(Number(c)) ? Number(c) : 2_000), beaten = Math.max(0, Math.floor(Number(q.get('beaten')) || 0));
  const south = q.has('south'), full = cellar && q.has('full');
  // (?upto=ID: Floe Sushi's upgrades after ID still to buy)
  const sushi: string[] = tiles.filter(t => t.stage === 2).map(t => t.id), upto = cellar ? -1 : sushi.indexOf(q.get('upto') ?? '');
  const toBuy = (t: { id: string; stage: number }) => upto >= 0 && t.stage === 2 && sushi.indexOf(t.id) > upto;
  deviceStore.write(JSON.stringify({
    v: 4, savedAt: Date.now(), money: cellar ? chips * 1_000 : 999_900,
    // (stages 1 and 2 built; the ring's own tiles, its $1M buy-in included, wait for his offer)
    tiles: tiles.filter(t => (t.stage < 3 && t.id !== 'dohyo' && !toBuy(t)) || (cellar && t.id === 'dohyo') || (full && t.stage === 3 && !t.gold))
      .map(t => ({ id: t.id, paid: t.cost, done: true, open: true })),
    mods: { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8, ...(full ? { bowls: 8, street: 8, cellarcrew: 8 } : {}) },
    reviews: Array(20).fill(5), pile: 20, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0,
    fish: 12, rice: 12, plates: 8, cash: 240, boxes: 3, tcash: 0, field: 10, season: 3, seasonT: 60, fugu: cellar ? 2 : 0, till: 0,
    ...(cellar ? { level: 1 } : {}),
    // (the grow room open with its first bed, as beating the first boss leaves it; or, just come down, the doors shut
    // till the first soup's out and the practice fight still to come)
    ...(cellar ? { v: 6, ring: full ? FULL(beaten) : beaten ? { beaten, lines: { mush: { n: 1 } }, den: { book: south, way: south } } : { practice: true, quiet: true } } : {}),
  }));
  load();
  if (!cellar) player.g.position.set(REGISTER.x - 1.6, FY, REGISTER.z - 1.4);
  // (with a full ledge, so the show can be played again and again)
  // (on the gong's pad, to ring the next boss in)
  else if (q.has('gong')) player.g.position.set(GONG_PAD.x, player.g.position.y, GONG_PAD.z);
  else if (q.has('pot')) { player.g.position.set(POT_PAD.x, player.g.position.y, POT_PAD.z); F.pantry = { rice: LEDGE_CAP, fish: LEDGE_CAP, mush: LEDGE_CAP }; }
}
