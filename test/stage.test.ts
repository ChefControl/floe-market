// The stage-up from the fish market to Floe Sushi: the show when the gold tile is bought, and the stage 2 world
// a saved game loads straight into.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('the stage-up', () => {
  it('plays when the gold tile is paid off: banner, camera pull-back, the old counters out and the restaurant in', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'korki'), money: 12000, c1: 4, c1c: 12 });
    const { staging, view, STAGE2_ZOOM } = g.stage, { stage1Only, stage2Only } = g.world;
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    const statue = g.korki.korkiStatue()!;
    g.placePlayer(gold.x, gold.z);
    g.runUntil(() => g.layout.stage.n === 2, 5);
    expect(staging()).toBe(true);
    expect($('banner').classList.contains('on')).toBe(true);
    expect($('banner').textContent).toBe('Stage 1 completeFish Market');
    expect(g.unlocks.visibleTiles()).toHaveLength(0); // stage 2's wait for the show
    g.run(1.6);
    expect(stage1Only.fence.visible).toBe(false);
    expect(g.counters.C1.meshes.every(m => !m.visible)).toBe(true);
    expect(view.k).toBeGreaterThan(0.5);
    expect(view.zoom).toBeGreaterThan(STAGE2_ZOOM);
    g.run(0.8);
    expect($('banner').textContent).toBe('Stage 2Floe Sushi');
    expect(g.korki.STATUE.z).toBe(g.korki.GARDEN_SPOT.statue.z);
    g.ui.hud(0.016); // confetti falling
    g.run(5);
    expect(staging()).toBe(false);
    expect($('banner').classList.contains('on')).toBe(false);
    expect([view.k, view.zoom]).toEqual([0, STAGE2_ZOOM]);
    expect(stage2Only.trees.scale.y).toBe(1);
    expect(g.hall.hallPieces.every(p => p.visible && p.scale.x === 1)).toBe(true);
    expect(statue.visible && statue.scale.x === 1).toBe(true);
    expect(g.hall.lamps[0].intensity).toBeCloseTo(9);
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['paddy', 'chef']);
  });

  it('moves fast for players who prefer less motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const g = await loadGame({ tiles: bought(...MARKET) });
    g.unlocks.applyUnlock('sushi');
    g.run(2.5);
    expect(g.stage.staging()).toBe(false);
  });
});

describe('a stage 2 save', () => {
  it('loads straight into the finished restaurant at dusk', async () => {
    const g = await loadGame({ tiles: bought('roulette', 'sushi') });
    const { stage1Only, stage2Only } = g.world;
    expect(g.stage.staging()).toBe(false);
    expect(g.stage.view.zoom).toBe(g.stage.STAGE2_ZOOM);
    expect([stage1Only.fence.visible, stage1Only.road.visible, stage2Only.road.visible]).toEqual([false, false, true]);
    expect(g.farm.farmPieces.every(p => p.visible)).toBe(true);
    expect(g.hall.glowMats[0].emissiveIntensity).toBe(1);
    expect(g.casino.CASINO.z).toBeCloseTo(-1.6);
  });

  it('fades the roof slopes that would hide the player, and shows them again', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const north = g.hall.hallPieces[3].children.find(c => 'material' in c)! as unknown as { material: { opacity: number } };
    g.placePlayer(0, -2);
    g.run(1);
    expect(north.material.opacity).toBeLessThan(0.2);
    g.placePlayer(0, 14);
    g.run(1);
    expect(north.material.opacity).toBeGreaterThan(0.95);
  });
});
