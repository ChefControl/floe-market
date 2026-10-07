// Upgrade tiles and what each upgrade does.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

describe('unlocks', () => {
  it('offers the next two unpaid upgrades in order, plus the statue', async () => {
    const g = await loadGame();
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['pack', 'turret', 'korki']);
    g.unlocks.applyUnlock('pack');
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['turret', 'roulette', 'korki']);
    g.unlocks.applyUnlock('korki');
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['turret', 'roulette']);
  });

  it('applies simple upgrades', async () => {
    const g = await loadGame();
    g.unlocks.applyUnlock('pack');
    g.unlocks.applyUnlock('boots');
    expect(g.player.back.cap).toBe(14);
    expect(g.player.speed).toBe(5.8);
  });

  it('opens the sled window with a pop-in animation', async () => {
    const g = await loadGame();
    const { C2 } = g.counters;
    g.unlocks.applyUnlock('sled');
    expect(C2.enabled).toBe(true);
    expect(C2.meshes.every(m => m.visible)).toBe(true);
    g.run(0.6);
    expect(C2.meshes[0].scale.x).toBe(1);
  });

  it.each(['turret', 'net'] as const)('the %s catches fish on its own', async id => {
    const g = await loadGame();
    g.unlocks.applyUnlock(id);
    g.run(4);
    expect(g.stations.pile.items.length).toBeGreaterThanOrEqual(3);
  });

  it('sets up the roulette table', async () => {
    const g = await loadGame();
    g.unlocks.applyUnlock('roulette');
    g.run(0.6);
    expect(g.unlocks.tiles.find(t => t.id === 'roulette')!.d.mesh.visible).toBe(false);
  });

  it('hires a runner', async () => {
    const g = await loadGame();
    g.unlocks.applyUnlock('runner');
    expect(g.runner.runner).not.toBeNull();
  });

  it('announces unlocks, and when everything is built', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret', 'roulette', 'runner', 'boots', 'sled', 'korki') });
    vi.useFakeTimers();
    const toast = document.getElementById('toast')!;
    g.unlocks.applyUnlock('net');
    expect(toast.textContent).toBe('Ice net unlocked');
    vi.advanceTimersByTime(1800);
    expect(toast.textContent).toBe('Floe Market is fully built');
  });

  it('applies saved upgrades silently on load', async () => {
    await loadGame({ tiles: bought('net') });
    expect(document.getElementById('toast')!.textContent).toBe('');
  });
});
