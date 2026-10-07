// Korki's golden statue: the $10 memorial tile, the statue, and the memoir on its pad.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe("Korki's statue", () => {
  it('costs $10, builds the statue, and stays bought', async () => {
    const g = await loadGame({ money: 15 });
    const { KORKI } = await import('../src/korki');
    const tile = g.unlocks.tiles.find(t => t.id === 'korki')!;
    expect(tile.cost).toBe(10);
    g.placePlayer(KORKI.x, KORKI.z);
    g.runUntil(() => tile.done, 5);
    expect(g.wallet.money).toBe(5);
    expect($('toast').textContent).toBe("Korki's golden statue unlocked");
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).tiles).toContainEqual({ id: 'korki', paid: 10, done: true });
  });

  it('shows the memoir while the player stands on the pad', async () => {
    const g = await loadGame({ tiles: bought('korki') });
    const { KORKI } = await import('../src/korki');
    expect($('korki').hidden).toBe(true);
    g.placePlayer(KORKI.x, KORKI.z);
    g.run(0.05);
    expect($('korki').hidden).toBe(false);
    expect($('korki').textContent).toContain('5,000 kilometers');
    expect($('korki').textContent).toContain('Oran');
    g.placePlayer(0, 0);
    g.run(0.05);
    expect($('korki').hidden).toBe(true);
  });

  it('stands off the deck, out of the way', async () => {
    const g = await loadGame({ tiles: bought('korki') });
    const { STATUE } = await import('../src/korki');
    g.placePlayer(STATUE.x, STATUE.z);
    g.run(0.05);
    expect(g.player.g.position.z).toBe(7.3); // the deck edge stops the player well short of it
  });

  it('does nothing before it is bought', async () => {
    const g = await loadGame();
    const { KORKI } = await import('../src/korki');
    g.placePlayer(KORKI.x, KORKI.z);
    g.run(0.05);
    expect($('korki').hidden).toBe(true);
  });
});
