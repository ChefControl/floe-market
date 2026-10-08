// The demo build of Mr. Fugu's offer (VITE_FUGU_DEMO=1): Floe Sushi fully built, the cash $100 short of a million and
// the player at the register, where the last diners' bills are waiting. Nothing is kept, so every visit starts over.
import { player } from './player';
import { REGISTER } from './restaurant';
import { deviceStore, load } from './save';
import { toast } from './ui';
import { tiles } from './unlocks';
import { FY } from './util';

export const DEMO = import.meta.env.VITE_FUGU_DEMO === '1';

export function startDemo() {
  deviceStore.write(JSON.stringify({
    v: 4, savedAt: Date.now(), money: 999_900,
    tiles: tiles.map(t => ({ id: t.id, paid: t.cost, done: true, open: true })),
    mods: { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8 },
    reviews: Array(20).fill(5), pile: 20, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0,
    fish: 12, rice: 12, plates: 8, cash: 240, boxes: 3, tcash: 0, field: 10, season: 3, seasonT: 60, fugu: 0,
  }));
  load();
  player.g.position.set(REGISTER.x - 1.6, FY, REGISTER.z - 1.4);
  toast('Walk over the cash at the register, then follow the ❗');
}
