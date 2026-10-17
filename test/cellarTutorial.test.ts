// Stage 3's tutorial: the gold arrow and bubble again, down in the cellar, for what's new there (the bins, the racks
// and barrels, the pot, the bowls, a level at the shop counter, the gong), never what stage 1 taught; the gong only
// once its forecast says the first fight's won, and winning it the end of it. A save from before it counts what it
// has done down there.
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];
/** Everything stage 1's tutorial teaches. */
const STAGE1 = ['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'harpoon', 'stars'];

/** A game down in the cellar, its player knowing stage 1, and the tutorial. */
async function cellar(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), learnt: STAGE1, ...save });
  const [tut, plan, fight, layout, stage] = await Promise.all([
    import('../src/tutorial'), import('../src/cellarPlan'), import('../src/fight'), import('../src/layout'), import('../src/stage'),
  ]);
  const CY = layout.CELLAR_Y;
  const at = (p: { x: number; z: number }) => g.player.g.position.set(p.x, CY, p.z);
  const F = () => fight.F;
  const { camera, OFF } = g.render;
  /** Looks at the player and draws a frame of the tutorial. */
  const draw = (dt = 0.1) => {
    const p = g.player.g.position;
    camera.position.set(p.x + OFF.x, p.y + OFF.y, p.z + OFF.z);
    camera.lookAt(p.x, p.y, p.z);
    camera.updateMatrixWorld();
    tut.drawTutorial(dt);
  };
  const now = () => tut.lesson.now?.id ?? null;
  const said = () => $('coach').querySelector('b')!.textContent + ' / ' + $('coach').querySelector('small')!.textContent;
  const goal = () => ($('goal').hidden ? null : $('goal').textContent);
  return { g, tut, plan, fight, stage, CY, at, F, draw, now, said, goal };
}

describe("the cellar's tutorial", () => {
  it('leads a new player from the bins to the stall, then saves up in chips for a level', async () => {
    const { g, tut, plan, fight, CY, at, F, draw, now, said, goal } = await cellar({ money: 0 });
    at({ x: plan.BIN_PADS.rice.x - 3, z: plan.BIN_PADS.rice.z });
    g.run(0.1);
    // nothing from stage 1 again: the dumbwaiter first, and the arrow's down on the cellar's floor
    expect(now()).toBe('bins');
    expect(tut.cellarKnown()).toBe(false); // (so the entry's reminder is left to the tutorial)
    draw();
    expect(tut.guide.visible).toBe(true);
    expect(tut.guide.position).toMatchObject({ x: plan.BIN_PADS.rice.x, y: CY, z: plan.BIN_PADS.rice.z });
    expect(said()).toBe('Grab rice or fish here / Sent down from upstairs');

    // rice in their arms: to the racks
    at(plan.BIN_PADS.rice);
    g.runUntil(() => now() === 'prep');
    draw();
    const rack = plan.machinePad('rice', 0, F().lines.rice.n);
    expect(tut.guide.position.x).toBe(rack.x);
    expect(said()).toBe('Rice dries on the rack / ');
    at(rack);
    g.runUntil(() => now() !== 'prep', 20); // dried, and back in their arms
    expect(tut.learntLessons()).toContain('prep');

    // the pot: the bubble stays while they stand there, as it only cooks while they do
    g.run(0.1);
    expect(now()).toBe('pot');
    F().pantry.fish = fight.PER_BATCH; // (the fish salted meanwhile)
    at(plan.POT_PAD);
    g.run(0.1);
    draw();
    expect(tut.guide.visible).toBe(true);
    expect(said()).toBe('Stand here to cook chanko / It only cooks while you stay');
    g.runUntil(() => now() !== 'pot', 30);
    expect(tut.learntLessons()).toContain('pot');

    // the bowls: from the counter, then out on the stall
    g.runUntil(() => now() === 'bowls', 10);
    draw();
    expect(tut.guide.position.x).toBe(plan.COUNTER_PAD.x);
    expect(said()).toBe('Take the bowls / ');
    at(plan.COUNTER_PAD);
    g.runUntil(() => g.player.back.count('bowl') > 0);
    at({ x: plan.COUNTER_PAD.x - 2, z: plan.COUNTER_PAD.z });
    g.run(0.1);
    draw();
    expect(tut.guide.position.x).toBe(plan.BAR_PAD.x);
    expect(said()).toBe('Drop them in the stall / Fans eat here');
    at(plan.BAR_PAD);
    g.runUntil(() => tut.learntLessons().includes('bowls'));

    // a level at the shop counter, the cheapest, saved up for in chips
    at({ x: 0, z: 0 });
    g.run(0.1);
    draw();
    expect(goal()).toMatch(/^📣Word on the street🐡 \d+ \/ 🐡 20$/);
    expect($('toast').textContent).toBe('Next goal: Word on the street, 🐡 20');
    g.wallet.money = 20_000;
    g.run(0.1);
    expect(now()).toBe('bench');
    draw();
    expect(goal()).toBe('📣Word on the street🐡 20 ✓');
    expect(tut.guide.position.x).toBe(plan.BENCH_PAD.x);
    expect(said()).toBe('Buy a level here / Bowl price, fans or crew');
    at(plan.BENCH_PAD);
    g.run(0.1);
    draw();
    expect(said()).toBe('Pick an upgrade / Click one in the list to buy it');
    $('shopRows').querySelector<HTMLButtonElement>('[data-mod="street"] button.cost')!.click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('bench');
    // (the gong's next, once it's a win: until then, nothing pointing at it)
    expect(now()).not.toBe('gong');
  });

  it('points at the gong only once the forecast says the fight is won, and winning it completes the tutorial', async () => {
    const { g, tut, plan, fight, F, at, draw, now, said } = await cellar({ learnt: [...STAGE1, 'bins', 'prep', 'pot', 'bowls', 'bench', 'chips', 'power'] });
    at({ x: 0, z: 0 });
    g.run(1.1);
    expect(now()).toBe(null); // an empty kitchen: it'd be lost
    // a kitchen that would win it
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) fight.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) fight.hire(r);
    g.runUntil(() => now() === 'gong', 120);
    const f = fight.forecast()!;
    expect(f.turned).toBeGreaterThanOrEqual(fight.toBeat(f.boss));
    draw();
    expect(tut.guide.position.x).toBe(plan.GONG_PAD.x);
    expect(said()).toBe('Ring the gong / Your crowd is ready');

    // at the gong its panel's up, and the bubble keeps out of its way
    at(plan.GONG_PAD);
    g.run(0.1);
    draw();
    expect($('gong').hidden).toBe(false);
    expect($('coach').hidden).toBe(true);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 61 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.runUntil(() => F().beaten === 1, 30);
    // the fight's card first; then, once it's away, the tutorial's done
    expect($('fightCard').hidden).toBe(false);
    g.run(0.1);
    expect(tut.learntLessons()).not.toContain('gong');
    $('fightCard').click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('gong');
    expect($('banner').classList.contains('on')).toBe(true);
    expect($('banner').textContent).toContain('First fight won');
    expect($('banner').textContent).toContain('Four more bosses to go');
  });

  it("a save from before the cellar's lessons counts what it has done down there", async () => {
    // two bosses beaten: everything's known
    const old = await cellar({ ring: { beaten: 2, tier: 1, hires: { washer: true, salter: true, picker: true } } });
    old.g.run(0.1);
    expect(old.tut.learntLessons()).toEqual(expect.arrayContaining(['bins', 'prep', 'pot', 'bowls', 'bench', 'gong', 'chips', 'power', 'grow']));
    expect(old.now()).toBe(null);
    expect(old.tut.cellarKnown()).toBe(true);
  });

  it("a save that only just came down still has the cellar's lessons to come, and stage 1's aren't shown again", async () => {
    const { g, now, tut } = await cellar();
    g.run(0.1);
    expect(now()).toBe('bins');
    expect(tut.learntLessons()).toEqual(STAGE1);
  });
});
