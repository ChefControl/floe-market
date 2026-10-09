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
      expect(mid).toBeLessThan(10);
      g.run(4);
      expect(log.vol[log.vol.length - 1]).toBe(10);
      expect(Math.max(...log.vol)).toBe(10);
    });

    it('fades out and pauses after walking away, and comes back next visit', async () => {
      const log = fakeYouTube();
      const g = await onPad();
      g.run(12);
      g.placePlayer(0, 0);
      g.run(1);
      expect(log.vol[log.vol.length - 1]).toBeGreaterThan(3);
      expect(log.pause).toBe(0);
      g.run(1.6);
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

    it('fades in from silence again when the player steps back on mid fade-out', async () => {
      const log = fakeYouTube();
      const g = await onPad();
      g.run(12);
      const { KORKI } = await import('../src/korki');
      g.placePlayer(0, 0);
      g.run(0.5);
      g.placePlayer(KORKI.x, KORKI.z);
      g.run(2.9);
      expect(log.vol[log.vol.length - 1]).toBe(0);
      g.run(0.5);
      expect(log.vol[log.vol.length - 1]).toBeLessThanOrEqual(1);
    });

    it('mutes and unmutes from the button, and remembers the choice', async () => {
      const log = fakeYouTube();
      const g = await onPad();
      const btn = $('korkiMute') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      g.run(10);
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.textContent).toBe('🔇');
      expect(log.vol[log.vol.length - 1]).toBe(0);
      expect(log.pause).toBe(1);
      g.run(2);
      expect(log.play).toBe(1);
      expect(localStorage.getItem('floe-market-korki-muted')).toBe('1');
      btn.click();
      expect(log.play).toBe(2); // starts inside the tap
      g.run(3);
      expect(log.vol[log.vol.length - 1]).toBeGreaterThan(0);
      expect(log.vol[log.vol.length - 1]).toBeLessThan(10);
    });

    it('stays silent while muted', async () => {
      const log = fakeYouTube();
      const g = await loadGame({ tiles: bought('korki') });
      ($('korkiMute') as HTMLButtonElement).click();
      const { KORKI } = await import('../src/korki');
      g.placePlayer(KORKI.x, KORKI.z);
      g.run(10);
      expect(log.play).toBe(0);
    });

    it('starts muted on iPhone, where the song cannot be faded', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
      const log = fakeYouTube();
      const g = await onPad();
      expect($('korkiMute').getAttribute('aria-pressed')).toBe('true');
      g.run(10);
      expect(log.play).toBe(0);
    });

    it('links the song credit to the video', async () => {
      await loadGame();
      const a = document.querySelector<HTMLAnchorElement>('#korki .song a')!;
      expect(a.href).toBe('https://www.youtube.com/watch?v=jcutNFPwXPE');
      expect(a.target).toBe('_blank');
    });
  });
});
