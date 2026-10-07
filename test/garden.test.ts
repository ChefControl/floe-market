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

describe('garden tables', () => {
  it('each row seats eight more diners, with a waiter of its own', async () => {
    const { g, garden } = await setup();
    const seats = g.restaurant.sushi.seats;
    expect(seats).toHaveLength(10);
    g.unlocks.applyUnlock('tables');
    expect(seats.filter(s => s.garden)).toHaveLength(8);
    expect(garden.waiters).toHaveLength(1);
    g.unlocks.applyUnlock('tables2');
    expect(seats.filter(s => s.garden)).toHaveLength(16);
    expect(garden.waiters).toHaveLength(2);
    expect(garden.waiters[1].home.x).toBeLessThan(0); // works the other end of the bar
  });

  it('the waiter takes plates off the belt out to diners there, who eat and pay', async () => {
    const { g, garden } = await setup('tables');
    const { sushi, register } = g.restaurant;
    fillBar(g);
    g.restaurant.loadPlates(30);
    sushi.spawnT = 0;
    g.run(0.05);
    const d = sushi.diners[0];
    sushi.spawnT = Infinity;
    expect(d.seat.garden).toBe(true);
    g.runUntil(() => garden.waiters[0].tray.n > 0, 20);
    g.runUntil(() => d.state === 'leave', 60);
    g.run(1);
    expect(g.cashAt({ cash: register })).toBe(d.want * g.restaurant.platePrice()); // paid on the way out
    g.runUntil(() => garden.waiters[0].state === 'home', 20);
    expect(garden.waiters[0].tray.n).toBe(0);
  });

  it('puts plates back on the belt if the diner leaves before they get there', async () => {
    const { g, garden } = await setup('tables');
    const { sushi } = g.restaurant;
    fillBar(g);
    sushi.spawnT = 0;
    g.run(0.05);
    sushi.spawnT = Infinity;
    const d = sushi.diners[0];
    g.runUntil(() => d.state === 'wait', 20);
    g.restaurant.loadPlates(12);
    const w = garden.waiters[0];
    g.runUntil(() => w.tray.n > 0, 5);
    d.wait = 1e9; // out of patience: leaves
    g.runUntil(() => w.tray.n === 0 && w.state === 'home', 30);
    expect(sushi.slots.filter(Boolean)).toHaveLength(12); // every plate back round the bar
  });

  it('counts plates on a tray when saving', async () => {
    const { g, garden } = await setup('tables');
    const { sushi } = g.restaurant;
    fillBar(g);
    g.restaurant.loadPlates(30);
    sushi.spawnT = 0;
    g.run(0.05);
    sushi.spawnT = Infinity;
    g.runUntil(() => garden.waiters[0].tray.n > 0, 20);
    const onTray = garden.waiters[0].tray.n;
    g.saveMod.save();
    const saved = JSON.parse(localStorage.getItem('floe-market-v1')!);
    expect(saved.plates).toBe(g.restaurant.sushiStock().plates + onTray);
  });

  it('keeps the player out of the tables', async () => {
    const { g } = await setup('tables');
    g.placePlayer(4.5, 19.9);
    g.run(0.05);
    const p = g.player.g.position;
    expect(Math.abs(p.x - 4.5) > 0.44 || Math.abs(p.z - 19.9) > 0.87).toBe(true);
  });
});
