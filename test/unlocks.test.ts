// Upgrade tiles and what each upgrade does.
import { describe, expect, it, vi } from 'vitest';
import type { UnlockId } from '../src/unlocks';
import { bought, loadGame, MARKET } from './helpers';

const STAGE2: UnlockId[] = ['paddy', 'chef', 'seats', 'farmer', 'kiosk', 'porter', 'plot2', 'chef3', 'plot3', 'premium'];
const offer = (g: Awaited<ReturnType<typeof loadGame>>) => g.unlocks.visibleTiles().map(t => t.id);
const $ = (id: string) => document.getElementById(id)!;

describe('what is on offer', () => {
  it('the next two unpaid market upgrades in order, plus the statue', async () => {
    const g = await loadGame();
    expect(offer(g)).toEqual(['pack', 'turret', 'korki']);
    g.unlocks.applyUnlock('pack');
    expect(offer(g)).toEqual(['turret', 'roulette', 'korki']);
    g.unlocks.applyUnlock('korki');
    expect(offer(g)).toEqual(['turret', 'roulette']);
  });

  it('the gold Floe Sushi tile only once the whole market is built, on its own', async () => {
    const g = await loadGame({ tiles: bought(...MARKET.filter(id => id !== 'runner3')) });
    expect(offer(g)).toEqual(['runner3', 'korki']);
    g.unlocks.applyUnlock('runner3');
    expect(offer(g)).toEqual(['sushi', 'korki']);
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    expect(gold.half).toBeGreaterThan(1);
  });

  it("stage 2's upgrades once the restaurant is open; the terraces' own once the first is planted", async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi') });
    // the chefs are out from the start, outside the two at a time, the third once there's a second
    expect(offer(g)).toEqual(['paddy', 'chef', 'seats', 'korki']);
    g.unlocks.applyUnlock('chef');
    expect(offer(g)).toEqual(['paddy', 'seats', 'chef3', 'korki']);
    g.unlocks.applyUnlock('paddy');
    expect(offer(g)).toEqual(['seats', 'farmer', 'chef3', 'korki']);
  });

  it('the second and third runners after the first, at its spot', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret', 'roulette', 'boots', 'sled', 'korki') });
    expect(offer(g)).toEqual(['runner', 'net']);
    g.unlocks.applyUnlock('runner');
    expect(offer(g)).toEqual(['runner2', 'net']);
    const [r1, r2] = ['runner', 'runner2'].map(id => g.unlocks.tiles.find(t => t.id === id)!);
    expect([r2.x, r2.z]).toEqual([r1.x, r1.z]);
    g.unlocks.applyUnlock('runner2');
    g.unlocks.applyUnlock('net');
    expect(offer(g)).toEqual(['runner3']);
    g.unlocks.applyUnlock('runner3');
    expect(g.runner.runners).toHaveLength(3);
  });

  it('puts terrace tiles on their terraces, above the water', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy') });
    const plot2 = g.unlocks.tiles.find(t => t.id === 'plot2')!;
    expect(plot2.d.mesh.position.y).toBeGreaterThan(g.layout.TERRACES[1].top + 0.07);
  });
});

describe('stage progress', () => {
  it('counts the market upgrades, then the restaurant ones', async () => {
    const g = await loadGame({ tiles: bought('pack', 'korki') });
    expect([$('stageNum').textContent, $('stageName').textContent, $('stageCount').textContent]).toEqual(['1', 'Fish Market', '1/9']);
    MARKET.slice(1).forEach(id => g.unlocks.applyUnlock(id as UnlockId, true));
    expect($('stageCount').textContent).toBe('Floe Sushi ready');
    expect($('stage').classList.contains('ready')).toBe(true);
    g.unlocks.applyUnlock('sushi', true);
    expect([$('stageNum').textContent, $('stageName').textContent, $('stageCount').textContent]).toEqual(['2', 'Floe Sushi', '0/10']);
    expect($('stage').classList.contains('s2')).toBe(true);
    STAGE2.forEach(id => g.unlocks.applyUnlock(id, true));
    expect($('stageCount').textContent).toBe('Complete');
  });
});

describe('upgrades', () => {
  it('applies simple upgrades', async () => {
    const g = await loadGame();
    g.unlocks.applyUnlock('pack');
    g.unlocks.applyUnlock('boots');
    expect(g.player.back.cap).toBe(14);
    expect(g.player.speed).toBe(5.8);
  });

  it('opens the sled window in the fence with a pop-in animation', async () => {
    const g = await loadGame();
    const { SLED } = g.counters;
    g.unlocks.applyUnlock('sled');
    expect(SLED.enabled).toBe(true);
    expect(SLED.meshes.every(m => m.visible)).toBe(true);
    expect(g.world.gapLogs.every(l => !l.visible)).toBe(true);
    g.run(0.6);
    expect(SLED.meshes[0].scale.x).toBe(1);
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
    expect(g.runner.runners).toHaveLength(1);
  });

  it("moves Korki's tile to the garden if it's still for sale in stage 2", async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const t = g.unlocks.tiles.find(x => x.id === 'korki')!;
    expect([t.x, t.z]).toEqual([g.korki.GARDEN_SPOT.pad.x, g.korki.GARDEN_SPOT.pad.z]);
  });

  it('announces unlocks, and when a stage is built', async () => {
    const g = await loadGame({ tiles: bought(...MARKET.filter(id => id !== 'net')) });
    vi.useFakeTimers();
    const toast = $('toast');
    g.unlocks.applyUnlock('net');
    expect(toast.textContent).toBe('Ice net unlocked');
    vi.advanceTimersByTime(2000); // each message gets its turn
    expect(toast.textContent).toBe('Floe Sushi is ready to open');
    vi.advanceTimersByTime(2000);
    g.unlocks.applyUnlock('sushi', true);
    STAGE2.slice(0, -1).forEach(id => g.unlocks.applyUnlock(id, true));
    g.unlocks.applyUnlock('premium');
    expect(toast.textContent).toBe('Premium menu unlocked');
    vi.advanceTimersByTime(2000);
    expect(toast.textContent).toBe('Floe Sushi is fully built');
  });

  it('applies saved upgrades silently on load', async () => {
    await loadGame({ tiles: bought('net') });
    expect($('toast').textContent).toBe('');
  });
});

