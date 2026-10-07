// Customer patience, reviews, the market rating, and upgrades that need stars.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('rating', () => {
  it('starts at ★3 and averages the latest reviews, counting missing ones as 3★', async () => {
    const g = await loadGame();
    const { rating, addReview, reviews, demand, WINDOW } = g.rating;
    expect(rating()).toBe(3);
    expect(demand()).toBeCloseTo(1);
    addReview(5);
    expect(rating()).toBe(3.1);
    g.rate(5);
    expect(reviews).toHaveLength(WINDOW);
    expect(rating()).toBe(5);
    expect(demand()).toBeCloseTo(1.4);
    g.rate(1);
    expect(rating()).toBe(1);
    expect(demand()).toBeCloseTo(0.6);
  });

  it('turns the patience a customer had left into stars', async () => {
    const { rating } = await loadGame();
    expect([0.9, 0.5, 0.2, 0.05].map(rating.starsFor)).toEqual([5, 4, 3, 2]);
  });

  it('shows the rating in the HUD', async () => {
    const g = await loadGame();
    g.ui.hud(0.016);
    expect($('starsN').textContent).toBe('3.0');
    g.rate(4);
    g.ui.hud(0.016);
    expect($('starsN').textContent).toBe('4.0');
  });
});

describe('patience', () => {
  it('a customer served straight away leaves a 5★ review', async () => {
    const g = await loadGame({ c1: 10 });
    g.runUntil(() => g.rating.reviews.length > 0);
    expect(g.rating.reviews[0]).toBe(5);
  });

  it('floats each review over the customer: stars, or an angry face for 1★', async () => {
    const g = await loadGame();
    g.ui.popStars(4, { x: 0, z: -5 });
    g.ui.popStars(1, { x: 0, y: 1, z: -5 });
    expect([...document.querySelectorAll('.pop.review')].map(p => p.textContent)).toEqual(['★★★★', '😠']);
  });

  it('drains the ring on the order bubble while a customer waits', async () => {
    const g = await loadGame();
    const { C1 } = g.counters;
    g.runUntil(() => C1.queue[0]?.arrived === true);
    const c = C1.queue[0], first = c.drawn;
    g.run(5);
    expect(c.drawn).toBeLessThan(first);
  });

  it('a customer who waits too long gives up, pays for what they got and leaves 1★', async () => {
    const g = await loadGame({ c1: 1 });
    const { C1 } = g.counters;
    C1.patience = 3;
    g.runUntil(() => C1.queue.length > 0);
    const c = C1.queue[0];
    c.want = 3;
    g.runUntil(() => g.rating.reviews.length > 0, 10);
    expect(g.rating.reviews[0]).toBe(1);
    expect(c.got).toBe(1);
    expect(C1.queue).not.toContain(c);
    g.runUntil(() => C1.cash.items.length > 0);
    expect(g.cashAt(C1)).toBe(C1.price);
    // later customers got nothing, so they leave without paying
    g.runUntil(() => g.rating.reviews.length > 1, 15);
    g.run(1);
    expect(g.cashAt(C1)).toBe(C1.price);
  });

  it('shows a face over impatient customers further back in the queue', async () => {
    const g = await loadGame();
    const { C1 } = g.counters;
    C1.patience = 4;
    g.runUntil(() => C1.queue.length > 0);
    C1.queue[0].wait = -100; // the front customer never runs out
    g.runUntil(() => C1.queue[1]?.queued === true);
    const back = C1.queue[1];
    g.runUntil(() => back.mood.visible, 5);
    const meh = back.mood.material;
    g.runUntil(() => back.mood.material !== meh, 5);
    expect(C1.queue[0].mood.visible).toBe(false);
  });
});

describe('upgrades that need stars', () => {
  const early = { money: 500, tiles: bought('pack', 'turret', 'roulette') };

  it('keeps a star-locked tile shut, with a tip saying what it needs', async () => {
    const g = await loadGame(early);
    const runner = g.unlocks.tiles.find(t => t.id === 'runner')!;
    expect(g.unlocks.locked(runner)).toBe(true);
    g.placePlayer(runner.x, runner.z);
    g.run(1.5);
    expect(g.wallet.money).toBe(500);
    expect(runner.paid).toBe(0);
    expect($('tip').textContent).toBe('Hire a runnerNeeds a ★3.5 rating (now ★3.0) · $120');
  });

  it('opens a tile for good once the rating reaches it', async () => {
    const g = await loadGame(early);
    const runner = g.unlocks.tiles.find(t => t.id === 'runner')!;
    const net = g.unlocks.tiles.find(t => t.id === 'net')!;
    g.rate(4);
    g.run(0.05);
    expect(runner.open).toBe(true);
    expect(net.open).toBe(true); // reached too, quietly, since it isn't on offer yet
    expect($('toast').textContent).toBe('★3.5 reached: Hire a runner for sale');
    g.rate(1);
    g.run(0.05);
    expect(g.unlocks.locked(runner)).toBe(false);
    g.placePlayer(runner.x, runner.z);
    g.run(1.5);
    expect(runner.done).toBe(true);
  });

  it('remembers which tiles are open across a reload', async () => {
    const g1 = await loadGame(early);
    g1.rate(4);
    g1.run(0.05);
    g1.rate(2);
    g1.saveMod.save();
    const g2 = await loadGame(localStorage.getItem('floe-market-v1')!);
    expect(g2.rating.rating()).toBe(2);
    expect(g2.unlocks.locked(g2.unlocks.tiles.find(t => t.id === 'runner')!)).toBe(false);
    expect(g2.unlocks.locked(g2.unlocks.tiles.find(t => t.id === 'sushi')!)).toBe(true);
  });
});
