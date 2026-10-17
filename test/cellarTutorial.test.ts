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
  /** How many of a kind are in the player's arms, with what's still flying into them. */
  const carrying = (kind: string) => g.player.back.all().filter(m => m.userData.kind === kind).length;
  return { g, tut, plan, fight, stage, CY, at, F, draw, now, said, goal, carrying };
}

describe("the cellar's tutorial", () => {
  it('leads a new player from the bins to the stall, saves up in chips for a level, then sends them to the gong', async () => {
    // (just come down: the doors shut till the first soup's out, and the practice fight still to come)
    const { g, tut, plan, fight, CY, at, F, draw, now, said, goal, carrying } = await cellar({ money: 0, ring: { practice: true, quiet: true } });
    at({ x: plan.BIN_PADS.rice.x - 3, z: plan.BIN_PADS.rice.z });
    g.run(0.1);
    // nothing from stage 1 again: the dumbwaiter first, and the arrow's down on the cellar's floor
    expect(now()).toBe('bins');
    expect(tut.cellarKnown()).toBe(false); // (so the entry's reminder is left to the tutorial)
    draw();
    expect(tut.guide.visible).toBe(true);
    expect(tut.guide.position).toMatchObject({ x: plan.BIN_PADS.rice.x, y: CY, z: plan.BIN_PADS.rice.z });
    expect(said()).toBe('Grab rice or fish here / Sent down from upstairs');

    // rice in their arms: to the racks, and how long it takes
    at(plan.BIN_PADS.rice);
    g.runUntil(() => now() === 'prep');
    draw();
    const rack = plan.machinePad('rice', 0, F().lines.rice.n), barrel = plan.machinePad('fish', 0, F().lines.fish.n);
    expect(tut.guide.position.x).toBe(rack.x);
    expect(said()).toBe('Rice dries on the rack / Ready in 8 s');
    g.run(1); // (an armful: as much as the rack has room for)
    at(rack);
    g.runUntil(() => carrying('rice') === 0);
    g.run(0.1);
    draw();
    // the pot takes fish too: not to the pot yet, but for the fish
    expect(now()).toBe('prep');
    expect(tut.guide.position).toMatchObject({ x: plan.BIN_PADS.fish.x, z: plan.BIN_PADS.fish.z });
    expect(said()).toBe('Now grab fish too / The pot needs both');
    at(plan.BIN_PADS.fish);
    g.runUntil(() => carrying('fish') > 0);
    g.run(1);
    draw();
    expect(tut.guide.position.x).toBe(barrel.x);
    expect(said()).toBe('Fish goes in salt / Ready in 8 s');
    at(barrel);
    g.runUntil(() => carrying('fish') === 0);
    g.run(0.1);
    draw();
    // while it's going, how long until it's ready (the rice first, as it went in first)
    expect(tut.guide.position.x).toBe(rack.x);
    expect(said()).toMatch(/^Drying… [1-8] s \/ Then take them out$/);
    at(rack);
    g.runUntil(() => carrying('rrice') >= fight.PER_BATCH, 10);
    g.run(0.1);
    draw();
    expect(tut.guide.position.x).toBe(barrel.x);
    expect(said()).toMatch(/^(Salting… [1-8] s \/ Then take them out|Take the salted fish \/ )$/);
    at(barrel);
    g.runUntil(() => now() !== 'prep', 10); // a batch's worth of both in their arms
    expect(tut.learntLessons()).toContain('prep');

    // the pot: the bubble stays while they stand there, as it only cooks while they do
    g.run(0.1);
    expect(now()).toBe('pot');
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
    expect(said()).toBe("Drop them in the stall / Fans come once it's out");
    // all this while, the doors were shut: nobody's come, and there's been no fight
    expect(F().quiet).toBe(true);
    expect(F().bout).toMatchObject({ phase: 'prep', t: 0, came: 0 });
    expect(F().queue).toEqual([]);
    at(plan.BAR_PAD);
    g.runUntil(() => tut.learntLessons().includes('bowls'));
    // the first soup's out: the doors open, and the first local fight's fans come in for it
    expect(F().quiet).toBe(false);
    g.runUntil(() => F().bout.came > 0, 15);

    // the cheapest thing at the shop counter, saved up for in chips: another drying rack
    at({ x: 0, z: 0 });
    g.run(0.1);
    draw();
    expect(goal()).toMatch(/^🌾Another drying rack🐡 \d+ \/ 🐡 10$/);
    expect($('toast').textContent).toBe('Next goal: Another drying rack, 🐡 10');
    g.wallet.money = 10_000;
    g.run(0.1);
    expect(now()).toBe('bench');
    draw();
    expect(goal()).toBe('🌾Another drying rack🐡 10 ✓');
    expect(tut.guide.position.x).toBe(plan.BENCH_PAD.x);
    expect(said()).toBe('Buy another drying rack here / At the shop counter');
    at(plan.BENCH_PAD);
    g.run(0.1);
    draw();
    expect(said()).toBe('Pick an upgrade / Click one in the list to buy it');
    $('shopRows').querySelector<HTMLButtonElement>('[data-tile="rack"] button.cost')!.click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('bench');
    // then the practice fight: with an empty stall, it'd be lost, so the stall first...
    at({ x: 0, z: 0 });
    F().stall.length = 0;
    g.run(1.1);
    expect(now()).toBe('gong');
    draw();
    expect(tut.guide.position.x).toBe(plan.BAR_PAD.x);
    expect(said()).toBe('Fill the stall first / Then ring the gong');
    // ...and with it full, the gong
    while (fight.toStall(false));
    g.run(1.1);
    draw();
    expect(tut.guide.position.x).toBe(plan.GONG_PAD.x);
    expect(said()).toBe('Ring the gong / A practice fight to start');
  });

  it('while the doors are shut, the champion trains by the teppo post, and the gong opens them too', async () => {
    const { g, plan, fight, F, at } = await cellar({ ring: { practice: true, quiet: true }, learnt: [...STAGE1, 'bins', 'prep', 'pot', 'bowls', 'bench'] });
    const { ring } = await import('../src/dohyo');
    const { TEPPO } = plan;
    at({ x: 0, z: 0 });
    g.run(30);
    // no fans, no fight: the ring's empty, the champion stamping beside his sparring partner
    expect(F().bout).toMatchObject({ phase: 'prep', t: 0, came: 0 });
    expect(ring.rival.visible).toBe(false);
    expect(Math.hypot(ring.champ.position.x - TEPPO.x, ring.champ.position.z - TEPPO.z)).toBeLessThan(2.5);
    expect(ring.partner.visible).toBe(true);
    // a reload keeps them shut
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).ring.quiet).toBe(true);
    // the gong: his crowd comes in, doors or no doors
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    expect(F().quiet).toBe(false);
    g.run(0.1);
    expect(ring.rival.visible).toBe(true);
  });

  it('the practice fight: the sparring partner and a small crowd, and winning it completes the tutorial', async () => {
    const { g, tut, plan, fight, F, at, draw } = await cellar({ ring: { practice: true }, learnt: [...STAGE1, 'bins', 'prep', 'pot', 'bowls', 'bench', 'chips', 'power'] });
    const { ring } = await import('../src/dohyo');
    at(plan.GONG_PAD);
    g.run(0.1);
    draw();
    // the gong calls him in, not Hakkaku, and the bubble keeps out of its panel's way
    expect($('gong').hidden).toBe(false);
    expect($('gongBoss').textContent).toBe('Sparring partner');
    expect([...$('gongCrowd').children].map(c => c.textContent)).toEqual(['🤼 Practice', '👥 40', '🔔 30 s', '🐡 35']);
    expect($('coach').hidden).toBe(true);
    expect(fight.ringGong()).toBe(true);
    expect(F().rush!.n).toBe(40);
    g.run(0.1);
    expect(ring.partner.visible).toBe(false); // (in the ring, not at the teppo post)
    // 21 of his 40, by the bell
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 21 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush!.win).toBe(true);
    const money = g.wallet.money;
    g.runUntil(() => !F().practice, 30);
    // no boss beaten: Hakkaku's next, and the prize hires the two lines' hands
    expect(F().beaten).toBe(0);
    expect(fight.nextBoss()!.name).toBe('Hakkaku');
    expect(g.wallet.money - money).toBeGreaterThanOrEqual(35 * fight.CHIP);
    expect($('fightCard').textContent).toContain('PRACTICE WON');
    expect($('fightCard').textContent).toContain('Next: Hakkaku 🐙 · hire a washer and salter');
    g.run(0.1);
    expect(tut.learntLessons()).not.toContain('gong');
    $('fightCard').click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('gong');
    expect($('banner').textContent).toContain('Practice won');
    expect($('banner').textContent).toContain('Tutorial complete');
    expect($('banner').textContent).toContain('Now take on Hakkaku 🐙');
    // and the practice is over for good, saved
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).ring.practice).toBe(false);
  });

  it('sends them back for more when a line has too few for a batch, never to a pot that would wait', async () => {
    const { g, tut, plan, fight, F, at, draw, now, said } = await cellar({ learnt: [...STAGE1, 'bins'] });
    // two dried rice in hand and a full batch of salted fish on the ledge
    F().pantry.fish = fight.PER_BATCH;
    F().pantry.rice = 2;
    at({ x: plan.BIN_PADS.rice.x - 3, z: plan.BIN_PADS.rice.z });
    g.run(0.1);
    draw();
    expect(now()).toBe('prep');
    expect(tut.guide.position.x).toBe(plan.BIN_PADS.rice.x);
    expect(said()).toBe(`Grab more rice / The pot takes ${fight.PER_BATCH}`);
  });

  it('a game that has had its practice fight: the gong only once the forecast says Hakkaku is beaten', async () => {
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

  it('a game from before the practice fight that has beaten no boss gets it too, but not one past Hakkaku or that won it', async () => {
    // (as a save from before it: no word in it of the practice fight)
    const older = await cellar({ ring: { sparred: undefined } });
    expect(older.F().practice).toBe(true);
    expect(older.fight.nextBoss()).toBe(older.fight.PRACTICE);
    expect(older.F().quiet).toBe(false); // (its doors were open already)
    // won, it's never owed again, even after a reload
    older.F().practice = false; older.F().sparred = true;
    older.g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).ring).toMatchObject({ practice: false, sparred: true });
    const past = await cellar({ ring: { sparred: undefined, beaten: 1 } });
    expect(past.F().practice).toBe(false);
    expect(past.fight.nextBoss()!.name).toBe('Yokobashiri');
    // one whose tutorial learnt the gong on it won it before that was kept
    const won = await cellar({ ring: { sparred: undefined }, learnt: [...STAGE1, 'bins', 'prep', 'pot', 'bowls', 'bench', 'gong'] });
    expect(won.F().practice).toBe(false);
    expect(won.F().sparred).toBe(true);
    expect(won.fight.nextBoss()!.name).toBe('Hakkaku');
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
