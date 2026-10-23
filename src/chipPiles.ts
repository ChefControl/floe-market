// Fugu Chips piling up in the cellar (stage 3), as bills do on the counters up top: the fans' chips on the floor
// against the hearth room's west wall, in sight of the pot (CHIP_SPOT), and Mama Moray's cut against her hall's west
// wall (MAMA_CHIPS); nothing in the way, so you walk right over them to scoop them up (playerUpdate.ts). A boss's prize
// goes straight to the wallet (ring.ts). What's in each is the fight's (F.piles, saved with it); this draws it, a chip
// for every TOKEN, in towers of STACK filled one after another, pink and gold (items.ts newChip).
import { Group } from 'three';
import { cellar, CY } from './cellar';
import { CHIP_SPOT, MAMA_CHIPS } from './cellarPlan';
import { CHIP, F, type Pile } from './fight';
import { fly } from './holder';
import { headless } from './headless';
import { CHIP_H, newChip } from './items';
import { quietly } from './kit';
import { player } from './player';
import { scene } from './render';
import { coin } from './sfx';
import { d2xz, V, type XZ } from './util';
import { addMoney } from './wallet';

/** Where each pile is (`y`, the floor it lies on), and from how far it's scooped up. */
export const PILE_AT: Record<Pile, XZ & { y: number }> = {
  bar: { ...CHIP_SPOT, y: CY },
  mama: { ...MAMA_CHIPS, y: CY },
};
export const PILE_REACH = 1.5;
/** Chips a drawn one stands for, and how many to a tower. */
const TOKEN = 2, STACK = 8;
/** The towers' places in a pile: a 3 by 3 square, a chip's width and a bit apart, filled a row at a time from the
 *  back; and which are gold (a chequer, the corners and the middle pink). */
const PITCH = 0.24;
const TOWERS = Array.from({ length: 9 }, (_, t): [number, number] =>
  [(t % 3 - 1) * PITCH, (Math.floor(t / 3) - 1) * PITCH]);
const gold = (t: number) => t % 2 === 1;

const piles = quietly(() => Object.fromEntries((Object.keys(PILE_AT) as Pile[]).map(k => {
  const at = PILE_AT[k], g = new Group();
  g.position.set(at.x, at.y, at.z);
  // (straight towers, every chip's puffer facing the same way)
  const tokens = TOWERS.flatMap(([x, z], t) => Array.from({ length: STACK }, (_, i) => {
    const m = newChip(gold(t));
    m.position.set(x, CHIP_H / 2 + i * CHIP_H, z);
    m.castShadow = true;
    m.visible = false;
    g.add(m);
    return m;
  }));
  cellar.add(g);
  return [k, { g, tokens, shown: -1 }];
}))) as Record<Pile, { g: Group; tokens: ReturnType<typeof newChip>[]; shown: number }>;

/** Tokens a pile of `chips` is drawn with. */
const tokensFor = (chips: number) => (chips > 0 ? Math.min(TOWERS.length * STACK, Math.ceil(chips / TOKEN)) : 0);
/** Chips scooped up from each pile since the page opened (the tutorial's lessons in collecting them). */
export const scooped: Record<Pile, number> = { bar: 0, mama: 0 };
/** Adds `chips` to a pile (the fans' at the soup square, or Mama Moray's cut). */
export function pileUp(k: Pile, chips: number) { if (chips > 0) F.piles[k] += chips; }

/** Scoops up any pile the player's standing by, a token's worth at a time, into the wallet. */
export function scoop(p: XZ, dt: number) {
  for (const k of Object.keys(PILE_AT) as Pile[]) {
    const at = PILE_AT[k];
    if (F.piles[k] <= 0 || d2xz(p, at) >= PILE_REACH * PILE_REACH) continue;
    player.tCash -= dt;
    while (player.tCash <= 0 && F.piles[k] > 0) {
      player.tCash += 0.025;
      const take = Math.min(F.piles[k], Math.max(TOKEN, F.piles[k] / tokensFor(F.piles[k])));
      F.piles[k] = F.piles[k] - take < 1e-6 ? 0 : F.piles[k] - take;
      scooped[k] += take;
      addMoney(Math.round(take * CHIP));
      if (headless.on) continue;
      // (a chip off the top, up into their hands)
      const i = Math.max(0, tokensFor(F.piles[k] + take) - 1), m = quietly(() => newChip(gold(Math.floor(i / STACK))));
      piles[k].tokens[i].getWorldPosition(m.position);
      scene.add(m);
      const pos = player.g.position;
      fly(m, () => V(pos.x, pos.y + 0.75, pos.z), 0.22, 0.6, () => { scene.remove(m); coin(); });
    }
    if (player.tCash < 0) player.tCash = 0;
  }
}

/** Draws each pile as it is. */
export function updPiles() {
  for (const k of Object.keys(piles) as Pile[]) {
    const P = piles[k], n = tokensFor(F.piles[k]);
    if (n === P.shown) continue;
    P.shown = n;
    P.tokens.forEach((m, i) => { m.visible = i < n; });
  }
}
/** What's in each pile, and how many chips it's drawn with (for tests). */
export const pilesNow = () => ({ bar: F.piles.bar, mama: F.piles.mama, tokens: { bar: tokensFor(F.piles.bar), mama: tokensFor(F.piles.mama) } });
