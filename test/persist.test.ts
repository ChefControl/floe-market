// Per-device progress: what's saved, migration, damaged saves, and multiple tabs.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const KEY = 'floe-market-v1';
const stored = () => JSON.parse(localStorage.getItem(KEY)!);

describe('saving progress', () => {
  it('round-trips everything through a reload', async () => {
    const tiles = [...bought('pack', 'sushi', 'paddy', 'sled', 'kiosk'), { id: 'turret', paid: 20, done: false }];
    const g1 = await loadGame({
      money: 50, tiles, reviews: [5, 4], pile: 5, back: 4, backRice: 2, fish: 3, rice: 2, plates: 4,
      cash: 30, boxes: 2, tcash: 18, field: 3,
    });
    g1.saveMod.save();
    expect(stored().v).toBe(4);

    const g2 = await loadGame(localStorage.getItem(KEY)!);
    const { restaurant: r, counters: { TAKEOUT } } = g2;
    expect(g2.wallet.money).toBe(50);
    expect(g2.player.back.cap).toBe(14);
    expect(g2.rating.reviews).toEqual([5, 4]);
    expect(g2.unlocks.tiles.find(t => t.id === 'turret')!.paid).toBe(20);
    expect(g2.stations.pile.items).toHaveLength(5);
    expect(g2.player.back.count('fish')).toBe(4);
    expect(g2.player.back.count('rice')).toBe(2);
    expect(r.fishTray.items).toHaveLength(3);
    expect(r.ricePot.items).toHaveLength(2);
    expect(r.sushi.slots.filter(Boolean)).toHaveLength(4);
    expect(g2.cashAt({ cash: r.register })).toBe(30);
    expect(TAKEOUT.stock.items).toHaveLength(2);
    expect(g2.cashAt(TAKEOUT)).toBe(18);
    expect(g2.rice.fieldStack.items).toHaveLength(3);
  });

  it('round-trips the stage 1 counters', async () => {
    const g1 = await loadGame({ tiles: bought('sled'), pile: 2, c1: 3, c1c: 12, c2: 5, c2c: 18 });
    expect(g1.restaurant.ricePot.items).toHaveLength(0); // no rice until the restaurant opens
    g1.saveMod.save();
    expect(stored()).toMatchObject({ pile: 2, c1: 3, c1c: 12, c2: 5, c2c: 18, fish: 0, cash: 0 });
    const g2 = await loadGame(localStorage.getItem(KEY)!);
    expect(g2.counters.C1.stock.items).toHaveLength(3);
    expect(g2.cashAt(g2.counters.C1)).toBe(12);
    expect(g2.counters.SLED.stock.items).toHaveLength(5);
    expect(g2.cashAt(g2.counters.SLED)).toBe(18);
  });

  it("puts the sled window's steaks and cash somewhere if it isn't open", async () => {
    const g = await loadGame({ money: 1, c2: 4, c2c: 18 });
    expect(g.wallet.money).toBe(19);
    expect(g.stations.pile.items).toHaveLength(4);
  });

  it("counts the closed counter's last steaks and cash toward the restaurant", async () => {
    const g = await loadGame({ c1: 2 });
    const { C1 } = g.counters;
    g.runUntil(() => (C1.queue[0]?.hands.n ?? 0) > 0);
    const got = C1.queue[0].got;
    g.unlocks.applyUnlock('sushi');
    g.saveMod.save();
    expect(stored()).toMatchObject({ c1: 0, c1c: 0, fish: 2 - got, cash: got * 4 });
  });

  it('counts cash and fish that are still in the air', async () => {
    const g = await loadGame({ c1c: 8 });
    const { C1 } = g.counters;
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    g.run(0.05); // bills are flying to the player
    expect(g.wallet.money).toBeLessThan(8);
    g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'turret'); // a fish is being reeled in
    g.saveMod.save();
    expect(stored()).toMatchObject({ money: 8, pile: 3 });
  });

  it("puts back what workers and customers are holding: porters' loads, a chef's ingredients, unpaid boxes", async () => {
    const after = async (save: Parameters<typeof loadGame>[0], until: (g: Awaited<ReturnType<typeof loadGame>>) => boolean) => {
      const g = await loadGame(save);
      g.runUntil(() => until(g), 30);
      g.saveMod.save();
      return stored();
    };
    expect(await after({ tiles: bought('sushi', 'runner'), pile: 3 }, g => g.runner.runner!.back.items.length === 3)).toMatchObject({ pile: 3 });
    expect(await after({ tiles: bought('sushi', 'paddy', 'porter'), field: 2 }, g => g.rice.porter!.back.items.length === 2)).toMatchObject({ field: 2 });
    expect(await after({ tiles: bought('sushi'), fish: 1, rice: 1 }, g => g.restaurant.sushi.chefs[0].state === 'slice')).toMatchObject({ fish: 1, rice: 1 });
    expect(await after({ tiles: bought('sushi', 'kiosk'), boxes: 5 }, g => (g.counters.TAKEOUT.queue[0]?.hands.n ?? 0) > 0)).toMatchObject({ boxes: 5 });
  });

  it("loses nothing mid-meal: diners' plates and unpaid bills are saved", async () => {
    const g = await loadGame({ tiles: bought('sushi'), plates: 16 });
    const { sushi } = g.restaurant;
    g.runUntil(() => sushi.diners.some(d => d.bill.length > 0 && d.plate), 60);
    g.saveMod.save();
    const s = stored();
    expect(s.plates + s.cash / 30).toBe(16);
  });

  it('turns plates that no longer fit on the belt back into fish and rice', async () => {
    const g = await loadGame({ tiles: bought('sushi'), plates: 32 });
    const { sushi, fishTray, ricePot } = g.restaurant;
    expect(sushi.slots.every(Boolean)).toBe(true);
    expect([fishTray.n, ricePot.n]).toEqual([2, 2]);
  });

  it('pays out takeout cash if the window is gone', async () => {
    const g = await loadGame({ money: 1, tcash: 9 });
    expect(g.wallet.money).toBe(10);
  });
});

describe('loading', () => {
  it('sanitises saves', async () => {
    const { saveMod } = await loadGame();
    const s = saveMod.migrate({ v: 4, money: '12', tiles: [{ id: 'pack', paid: 25, done: true }, null], pile: -3, reviews: [5, '4', 9, null] });
    expect(s).toMatchObject({ v: 4, money: 12, pile: 0, back: 0, reviews: [5, 4], tiles: [{ id: 'pack', paid: 25, done: true, open: false }] });
    expect(() => saveMod.migrate('nope')).toThrow();
    expect(() => saveMod.migrate([])).toThrow();
  });

  it('takes a save with the old restaurant and the whole market straight to stage 2', async () => {
    const { saveMod } = await loadGame();
    const old = {
      v: 3, money: 100, pile: 4, back: 2, c1: 5, c2: 3, c1c: 12, c2c: 18, reviews: [5, 5], lever: 'sushi', k: 6, kp: 7, rc: 24,
      tiles: [
        ...bought(...MARKET), { id: 'sushi', paid: 1200, done: true, open: true }, { id: 'seats', paid: 900, done: true },
        { id: 'chef', paid: 300, done: false },
      ],
    };
    const s = saveMod.migrate(old);
    expect(s).toMatchObject({
      v: 4, money: 100 + 300, pile: 4, back: 2, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0, fish: 5 + 3 + 6, rice: 6,
      plates: 7, cash: 24 + 12 + 18, boxes: 0, tcash: 0, field: 0, reviews: [5, 5],
    });
    expect(s.tiles.map(t => t.id)).toEqual([...MARKET, 'sushi', 'seats']);
  });

  it('keeps everyone else in stage 1, refunding the old restaurant, its cash and its plates', async () => {
    const { saveMod } = await loadGame();
    const old = {
      v: 3, money: 3, pile: 4, c1: 2, c1c: 5, c2: 1, c2c: 6, k: 3, kp: 2, rc: 10,
      tiles: [...bought('pack', 'runner'), { id: 'sushi', paid: 1200, done: true }, { id: 'seats', paid: 300, done: false }],
    };
    expect(saveMod.migrate(old)).toMatchObject({
      v: 4, money: 3 + 1200 + 300 + 10 + 2 * 12, pile: 4 + 3, c1: 2, c1c: 5, c2: 1, c2c: 6, fish: 0, rice: 0, plates: 0, cash: 0,
      tiles: [{ id: 'pack' }, { id: 'runner' }],
    });
    // v1 and v2 saves were only ever the market
    expect(saveMod.migrate({ money: 3, c1: 2, tiles: [{ id: 'sled', paid: 220, done: true }] }))
      .toMatchObject({ money: 3, c1: 2, tiles: [{ id: 'sled', done: true }] });
  });

  it('loads a converted save into the new game', async () => {
    const g = await loadGame(JSON.stringify({ v: 3, money: 5, c1: 4, c1c: 8, k: 2, tiles: [...bought(...MARKET, 'sushi')] }));
    expect(g.wallet.money).toBe(5);
    expect(g.layout.stage.n).toBe(2);
    expect(g.restaurant.sushi.built).toBe(true);
    expect(g.restaurant.fishTray.items).toHaveLength(6);
    expect(g.cashAt({ cash: g.restaurant.register })).toBe(8);
    expect(g.counters.C1.enabled).toBe(false);
    expect(g.counters.TAKEOUT.enabled).toBe(false); // the takeout kiosk is a stage 2 upgrade
  });

  it('backs up an unreadable save instead of overwriting it', async () => {
    const g = await loadGame('{broken');
    expect(localStorage.getItem('floe-market-backup')).toBe('{broken');
    g.saveMod.save();
    expect(stored().v).toBe(4);
    expect(localStorage.getItem('floe-market-backup')).toBe('{broken');
  });

  it('keeps going when storage is unavailable', async () => {
    const g = await loadGame({ money: 3 });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => g.saveMod.save()).not.toThrow();
    expect(() => g.saveMod.wipeSave()).not.toThrow();
    expect(g.saveMod.load()).toBe(false);
  });
});

describe('several tabs', () => {
  it('stops saving once another tab has saved', async () => {
    const g = await loadGame({ money: 5 });
    g.saveMod.save();
    localStorage.setItem(KEY, 'newer progress from another tab');
    g.saveMod.save();
    expect(localStorage.getItem(KEY)).toBe('newer progress from another tab');
    expect(g.saveMod.isStale()).toBe(true);
    expect(document.getElementById('stale')!.hidden).toBe(false);
  });
});

describe('storage durability', () => {
  it('asks the browser to keep storage once the player has made progress', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(true) };
    Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
    const g = await loadGame({ money: 5 });
    g.saveMod.save();
    expect(storage.persisted).not.toHaveBeenCalled();
    g.unlocks.tiles[0].paid = 1;
    g.saveMod.save();
    g.saveMod.save();
    await vi.waitFor(() => expect(storage.persist).toHaveBeenCalledOnce());
  });
});
