// The watch button (gong.ts): on a boss's fight it does what the watch spot does, from wherever the player is.
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A game in stage 3, down in the cellar, at the bar. */
async function ring() {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5) });
  const [cellar, plan, fight, gong, stage] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/gong'), import('../src/stage'),
  ]);
  const at = (p: { x: number; z: number }) => g.player.g.position.set(p.x, cellar.CY, p.z);
  const F = () => fight.F;
  at(plan.BAR_PAD);
  return { g, plan, fight, gong, stage, at, F };
}
const btn = () => $('watchGo') as HTMLButtonElement;

describe('the watch button', () => {
  it("shows once a boss's fans sit down, and closes the camera in on the ring from the bar", async () => {
    const { g, fight, gong, stage, F } = await ring();
    expect(fight.ringGong()).toBe(true);
    // (not while his crowd's eating: the player's at the kitchen)
    g.run(1);
    expect(btn().hidden).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 120 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.run(0.1);
    expect(F().bout.phase).toBe('sit');
    expect(btn().hidden).toBe(false);
    expect([btn().textContent, btn().getAttribute('aria-pressed'), btn().dataset.key]).toEqual(['👁️ Watch', 'false', 'V']);
    expect(gong.watching()).toBe(false);
    btn().click();
    g.run(3);
    expect(gong.watching()).toBe(true);
    expect(stage.view.zoom).toBeLessThan(stage.CELLAR_ZOOM);
    expect([btn().textContent, btn().getAttribute('aria-pressed')]).toEqual(['👁️ Watching', 'true']);
    // pressed again, the camera comes back
    btn().click();
    g.run(3);
    expect(gong.watching()).toBe(false);
    expect(btn().textContent).toBe('👁️ Watch');
  }, 30_000);

  it('V does it too, and once the fight is over the camera comes back on its own', async () => {
    const { g, fight, gong, F } = await ring();
    fight.ringGong();
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 100 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.run(0.1);
    g.press('v'); g.run(1 / 30); g.press('v', 'keyup');
    g.runUntil(() => F().bout.phase === 'fight', 10);
    expect(gong.watching()).toBe(true);
    // (the fight, its result, and the fans go home)
    g.runUntil(() => !F().rush, 40);
    g.run(3);
    expect(btn().hidden).toBe(true);
    expect(gong.watching()).toBe(false);
  }, 30_000);

  it("never shows for a local's fight: that one's watched from the spot", async () => {
    const { g, plan, fight, gong, F, at } = await ring();
    g.runUntil(() => F().bout.phase === 'fight', fight.BOUT.prep + fight.BOUT.sit + 5);
    expect(btn().hidden).toBe(true);
    expect(gong.watchOffered()).toBe(false);
    at(plan.WATCH);
    g.run(3);
    expect(gong.watching()).toBe(true);
    expect(btn().hidden).toBe(true);
  }, 30_000);
});
