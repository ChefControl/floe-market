// The stage 3 tests' game: the ring bought and the player down in the cellar (stage3*.test.ts). Stage 3's tests are in
// four files so CI can run them side by side: each one loads the game for every test, and in one file they took over
// eight minutes.
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

export const $ = (id: string) => document.getElementById(id)!;
export const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A game in stage 3 (the ring bought), down in the cellar unless `level` says otherwise. */
export async function ring(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), ...save });
  const [cellar, plan, fight, dohyo, gong, swarm, front, stage, ringSound] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/dohyo'), import('../src/gong'),
    import('../src/swarm'), import('../src/front'), import('../src/stage'), import('../src/ringSound'),
  ]);
  const at = (p: { x: number; z: number }) => g.player.g.position.set(p.x, cellar.CY, p.z);
  /** The cellar now (fight.ts swaps its state object, so always read it fresh). */
  const F = () => fight.F;
  /** Stands on a tile with the money for it until it's bought (or, for a room's upgrade, at the crafting bench, and
   *  taps it in its room's tab). */
  const buy = (id: string) => {
    const t = g.unlocks.tiles.find(x => x.id === id)!;
    if (t.menu) {
      at(plan.ROOM_MENUS[t.menu]);
      g.run(0.1);
      // (the bench's menu opens folded, as its Craft button: tap it open, then the room's tab)
      if (document.getElementById('shop')!.hidden) document.getElementById('craft')!.click();
      document.querySelector<HTMLButtonElement>(`#shopTabs [data-tab="${t.menu}"]`)?.click();
      // (a computer's list: its price button; a touch screen's cards: pick its card, then buy it)
      const price = document.querySelector<HTMLButtonElement>(`#shopRows [data-tile="${id}"] button.cost`);
      if (!price) document.querySelector<HTMLButtonElement>(`#shopRows [data-tile="${id}"]`)?.click();
      const b = price ?? document.querySelector<HTMLButtonElement>('#shopPick .buy');
      if (!b || b.disabled || (!price && !document.querySelector(`#shopRows [data-tile="${id}"][aria-pressed="true"]`))) throw new Error(`${id} isn't on sale in its menu`);
      b.click();
      g.run(0.1);
      return t;
    }
    at(t);
    g.press('e');
    const n = t.line ? F().lines[t.line].n : -1;
    g.runUntil(() => (t.line ? F().lines[t.line].n > n : t.done), 15);
    g.press('e', 'keyup');
    g.run(0.1);
    return t;
  };
  return { g, cellar, plan, fight, dohyo, gong, swarm, front, stage, ringSound, at, F, buy };
}
/** The stage 3 upgrades on offer now: on tiles, and in the rooms' menus. */
export const offered = (g: Awaited<ReturnType<typeof loadGame>>) =>
  [...g.unlocks.visibleTiles().filter(t => t.stage === 3), ...g.unlocks.menuOffer()].map(t => t.id);
