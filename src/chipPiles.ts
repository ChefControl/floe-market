// Fugu Chips piling up in the cellar (stage 3), as bills do on the counters up top: the fans' chips in a till crate in
// the soup square's north-east corner, a step from where the bowls are set out (CHIP_CRATE), and Mama Moray's cut on
// her counter by her till. Walk over a pile to scoop it up (playerUpdate.ts); a boss's prize goes straight to the wallet (ring.ts).
// What's in each is the fight's (F.piles, saved with it); this draws it, a token for every TOKEN chips, MOST at most,
// in stacks of STACK.
import { BoxGeometry, CylinderGeometry, Group } from 'three';
import { cellar, CY } from './cellar';
import { CHIP_CRATE, MAMA_COUNTER, TILL } from './cellarPlan';
import { CHIP, F, type Pile } from './fight';
import { fly } from './holder';
import { headless } from './headless';
import { player } from './player';
import { mesh, scene } from './render';
import { coin } from './sfx';
import { d2xz, V, type XZ } from './util';
import { addMoney } from './wallet';

/** Where each pile is (`y`, the top it sits on), and from how far it's scooped up. */
export const PILE_AT: Record<Pile, XZ & { y: number }> = {
  bar: { x: CHIP_CRATE.x, z: CHIP_CRATE.z, y: CY + CHIP_CRATE.h },
  mama: { x: TILL.x + 0.55, z: TILL.z + 0.25, y: CY + MAMA_COUNTER.h },
};
export const PILE_REACH = 1.5;
/** Chips a token stands for, the most drawn in a pile, and how many a stack. */
const TOKEN = 2, MOST = 40, STACK = 10;
const PINK = 0xE0567F, GOLD = 0xF2C14E;
const tokenGeo = new CylinderGeometry(0.075, 0.075, 0.022, 16), T = 0.024;
/** Each stack's place on the pile, round its middle. */
const SPOTS = [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]];

const piles = Object.fromEntries((Object.keys(PILE_AT) as Pile[]).map(k => {
  const at = PILE_AT[k], g = new Group();
  g.position.set(at.x, at.y, at.z);
  // (the soup square's stands on a crate; Mama's on her counter)
  if (k === 'bar') g.add(mesh(new BoxGeometry(CHIP_CRATE.w, CHIP_CRATE.h, CHIP_CRATE.d), 0x7A5634, 0, -CHIP_CRATE.h / 2, 0, true));
  const tokens = Array.from({ length: MOST }, (_, i) => {
    const [x, z] = SPOTS[Math.floor(i / STACK) % SPOTS.length];
    const m = mesh(tokenGeo, i % 2 ? GOLD : PINK, x, T / 2 + (i % STACK) * T, z, true);
    m.visible = false;
    g.add(m);
    return m;
  });
  cellar.add(g);
  return [k, { g, tokens, shown: -1 }];
})) as Record<Pile, { g: Group; tokens: ReturnType<typeof mesh>[]; shown: number }>;

/** Tokens a pile of `chips` is drawn with. */
const tokensFor = (chips: number) => (chips > 0 ? Math.min(MOST, Math.ceil(chips / TOKEN)) : 0);
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
      addMoney(Math.round(take * CHIP));
      if (headless.on) continue;
      // (a token off the top, up into their hands)
      const top = piles[k].tokens[Math.max(0, tokensFor(F.piles[k] + take) - 1)], m = mesh(tokenGeo, PINK);
      top.getWorldPosition(m.position);
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
/** What's in each pile, and how many tokens it's drawn with (for tests). */
export const pilesNow = () => ({ bar: F.piles.bar, mama: F.piles.mama, tokens: { bar: tokensFor(F.piles.bar), mama: tokensFor(F.piles.mama) } });
