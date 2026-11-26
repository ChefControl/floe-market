// The Steam build's main menu (title.ts, #162).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDesktop } from './desktopFake';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const key = (k: string, code = '') => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, cancelable: true, bubbles: true }));
const shows = (id: string) => !$(id).closest('[hidden]');

describe('the main menu', () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is only in the Steam build: the web game starts straight into play', async () => {
    await loadGame({ money: 7 }, { main: true });
    expect([shows('title'), document.body.classList.contains('title')]).toEqual([false, false]);
    key('Escape');
    expect([shows('pause'), shows('pauseMenu')]).toEqual([true, false]);
  });

  it('the Steam build starts on it, paused, and Esc leaves it up; E continues the game', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    await loadGame({ money: 7 }, { main: true });
    const { paused } = await import('../src/uiKit');
    expect([shows('title'), paused(), document.body.classList.contains('title')]).toEqual([true, true, true]);
    expect([$('titlePlay').textContent, shows('titleNew'), document.activeElement?.id]).toEqual(['Continue', true, 'titlePlay']);
    expect($('title').querySelector('.k-paused')).not.toBeNull(); // (the kit's tag, kept out of sight: index.html)
    key('Escape');
    expect([shows('title'), shows('pause')]).toEqual([true, false]);
    key('e', 'KeyE');
    expect([shows('title'), paused(), document.body.classList.contains('title')]).toEqual([false, false, false]);
    // and Esc in the game is the pause menu's again
    key('Escape');
    expect(shows('pause')).toBe(true);
  });

  it('with no save yet, it says Play, with no New game', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    await loadGame(undefined, { main: true });
    expect([$('titlePlay').textContent, shows('titleNew')]).toEqual(['Play', false]);
  });

  it('a reload in the same run goes straight into the game', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    await loadGame({ money: 7 }, { main: true });
    $('titlePlay').click();
    await loadGame({ money: 7 }, { main: true });
    expect(shows('title')).toBe(false);
  });

  it('New game takes two presses, then erases the save and starts over in the game', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    await loadGame({ money: 7 }, { main: true });
    const { page } = await import('../src/title');
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    key('1', 'Digit1');
    expect([$('titleNew').getAttribute('aria-pressed'), $('titleNew').textContent]).toEqual(['true', 'Press again to erase progress']);
    expect([reload.mock.calls.length, localStorage.getItem('floe-market-v1') !== null]).toEqual([0, true]);
    now.mockReturnValue(2000);
    key('1', 'Digit1');
    expect([reload.mock.calls.length, localStorage.getItem('floe-market-v1'), sessionStorage.getItem('floe-in')]).toEqual([1, null, '1']);
    now.mockRestore();
  });

  it('2 drops the settings down over it', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    await loadGame({ money: 7 }, { main: true });
    key('2', 'Digit2');
    expect([shows('settings'), shows('title')]).toEqual([true, true]);
    key('Escape');
    expect([shows('settings'), shows('title')]).toEqual([false, true]);
  });

  it("the pause menu's Main menu saves there and then and comes back to it; Quit to desktop quits", async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    const d = fakeDesktop();
    const g = await loadGame({ money: 7 }, { main: true });
    key('e', 'KeyE');
    g.wallet.money = 99;
    key('Escape');
    expect(shows('pauseMenu')).toBe(true);
    key('3', 'Digit3');
    expect([shows('pause'), shows('title'), $('titlePlay').textContent]).toEqual([false, true, 'Continue']);
    expect(d.calls[d.calls.length - 1]).toBe('writeNow floe-market-v1');
    expect(JSON.parse(d.kept.get('floe-market-v1')!).money).toBe(99);
    key('3', 'Digit3');
    expect(d.calls.slice(-2)).toEqual(['writeNow floe-market-v1', 'quit']);
  });
});
