// The sushi restaurant: going on sale, the lever and conveyor, chefs, diners, its upgrades, and saving it.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const MARKET = ['pack', 'turret', 'roulette', 'runner', 'boots', 'sled', 'net'];
const KEY = 'floe-market-v1';
const stored = () => JSON.parse(localStorage.getItem(KEY)!);
type Game = Awaited<ReturnType<typeof loadGame>>;
const offered = (g: Game) => g.unlocks.visibleTiles().map(t => t.id);
const near = (g: Game) => () => g.util.V(-4.5, 1, -5.2);
const fill = (g: Game, h: { put: (m: import('three').Mesh) => void }, n: number) => {
  for (let i = 0; i < n; i++) h.put(g.items.newSteak());
};
/** A restaurant game with no walk-in customers, so the only reviews are the diners'. */
async function dinersOnly(save: Parameters<typeof loadGame>[0]) {
  const g = await loadGame(save);
  g.counters.C1.maxQ = 0;
  return g;
}

describe('opening the restaurant', () => {
  it("goes on sale once the market is fully built (Korki's statue isn't needed), and its upgrades once it opens", async () => {
    const g = await loadGame({ tiles: bought(...MARKET.slice(0, -1)) });
    expect(offered(g)).toEqual(['net', 'korki']);
    g.unlocks.applyUnlock('net');
    expect(offered(g)).toEqual(['sushi', 'korki']);
    g.unlocks.applyUnlock('sushi');
    expect(offered(g)).toEqual(['seats', 'chef', 'korki']);
  });

  it('opens a gate in the fence to walk through', async () => {
    const g = await loadGame();
    g.placePlayer(-7, 2.5);
    g.press('a');
    g.run(2);
    expect(g.player.g.position.x).toBeCloseTo(-7.4); // fence still closed
    g.unlocks.applyUnlock('sushi');
    g.placePlayer(-7.4, 2.5);
    g.run(3);
    g.press('a', 'keyup');
    expect(g.player.g.position.x).toBeLessThan(-12);
    expect(g.player.g.position.z).toBeCloseTo(4.6); // along the dining room's front rail
  });

  it('keeps the player out of the bar and the kitchen counter', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const p = g.player.g.position;
    const at = (x: number, z: number) => { g.placePlayer(x, z); g.run(0.02); return [p.x, p.z]; };
    expect(at(-17, 0.3)[1]).toBeCloseTo(2.35); // dead centre: out the front
    expect(at(-17, 1.5)[1]).toBeCloseTo(2.35);
    expect(at(-20, 0.3)[0]).toBeCloseTo(-21.25);
    expect(at(-12, -3.5)[1]).toBeCloseTo(-2.6);
    expect(at(-13.4, -4.4)[0]).toBeCloseTo(-13.6);
  });
});

describe('lever and conveyor', () => {
  it('switches route when the player steps on a lever pad', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { belt, steakTo } = g.conveyor;
    expect(belt.mode).toBe('market');
    expect(steakTo()).toBe('pile');
    g.placePlayer(-0.8, -2.1);
    g.run(0.05);
    expect(belt.mode).toBe('sushi');
    expect(document.getElementById('toast')!.textContent).toBe('Steaks → Sushi bar');
    expect(steakTo()).toBe('belt');
    g.placePlayer(-1.9, -2.1);
    g.run(0.05);
    expect(belt.mode).toBe('split');
    expect([steakTo(), steakTo(), steakTo(), steakTo()]).toEqual(['belt', 'pile', 'belt', 'pile']);
  });

  it('sends steaks the other way when one side is full', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { steakTo, setRoute, loadBelt, BELT_CAP } = g.conveyor;
    const { pile } = g.stations, { kitchen } = g.restaurant;
    setRoute('split');
    fill(g, pile, pile.cap);
    expect([steakTo(), steakTo()]).toEqual(['belt', 'belt']);
    fill(g, kitchen, kitchen.cap);
    loadBelt(BELT_CAP);
    expect([steakTo(), steakTo()]).toEqual(['belt', 'pile']); // both full: keep alternating
    pile.take();
    setRoute('sushi');
    expect(steakTo()).toBe('pile');
  });

  it('only hooks fish there is room for, wherever the lever points', async () => {
    const g = await loadGame({ tiles: bought('sushi'), pile: 54 });
    const { setRoute, roomFor } = g.conveyor;
    expect(g.fishing.tryCatch(near(g), 'player')).toBeNull();
    setRoute('sushi');
    expect(g.fishing.tryCatch(near(g), 'player')).not.toBeNull();
    setRoute('split');
    expect(roomFor(3, 0)).toBe(true);
  });

  it('carries steaks along the conveyor into the kitchen', async () => {
    const g = await loadGame({ tiles: bought('sushi'), lever: 'sushi' });
    const { belt } = g.conveyor, { kitchen, sushi } = g.restaurant;
    sushi.chefs[0].state = 'fetch'; // keep the chef busy so the steaks stay in the kitchen
    g.fishing.tryCatch(near(g), 'player');
    g.runUntil(() => belt.items.length === 3);
    expect(g.stations.pile.n).toBe(0);
    g.runUntil(() => kitchen.items.length === 3, 15);
    expect(belt.items).toHaveLength(0);
  });

  it('backs up when the kitchen is full', async () => {
    const g = await loadGame({ tiles: bought('sushi'), lever: 'sushi', k: 38 });
    const { belt, BELT_LEN } = g.conveyor;
    g.restaurant.sushi.chefs[0].state = 'fetch';
    expect(g.restaurant.kitchen.n).toBe(36);
    g.run(2);
    expect(belt.items.map(i => i.s)).toEqual([BELT_LEN, BELT_LEN - 0.42]);
  });
});

describe('the sushi bar', () => {
  it('a chef slices steaks into plates and puts them on the belt', async () => {
    const g = await loadGame({ tiles: bought('sushi'), k: 2 });
    const { sushi, kitchen } = g.restaurant;
    g.runUntil(() => sushi.slots.filter(Boolean).length === 2, 10);
    expect(kitchen.n).toBe(0);
    expect(sushi.slots.find(Boolean)!.userData.value).toBe(12);
  });

  it('takes steaks dropped off by hand', async () => {
    const g = await loadGame({ tiles: bought('sushi'), back: 5 });
    const { kitchen, sushi, KITCHEN_DROP } = g.restaurant;
    sushi.chefs[0].state = 'fetch';
    g.placePlayer(KITCHEN_DROP.x, KITCHEN_DROP.z);
    g.run(1);
    expect(kitchen.n).toBe(5);
    expect(g.player.back.n).toBe(0);
  });

  it('diners take plates as they pass, eat, pay at the register, review and go home', async () => {
    const g = await dinersOnly({ tiles: bought('sushi'), kp: 18 });
    const { sushi, register, REGISTER } = g.restaurant;
    g.runUntil(() => sushi.diners.length > 0);
    const d = sushi.diners[0];
    g.runUntil(() => d.state === 'eat', 30);
    expect(d.bubble.visible).toBe(false);
    g.runUntil(() => d.state === 'leave', 30);
    const total = d.want * 12;
    expect(g.rating.reviews[0]).toBe(5);
    expect(d.stack).toHaveLength(0);
    g.runUntil(() => g.cashAt({ cash: register }) >= total);
    g.placePlayer(REGISTER.x, REGISTER.z);
    g.run(1);
    expect(g.wallet.money).toBeGreaterThanOrEqual(total);
    g.runUntil(() => !sushi.diners.includes(d), 30);
    expect(d.g.parent).toBeNull();
  });

  it('a diner left waiting gives up with 1★, paying for what they ate', async () => {
    const g = await dinersOnly({ tiles: bought('sushi'), kp: 1 });
    const { sushi, register } = g.restaurant;
    g.runUntil(() => sushi.diners.length > 0);
    sushi.diners[0].want = 4;
    g.runUntil(() => g.rating.reviews.length > 0, 60);
    expect(g.rating.reviews[0]).toBe(1);
    g.runUntil(() => g.cashAt({ cash: register }) === 12);
    g.runUntil(() => g.rating.reviews.length > 2, 60); // the others ate nothing and leave without paying
    g.run(2);
    expect(g.cashAt({ cash: register })).toBe(12);
  });

  it('folds bills into the top one when the register is full', async () => {
    const g = await loadGame({ tiles: bought('sushi'), kp: 18, rc: 12 });
    const { sushi, register } = g.restaurant;
    register.cap = register.items.length;
    g.runUntil(() => g.cashAt({ cash: register }) > 12, 60);
    expect(register.items).toHaveLength(1);
    expect(sushi.diners.length).toBeGreaterThan(0);
  });
});

describe('restaurant upgrades', () => {
  it('adds seats, a second chef and the premium menu', async () => {
    const g = await loadGame({ tiles: bought('sushi'), k: 1 });
    const { sushi } = g.restaurant;
    vi.useFakeTimers();
    g.unlocks.applyUnlock('seats');
    expect(sushi.seats).toHaveLength(10);
    g.unlocks.applyUnlock('chef');
    expect(sushi.chefs).toHaveLength(2);
    g.unlocks.applyUnlock('premium');
    vi.advanceTimersByTime(1800);
    expect(document.getElementById('toast')!.textContent).toBe('Floe Sushi is fully built');
    g.runUntil(() => sushi.slots.some(Boolean), 10);
    expect(sushi.slots.find(Boolean)!.userData.value).toBe(20);
  });
});

describe('saving the restaurant', () => {
  it('round-trips the rating, lever, stock and register, and cleans up bad values', async () => {
    const g1 = await loadGame({ tiles: bought('sushi'), lever: 'split', k: 5, kp: 4, rc: 30, reviews: [5, 4, '3', 9, null] });
    expect(g1.rating.reviews).toEqual([5, 4, 3]);
    expect(g1.conveyor.belt.mode).toBe('split');
    g1.saveMod.save();
    expect(stored()).toMatchObject({ v: 3, lever: 'split', k: 5, kp: 4, rc: 30, reviews: [5, 4, 3] });
    const g2 = await loadGame(localStorage.getItem(KEY)!);
    expect(g2.restaurant.kitchen.n).toBe(5);
    expect(g2.restaurant.sushi.slots.filter(Boolean)).toHaveLength(4);
    expect(g2.cashAt({ cash: g2.restaurant.register })).toBe(30);
    expect(g2.saveMod.migrate({ lever: 'sideways' }).lever).toBe('market');
  });

  it('turns plates that no longer fit on the belt back into steaks', async () => {
    const g = await loadGame({ tiles: bought('sushi'), kp: 20 });
    expect(g.restaurant.sushi.slots.every(Boolean)).toBe(true);
    expect(g.restaurant.kitchen.n).toBe(2);
  });

  it("counts sushi in the making: fish reeled in for it, the chef's steak", async () => {
    const g = await loadGame({ tiles: bought('sushi'), lever: 'sushi', k: 1 });
    g.run(0.1); // the chef picks up the steak
    g.fishing.tryCatch(near(g), 'turret');
    g.saveMod.save();
    expect(stored()).toMatchObject({ k: 4, pile: 0 });
  });

  it("loses nothing mid-meal: diners' plates and unpaid bills are saved", async () => {
    const g = await loadGame({ tiles: bought('sushi'), kp: 18 });
    const { sushi } = g.restaurant;
    g.runUntil(() => sushi.diners.some(d => d.bill.length > 0 && d.plate), 60);
    g.saveMod.save();
    const s = stored();
    expect(s.kp + s.rc / 12).toBe(18);
  });
});
