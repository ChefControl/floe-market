// The stage-up from the fish market to Floe Sushi: the show when the gold tile is bought, and the stage 2 world
// a saved game loads straight into.
import { Color } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('the stage-up', () => {
  it('keeps two of the market\'s three runners for the restaurant: the third hands its fish back and goes', async () => {
    const g = await loadGame({ tiles: bought(...MARKET), money: 12000 });
    const { runners } = g.runner;
    expect(runners).toHaveLength(3);
    const third = runners[2];
    for (let i = 0; i < 3; i++) third.back.put(g.items.newSteak());
    const pile = g.stations.pile.n;
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => g.layout.stage.n === 2, 5);
    g.press('e', 'keyup');
    expect(runners).toHaveLength(2);
    expect(g.stations.pile.n).toBe(pile + 3); // nothing lost
    g.run(4);
    expect(third.g.visible).toBe(false); // gone with the market
  });

  it('loads a restaurant with two runners, whatever the market had', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi') });
    expect(g.runner.runners).toHaveLength(2);
  });

  it('plays when the gold tile is paid off: banner, camera pull-back, the old counters out and the restaurant in', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'korki'), money: 12000, c1: 4, c1c: 12 });
    const { staging, view, STAGE2_ZOOM } = g.stage, { stage1Only, stage2Only } = g.world;
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    const statue = g.korki.korkiStatue()!;
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => g.layout.stage.n === 2, 5);
    g.press('e', 'keyup');
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
    expect($('confetti').hidden).toBe(false);
    for (let i = 0; i < 100 && !$('confetti').hidden; i++) g.ui.hud(0.05);
    expect($('confetti').hidden).toBe(true); // all fallen: the canvas goes, so it isn't drawn over the game
    g.run(5);
    expect(staging()).toBe(false);
    expect($('banner').classList.contains('on')).toBe(false);
    expect([view.k, view.zoom]).toEqual([0, STAGE2_ZOOM]);
    expect(stage2Only.trees.scale.y).toBe(1);
    expect(g.hall.hallPieces.every(p => p.visible && p.scale.x === 1)).toBe(true);
    expect(statue.visible && statue.scale.x === 1).toBe(true);
    expect(g.hall.lamps[0].intensity).toBeCloseTo(9);
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['paddy', 'seats', 'chef']);
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

  it("leads out to her house through a door in the east wall, and rains over the dusk, then clears back to it", async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { RAIN_PAD } = await import('../src/rain');
    const p = g.player.g.position, bg = g.render.scene.background as Color, dusk = bg.clone();
    expect(dusk.equals(new Color(0xCFEAF5))).toBe(false);
    g.placePlayer(10.0, RAIN_PAD.z);
    g.run(0.05);
    expect(p.x).toBeCloseTo(10.0); // in the doorway
    g.placePlayer(10.0, 4.5);
    g.run(0.05);
    expect(p.x).toBeCloseTo(9.6); // the wall beside it
    g.placePlayer(RAIN_PAD.x, RAIN_PAD.z);
    g.run(3);
    expect(bg.equals(dusk)).toBe(false);
    g.placePlayer(15, RAIN_PAD.z);
    g.run(4);
    expect(bg.equals(dusk)).toBe(true);
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
