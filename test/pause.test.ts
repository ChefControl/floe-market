// The pause menu (pause.ts, #162) and the desktop app's display settings (display.ts, #163).
import { describe, expect, it, vi } from 'vitest';
import { fakeDesktop } from './desktopFake';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const key = (k: string, code = '') => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, cancelable: true, bubbles: true }));
const shows = (id: string) => !$(id).closest('[hidden]');

describe('the pause menu', () => {
  it('Esc brings it up over the paused game, and Esc or E (Resume) takes it away', async () => {
    await loadGame({ money: 7 }, { main: true });
    const { paused } = await import('../src/uiKit');
    expect(shows('pause')).toBe(false);
    key('Escape');
    expect([shows('pause'), paused(), document.activeElement?.id]).toEqual([true, true, 'pauseResume']);
    expect($('pause').querySelector('.k-paused')!.textContent).toBe('Game paused');
    key('Escape');
    expect([shows('pause'), paused()]).toEqual([false, false]);
    key('Escape');
    key('e', 'KeyE');
    expect(shows('pause')).toBe(false);
  });

  it("Esc closes what's open first, and doesn't open the menu with it", async () => {
    await loadGame({ money: 7 }, { main: true });
    $('gear').click();
    expect(shows('settings')).toBe(true);
    key('Escape');
    expect([shows('settings'), shows('pause')]).toEqual([false, false]);
    $('privacyFull').click(); // a dialog of the kit
    key('Escape');
    expect([shows('privacyDialog'), shows('pause')]).toEqual([false, false]);
  });

  it('1 opens the settings, 2 how to play; no Quit in a browser', async () => {
    await loadGame({ money: 7 }, { main: true });
    expect(shows('pauseQuit')).toBe(false);
    key('Escape');
    key('1', 'Digit1');
    expect([shows('pause'), shows('settings')]).toEqual([false, true]);
    $('gear').click();
    key('Escape');
    key('2', 'Digit2');
    expect([shows('pause'), shows('hint')]).toEqual([false, true]);
  });

  it('in the desktop app, Quit to desktop saves there and then, then quits', async () => {
    const d = fakeDesktop();
    const g = await loadGame({ money: 7 }, { main: true });
    g.wallet.money = 99;
    key('Escape');
    expect(shows('pauseQuit')).toBe(true);
    key('3', 'Digit3');
    expect(d.calls.slice(-2)).toEqual(['writeNow floe-market-v1', 'quit']);
    expect(JSON.parse(d.kept.get('floe-market-v1')!).money).toBe(99);
  });
});

describe('the display settings', () => {
  it('are only in the desktop app', async () => {
    await loadGame({ money: 7 }, { main: true });
    expect($('display').hidden).toBe(true);
  });

  it('switch the window, the resolution and the frame rate, and keep them on this device', async () => {
    const d = fakeDesktop();
    await loadGame({ money: 7 }, { main: true });
    const pressed = (sel: string) => [...$('display').querySelectorAll<HTMLButtonElement>(sel)].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
    expect($('display').hidden).toBe(false);
    expect([pressed('[data-screen]'), pressed('[data-scale]'), pressed('[data-cap]')]).toEqual([['Fullscreen'], ['100%'], ['Max']]);
    $('display').querySelector<HTMLButtonElement>('[data-screen="window"]')!.click();
    expect(d.calls[d.calls.length - 1]).toBe('fullscreen false');
    expect(pressed('[data-screen]')).toEqual(['Window']);
    // F11 in the program: the page hears of it
    for (const f of d.screen.changed) f({ fullscreen: true });
    expect(pressed('[data-screen]')).toEqual(['Fullscreen']);
    const { renderer } = await import('../src/render');
    const ratio = vi.spyOn(renderer, 'setPixelRatio');
    $('display').querySelector<HTMLButtonElement>('[data-scale="1"]')!.click();
    $('display').querySelector<HTMLButtonElement>('[data-scale="0.5"]')!.click();
    $('display').querySelector<HTMLButtonElement>('[data-cap="30"]')!.click();
    const [full, half] = ratio.mock.calls.map(c => c[0]);
    expect(half).toBeCloseTo(full / 2);
    expect([pressed('[data-scale]'), pressed('[data-cap]')]).toEqual([['50%'], ['30']]);
    expect(JSON.parse(localStorage.getItem('floe-display')!)).toEqual({ scale: 0.5, cap: 30 });
    const { frameGap } = await import('../src/display');
    expect(frameGap()).toBeCloseTo(1000 / 30 - 2);
  });
});
