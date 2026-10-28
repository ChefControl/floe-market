// Stage 3's tutorial: the gold arrow and bubble again, down in the cellar, for what's new there (a card on arriving,
// then the bins, the racks and barrels, the pot, the bowls, the fans and 💪 once one's fed, collecting their chips off
// the floor, the fight: the loop till it's
// won, the cooking game, the gong, what wins it; then its prize at the shop counter), never what stage 1 taught; each
// idea explained as it happens. A save from before it counts what it has done down there.
import { describe, expect, it } from 'vitest';
import { PRACTICE } from '../src/fight';
import { FACE } from '../src/icons/bosses';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];
/** Everything stage 1's tutorial teaches. */
const STAGE1 = ['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'harpoon', 'stars'];
/** The cellar's lessons that came later: the arriving card, and the fans one. */
const NEWER = ['arrive', 'fed'];

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

/** The cooking game left half way, if it was. */
const F_show = (fight: typeof import('../src/fight')) => fight.F.show;
/** Any of the lines the loop's next job says (the fight's lesson borrows it). */
const JOB = /^(Grab|Now grab|Put|Drying|Salting|Take|Bring|Pick|Bowls|Set)/;

describe("the cellar's tutorial", () => {
  it('leads a new player from arriving to the stall, explains the fans, then through the practice fight to its prize', async () => {
    // (just come down: the doors shut till the first soup's out, and the practice fight still to come)
    const { g, tut, plan, fight, CY, at, F, draw, now, said, goal, carrying } = await cellar({ money: 0, ring: { practice: true, quiet: true } });
    /** Draws and runs on, as main.ts would, for `s` seconds. */
    const wait = (s: number) => { for (let t = 0; t < s; t += 0.1) { draw(); g.run(0.1); } };
    at({ x: plan.BIN_PADS.rice.x - 3, z: plan.BIN_PADS.rice.z });
    g.run(0.1);
    // nothing from stage 1 again: first a card saying what it's all about, read where they stand, no arrow
    expect(now()).toBe('arrive');
    expect(tut.cellarKnown()).toBe(false); // (so the entry's reminder is left to the tutorial)
    draw();
    expect(tut.guide.visible).toBe(false);
    expect($('coach').hidden).toBe(false);
    expect(said()).toBe('Cook soup, feed fans, win fights / Follow the gold arrow');
    // it stays till they first move, however long
    wait(10);
    expect(now()).toBe('arrive');
    // then a few seconds' grace to find their feet
    at({ x: plan.BIN_PADS.rice.x - 2, z: plan.BIN_PADS.rice.z });
    wait(6);
    expect(now()).toBe('arrive');
    wait(1.5);
    // then the dumbwaiter, and the arrow's down on the cellar's floor
    expect(now()).toBe('bins');
    draw();
    expect(tut.guide.visible).toBe(true);
    expect(tut.guide.position).toMatchObject({ x: plan.BIN_PADS.rice.x, y: CY, z: plan.BIN_PADS.rice.z });
    expect(said()).toBe('Grab rice from this tray / Soup needs rice and fish');

    // rice in their arms: to the racks, and how long it takes
    at(plan.BIN_PADS.rice);
    g.runUntil(() => now() === 'prep');
    draw();
    const rack = plan.machinePad('rice', 0, F().lines.rice.n), barrel = plan.machinePad('fish', 0, F().lines.fish.n);
    expect(tut.guide.position.x).toBe(rack.x);
    expect(said()).toBe('Put the rice on the rack / It dries in 8 seconds');
    g.run(1); // (an armful: as much as the rack has room for)
    at(rack);
    g.runUntil(() => carrying('rice') === 0);
    g.run(0.1);
    draw();
    // the pot takes fish too: not to the pot yet, but for the fish
    expect(now()).toBe('prep');
    expect(tut.guide.position).toMatchObject({ x: plan.BIN_PADS.fish.x, z: plan.BIN_PADS.fish.z });
    expect(said()).toBe('Now grab fish too / Soup needs both');
    at(plan.BIN_PADS.fish);
    g.runUntil(() => carrying('fish') > 0);
    g.run(1);
    draw();
    expect(tut.guide.position.x).toBe(barrel.x);
    expect(said()).toBe('Put the fish in the barrel / Salt cures it in 8 seconds');
    at(barrel);
    g.runUntil(() => carrying('fish') === 0);
    g.run(0.1);
    draw();
    // while it's going, how long until it's ready (the rice first, as it went in first)
    expect(tut.guide.position.x).toBe(rack.x);
    expect(said()).toMatch(/^Drying… [1-8] s \/ Then take it out$/);
    at(rack);
    g.runUntil(() => carrying('rrice') >= fight.PER_BATCH, 10);
    g.run(0.1);
    draw();
    expect(tut.guide.position.x).toBe(barrel.x);
    expect(said()).toMatch(/^(Salting… [1-8] s \/ Then take it out|Take the salted fish \/ )$/);
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
    expect(said()).toBe('Bring it all to the pot / Stay here while it cooks');
    g.runUntil(() => now() !== 'pot', 30);
    expect(tut.learntLessons()).toContain('pot');

    // the bowls: straight on to the counter (coming out of the pot, or there), then out on the stall
    g.run(0.1);
    expect(now()).toBe('bowls');
    draw();
    expect(tut.guide.position.x).toBe(plan.COUNTER_PAD.x);
    expect(said()).toMatch(/^(Bowls come out here|Pick up the bowls) \/ $/);
    at(plan.COUNTER_PAD);
    g.runUntil(() => g.player.back.count('bowl') > 0);
    at({ x: plan.COUNTER_PAD.x - 2, z: plan.COUNTER_PAD.z });
    g.run(0.1);
    draw();
    expect(tut.guide.position.x).toBe(plan.BAR_PAD.x);
    expect(said()).toBe('Set the bowls out here / Walk in through the kitchen door');
    // all this while, the doors were shut: nobody's come, and there's been no fight
    expect(F().quiet).toBe(true);
    expect(F().bout).toMatchObject({ phase: 'prep', t: 0, came: 0 });
    expect(F().queue).toEqual([]);
    at(plan.BAR_PAD);
    g.runUntil(() => tut.learntLessons().includes('bowls'));
    // the first soup's out: the doors open, and the first local fight's fans come in for it
    expect(F().quiet).toBe(false);
    // the first fan fed: what fans and 💪 are, the 💪 glowing, read at the stall
    g.runUntil(() => fight.sold.n > 0, 30);
    g.run(0.1);
    expect(now()).toBe('fed');
    draw();
    expect(said()).toBe('Fans eat, then cheer your wrestler / 💪 up top counts them');
    expect($('power').classList.contains('teach')).toBe(true);
    wait(6);
    expect(now()).toBe('fed');
    wait(1.5);
    expect($('power').classList.contains('teach')).toBe(false);
    // then their chips, piled up on the hearth room's floor: walk over them to collect them, and no "Next goal" in
    // chips to save up for
    g.runUntil(() => F().piles.bar > 0, 30);
    expect(now()).toBe('scoop');
    draw();
    expect(said()).toBe('Collect your 🐡 chips / Walk over the pile');
    expect(tut.guide.position).toMatchObject({ x: plan.CHIP_SPOT.x, y: CY, z: plan.CHIP_SPOT.z });
    expect(goal()).toBe(null);
    const had = g.wallet.money;
    at(plan.CHIP_SPOT);
    g.run(1);
    expect(g.wallet.money).toBeGreaterThan(had);
    expect(tut.learntLessons()).toContain('scoop');
    // then that they pay in chips, Fugu keeping 30% (a tip, read there)
    expect(now()).toBe('chips');
    draw();
    expect(said()).toBe('Fans pay in 🐡 chips / Fugu keeps 30%');
    wait(10.5);
    expect(tut.learntLessons()).toContain('chips');

    // the fight: with an empty stall it'd be lost, so the loop's next job, saying what it's for
    at({ x: 0, z: 0 });
    F().stall.length = 0;
    g.run(1.1);
    expect(now()).toBe('gong');
    draw();
    expect(said()).toMatch(/^Fill the stall for a fight \/ /);
    expect(said().split(' / ')[1]).toMatch(JOB);
    // with it full, the cooking game first, so its bonus helps (played to the end, bland, it's learnt)
    while (fight.toStall(false));
    g.run(1.1);
    expect(now()).toBe('cook');
    fight.showResult(0);
    g.run(0.1);
    expect(tut.learntLessons()).toContain('cook');
    // then the gong
    while (fight.toStall(false));
    g.run(1.1);
    expect(now()).toBe('gong');
    draw();
    expect(tut.guide.position.x).toBe(plan.GONG_PAD.x);
    expect(said()).toBe('Ring the gong for a fight / A rival brings his own fans');
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    // (rung while a local fight's on, he walks in once it's over)
    at({ x: 0, z: 0 });
    if (F().called) {
      g.run(0.1);
      draw();
      expect(said()).toMatch(/^He walks in after this fight \/ /);
      g.runUntil(() => !!F().rush, fight.BOUT.fight + fight.BOUT.pay);
    }
    // during it, what wins it, back on the loop
    g.run(0.1);
    draw();
    expect(now()).toBe('gong');
    expect(said()).toBe('Feed his fans to win them / Win 21 before the 🔔 rings');
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 21 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush!.win).toBe(true);
    // his bell's rung: nothing more to feed, so off to watch the fight
    g.run(0.1);
    draw();
    expect(said()).toBe('Go watch the fight / Stand on the 👁️ spot');
    expect(tut.guide.position).toMatchObject({ x: plan.WATCH.x, z: plan.WATCH.z });
    g.runUntil(() => !F().practice, 30);
    g.run(0.1);
    $('fightCard').click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('gong');
    expect($('banner').textContent).not.toContain('Tutorial complete');

    // its prize spent at the shop counter: the end of it
    expect(now()).toBe('bench');
    draw();
    expect(tut.guide.position.x).toBe(plan.BENCH_PAD.x);
    expect(said()).toBe('Spend your prize here / Hire a washer and salter');
    at(plan.BENCH_PAD);
    g.run(0.1);
    draw();
    expect(said()).toBe('Pick an upgrade / Click a lit one to buy it');
    $('shopRows').querySelector<HTMLButtonElement>('[data-tile="rack"] button.cost')!.click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('bench');
    expect($('banner').textContent).toContain('Tutorial complete');
    expect($('banner').textContent).toContain(`Now take on Hakkaku ${FACE.octopus}`);
  }, 60_000); // 22.7 s of 30 on CI under coverage

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

  it('the practice fight: the sparring partner and a small crowd, and (with the shop counter known) winning it completes the tutorial', async () => {
    const { g, tut, plan, fight, F, at, draw } = await cellar({ ring: { practice: true }, learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls', 'cook', 'bench', 'chips', 'power'] });
    const { ring } = await import('../src/dohyo');
    at(plan.GONG_PAD);
    g.run(0.1);
    draw();
    // the gong calls him in, not Hakkaku, and the bubble keeps out of its panel's way
    expect($('gong').hidden).toBe(false);
    expect($('gongBoss').textContent).toBe('Sparring partner');
    expect([...$('gongCrowd').children].map(c => c.textContent)).toEqual([`${PRACTICE.face} Practice`, '👥 40', '💪 21', '🔔 30 s', '🐡 35']);
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
    expect($('fightCard').textContent).toContain(`Next: Hakkaku ${FACE.octopus} · hire a washer and salter`);
    g.run(0.1);
    expect(tut.learntLessons()).not.toContain('gong');
    $('fightCard').click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('gong');
    expect($('banner').textContent).toContain('Well done');
    expect($('banner').textContent).toContain('Tutorial complete');
    expect($('banner').textContent).toContain(`Now take on Hakkaku ${FACE.octopus}`);
    // and the practice is over for good, saved
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).ring.practice).toBe(false);
  }, 30_000); // 13.0 s of 15 on CI under coverage

  it('sends them back for more when a line has too few for a batch, never to a pot that would wait', async () => {
    const { g, tut, plan, fight, F, at, draw, now, said } = await cellar({ learnt: [...STAGE1, 'arrive', 'bins'] });
    // two dried rice in hand and a full batch of salted fish on the ledge
    F().pantry.fish = fight.PER_BATCH;
    F().pantry.rice = 2;
    at({ x: plan.BIN_PADS.rice.x - 3, z: plan.BIN_PADS.rice.z });
    g.run(0.1);
    draw();
    expect(now()).toBe('prep');
    expect(tut.guide.position.x).toBe(plan.BIN_PADS.rice.x);
    expect(said()).toBe(`Grab more rice / The pot needs ${fight.PER_BATCH}`);
  });

  it('a game that has had its practice fight: the gong only once the forecast says Hakkaku is beaten', async () => {
    const { g, tut, plan, fight, F, at, draw, now, said } = await cellar({ learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls', 'cook', 'bench', 'chips', 'power'] });
    at({ x: 0, z: 0 });
    g.run(1.1);
    // an empty kitchen: it'd be lost, so the loop's next job
    expect(now()).toBe('gong');
    draw();
    expect(said()).toMatch(/^Fill the stall for a fight \/ /);
    // a kitchen that would win it
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) fight.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) fight.hire(r);
    // (asking the lesson what it says, not drawing every step: a forecast a second is slow enough)
    g.runUntil(() => tut.lesson.now?.say()[0].startsWith('Ring the gong') ?? false, 120);
    const f = fight.forecast()!;
    expect(f.turned).toBeGreaterThanOrEqual(fight.toBeat(f.boss));
    draw();
    expect(tut.guide.position.x).toBe(plan.GONG_PAD.x);
    expect(said()).toBe('Ring the gong for a fight / A rival brings his own fans');

    // at the gong its panel's up, and the bubble keeps out of its way
    at(plan.GONG_PAD);
    g.run(0.1);
    draw();
    expect($('gong').hidden).toBe(false);
    expect($('coach').hidden).toBe(true);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 71 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.runUntil(() => F().beaten === 1, 30);
    // the fight's card first; then, once it's away, the tutorial's done
    expect($('fightCard').hidden).toBe(false);
    g.run(0.1);
    expect(tut.learntLessons()).not.toContain('gong');
    $('fightCard').click();
    g.run(0.1);
    expect(tut.learntLessons()).toContain('gong');
    expect($('banner').classList.contains('on')).toBe(true);
    expect($('banner').textContent).toContain('Well done');
    expect($('banner').textContent).toContain('Four more bosses to go');
    // (a kitchen run ahead in the forecast once a second for up to two minutes: more than the default 15 s on CI)
  }, 45_000);

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
    // (three games loaded, each its own: more than the default 15 s on a slow CI runner)
  }, 45_000);

  it("a save from before the cellar's lessons counts what it has done down there", async () => {
    // two bosses beaten: everything's known
    const old = await cellar({ ring: { beaten: 2, tier: 1, hires: { washer: true, salter: true, picker: true } } });
    old.g.run(0.1);
    expect(old.tut.learntLessons()).toEqual(expect.arrayContaining([...NEWER, 'bins', 'prep', 'pot', 'bowls', 'bench', 'gong', 'chips', 'grow']));
    // (but the cooking game's new to everyone: shown once, before a fight it'd win, as it's no basic it leaves the
    // cellar known)
    expect(['cook', null]).toContain(old.now());
    expect(old.tut.cellarKnown()).toBe(true);
  });

  it("a save that only just came down still has the cellar's lessons to come, and stage 1's aren't shown again", async () => {
    const { g, now, tut } = await cellar({ ring: { sparred: false } });
    g.run(0.1);
    expect(now()).toBe('arrive');
    expect(tut.learntLessons()).toEqual(STAGE1);
  });

  it("a save from before the arriving and fans cards skips them once it's served soup, and has them to come if not", async () => {
    const served = await cellar({ learnt: [...STAGE1, 'bins', 'prep'], ring: { stall: [false, false] } });
    served.g.run(0.1);
    expect(served.tut.learntLessons()).toEqual(expect.arrayContaining(NEWER));
    expect(served.now()).not.toBe('arrive');
    const fresh = await cellar({ learnt: [...STAGE1, 'bins', 'prep'] });
    fresh.g.run(0.1);
    expect(fresh.now()).toBe('arrive');
    // (two games loaded)
  }, 30_000);

  it("Mama Moray's chips: once her place is bought, the first time her cut's piled up in her hall, a tip to collect it", async () => {
    const { g, tut, plan, F, CY, at, draw, now, said } = await cellar({
      ring: { beaten: 2, slide: true, mama: true }, learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls', 'cook', 'gong', 'bench', 'scoop', 'chips'],
    });
    at({ x: 0, z: 0 });
    g.run(0.1);
    expect(now()).not.toBe('mamaChips');
    F().piles.mama = 6;
    g.run(0.1);
    expect(now()).toBe('mamaChips');
    draw();
    expect(said()).toBe('Mama pays your cut here / Walk over it to collect');
    expect(tut.guide.position).toMatchObject({ x: plan.MAMA_CHIPS.x, y: CY, z: plan.MAMA_CHIPS.z });
    at(plan.MAMA_CHIPS);
    g.run(1);
    expect(F().piles.mama).toBe(0);
    expect(tut.learntLessons()).toContain('mamaChips');
    // (once only)
    F().piles.mama = 6;
    at({ x: 0, z: 0 });
    g.run(0.1);
    expect(now()).not.toBe('mamaChips');
  }, 30_000);

  it('a game from before the chip piles learns to collect them too, without the banner again', async () => {
    const { g, tut, plan, F, at, now } = await cellar({
      ring: { beaten: 2 }, learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls', 'cook', 'gong', 'bench', 'chips', 'grow'],
    });
    at({ x: 0, z: 0 });
    F().piles.bar = 10;
    g.run(0.1);
    expect(now()).toBe('scoop');
    at(plan.CHIP_SPOT);
    g.run(1);
    expect(tut.learntLessons()).toContain('scoop');
    expect($('banner').textContent).not.toContain('Tutorial complete');
  }, 30_000);

  it('the cooking game at the pot, just before a fight the stall would win: played through once, never toward the banner', async () => {
    const { g, tut, plan, fight, at, draw, now, said } = await cellar({ ring: { sparred: false }, learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls'] });
    const show = await import('../src/chanko');
    at({ x: plan.POT_PAD.x - 3, z: plan.POT_PAD.z });
    g.run(1.1);
    // (an empty stall: the loop first)
    expect(now()).toBe('gong');
    while (fight.toStall(false));
    g.run(1.1);
    expect(now()).toBe('cook');
    draw();
    expect(tut.guide.position).toMatchObject({ x: plan.POT_PAD.x, z: plan.POT_PAD.z });
    expect(said()).toBe('Cook a bonus pot first / Bigger pots for 70 seconds');
    // at the pot, how to start it; the bubble stays, over the player's head
    at(plan.POT_PAD);
    g.run(0.1);
    draw();
    expect($('coach').hidden).toBe(false);
    expect(said()).toBe('Press E to start / Good cooking makes bigger pots');
    // while it's on, the bubble keeps out of its way
    $('cook').click();
    g.run(0.6);
    expect(show.showing()).toBe(true);
    draw();
    expect($('coach').hidden).toBe(true);
    // left half way, it's to carry on
    $('showGo').click();
    g.run(0.5);
    show.stopShow();
    g.run(1);
    expect(F_show(fight)).not.toBeNull();
    draw();
    expect(now()).toBe('cook');
    expect(said()).toBe('Carry on your cooking game / Press E or Cook');
    expect(tut.learntLessons()).not.toContain('cook');
    // played to the end (its result card), and it's learnt, with no banner
    fight.showResult(6);
    g.run(0.1);
    expect(tut.learntLessons()).toContain('cook');
    expect($('banner').textContent).not.toContain('Tutorial complete');
    // (nothing to point at while its bonus runs: on to the gong)
    expect(now()).not.toBe('cook');
  });

  it('a lost practice fight says to fill the stall and try again', async () => {
    const { g, fight, F, at, draw, now, said } = await cellar({ ring: { sparred: false }, learnt: [...STAGE1, ...NEWER, 'bins', 'prep', 'pot', 'bowls', 'cook'] });
    at({ x: 0, z: 0 });
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => !F().rush, 31 + fight.WALK_IN + 30);
    expect(F().practice).toBe(true);
    // (once its card's away)
    g.run(3);
    $('fightCard').click();
    g.run(1.1);
    draw();
    expect(now()).toBe('gong');
    expect(said()).toMatch(/^Fill the stall, then try again \/ /);
  }, 30_000);
});
