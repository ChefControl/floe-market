// The stage 1 tutorial: a gold arrow and a bubble lead a new player round the market's loop one idea at a time, then
// point out the upgrade square and the star ratings, and never show the same player an idea twice.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const KEY = 'floe-market-tutorial';

/** A game (fresh unless saved), the tutorial, and a camera that looks at a spot from the usual angle. */
async function setup(save?: Parameters<typeof loadGame>[0]) {
  const g = await loadGame(save);
  const tut = await import('../src/tutorial');
  const { camera, OFF } = g.render;
  const look = (x: number, z: number) => {
    camera.position.set(x + OFF.x, OFF.y, z + OFF.z);
    camera.lookAt(x, 0, z);
    camera.updateMatrixWorld();
  };
  const now = () => tut.lesson.now?.id ?? null;
  /** Looks at the player and draws a frame of the tutorial. */
  const draw = (dt = 0.1) => { const p = g.player.g.position; look(p.x, p.z); tut.drawTutorial(dt); };
  const said = () => $('coach').querySelector('b')!.textContent + ' / ' + $('coach').querySelector('small')!.textContent;
  return { g, tut, look, now, draw, said };
}

describe('the tutorial', () => {
  it("leads a new player round the market's loop, one step at a time", async () => {
    const { g, tut, now, draw, said } = await setup();
    const { PAD, PILE } = g.stations, { C1 } = g.counters;
    g.run(0.1);
    expect(now()).toBe('fish');
    draw();
    expect(tut.guide.visible).toBe(true);
    expect(tut.guide.position.x).toBe(PAD.x);
    expect($('coach').hidden).toBe(false);
    expect(said()).toBe('Stand here to fish / They get chopped into slices');
    expect($('coach').classList.contains('edge')).toBe(false); // over the arrow, in view

    // standing there doing it, the arrow steps aside
    g.placePlayer(PAD.x, PAD.z);
    draw();
    expect(tut.guide.visible).toBe(false);
    expect($('coach').hidden).toBe(true);
    g.runUntil(() => now() === 'pick');
    draw();
    expect(tut.guide.position.x).toBe(PILE.x);
    expect(said()).toBe('Pick up the fish slices / ');
    expect($('coach').querySelector('small')!.hidden).toBe(true);

    g.runUntil(() => g.stations.pile.n >= 3); // the slices land
    g.placePlayer(PILE.x, PILE.z);
    g.runUntil(() => now() === 'sell');
    draw();
    expect(said()).toBe('Drop them on the counter / Customers buy fish here');

    g.placePlayer(C1.dropPos!.x, C1.dropPos!.z);
    g.runUntil(() => now() !== 'sell');
    expect(now()).toBe(null); // no cash to collect yet
    g.runUntil(() => now() === 'cash', 60);
    draw();
    expect(said()).toBe('Collect the cash / Walk over it');
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    g.runUntil(() => now() !== 'cash');
    expect(now()).toBe(null); // not enough for an upgrade yet

    // an upgrade's tile, once there's the cash for it
    g.wallet.money = 45;
    g.run(0.1);
    expect(now()).toBe('buy');
    const pack = g.unlocks.tiles.find(t => t.id === 'pack')!;
    g.placePlayer(pack.x, pack.z);
    draw();
    expect(tut.guide.visible).toBe(true); // stays up there: what to do needs saying
    expect(said()).toBe('Buy Bigger arms here / Stand on it and hold E');
    g.press('e');
    g.runUntil(() => pack.done);
    g.press('e', 'keyup');
    g.run(0.1);
    expect(tut.learntLessons()).toEqual(['fish', 'pick', 'sell', 'cash', 'buy']);
    expect(now()).toBe(null); // $15 left: nothing at the upgrade square for that yet

    g.wallet.money = 40;
    g.run(0.1);
    expect(now()).toBe('shop');
    g.placePlayer(g.shop.SHOPS[0].x, g.shop.SHOPS[0].z);
    g.run(0.1);
    expect(now()).toBe(null);
    expect(tut.learntLessons()).toContain('shop');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toContain('shop'); // kept on the device
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).learnt).toEqual(['fish', 'pick', 'sell', 'cash', 'buy', 'shop']);
  });

  it('points out a tile that needs a better rating, and the rating, until the player has read it', async () => {
    const { g, tut, now, look, said } = await setup({ tiles: bought('pack', 'turret', 'roulette') });
    g.run(0.1);
    expect(now()).toBe('stars');
    const runner = g.unlocks.tiles.find(t => t.id === 'runner')!;
    look(runner.x, runner.z);
    tut.drawTutorial(0.1);
    expect(said()).toBe('Opens at ★3.5 / Serve customers quickly for better reviews');
    expect($('stars').classList.contains('teach')).toBe(true);
    expect(tut.guide.children[1].visible).toBe(false); // no ring: there's nothing to do on the tile yet
    for (let i = 0; i < 70; i++) { tut.drawTutorial(0.1); g.run(0.1); }
    expect(now()).toBe(null);
    tut.drawTutorial(0.1);
    expect($('stars').classList.contains('teach')).toBe(false);
    expect($('coach').hidden).toBe(true);
    expect($('banner').classList.contains('on')).toBe(false); // the upgrade square is still to come
  });

  it('says the tutorial is complete when the last idea is learnt, and leaves the rest to the player', async () => {
    const { g, tut, now } = await setup({ tiles: bought('pack'), money: 100, learnt: ['stars'] });
    g.run(0.1);
    expect(now()).toBe('shop');
    expect($('banner').classList.contains('on')).toBe(false);
    g.placePlayer(g.shop.SHOPS[0].x, g.shop.SHOPS[0].z);
    g.run(0.1);
    expect(tut.learntLessons()).toHaveLength(7);
    expect($('banner').classList.contains('on')).toBe(true);
    expect($('banner').textContent).toBe('Well doneTutorial completeThe rest is up to you. Go make it big!');
    g.run(3);
    expect($('banner').classList.contains('on')).toBe(true);
    g.run(1.1);
    expect($('banner').classList.contains('on')).toBe(false);
  });

  it('waits at the edge of the screen, pointing the way, while the spot is off it', async () => {
    const { g, tut, look } = await setup();
    g.run(0.1);
    look(g.stations.PAD.x + 40, g.stations.PAD.z); // it's off to the left
    tut.drawTutorial(0.1);
    expect($('coach').hidden).toBe(false);
    expect($('coach').classList.contains('edge')).toBe(true);
    const [x] = $('coach').style.transform.match(/-?[\d.]+/g)!.map(Number);
    expect(x).toBeLessThan(100);
    const turn = Number(($('coach').querySelector('.dir') as HTMLElement).style.transform.match(/rotate\((-?[\d.]+)/)![1]);
    expect(Math.abs(turn)).toBeGreaterThan(2); // pointing left
    expect(tut.lesson.viewed).toBe(0); // not seen yet
  });

  it("isn't shown again to a player who has learnt it on this device, even in a new game", async () => {
    const { g, now } = await setup();
    localStorage.setItem(KEY, JSON.stringify(['fish', 'pick', 'nonsense']));
    g.run(0.1);
    expect(now()).toBe('sell');
  });

  it('follows the player in their save, to another device', async () => {
    const { g, now, tut } = await setup({ learnt: ['fish', 'pick', 'sell'] });
    g.run(0.1);
    expect(now()).toBe(null); // the cash lesson waits for cash on the counter
    expect(tut.learntLessons()).toEqual(['fish', 'pick', 'sell']);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['fish', 'pick', 'sell']);
  });

  it("counts what a game from before the tutorial has done, and stays out of stage 2", async () => {
    const old = await setup({ tiles: bought('pack'), money: 100 });
    old.g.run(0.1);
    expect(old.now()).toBe('shop'); // the loop and buying are known; the upgrade square isn't
    const s2 = await setup({ tiles: bought(...MARKET, 'sushi'), money: 100000 });
    s2.g.run(0.1);
    expect(s2.now()).toBe(null);
    s2.draw();
    expect(s2.tut.guide.visible).toBe(false);
    expect(s2.tut.learntLessons()).toEqual(['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'stars']);
    expect($('banner').classList.contains('on')).toBe(false); // nothing to celebrate: it was all known already
  });

  it('works without storage', async () => {
    const { g, now } = await setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    g.run(0.1);
    expect(now()).toBe('fish');
    g.placePlayer(g.stations.PAD.x, g.stations.PAD.z);
    g.runUntil(() => now() === 'pick');
  });
});
