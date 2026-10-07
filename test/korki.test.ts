// Korki's golden statue: the $10 memorial tile, the statue, and the memoir on its pad.
import { describe, expect, it, vi } from 'vitest';
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

  describe('his song', () => {
    /** Stand-in for YouTube's player API that records what the game asks of it. */
    function fakeYouTube() {
      const log = { created: 0, play: 0, pause: 0, vol: [] as number[] };
      class Player {
        constructor(_el: HTMLElement, o: { events: { onReady: (e: { target: Player }) => void } }) {
          log.created++;
          o.events.onReady({ target: this });
        }
        playVideo() { log.play++; }
        pauseVideo() { log.pause++; }
        setVolume(v: number) { log.vol.push(v); }
      }
      vi.stubGlobal('YT', { Player });
      return log;
    }

    async function onPad() {
      const g = await loadGame({ tiles: bought('korki') });
      const { KORKI } = await import('../src/korki');
      g.placePlayer(KORKI.x, KORKI.z);
      return g;
    }

    it('fades in, quietly, only after lingering on the pad', async () => {
      const log = fakeYouTube();
      const g = await onPad();
      g.run(2.5);
      expect(log.created).toBe(0);
      g.run(1);
      expect(log.created).toBe(1);
      expect(log.play).toBe(1);
      g.run(3);
      const mid = log.vol[log.vol.length - 1];
      expect(mid).toBeGreaterThan(3);
      expect(mid).toBeLessThan(15);
      g.run(4);
      expect(log.vol[log.vol.length - 1]).toBe(15);
      expect(Math.max(...log.vol)).toBe(15);
    });

    it('fades out and pauses after walking away, and comes back next visit', async () => {
      const log = fakeYouTube();
      const g = await onPad();
      g.run(12);
      g.placePlayer(0, 0);
      g.run(2);
      expect(log.vol[log.vol.length - 1]).toBeGreaterThan(5);
      expect(log.pause).toBe(0);
      g.run(2.5);
      expect(log.vol[log.vol.length - 1]).toBe(0);
      expect(log.pause).toBe(1);
      const { KORKI } = await import('../src/korki');
      g.placePlayer(KORKI.x, KORKI.z);
      g.run(4);
      expect(log.created).toBe(1);
      expect(log.play).toBe(2);
    });

    it("loads YouTube's player API the first time it's needed", async () => {
      const g = await onPad();
      g.run(3.5);
      const script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      expect(script).not.toBeNull();
      const log = fakeYouTube();
      window.onYouTubeIframeAPIReady!();
      g.run(1);
      expect(log.created).toBe(1);
      expect(log.play).toBe(1);
    });
  });
});
