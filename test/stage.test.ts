// The stage-up from the fish market to Floe Sushi: the show when the gold tile is bought, and the stage 2 world
// a saved game loads straight into.
import { Color } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('the stage-up', () => {
  it("keeps all the market's runners for the restaurant, fish and all", async () => {
    const g = await loadGame({ tiles: bought(...MARKET), money: 12000 });
    const { runners } = g.runner;
    expect(runners).toHaveLength(2);
    const second = runners[1];
    for (let i = 0; i < 3; i++) second.back.put(g.items.newFillet());
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => g.layout.stage.n === 2, 5);
    g.press('e', 'keyup');
    g.run(4);
    expect(runners).toHaveLength(2);
    expect(second.g.visible).toBe(true);
    g.runUntil(() => g.restaurant.fishTray.n >= 3, 20); // its fish goes to the kitchen line
  });

  it('loads a restaurant with the runners the market had', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi') });
    expect(g.runner.runners).toHaveLength(2);
  });

  it('plays when the gold tile is paid off: banner, camera pull-back, the old counters out and the restaurant in', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'korki'), money: 12000, c1: 4, c1c: 12 });
    const boat = g.casino.casinoPieces();
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
    expect(g.unlocks.visibleTiles()).toHaveLength(0); // stage 2's, and the casino boat's games, wait for the show
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
    expect(g.unlocks.visibleTiles().map(t => t.id)).toEqual(['paddy', 'seats', 'chef', 'slots', 'blackjack']);
    // the casino boat stays where it was all through
    expect(boat.every(o => o.visible && o.scale.x === 1)).toBe(true);
  });

  it('leaves the sled window up, shut, with a sign for the takeout to come, till the takeout kiosk opens', async () => {
    const g = await loadGame({ tiles: bought(...MARKET), money: 12000 });
    const { SLED } = g.counters, [stall, pad] = SLED.meshes;
    const parts = stall.children.length;
    const gold = g.unlocks.tiles.find(t => t.id === 'sushi')!;
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => g.layout.stage.n === 2, 5);
    g.press('e', 'keyup');
    g.run(8);
    expect(g.stage.staging()).toBe(false);
    expect(SLED.enabled).toBe(false);
    expect(pad.visible).toBe(false);
    expect(stall.visible && stall.scale.x === 1).toBe(true);
    expect(stall.children).toHaveLength(parts + 1); // the sign
    expect(stall.children[stall.children.length - 1].scale.x).toBe(1);
    g.unlocks.applyUnlock('kiosk');
    expect(stall.visible).toBe(false);
  });

  it('loads the shut sled window into stage 2, or not once the takeout kiosk is open', async () => {
    let g = await loadGame({ tiles: bought(...MARKET, 'sushi') });
    expect(g.counters.SLED.meshes[0].visible).toBe(true);
    g = await loadGame({ tiles: bought(...MARKET, 'sushi', 'kiosk') });
    expect(g.counters.SLED.meshes[0].visible).toBe(false);
    expect(g.counters.TAKEOUT.meshes.every(m => m.visible)).toBe(true);
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
    expect(g.layout.casinoBoat.open).toBe(true);
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
