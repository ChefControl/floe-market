// The demo build of Mr. Fugu's offer (VITE_FUGU_DEMO=1): Floe Sushi fully built, the cash $100 short of a million and
// the last diners' bills at the register, which the crew brings in a moment later: then he knocks, and the arrow
// points the way. Or, with ?cellar in the address, down in his cellar (stage 3) with chips to spend, to try fight
// night (&chips=N for N chips, not 2,000; &beaten=N with N of the bosses beaten already, and what they open open).
// Nothing is kept, so every visit starts over, the tutorial included.
import { player } from './player';
import { REGISTER } from './restaurant';
import { deviceStore, load } from './save';
import { forgetLessons } from './tutorial';
import { tiles } from './unlocks';
import { FY } from './util';

export const DEMO = import.meta.env.VITE_FUGU_DEMO === '1';

export function startDemo() {
  // (and the tutorial's lessons from a visit before, which the device keeps apart from the save)
  forgetLessons();
  const q = new URLSearchParams(location.search), cellar = q.has('cellar');
  const chips = Math.max(0, Number(q.get('chips')) || 2_000), beaten = Math.max(0, Math.floor(Number(q.get('beaten')) || 0));
  deviceStore.write(JSON.stringify({
    v: 4, savedAt: Date.now(), money: cellar ? chips * 1_000 : 999_900,
    // (stages 1 and 2 built; the ring's own tiles, its $1M buy-in included, wait for his offer)
    tiles: tiles.filter(t => (t.stage < 3 && t.id !== 'dohyo') || (cellar && t.id === 'dohyo')).map(t => ({ id: t.id, paid: t.cost, done: true, open: true })),
    mods: { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8 },
    reviews: Array(20).fill(5), pile: 20, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0,
    fish: 12, rice: 12, plates: 8, cash: 240, boxes: 3, tcash: 0, field: 10, season: 3, seasonT: 60, fugu: cellar ? 2 : 0,
    ...(cellar ? { level: 1 } : {}),
    // (the grow room open with its first bed, as beating the first boss leaves it; or, just come down, the doors shut
    // till the first soup's out and the practice fight still to come)
    ...(cellar ? { v: 6, ring: beaten ? { beaten, lines: { mush: { n: 1 } } } : { practice: true, quiet: true } } : {}),
  }));
  load();
  if (!cellar) player.g.position.set(REGISTER.x - 1.6, FY, REGISTER.z - 1.4);
}
