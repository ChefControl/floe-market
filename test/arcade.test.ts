// Cooking Hazard's arcade cabinet on the casino yacht (casinoArcade.ts): where it stands, its card and Play. The game
// itself is in hazard.test.ts.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('the arcade cabinet', () => {
  it('stands by the door, and its pad opens a card with the best run and Play, which opens the game', async () => {
    const g = await loadGame({ money: 100, tiles: bought('roulette') });
    const arcade = await import('../src/casinoArcade');
    const pad = arcade.arcadePad();
    expect($('arcade').hidden).toBe(true);
    g.placePlayer(pad.x, pad.z); g.run(0.1);
    expect(arcade.arcadeView().open).toBe(true);
    expect($('arcadeBest').textContent).toBe('🏆 No best yet');
    // it faces away from the camera, so the camera comes round onto its face
    const kit = await import('../src/casinoKit');
    expect(kit.atTable()).toBe(true);
    // its screen's attract loop keeps going
    const t = arcade.arcadeView().t;
    g.run(1);
    expect(arcade.arcadeView().t).toBeGreaterThan(t);
    // Play opens the game over the whole screen, and the game waits behind it
    await arcade.playArcade();
    expect($('hazard').hidden).toBe(false);
    expect($('hazard').dataset.mode).toBe('pick');
    const was = g.player.g.position.clone();
    g.run(1);
    expect(g.player.g.position.distanceTo(was)).toBeLessThan(0.001);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    expect($('hazard').hidden).toBe(true);
    // stepping off shuts the card; a best run shows next time
    g.placePlayer(-15.7, -4.4); g.run(0.1);
    expect($('arcade').hidden).toBe(true);
    expect(kit.atTable()).toBe(false);
    localStorage.setItem('floe-market-hazard-haul', '14');
    g.placePlayer(pad.x, pad.z); g.run(0.1);
    expect($('arcadeBest').textContent).toBe('🏆 Best haul 14');
  });

  it("is in the player's way like any machine, but not on the way from the door to the games", async () => {
    const g = await loadGame({ money: 100, tiles: bought('roulette') });
    const { SHIP } = g.layout, p = g.player.g.position;
    const { CABINET } = await import('../src/casinoArcade');
    // walking at it from its front, the player stops at its control deck
    g.placePlayer(SHIP.x + CABINET.x - 1.2, SHIP.z + CABINET.z); g.run(0.05);
    for (let i = 0; i < 40; i++) { p.x += 0.05; g.run(1 / 60); }
    expect(p.x).toBeLessThan(SHIP.x + CABINET.x - 0.5);
  });
});
