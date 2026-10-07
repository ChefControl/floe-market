// Floe Sushi (stage 2): the kitchen line, chefs making plates from fish and rice, diners, the register, and its
// upgrades.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, type SaveFixture } from './helpers';

/** A stage 2 game; the takeout kiosk is kept out of the way unless a test wants it. */
async function open(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought('sushi'), ...save });
  g.counters.TAKEOUT.stock.cap = 0;
  g.counters.TAKEOUT.maxQ = 0;
  return g;
}

describe('opening the restaurant', () => {
  it('replaces the counters: their queue pays up and leaves, their steaks and cash move over, the stall opens', async () => {
    const g = await loadGame({ tiles: bought('sled'), c1: 3, c1c: 12, c2: 2, c2c: 6 });
    const { C1, SLED } = g.counters, { sushi, ricePot, register, STARTER_RICE, sushiStock } = g.restaurant;
    g.runUntil(() => (C1.queue[0]?.hands.n ?? 0) > 0);
    const c = C1.queue[0];
    expect(sushi.built).toBe(false);
    expect(g.rice.stallOpen()).toBe(false);
    g.unlocks.applyUnlock('sushi');
    expect([C1.enabled, SLED.enabled]).toEqual([false, false]);
    expect(C1.queue).toHaveLength(0);
    expect(sushi.built).toBe(true);
    expect(g.rice.stallOpen()).toBe(true);
    expect(sushi.seats).toHaveLength(10);
    expect(sushi.chefs).toHaveLength(1);
    expect(sushi.cooks).toHaveLength(2);
    expect(ricePot.n).toBe(STARTER_RICE); // a delivery of rice, on its way
    g.run(2.5);
    const ss = sushiStock(), boxes = g.counters.TAKEOUT.stock.n;
    expect(ss.fish + ss.plates + boxes).toBe(3 - c.got + 2); // everything left on the counters, as fish or made up
    expect(g.cashAt({ cash: register })).toBe(12 + 6 + c.got * 4); // the queue paid for what it held
    expect(g.rating.reviews).toHaveLength(0); // closing up isn't the customers' fault
    expect([C1.stock.n, C1.cash.n, SLED.stock.n, SLED.cash.n]).toEqual([0, 0, 0, 0]);
  });
});

describe('the kitchen', () => {
  it('a cook tosses a fish slice and a bag of rice to the chef, who makes plates and puts them on the belt', async () => {
    const g = await open({ fish: 3, rice: 1 });
    const { sushi, fishTray, ricePot } = g.restaurant;
    sushi.spawnT = Infinity;
    g.run(0.1);
    expect(sushi.cooks.some(c => c.t > 0)).toBe(true);
    g.runUntil(() => sushi.slots.some(Boolean), 10);
    g.run(5);
    expect(sushi.slots.filter(Boolean)).toHaveLength(2); // a bag of rice makes two plates, then it's out
    expect(sushi.slots.find(Boolean)!.userData.value).toBe(30);
    expect([fishTray.n, ricePot.n, sushi.portions]).toEqual([1, 0, 0]);
    expect(sushi.chefs[0].state).toBe('idle');
    expect(sushi.cooks[0].g.arms[1].rotation.x).toBeCloseTo(-0.9);
  });
});

describe('diners', () => {
  it('come in through the gate, take plates as they pass, eat, pay at the register, review and go home', async () => {
    const g = await open({ plates: 30 });
    const { sushi, register, REGISTER } = g.restaurant;
    g.runUntil(() => sushi.diners.length > 0);
    const d = sushi.diners[0];
    expect(d.g.position.z).toBeGreaterThan(30); // out on the street
    g.runUntil(() => d.state === 'wait', 30);
    expect(d.g.position.y).toBeGreaterThan(0.3); // up on a stool
    g.runUntil(() => d.state === 'eat', 30);
    expect(d.bubble.visible).toBe(false);
    g.runUntil(() => d.state === 'leave', 30);
    const total = d.want * 30;
    expect(g.rating.reviews[0]).toBe(5);
    expect(d.stack).toHaveLength(0);
    g.runUntil(() => g.cashAt({ cash: register }) >= total);
    g.placePlayer(REGISTER.x, REGISTER.z);
    g.run(1);
    expect(g.wallet.money).toBeGreaterThanOrEqual(total);
    g.runUntil(() => !sushi.diners.includes(d), 40);
    expect(d.g.parent).toBeNull();
  });

  it('a diner left waiting gives up with 1★, paying for what they ate', async () => {
    const g = await open({ plates: 1 });
    const { sushi, register } = g.restaurant;
    g.runUntil(() => sushi.diners.length > 0);
    sushi.diners[0].want = 4;
    sushi.spawnT = Infinity; // just the one, so the plate is theirs
    g.runUntil(() => g.rating.reviews.length > 0, 70);
    expect(g.rating.reviews[0]).toBe(1);
    g.runUntil(() => g.cashAt({ cash: register }) === 30);
    sushi.spawnT = 0;
    g.runUntil(() => g.rating.reviews.length > 2, 120); // the next ones eat nothing and leave without paying
    g.run(2);
    expect(g.cashAt({ cash: register })).toBe(30);
  });

  it('fold bills into the top one when the register is full', async () => {
    const g = await open({ plates: 30, cash: 30 });
    const { register } = g.restaurant;
    register.cap = register.items.length;
    g.runUntil(() => g.cashAt({ cash: register }) > 30, 60);
    expect(register.items).toHaveLength(1);
  });
});

describe('restaurant upgrades', () => {
  it('more seats, more chefs and the premium menu', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'kiosk'), fish: 2, rice: 2 });
    const { sushi } = g.restaurant, { TAKEOUT } = g.counters;
    sushi.spawnT = Infinity;
    TAKEOUT.maxQ = 0;
    g.unlocks.applyUnlock('seats');
    expect(sushi.seats).toHaveLength(18);
    g.unlocks.applyUnlock('chef');
    g.unlocks.applyUnlock('chef3');
    expect(sushi.chefs).toHaveLength(3);
    expect(new Set(sushi.chefs.map(c => c.q)).size).toBe(3); // each puts plates on its own stretch of belt
    g.unlocks.applyUnlock('premium');
    expect(TAKEOUT.price).toBe(56);
    g.runUntil(() => sushi.slots.some(Boolean) && TAKEOUT.stock.items.length > 0, 15);
    expect(sushi.slots.find(Boolean)!.userData.value).toBe(48);
    expect(TAKEOUT.stock.items[0].userData.value).toBe(56);
  });

  it('diners find their way to the extra seats, round either end of the bar', async () => {
    const g = await open({ tiles: bought('sushi', 'seats'), plates: 30 });
    const { sushi } = g.restaurant;
    const extra = sushi.seats.slice(10);
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // always pick the last free seat
    const reached = new Set<unknown>();
    g.runUntil(() => {
      for (const s of extra) if (s.diner && s.diner.state !== 'walk' && s.diner.g.position.distanceTo(s.pos) < 0.01) reached.add(s);
      return reached.size === extra.length;
    }, 120);
  });
});
