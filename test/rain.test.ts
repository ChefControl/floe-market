// Her house past the road: the path out to it, and the rain, tears and song in the circle out front.
import { Mesh, type Color, type MeshLambertMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

/** Stand-in for YouTube's player API that records what the game asks of each player. */
function fakeYouTube() {
  const log = { ids: [] as string[], vars: [] as Record<string, unknown>[], play: 0, pause: 0, seek: [] as number[], vol: [] as number[] };
  class Player {
    constructor(_el: HTMLElement, o: { videoId: string; playerVars: Record<string, unknown>; events: { onReady: (e: { target: Player }) => void } }) {
      log.ids.push(o.videoId);
      log.vars.push(o.playerVars);
      o.events.onReady({ target: this });
    }
    playVideo() { log.play++; }
    pauseVideo() { log.pause++; }
    seekTo(s: number) { log.seek.push(s); }
    setVolume(v: number) { log.vol.push(v); }
  }
  vi.stubGlobal('YT', { Player });
  return log;
}

async function house() {
  const g = await loadGame();
  const rain = await import('../src/rain');
  return { g, rain, toPad: () => g.placePlayer(rain.RAIN_PAD.x, rain.RAIN_PAD.z) };
}

describe('her house', () => {
  it('can be walked to from the deck, across the road, but not into', async () => {
    const { g, rain } = await house();
    for (const x of [7.8, 9.6, 15, rain.RAIN_PAD.x]) {
      g.placePlayer(x, rain.RAIN_PAD.z);
      g.run(0.05);
      expect(g.player.g.position.x).toBeCloseTo(x);
    }
    g.placePlayer(30, rain.RAIN_PAD.z);
    g.run(0.05);
    expect(g.player.g.position.x).toBeLessThan(24); // the front wall
    g.placePlayer(12, 3);
    g.run(0.05);
    expect(g.player.g.position.z).toBeGreaterThan(5.7); // off the path is snow, not floor
  });

  it('keeps the path open once the sushi restaurant is built', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { RAIN_PAD } = await import('../src/rain');
    g.placePlayer(RAIN_PAD.x, RAIN_PAD.z);
    g.run(0.05);
    expect(g.player.g.position.x).toBeCloseTo(RAIN_PAD.x);
  });

  it('rains, greys the sky, and makes the player cry while standing in the circle', async () => {
    const { g, rain, toPad } = await house();
    const bg = () => g.render.scene.background as Color;
    const sky = bg().clone();
    const tears = g.player.g.children.filter(c => !c.visible && c.scale.y === 1.6);
    /** Colour of the shirt or parka the player is wearing. */
    const top = () => {
      const m = g.player.g.children.find(c => c.visible && c instanceof Mesh && c.geometry === g.render.G.body) as Mesh;
      return (m.material as MeshLambertMaterial).color.getHex();
    };
    expect(top()).toBe(0xFF6B4A);
    expect(tears).toHaveLength(4);
    expect($('rain').hidden).toBe(true);
    g.run(1);
    expect(rain.rainK).toBe(0);

    const cam = g.render.camera;
    cam.position.set(rain.RAIN_PAD.x + 5, 15, rain.RAIN_PAD.z + 12);
    cam.lookAt(rain.RAIN_PAD.x, 0, rain.RAIN_PAD.z);
    cam.updateMatrixWorld();
    toPad();
    g.run(1);
    expect(rain.crying).toBe(true);
    expect($('rain').hidden).toBe(false);
    expect(rain.rainK).toBeGreaterThan(0.3);
    expect(rain.rainK).toBeLessThan(0.5);
    expect(tears.every(t => t.visible)).toBe(true);
    expect(top()).toBe(0x18181D); // dressed as the singer
    expect(document.querySelector('.pop')!.textContent).toBe('😢');
    g.run(2);
    expect(rain.rainK).toBe(1);
    expect(bg().equals(sky)).toBe(false);
    expect(g.render.hemi.intensity).toBeLessThan(0.78 * Math.PI);
    // turned to face her window, a hand up to wipe the tears
    expect(g.player.h).toBeCloseTo(Math.PI / 2, 1);
    expect(g.player.g.arms[0].rotation.x).toBeLessThan(-2);
    expect(g.player.g.arms[0].rotation.z).toBe(0.6);

    g.placePlayer(15, rain.RAIN_PAD.z);
    g.run(0.1);
    expect(rain.crying).toBe(false);
    expect($('rain').hidden).toBe(true);
    expect(tears.some(t => t.visible)).toBe(false);
    expect(top()).toBe(0xFF6B4A);
    expect(g.player.g.arms[0].rotation.z).toBe(0);
    expect(rain.rainK).toBeGreaterThan(0.5);
    g.run(3);
    expect(rain.rainK).toBe(0);
    expect(bg().equals(sky)).toBe(true);
    expect(g.render.hemi.intensity).toBeCloseTo(0.78 * Math.PI);
  });

  it('leaves the hands alone while carrying steaks', async () => {
    const { g, toPad } = await house();
    g.stations.pile.put(g.items.newSteak());
    g.player.back.put(g.stations.pile.take()!);
    toPad();
    g.run(1);
    expect(g.player.g.arms[0].rotation.x).toBe(-1.25);
  });

  describe('the song', () => {
    it('plays from the line, fades in, and fades out after walking away', async () => {
      const log = fakeYouTube();
      const { g, rain, toPad } = await house();
      g.run(1);
      expect(log.ids).toHaveLength(0);
      toPad();
      g.run(0.1);
      expect(log.ids).toEqual([rain.SONG.id]);
      expect(log.vars[0].start).toBe(rain.SONG.start);
      expect(log.seek).toEqual([rain.SONG.start]);
      expect(log.play).toBe(1);
      g.run(2.5);
      expect(log.vol[log.vol.length - 1]).toBe(60);

      g.placePlayer(15, rain.RAIN_PAD.z);
      g.run(1.5);
      expect(log.vol[log.vol.length - 1]).toBeGreaterThan(20);
      expect(log.pause).toBe(0);
      g.run(2);
      expect(log.vol[log.vol.length - 1]).toBe(0);
      expect(log.pause).toBe(1);

      // back in the circle, it starts over from the same line
      toPad();
      g.run(0.5);
      expect(log.ids).toHaveLength(1);
      expect(log.seek).toEqual([rain.SONG.start, rain.SONG.start]);
      expect(log.play).toBe(2);
    });

    it('mutes from its button, and starts inside the tap that unmutes it', async () => {
      const log = fakeYouTube();
      const { g, toPad } = await house();
      const btn = $('rainMute') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      toPad();
      g.run(1);
      btn.click();
      expect(btn.textContent).toBe('🔇');
      expect(log.pause).toBe(1);
      expect(localStorage.getItem('floe-market-rain-muted')).toBe('1');
      g.run(1);
      expect(log.play).toBe(1);
      btn.click();
      expect(log.play).toBe(2);
    });

    it('starts muted on iPhone, where it cannot be faded', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
      const log = fakeYouTube();
      const { g, toPad } = await house();
      expect($('rainMute').getAttribute('aria-pressed')).toBe('true');
      toPad();
      g.run(3);
      expect(log.play).toBe(0);
    });

    it("shares one load of YouTube's player API with Korki's song", async () => {
      const g = await loadGame({ tiles: bought('korki') });
      const { KORKI } = await import('../src/korki');
      const { RAIN_PAD } = await import('../src/rain');
      const scripts = () => document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').length;
      const before = scripts();
      g.placePlayer(KORKI.x, KORKI.z);
      g.run(3.5);
      g.placePlayer(RAIN_PAD.x, RAIN_PAD.z);
      g.run(0.1);
      expect(scripts()).toBe(before + 1);
      const log = fakeYouTube();
      window.onYouTubeIframeAPIReady!();
      expect(log.ids).toEqual(['jcutNFPwXPE', (await import('../src/rain')).SONG.id]);
    });

    it('links the song credit to the video', async () => {
      await loadGame();
      const { SONG } = await import('../src/rain');
      const a = $('rainSong') as HTMLAnchorElement;
      expect(a.href).toBe(`https://www.youtube.com/watch?v=${SONG.id}`);
      expect(a.target).toBe('_blank');
    });
  });
});
