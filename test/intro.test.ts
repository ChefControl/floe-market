// The Steam build's studio intro (intro.ts): ChefControl's mascot on its plate, then the studio's name.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { steamPage } from '../vite.config';
import { fake, type FakeNode, type FakeParam, installFakeAudio } from './fakeAudio';

const intro = () => document.getElementById('intro');
const html = document.documentElement;
/** The intro module last loaded: each test ends what it left playing, so its keys don't reach the next test's. */
let last: typeof import('../src/intro') | undefined;
afterEach(() => { last?.endIntro(); last = undefined; });
async function play(steam = true) {
  last?.endIntro();
  vi.resetModules();
  if (steam) vi.stubEnv('VITE_STEAM', 'on');
  const m = last = await import('../src/intro');
  return { m, played: m.playIntro() };
}

describe('the studio intro', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
    html.className = '';
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it('is only in the Steam build', async () => {
    const { played } = await play(false);
    expect([played, intro(), html.classList.contains('intro')]).toEqual([false, null, false]);
  });

  it('plays once a run, over the loading screen, then fades to the game', async () => {
    const { m, played } = await play();
    expect([played, html.classList.contains('intro'), intro()?.getAttribute('aria-label')]).toEqual([true, true, 'ChefControl Studio']);
    // the logo's own drawing, the falling parts apart, with the glint's sparkle; then the name
    for (const part of ['cc-plate', 'cc-ball', 'cc-top', 'cc-mag', 'cc-tails', 'cc-wink']) expect(intro()!.querySelector(`#${part}`)).not.toBeNull();
    expect(intro()!.querySelector('.spark')).not.toBeNull();
    expect([...intro()!.querySelectorAll('p')].map(p => p.textContent)).toEqual(['ChefControl', 'Studio']);
    vi.advanceTimersByTime(m.LENGTH * 1000 - 1);
    expect(intro()!.classList.contains('out')).toBe(false);
    vi.advanceTimersByTime(1);
    expect([intro()!.classList.contains('out'), html.classList.contains('intro'), m.introOn()]).toEqual([true, false, false]);
    vi.advanceTimersByTime(500);
    expect(intro()).toBeNull();
    // a reload in the same run: straight to the game
    expect((await play()).played).toBe(false);
  });

  it("a key or a click skips it, and the game doesn't hear it", async () => {
    await play();
    const heard = vi.fn();
    window.addEventListener('keydown', heard);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', cancelable: true }));
    expect([heard.mock.calls.length, intro()!.className]).toEqual([0, 'out fast']);
    vi.advanceTimersByTime(250);
    expect(intro()).toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', heard);
  });

  it("the Steam build's page says so from its first line, so its head hides the loading screen at once", () => {
    expect(steamPage(indexHtml)).toContain('<html lang="en" data-steam>');
    expect(indexHtml).toContain("document.documentElement.hasAttribute('data-steam') && sessionStorage.getItem('floe-intro') !== '1'");
    expect(() => steamPage('<html>')).toThrow(/no <html lang="en">/);
  });
});

describe("the studio intro's sound", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.body.innerHTML = '';
    html.className = '';
    vi.useFakeTimers();
    installFakeAudio();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete (navigator as { webdriver?: boolean }).webdriver;
  });
  /** The intro's own mix: the gain every sound goes through on its way out, after its envelope. */
  const master = () => (fake.played[0].src.outs[0].outs[0] as FakeNode & { gain: FakeParam }).gain;

  it('plays with it, every sound rising from silence, at the effects\' volume', async () => {
    localStorage.setItem('floe-market-sound', JSON.stringify({ level: { sfx: 10 } }));
    await play();
    expect(fake.made).toBe(1);
    // (besides the wind's flutter, a slow wobble of its level)
    const tones = fake.played.filter(p => p.kind === 'tone' && p.f > 20), hiss = fake.played.filter(p => p.kind === 'noise');
    expect([tones.length, hiss.length]).toEqual([16, 3]);
    // (nothing starts at full: each envelope sets off from 0, so nothing clicks)
    expect([...tones, ...hiss].every(p => p.from === 0)).toBe(true);
    // the effects slider at 10: twice the mix's level
    expect(master().value).toBeCloseTo(0.48);
    // nothing shrill
    expect(Math.max(...tones.map(p => p.f))).toBeLessThan(4000);
  });

  it('is silent with the effects muted, or while the game is being tested', async () => {
    localStorage.setItem('floe-market-sound', JSON.stringify({ mute: { sfx: true } }));
    await play();
    expect(fake.made).toBe(0);
    localStorage.clear(); sessionStorage.clear();
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
    await play();
    expect([fake.made, intro() !== null]).toEqual([0, true]);
  });

  it('fades away when the intro is skipped', async () => {
    await play();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(master().value).toBe(0);
  });
});
