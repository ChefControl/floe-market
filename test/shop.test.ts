// The upgrade squares: repeatable upgrades for prices, customers (marketing) and speed (the crew), and the
// overview of every modifier in the HUD.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const rowsText = () => [...$('shopRows').children].map(r => r.textContent);

describe('the upgrade square', () => {
  it('opens from anywhere on the square, its corners too, and is drawn square with the world', async () => {
    const g = await loadGame({ money: 50 });
    const [at] = g.shop.SHOPS;
    g.placePlayer(at.x + 0.85, at.z - 0.85); // outside a circle that size, inside the square
    g.run(0.05);
    expect($('shop').hidden).toBe(false);
    g.placePlayer(at.x + 1.1, at.z);
    g.run(0.05);
    expect($('shop').hidden).toBe(true);
  });

  it("opens this stage's upgrades while the player stands on it", async () => {
    const g = await loadGame({ money: 50 });
    const [at] = g.shop.SHOPS;
    g.run(0.05);
    expect($('shop').hidden).toBe(true);
    g.placePlayer(at.x, at.z);
    g.run(0.05);
    expect($('shop').hidden).toBe(false);
    expect($('shopTitle').textContent).toBe('Market upgrades');
    expect(rowsText()).toEqual([
      '🐟Fine fillets · level 1Prices +0% → +25%$40',
      '📣Marketing · next: PostersCustomers +0% → +20%$60',
    ]);
    const [fillets, marketing] = [...$('shopRows').children] as HTMLButtonElement[];
    expect([fillets.disabled, marketing.disabled]).toEqual([false, true]); // only $50
    g.placePlayer(0, 0);
    g.run(0.05);
    expect($('shop').hidden).toBe(true);
  });

  it('sells crew training once there is a crew: the first runner', async () => {
    const g = await loadGame({ money: 1e9 });
    const [at] = g.shop.SHOPS;
    expect(g.shop.buyMod('training')).toBe(false);
    g.placePlayer(at.x, at.z);
    g.run(0.05);
    expect(rowsText()).toHaveLength(2);
    vi.useFakeTimers();
    g.unlocks.applyUnlock('runner');
    vi.advanceTimersByTime(2000);
    expect($('toast').textContent).toBe('New at the Upgrade square: Crew training');
    g.run(0.05);
    expect(rowsText()[2]).toBe('💪Crew training · level 1Fish, chop, runners +0% → +15%$80');
    expect(g.shop.buyMod('training')).toBe(true);
  });

  it('crew training speeds up the runners too, up to twice as fast', async () => {
    const g = await loadGame({ tiles: bought('runner'), money: 1e9 });
    g.run(0.05);
    expect(g.runner.runners[0].speed).toBe(3.3);
    g.shop.buyMod('training');
    g.run(0.05);
    expect(g.runner.runners[0].speed).toBeCloseTo(3.3 * 1.15);
    for (let i = 0; i < 7; i++) g.shop.buyMod('training');
    g.run(0.05);
    expect(g.runner.runners[0].speed).toBeCloseTo(6.6);
  });

  it('buys a level with a tap: better products sell for more', async () => {
    const g = await loadGame({ money: 50 });
    const [at] = g.shop.SHOPS, { C1, SLED } = g.counters;
    g.placePlayer(at.x, at.z);
    g.run(0.05);
    ($('shopRows').children[0] as HTMLButtonElement).click();
    expect(g.wallet.money).toBe(10);
    expect(g.economy.mods.fillets).toBe(1);
    expect([C1.price, SLED.price]).toEqual([5, 8]);
    expect($('toast').textContent).toBe('Fine fillets: level 1');
    expect(rowsText()[0]).toBe('🐟Fine fillets · level 2Prices +25% → +56%$64');
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).mods).toMatchObject({ fillets: 1 });
    expect(g.shop.buyMod('fillets')).toBe(false); // can't afford the next one
  });

  it('marketing brings customers in faster and makes room for more in the queue, up to a limit', async () => {
    const g = await loadGame({ money: 1e9 });
    const { C1 } = g.counters;
    for (let i = 0; i < 8; i++) expect(g.shop.buyMod('marketing')).toBe(true);
    expect(g.shop.buyMod('marketing')).toBe(false);
    expect($('toast').textContent).toBe('Marketing: TV ad');
    C1.patience = 1e9;
    g.runUntil(() => C1.queue.length === 14, 40);
    // the long queue turns the corner rather than running out across the road
    g.runUntil(() => C1.queue.every(c => c.arrived), 20);
    expect(Math.max(...C1.queue.map(c => c.g.position.x))).toBeLessThan(8);
  });

  it('crew training makes fishing and chopping faster', async () => {
    const slices = async (levels: number) => {
      const g = await loadGame({ tiles: bought('runner'), money: 1e9 });
      for (let i = 0; i < levels; i++) g.shop.buyMod('training');
      g.placePlayer(-4.5, -5.2);
      g.run(6);
      return g.stations.pile.n;
    };
    expect(await slices(8)).toBeGreaterThan(await slices(0) * 1.5);
  });

  it("stage 2's circle sits in the restaurant, with the kitchen crew and the sushi marketing", async () => {
    const g = await loadGame({ tiles: bought('sushi', 'premium'), money: 1e9 });
    const [, at] = g.shop.SHOPS;
    g.placePlayer(at.x, at.z);
    g.run(0.05);
    expect($('shopTitle').textContent).toBe('Restaurant upgrades');
    expect(rowsText()[2]).toBe('🧑‍🍳Kitchen crew · level 1Kitchen +0% → +15%$1,000');
    g.shop.buyMod('specials');
    expect(g.restaurant.platePrice()).toBe(Math.round(30 * 1.25 * 1.6));
    expect(g.counters.TAKEOUT.price).toBe(Math.round(35 * 1.25 * 1.6));
    for (let i = 0; i < 8; i++) g.shop.buyMod('promo');
    expect($('toast').textContent).toBe('Marketing: World famous');
    g.run(0.05);
    expect(rowsText()[1]).toBe('📣Marketing · World famousCustomers +330% · fully upgradedMax');
  });

  it('the kitchen crew speeds up the runner too, once the restaurant is open', async () => {
    const g = await loadGame({ tiles: bought('runner'), money: 1e9 });
    for (let i = 0; i < 8; i++) g.shop.buyMod('crew');
    g.run(0.05);
    expect(g.runner.runners[0].speed).toBe(3.3); // not in the market: crew training is the market's
    g.unlocks.applyUnlock('sushi', true);
    g.run(0.05);
    expect(g.runner.runners[0].speed).toBeCloseTo(6.6); // twice as fast, at most
  });

  it('the kitchen crew makes the chefs faster, but not the rice: more of that takes more terraces', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy'), money: 1e9, fish: 1, rice: 1 });
    for (let i = 0; i < 8; i++) g.shop.buyMod('crew');
    g.restaurant.sushi.spawnT = Infinity;
    g.runUntil(() => g.restaurant.sushi.slots.some(Boolean), 1.2);
    g.run(16 / 1.15 ** 8 + 0.1);
    expect(g.rice.field.cells.every(c => c.grow >= 1)).toBe(false);
  });
});

describe('the modifier overview', () => {
  it('lists every modifier in play, as a percentage, with the rating counted into customers', async () => {
    const g = await loadGame({ money: 1e9 });
    g.rate(5);
    g.shop.buyMod('fillets'); g.shop.buyMod('fillets');
    g.run(0.05);
    expect([...$('mods').children].map(r => r.textContent)).toEqual([
      '🐟Prices+56%', '📣Customers+40%', '💪Speed+0%', // ★5 brings them in ×1.4
    ]);
    expect($('mods').children[0].lastElementChild!.className).toBe('up');
    g.shop.buyMod('marketing');
    g.run(0.05);
    expect($('mods').children[1].textContent).toBe('📣Customers+68%'); // ×1.2 marketing, ×1.4 rating
    g.rate(1);
    g.run(0.05);
    expect($('mods').children[1].textContent).toBe('📣Customers−28%'); // ×1.2, ×0.6
    expect($('mods').children[1].lastElementChild!.className).toBe('down');
  });

  it("in stage 2, counts the premium menu in prices, and leaves out fishing, which the kitchen can't outpace", async () => {
    const g = await loadGame({ tiles: bought('sushi', 'premium'), money: 1e9 });
    g.shop.buyMod('training');
    g.run(0.05);
    expect([...$('mods').children].map(r => r.textContent)).toEqual([
      '🍣Prices+60%', '📣Customers+0%', '🧑‍🍳Kitchen+0%',
    ]);
  });

  it('keeps upgrade levels across a reload, and converts test builds that had price tiles', async () => {
    const g1 = await loadGame({ tiles: bought('runner'), money: 1e9 });
    g1.shop.buyMod('marketing'); g1.shop.buyMod('training');
    const g2 = await loadGame(localStorage.getItem('floe-market-v1')!);
    expect(g2.economy.mods).toMatchObject({ marketing: 1, training: 1 });
    const old = g2.saveMod.migrate({ v: 4, tiles: [{ id: 'steak', level: 3 }, { id: 'menu', level: 2 }], mods: { crew: 99 } });
    expect(old.mods).toEqual({ fillets: 3, specials: 2, crew: 8 });
  });
});
