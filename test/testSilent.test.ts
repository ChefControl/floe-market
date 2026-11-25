// A game being tested starts silent (flags.ts): driven by an automation, or a demo build opened at localhost. The mix
// is silenced from the start, the player's own sound settings untouched; ?sound=on plays it anyway, ?sound=off silences
// any game.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fake, installFakeAudio, nameBuses, type FakeNode, type FakeParam } from './fakeAudio';
import { loadGame } from './helpers';

const at = (url: string) => new URL(url);
type Gain = FakeNode & { gain: FakeParam };

/** An automation drives the page (jsdom's navigator has no webdriver of its own). */
const driven = () => Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete (navigator as { webdriver?: boolean }).webdriver;
  history.replaceState(null, '', '/');
});

describe('sound while testing (flags.ts)', () => {
  it('is silent under automation and in a demo build at localhost, and playing anywhere else', async () => {
    const { testSilent } = await import('../src/flags');
    // the dev server and the live game: sound, unless an automation drives them
    expect(testSilent(at('http://localhost:5175/'), false)).toBe(false);
    expect(testSilent(at('https://chefcontrol.github.io/floe-market/'), false)).toBe(false);
    expect(testSilent(at('http://localhost:5175/'), true)).toBe(true);
    expect(testSilent(at('https://chefcontrol.github.io/floe-market/'), true)).toBe(true);
    // the demo build: silent at localhost (the agents' previews, the emulators), playing at the Wi-Fi address (a phone)
    vi.stubEnv('VITE_FUGU_DEMO', '1');
    for (const host of ['localhost:5177', '127.0.0.1:5177', '[::1]:5177']) expect(testSilent(at(`http://${host}/`), false)).toBe(true);
    expect(testSilent(at('http://192.168.1.20:5190/'), false)).toBe(false);
    vi.unstubAllEnvs();
    vi.stubEnv('MODE', 'demo');
    expect(testSilent(at('http://localhost:4173/'), false)).toBe(true);
    expect(testSilent(at('http://192.168.1.20:4173/'), false)).toBe(false);
  });

  it('?sound=on plays it anyway, and ?sound=off silences any game', async () => {
    const { testSilent } = await import('../src/flags');
    vi.stubEnv('VITE_FUGU_DEMO', '1');
    expect(testSilent(at('http://localhost:5177/?sound=on'), true)).toBe(false);
    expect(testSilent(at('http://localhost:5175/?stage3=on&sound=on'), false)).toBe(false);
    vi.unstubAllEnvs();
    expect(testSilent(at('http://192.168.1.20:5175/?sound=off'), false)).toBe(true);
  });

  /** A game whose sound is started by a key press: its mix's level (what reaches the speakers) and what it played. */
  async function started() {
    installFakeAudio();
    const g = await loadGame();
    const audio = await import('../src/audio');
    localStorage.removeItem('floe-market-sound');
    g.press('x'); g.press('x', 'keyup');
    nameBuses(audio.buses);
    for (let t = 0; t < 2; t += 1 / 60) { fake.now += 1 / 60; g.game.tick(1 / 60); }
    // every bus goes on into the mix (here, with no worklets, straight), and the mix on to the speakers
    const mix = (audio.buses.sfx as unknown as FakeNode).outs[0] as Gain;
    expect((audio.buses.amb as unknown as FakeNode).outs[0]).toBe(mix);
    expect(((audio.buses.music as unknown as FakeNode).outs[0] as Gain).outs[0]).toBe(mix);
    return { audio, mix };
  }

  it('starts a tested game with its mix at nothing, before a sound is made, and keeps nothing of it', async () => {
    driven();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { audio, mix } = await started();
    expect(mix.gain.value).toBe(0);
    expect(mix.gain.before).toBeUndefined(); // set before anything played, never faded down from full
    expect(info).toHaveBeenCalledWith(expect.stringContaining('?sound=on'));
    // the game sounds as ever behind it, and the player's settings are as they were, and not written
    expect(fake.played.some(p => p.loop)).toBe(true);
    expect(audio.prefs.mute).toEqual({ sfx: false, amb: false, music: false });
    expect(localStorage.getItem('floe-market-sound')).toBeNull();
  });

  it('leaves a played game at full', async () => {
    const { mix } = await started();
    expect(mix.gain.value).toBe(1);
  });

  it('plays a tested game with ?sound=on', async () => {
    driven();
    history.replaceState(null, '', '/?sound=on');
    const { mix } = await started();
    expect(mix.gain.value).toBe(1);
  });
});
