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
    g.press('e');
    g.runUntil(() => tile.done, 5);
    expect(g.wallet.money).toBe(5);
    expect($('toast').textContent).toBe("Korki's golden statue unlocked");
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).tiles).toContainEqual({ id: 'korki', paid: 10, done: true, open: false });
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

  it("closes with its ✕ while the player stays on the pad, and opens again when they step back on", async () => {
    const g = await loadGame({ tiles: bought('korki') });
    const { KORKI } = await import('../src/korki');
    g.placePlayer(KORKI.x, KORKI.z);
    g.run(0.05);
    $('korkiClose').click();
    g.run(1);
    expect($('korki').hidden).toBe(true);
    g.placePlayer(0, 0);
    g.run(0.05);
    g.placePlayer(KORKI.x, KORKI.z);
    g.run(0.05);
    expect($('korki').hidden).toBe(false);
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

  describe('his tune', () => {
    async function onPad() {
      const g = await loadGame({ tiles: bought('korki') });
      const korki = await import('../src/korki');
      g.placePlayer(korki.KORKI.x, korki.KORKI.z);
      return { g, korki };
    }

    it('fades in only after lingering on the pad, over six seconds', async () => {
      const { g, korki } = await onPad();
      g.run(2.9);
      expect(korki.korkiK()).toBe(0);
      g.run(3.1);
      expect(korki.korkiK()).toBeGreaterThan(0.4);
      expect(korki.korkiK()).toBeLessThan(0.6);
      g.run(4);
      expect(korki.korkiK()).toBe(1);
    });

    it('fades out after walking away, and all the way out before it comes in again when they step back on', async () => {
      const { g, korki } = await onPad();
      g.run(12);
      g.placePlayer(0, 0);
      g.run(1);
      expect(korki.korkiK()).toBeGreaterThan(0.5);
      g.run(1.6);
      expect(korki.korkiK()).toBe(0);
      // stepping back on mid fade-out: it fades all the way out first, then in from silence (from the top, music.ts)
      g.run(5);
      g.placePlayer(korki.KORKI.x, korki.KORKI.z);
      g.run(1);
      g.placePlayer(0, 0);
      g.run(0.5);
      g.placePlayer(korki.KORKI.x, korki.KORKI.z);
      g.run(2.9);
      expect(korki.korkiK()).toBe(0);
      g.run(0.5);
      expect(korki.korkiK()).toBeGreaterThan(0);
    });

    it('names the tune under his story, with no link out', async () => {
      await loadGame();
      expect($('korki').querySelector('.song')!.textContent).toBe('♪ Stay a while: 5,000 km');
      expect($('korki').querySelector('.song a')).toBeNull();
      expect(document.getElementById('korkiMute')).toBeNull();
    });
  });
});
