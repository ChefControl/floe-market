// The Steam build's studio intro (intro.ts): ChefControl's mascot on its plate, then the studio's name.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { steamPage } from '../vite.config';

const intro = () => document.getElementById('intro');
const html = document.documentElement;
async function play(steam = true) {
  vi.resetModules();
  if (steam) vi.stubEnv('VITE_STEAM', 'on');
  const m = await import('../src/intro');
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
