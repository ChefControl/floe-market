// The garden tables (stage 2): seats out front, and the waiters who bring the plates out to them.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;

/** Loads a game and the garden module that goes with it. */
async function setup(...ids: string[]) {
  const g = await loadGame({ tiles: bought('sushi', ...ids), mods: { crew: 8 } });
  const garden = await import('../src/garden');
  return { g, garden };
}
/** Fills the bar's seats, so the next diners go to the garden. */
const fillBar = (g: Game) => g.restaurant.sushi.seats.filter(s => !s.garden).forEach(s => { s.diner = {} as never; });

/** Brings in `n` diners, one after another, and stops any more coming. */
function spawn(g: Game, n = 1) {
  const { sushi } = g.restaurant;
  for (let i = 0; i < n; i++) { sushi.spawnT = 0; g.run(0.05); }
  sushi.spawnT = Infinity;
  return sushi.diners.slice(-n);
}

describe('garden tables', () => {
  it('each row seats eight more diners, with a waiter of its own by the serving counter', async () => {
    const { g, garden } = await setup();
    const seats = g.restaurant.sushi.seats;
    expect(seats).toHaveLength(10);
    g.unlocks.applyUnlock('tables');
    expect(seats.filter(s => s.garden)).toHaveLength(8);
    expect(garden.waiters).toHaveLength(1);
    g.unlocks.applyUnlock('tables2');
    expect(seats.filter(s => s.garden)).toHaveLength(16);
    expect(garden.waiters).toHaveLength(2);
    const { PASS } = g.restaurant;
    for (const w of garden.waiters) expect(Math.hypot(w.home.x - PASS.x, w.home.z - PASS.z)).toBeLessThan(1.5);
  });

  it('chefs put garden orders on the serving counter, and the waiter carries them out to diners who eat and pay', async () => {
    const { g, garden } = await setup('tables');
    const { sushi, register, servingPass } = g.restaurant;
    fillBar(g);
    const [d] = spawn(g);
    expect(d.seat.garden).toBe(true);
    g.runUntil(() => d.state === 'wait', 30);
    g.restaurant.handOver({ steaks: [...Array(12)].map(() => g.items.newSteak()), bills: [] });
    for (let i = 0; i < 6; i++) g.restaurant.ricePot.put(g.items.newRice());
    g.runUntil(() => servingPass.n > 0, 30);
    expect(sushi.slots.filter(Boolean)).toHaveLength(0); // not on the belt
    expect(servingPass.all()[0].userData.diner).toBe(d);
    g.runUntil(() => garden.waiters[0].tray.n > 0, 10);
    g.runUntil(() => d.state === 'leave', 60);
    g.run(1);
    expect(g.cashAt({ cash: register })).toBe(d.want * g.restaurant.platePrice()); // paid on the way out
    g.runUntil(() => garden.waiters[0].state === 'home', 20);
    expect(garden.waiters[0].tray.n).toBe(0);
  });

  it('never takes plates off the belt', async () => {
    const { g, garden } = await setup('tables', 'tables2');
    const { sushi } = g.restaurant;
    fillBar(g);
    g.restaurant.loadPlates(30);
    spawn(g, 3);
    g.run(15);
    expect(sushi.slots.filter(Boolean)).toHaveLength(30);
    expect(garden.waiters.every(w => w.tray.n === 0)).toBe(true);
  });

  it('keeps cooking for the garden when the belt is full', async () => {
    const { g } = await setup('tables');
    g.restaurant.loadPlates(30);
    g.restaurant.handOver({ steaks: [...Array(12)].map(() => g.items.newSteak()), bills: [] });
    for (let i = 0; i < 6; i++) g.restaurant.ricePot.put(g.items.newRice());
    fillBar(g);
    const [d] = spawn(g);
    g.runUntil(() => d.state === 'leave', 60);
    expect(g.rating.reviews[g.rating.reviews.length - 1]).toBeGreaterThan(1);
  });

  it('a diner stops waiting once their plate is made, so the waiter costs them nothing', async () => {
    const { g, garden } = await setup('tables');
    g.restaurant.handOver({ steaks: [...Array(12)].map(() => g.items.newSteak()), bills: [] });
    for (let i = 0; i < 6; i++) g.restaurant.ricePot.put(g.items.newRice());
    fillBar(g);
    const [d] = spawn(g);
    g.runUntil(() => d.coming > 0, 30);
    const waited = d.wait, w = garden.waiters[0];
    w.home.set(40, 0, 40); // a waiter who wanders off before picking it up
    g.run(5);
    expect(d.wait).toBe(waited);
    expect(d.state).toBe('wait');
  });

  it('carries several plates a trip', async () => {
    const { g, garden } = await setup('tables', 'chef', 'chef3');
    g.restaurant.handOver({ steaks: [...Array(24)].map(() => g.items.newSteak()), bills: [] });
    for (let i = 0; i < 12; i++) g.restaurant.ricePot.put(g.items.newRice());
    fillBar(g);
    spawn(g, 6);
    const w = garden.waiters[0];
    g.runUntil(() => w.state === 'out', 30);
    expect(w.tray.n).toBeGreaterThan(1);
    expect(w.tray.n).toBeLessThanOrEqual(4);
  });

  it('counts plates on the serving counter and the trays when saving', async () => {
    const { g, garden } = await setup('tables');
    g.restaurant.handOver({ steaks: [...Array(12)].map(() => g.items.newSteak()), bills: [] });
    for (let i = 0; i < 6; i++) g.restaurant.ricePot.put(g.items.newRice());
    fillBar(g);
    spawn(g, 3);
    g.runUntil(() => g.restaurant.servingPass.n + garden.waiterPlates() > 0, 30);
    g.saveMod.save();
    const saved = JSON.parse(localStorage.getItem('floe-market-v1')!);
    expect(saved.plates).toBe(g.restaurant.sushiStock().plates + garden.waiterPlates());
  });

  it('keeps the player out of the tables and the serving counter', async () => {
    const { g } = await setup('tables');
    g.placePlayer(4.5, 19.9);
    g.run(0.05);
    const p = g.player.g.position;
    expect(Math.abs(p.x - 4.5) > 0.44 || Math.abs(p.z - 19.9) > 0.87).toBe(true);
    const { PASS } = g.restaurant;
    g.placePlayer(PASS.x, PASS.z + PASS.d / 2 + 0.1);
    g.run(0.05);
    expect(p.z).toBeGreaterThanOrEqual(PASS.z + PASS.d / 2 + 0.3 - 1e-6);
  });
});
