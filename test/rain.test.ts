// Her house past the road: the path out to it, and the rain, tears and song in the circle out front.
import { LineSegments, Mesh, type Color, type MeshLambertMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

interface FakeEvents {
  onReady: (e: { target: unknown }) => void;
  onStateChange: (e: { data: number }) => void;
  onError: (e: { data: number }) => void;
}

/**
 * Stand-in for YouTube's player API that records what the game asks of each player. With `starts`, playVideo()
 * reports the player as playing, as YouTube does when the browser lets it; without, it stays silent, and the test
 * can play YouTube's part through `events`.
 */
function fakeYouTube(starts = false) {
  const log = {
    ids: [] as string[], vars: [] as Record<string, unknown>[], play: 0, pause: 0, seek: [] as number[], vol: [] as number[],
    events: null as FakeEvents | null,
  };
  class Player {
    constructor(_el: HTMLElement, o: { videoId: string; playerVars: Record<string, unknown>; events: FakeEvents }) {
      log.ids.push(o.videoId);
      log.vars.push(o.playerVars);
      log.events = o.events;
      o.events.onReady({ target: this });
    }
    playVideo() { log.play++; if (starts) log.events!.onStateChange({ data: 1 }); }
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
    const tears = g.player.g.body.children.filter(c => !c.visible && c.scale.y === 1.6);
    /** Colour of the shirt or parka the player is wearing. */
    const top = () => {
      const own = g.player.g.worn().find(w => w.geo === g.render.G.body);
      const jacket = g.player.g.body.children.find(c => c.visible && c instanceof Mesh && c.geometry === g.render.G.body) as Mesh | undefined;
      expect(!own !== !jacket).toBe(true); // one or the other, never both
      return own ? own.c : (jacket!.material as MeshLambertMaterial).color.getHex();
    };
    // the jacket is read off the Low look's own mesh (High bakes it in with the rest of him)
    (await import('../src/graphics')).choose('low');
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
    expect(top()).toBe(0x5F7A3B); // in the singer's olive jacket
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
    expect(g.player.g.arms[0].rotation.z).toBe(-g.player.g.arms[1].rotation.z); // hanging again, like the other
    expect(rain.rainK).toBeGreaterThan(0.5);
    g.run(3);
    expect(rain.rainK).toBe(0);
    expect(bg().equals(sky)).toBe(true);
    expect(g.render.hemi.intensity).toBeCloseTo(0.78 * Math.PI);
  });

  it('lets the rain fall where it is: it stays put as the player walks about in it', async () => {
    const { g, toPad } = await house();
    toPad();
    g.run(1);
    const rain = g.render.scene.children.find(o => o instanceof LineSegments)!;
    const xs = () => Array.from((rain.geometry.attributes.position.array as Float32Array).filter((_, i) => i % 6 === 0));
    const before = xs();
    g.placePlayer(g.player.g.position.x - 0.5, g.player.g.position.z);
    g.run(1 / 60);
    const after = xs(), moved = after.filter((x, i) => Math.abs(x - before[i]) > 1e-4).length;
    expect(rain.position.x).toBe(0);
    expect(moved / after.length).toBeLessThan(0.05); // only those that wrapped round to the far side
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

    it('says nothing on the banner while the song plays', async () => {
      fakeYouTube(true);
      const { g, toPad } = await house();
      toPad();
      g.run(5);
      expect($('rainHint').hidden).toBe(true);
    });

    it("asks for a tap when the browser won't start it, and starts it on that tap", async () => {
      const log = fakeYouTube();
      const { g, rain, toPad } = await house();
      toPad();
      g.run(1.5);
      expect(log.play).toBe(1);
      expect($('rainHint').hidden).toBe(true); // give YouTube a moment first
      g.run(1);
      expect($('rainHint').hidden).toBe(false);
      expect($('rainHint').textContent).toBe('Tap anywhere to hear the song');
      window.dispatchEvent(new Event('pointerdown'));
      expect(log.play).toBe(2);
      log.events!.onStateChange({ data: 3 }); // buffering, then playing
      g.run(0.1);
      expect($('rainHint').hidden).toBe(true);
      log.events!.onStateChange({ data: 1 });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(log.play).toBe(2); // already playing: taps leave it alone
      g.placePlayer(15, rain.RAIN_PAD.z);
      g.run(0.1);
      expect($('rain').hidden).toBe(true);
    });

    it("says so when YouTube won't play the video outside YouTube", async () => {
      const log = fakeYouTube();
      const { g, toPad } = await house();
      toPad();
      g.run(0.5);
      log.events!.onError({ data: 150 });
      g.run(0.1);
      expect($('rainHint').textContent).toBe("YouTube won't play this song here. Tap its name to listen on YouTube");
      window.dispatchEvent(new Event('pointerdown'));
      expect(log.play).toBe(1); // no point retrying
    });

    it("says so when YouTube's player doesn't load", async () => {
      const { g, toPad } = await house();
      toPad();
      g.run(5);
      expect($('rainHint').hidden).toBe(true);
      g.run(1.5);
      expect($('rainHint').textContent).toBe("Couldn't load YouTube's player. Check your connection, or allow YouTube in your ad blocker");
      const log = fakeYouTube();
      window.onYouTubeIframeAPIReady!(); // it turns up after all
      g.run(0.1);
      expect(log.play).toBe(1);
      expect($('rainHint').hidden).toBe(true);
    });

    it('points at the mute button while muted', async () => {
      fakeYouTube();
      const { g, toPad } = await house();
      ($('rainMute') as HTMLButtonElement).click();
      toPad();
      g.run(0.1);
      expect($('rainHint').textContent).toBe('Tap 🔇 to hear the song');
      ($('rainMute') as HTMLButtonElement).click();
      g.run(0.1);
      expect($('rainHint').hidden).toBe(true);
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
      expect(a.href).toBe(`https://www.youtube.com/watch?v=${SONG.id}&t=${SONG.start}s`);
      expect(a.target).toBe('_blank');
    });
  });
});

describe('the crossing', () => {
  it('stops drivers for the player in the road; kept waiting, they beep, then lean on the horn and get cross', async () => {
    const g = await loadGame({ tiles: bought('sled') });
    const { SLED } = g.counters;
    const { moodMat } = await import('../src/bubble');
    const { HOUSE_PATH_Z } = await import('../src/layout');
    const { ROAD1_X } = g.world;
    g.placePlayer(ROAD1_X, HOUSE_PATH_Z); // on the zebra crossing
    g.runUntil(() => SLED.queue[0]?.held > 0);
    const c = SLED.queue[0];
    expect(c.g.position.z).toBeGreaterThan(HOUSE_PATH_Z + 0.3); // stopped short, coming up from the south
    g.run(1.5);
    expect(c.mood.visible).toBe(true);
    g.run(1.5);
    expect(c.mood.material).toBe(moodMat('angry'));
    // one behind waits behind it (sent along now, before the first loses patience and gets out)
    SLED.spawnT = 0;
    g.runUntil(() => SLED.queue[1]?.stopped === true, 20);
    expect(c.out).toBeFalsy();
    expect(SLED.queue[1].g.position.z - c.g.position.z).toBeGreaterThan(2);
    expect(SLED.queue[1].held).toBe(0); // it's the one in front that's held up by the player
    // off the road: on they go, the face gone
    g.placePlayer(7.5, HOUSE_PATH_Z);
    g.run(0.1);
    expect(c.held).toBe(0);
    expect(c.mood.visible).toBe(false);
    g.runUntil(() => c.arrived);
  });

  it('holds up drivers on their way home too', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'kiosk') });
    const { TAKEOUT } = g.counters;
    const { HOUSE_PATH_Z } = await import('../src/layout');
    for (let i = 0; i < 12; i++) TAKEOUT.stock.put(g.items.newBox(30, false));
    g.runUntil(() => TAKEOUT.queue[0]?.got > 0, 40);
    const c = TAKEOUT.queue[0];
    g.placePlayer(g.world.ROAD2_X, HOUSE_PATH_Z + 0.4);
    g.runUntil(() => !TAKEOUT.queue.includes(c) && c.held > 0, 30);
    expect(c.g.position.z).toBeLessThan(HOUSE_PATH_Z); // heading south, stopped short of the player
    g.run(3);
    expect(c.mood.visible).toBe(true);
    g.placePlayer(10, HOUSE_PATH_Z);
    g.run(0.1);
    expect(c.mood.visible).toBe(false);
  });

  it('kept waiting long enough, a driver gets out and boops the player back onto the pavement', async () => {
    const g = await loadGame({ tiles: bought('sled') });
    const { SLED } = g.counters;
    const { HOUSE_PATH_Z } = await import('../src/layout');
    const { ROAD1_X, ROAD_HALF } = g.world;
    const { player } = await import('../src/player');
    g.placePlayer(ROAD1_X - 0.4, HOUSE_PATH_Z); // on the crossing, in the near lane
    g.runUntil(() => SLED.queue[0]?.held > 0);
    const { Person } = await import('../src/characters');
    const c = SLED.queue[0], seat = c.g.children.find(o => o instanceof Person)!;
    g.run(7);
    expect(c.out).toBeNull(); // still leaning on the horn
    g.runUntil(() => c.out !== null, 2);
    expect(c.stopped).toBe(true);
    g.runUntil(() => player.booped !== null, 5);
    // the driver walked over from the sled
    expect(Math.hypot(seat.position.x, seat.position.z)).toBeGreaterThan(1);
    g.runUntil(() => player.booped === null, 1);
    expect(player.g.position.x).toBeLessThan(ROAD1_X - ROAD_HALF); // back on the pavement, the market's side
    expect(player.g.position.z).toBeCloseTo(HOUSE_PATH_Z, 1);
    // back in the seat, and on their way
    g.runUntil(() => c.out === null, 5);
    expect(seat.position.toArray()).toEqual([0, 0.28, 0.1]);
    expect(c.mood.visible).toBe(false);
    g.runUntil(() => c.arrived, 10);
  });

  it('gives up and gets back in if the player steps off the road first', async () => {
    const g = await loadGame({ tiles: bought('sled') });
    const { SLED } = g.counters;
    const { HOUSE_PATH_Z } = await import('../src/layout');
    const { player } = await import('../src/player');
    g.placePlayer(g.world.ROAD1_X, HOUSE_PATH_Z);
    g.runUntil(() => SLED.queue[0]?.out != null, 40);
    const c = SLED.queue[0];
    g.placePlayer(7.5, HOUSE_PATH_Z);
    g.runUntil(() => c.out === null, 5);
    expect(player.booped).toBeNull();
    expect(player.g.position.x).toBe(7.5);
  });

  it('has a lane each way: customers keep to the counter side, and others drive by the other way', async () => {
    const g = await loadGame({ tiles: bought('sled') });
    const { SLED, leaving } = g.counters;
    const { ROAD1_X } = g.world;
    g.runUntil(() => SLED.queue.length > 0);
    expect(SLED.queue[0].g.position.x).toBeLessThan(ROAD1_X); // the near lane, coming up from the south
    g.runUntil(() => leaving.some(c => c.g.position.x > ROAD1_X), 20);
    const by = leaving.find(c => c.g.position.x > ROAD1_X)!;
    const z = by.g.position.z;
    g.run(1);
    expect(by.g.position.z).toBeGreaterThan(z); // down the road, southwards
    expect(by.want).toBe(0);
    g.runUntil(() => !leaving.includes(by), 30);
    expect(SLED.queue).not.toContain(by);
  });
});
