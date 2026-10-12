// Upgrade tiles and what each upgrade does.
import { describe, expect, it, vi } from 'vitest';
import type { UnlockId } from '../src/unlocks';
import { bought, loadGame, MARKET } from './helpers';

const STAGE2: UnlockId[] = ['paddy', 'seats', 'chef', 'farmer', 'porter', 'plot2', 'tables', 'chef3', 'tables2', 'plot3', 'kiosk', 'premium'];
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
    const g = await loadGame({ tiles: bought(...MARKET.filter(id => id !== 'runner3'), 'slots', 'blackjack') });
    expect(offer(g)).toEqual(['runner3', 'korki']);
    g.unlocks.applyUnlock('runner3');
    expect(offer(g)).toEqual(['sushi', 'korki']);
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    expect(gold.half).toBeGreaterThan(1);
  });

  it("stage 2's upgrades once the restaurant is open; the terraces' own once the first is planted", async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', 'slots', 'blackjack') });
    // the chefs are out from the start, outside the two at a time, the third once there's a second
    expect(offer(g)).toEqual(['paddy', 'seats', 'chef', 'korki']);
    g.unlocks.applyUnlock('chef');
    expect(offer(g)).toEqual(['paddy', 'seats', 'chef3', 'korki']);
    g.unlocks.applyUnlock('paddy');
    expect(offer(g)).toEqual(['seats', 'farmer', 'chef3', 'korki']);
    // the porter carries from the farmer's stack, so it waits for the farmer
    g.unlocks.applyUnlock('seats');
    expect(offer(g)).toEqual(['farmer', 'plot2', 'chef3', 'korki']);
    g.unlocks.applyUnlock('farmer');
    expect(offer(g)).toEqual(['porter', 'plot2', 'chef3', 'korki']);
  });

  it('the second and third runners after the first, at its spot', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret', 'roulette', 'boots', 'sled', 'korki', 'slots', 'blackjack') });
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
    expect([$('stageNum').textContent, $('stageName').textContent, $('stageCount').textContent]).toEqual(['2', 'Floe Sushi', '0/12']);
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

describe('the spotlight on a new upgrade', () => {
  it('has the camera go over to what it built and come in close for a couple of seconds, then back to the player', async () => {
    const g = await loadGame({ tiles: bought('pack') });
    const { view } = g.stage, focus = view.focus.clone();
    g.unlocks.applyUnlock('turret');
    g.run(0.8);
    expect(view.k).toBeCloseTo(1);
    expect(view.close).toBeCloseTo(0.6);
    expect(Math.hypot(view.focus.x + 6.9, view.focus.z + 5.9)).toBeLessThan(0.6); // the harpoon by the north fence
    expect(view.focus.y).toBeGreaterThan(0.5); // its middle, not its foot
    g.run(1.2);
    expect(view.close).toBeCloseTo(0.6); // still holding on it
    g.run(1);
    expect(view.k).toBe(0);
    expect(view.close).toBe(1);
    expect(view.focus.equals(focus)).toBe(true);
  });

  it('has the player in it when there is nothing new to see, like snow boots', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret', 'roulette', 'runner') });
    const p = g.player.g.position;
    g.unlocks.applyUnlock('boots');
    g.run(0.8);
    expect(g.stage.view.close).toBeLessThan(1);
    expect(Math.hypot(g.stage.view.focus.x - p.x, g.stage.view.focus.z - p.z)).toBeLessThan(0.1);
  });

  it('goes straight on to a second upgrade bought while it is still showing', async () => {
    const g = await loadGame({ tiles: bought('pack') });
    const { view } = g.stage, focus = view.focus.clone();
    g.unlocks.applyUnlock('turret');
    g.run(1);
    g.unlocks.applyUnlock('korki');
    g.run(0.1);
    expect(view.close).toBeCloseTo(0.6); // stays in close
    g.run(1);
    const statue = g.korki.korkiStatue()!.position;
    expect(Math.hypot(view.focus.x - statue.x, view.focus.z - statue.z)).toBeLessThan(0.1);
    g.run(2);
    expect(view.close).toBe(1);
    expect(view.focus.equals(focus)).toBe(true);
  });

  it("doesn't play on load", async () => {
    const g = await loadGame({ tiles: bought('net') });
    g.run(0.5);
    expect(g.stage.view.close).toBe(1);
  });

  it("doesn't play for players who prefer less motion", async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const g = await loadGame();
    g.unlocks.applyUnlock('turret');
    g.run(0.5);
    expect(g.stage.view.close).toBe(1);
  });

  it("doesn't play for the stage-up, which has a show of its own", async () => {
    const g = await loadGame({ tiles: bought(...MARKET), money: 12000 });
    g.unlocks.applyUnlock('sushi');
    g.run(1);
    expect(g.stage.view.close).toBe(1);
  });
});

