// Player movement and every station interaction.
import { describe, expect, it } from 'vitest';
import { loadGame } from './helpers';

describe('movement', () => {
  it('walks away from the camera on W and stops on release', async () => {
    const g = await loadGame();
    const p = g.player.g.position;
    const start = p.clone();
    g.press('w');
    g.run(0.5);
    // camera sits at +x,+z, so "up" is toward -x,-z
    expect(p.x).toBeLessThan(start.x);
    expect(p.z).toBeLessThan(start.z);
    expect(p.distanceTo(start)).toBeCloseTo(g.player.speed * 0.5, 0);
    g.press('w', 'keyup');
    g.run(0.1);
    expect(g.player.moving).toBe(false);
  });

  it('stays on the deck', async () => {
    const g = await loadGame();
    g.press('w');
    g.run(5);
    expect(g.player.g.position.x).toBeCloseTo(-7.4);
    expect(g.player.g.position.z).toBeCloseTo(-6.25);
  });

  it('is pushed out of the chopping block', async () => {
    const g = await loadGame();
    g.placePlayer(0.5, -5.5);
    g.run(0.02);
    expect(g.player.g.position.z).toBeCloseTo(-4.8);
    g.placePlayer(-0.3, -5.5);
    g.run(0.02);
    expect(g.player.g.position.x).toBeCloseTo(-0.5);
  });
});

describe('stations', () => {
  it('fishes while standing on the pad', async () => {
    const g = await loadGame();
    g.placePlayer(-4.5, -5.2);
    g.run(2.5);
    expect(g.stations.pile.items.length).toBeGreaterThanOrEqual(3);
  });

  it('picks steaks up from the pile until its arms are full', async () => {
    const g = await loadGame({ pile: 10 });
    g.placePlayer(2.7, -4.0);
    g.run(1);
    expect(g.player.back.items).toHaveLength(6);
    expect(g.stations.pile.items).toHaveLength(4);
  });

  it('stocks a counter and collects its cash', async () => {
    const g = await loadGame({ back: 5, c1c: 20 });
    const { C1 } = g.counters;
    C1.maxQ = 0;
    g.placePlayer(C1.dropPos.x, C1.dropPos.z);
    g.run(1);
    expect(C1.stock.items).toHaveLength(5);
    expect(g.player.back.items).toHaveLength(0);
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    g.run(1);
    expect(g.wallet.money).toBe(20);
    expect(C1.cash.items).toHaveLength(0);
  });

  it('shows the upgrade tip and pays into the tile after a short stand', async () => {
    const g = await loadGame({ money: 30 });
    const tip = document.getElementById('tip')!;
    g.placePlayer(-1.3, 6.0);
    g.run(0.2);
    expect(tip.classList.contains('on')).toBe(true);
    expect(tip.textContent).toContain('Bigger arms');
    expect(g.wallet.money).toBe(30);
    g.run(1.5);
    expect(g.wallet.money).toBe(5);
    expect(g.player.back.cap).toBe(14);
    expect(tip.classList.contains('on')).toBe(false);
    expect(localStorage.getItem('floe-market-v1')).toContain('"done":true');
  });
});
