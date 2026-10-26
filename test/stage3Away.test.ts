// Stage 3, one level at a time: with the player upstairs, the cellar holds still and isn't drawn, and what it would
// make on its own (its hands, its fans, Mama Moray's) comes in at a steady rate instead, worked out from a copy of it
// run ahead (fight.ts, idleRate; ring.ts). Down in the cellar, the world up top holds still in its turn, and its tills
// pay the player's share of what they were taking (front.ts). Each is as it was left when the player's back.
import { Box3, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];
const HANDS = { washer: true, salter: true, picker: true, attendant: true, cook: true };
const LINES = { rice: { n: 6, up: 1 }, fish: { n: 6, up: 1 }, mush: { n: 6, up: 1 } };
/** A cellar with everything bought, four bosses down. */
const BUSY = { beaten: 4, tier: 3, slide: true, resto: 3, pantry: { rice: 40, fish: 40, mush: 40 }, hires: HANDS, lines: LINES };
/** A game in stage 3, the player up top (`level` 0) or down in the cellar (1). */
async function game(level: 0 | 1, ring: object, save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level, reviews: Array(20).fill(5), ring, ...save } as SaveFixture);
  const [fight, levelCull, render, cellar, layout] = await Promise.all([
    import('../src/fight'), import('../src/levelCull'), import('../src/render'), import('../src/cellar'), import('../src/layout'),
  ]);
  return { g, fight, levelCull, render, cellar, layout, F: () => fight.F };
}
/** Chips made over `s` seconds: into the wallet, or piled up on the cellar's floor to be scooped (chipPiles.ts). */
const chipsOver = ({ g, F }: Awaited<ReturnType<typeof game>>, s: number) => {
  const held = () => g.wallet.money / 1000 + F().piles.bar + F().piles.mama, m0 = held();
  for (let i = 0; i < s; i++) g.run(1);
  return held() - m0;
};

describe('the cellar, with the player upstairs', () => {
  it('holds still, and pays what it makes on its own, as much as it makes running', async () => {
    const running = chipsOver(await game(1, BUSY), 300);
    const up = await game(0, BUSY), { F, fight } = up;
    const rate = fight.idleRate(), t = F().t, crew = JSON.stringify(F().crew);
    expect(rate * 60).toBeGreaterThan(100);
    const paid = chipsOver(up, 300);
    // (nothing moves down there: its clock, its hands)
    expect([F().t, JSON.stringify(F().crew)]).toEqual([t, crew]);
    // at the rate it worked out, a chip at a time, and within a few percent of the cellar running for those 5 minutes
    expect(paid).toBeCloseTo(rate * 300, -1);
    expect(Math.abs(paid - running) / running).toBeLessThan(0.08);
  }, 180_000); // (ten minutes of a busy cellar: over the minute under coverage on CI)

  it('pays nothing before there are hands to work it, as it makes nothing on its own', async () => {
    const up = await game(0, { beaten: 1, lines: { mush: { n: 1 } } });
    expect(up.fight.idleRate()).toBe(0);
    expect(chipsOver(up, 60)).toBe(0);
  }, 30_000);

  it('runs as ever with a boss called, up top or not', async () => {
    const { g, F, fight, layout } = await game(1, BUSY);
    expect(fight.ringGong()).toBe(true);
    const { setLevel } = await import('../src/stage');
    setLevel(false);
    expect(layout.level.down).toBe(false);
    const t = F().t;
    g.run(2);
    expect(F().t).toBeGreaterThan(t + 1.5);
    expect(fight.idleRate()).toBe(0);
  }, 30_000);

  it("isn't drawn from up top, and is again back down", async () => {
    const { g, levelCull, render, cellar, layout } = await game(1, BUSY);
    g.run(2);
    const { setLevel } = await import('../src/stage');
    setLevel(false);
    g.run(1);
    const below = (o: Object3D) => !!o.userData.below;
    const fans = render.scene.children.filter(o => below(o) && o !== cellar.cellar);
    expect(fans.length).toBeGreaterThan(0);
    const was = render.scene.children.filter(o => o.visible);
    expect(cellar.cellar.visible).toBe(true);
    const show = levelCull.hideAbove();
    // (for the render: the cellar, its fans' meshes and whatever's wholly down there, and nothing up in the world)
    const gone = was.filter(o => !o.visible), box = new Box3();
    expect(gone).toContain(cellar.cellar);
    expect(fans.every(o => !o.visible)).toBe(true);
    for (const o of gone) expect(below(o) || box.setFromObject(o).max.y < layout.CELLAR_Y + 15).toBe(true);
    show();
    expect(was.every(o => o.visible)).toBe(true);
    // down the ladder: drawn
    setLevel(true);
    const show2 = levelCull.hideAbove();
    expect([cellar.cellar.visible, fans.every(o => o.visible)]).toEqual([true, true]);
    show2();
  }, 30_000);

  it('keeps its wrestlers down in it, loaded with the player up top', async () => {
    // (they're only moved to the ring by its frames, which don't run while it holds still: shown where they were made,
    // they stood in the middle of the restaurant)
    const { g, layout } = await game(0, { beaten: 1, lines: { mush: { n: 1 } } });
    g.run(2);
    const { ring } = await import('../src/dohyo');
    const shown = [ring.champ, ring.rival, ring.partner, ring.gyoji].filter(o => o.visible);
    expect(shown.length).toBeGreaterThan(0);
    for (const o of shown) expect(new Box3().setFromObject(o).max.y).toBeLessThan(layout.CELLAR_Y + 15);
  }, 30_000);
});

describe('the world up top, with the player down in the cellar', () => {
  it('holds still: the belt, the diners', async () => {
    const { g } = await game(1, BUSY, { plates: 30 });
    g.run(2);
    const { sushi } = g.restaurant, was = JSON.stringify([sushi.offset, sushi.t, sushi.diners.map(d => d.g.position)]);
    g.run(30);
    expect(JSON.stringify([sushi.offset, sushi.t, sushi.diners.map(d => d.g.position)])).toBe(was);
  }, 30_000);

  it("pays the player's share of what its tills were taking: none while it's Mr. Fugu's rent, all once he's bought out", async () => {
    // (a cellar that makes nothing on its own yet: whatever comes in down there is from up top)
    const { g, F } = await game(0, { beaten: 1, lines: { mush: { n: 1 } } }, { plates: 30 });
    const front = await import('../src/front'), { setLevel } = await import('../src/stage');
    g.run(120);
    const rate = front.tillRate();
    expect(rate).toBeGreaterThan(0);
    setLevel(true);
    let m0 = g.wallet.money;
    g.run(30);
    expect(g.wallet.money).toBe(m0);
    F().boughtOut = true; front.front.boughtOut = true;
    m0 = g.wallet.money;
    g.run(60);
    expect(g.wallet.money - m0).toBeGreaterThan(rate * 60 - 2);
    // (and up to a tick's worth over: sixty seconds of 1/60 s ticks can come to one tick more)
    expect(g.wallet.money - m0).toBeLessThanOrEqual(rate * (60 + 1 / 60) + 1);
    expect(front.tillRate()).toBe(rate);
  }, 60_000);
});
