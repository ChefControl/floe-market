// The Steam demo (steamDemo.ts, #183): stage 1 and stage 2 up to the second chef; then Mr. Fugu whispers through the
// hatch and the end card says the rest is in the full game.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDesktop } from './desktopFake';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const shows = (id: string) => !$(id).closest('[hidden]');
const key = (k: string, code = '') => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, cancelable: true, bubbles: true }));

describe('the full game', () => {
  it('goes on past the second chef', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', 'paddy', 'farmer', 'seats', 'chef'), money: 0 });
    g.run(0.1);
    expect(g.unlocks.tiles.filter(t => g.unlocks.offered(t) && !t.done && t.stage === 2).map(t => t.id)).toContain('tables');
    expect(g.unlocks.stageProgress()).toBeLessThan(1);
  });
});

describe('the Steam demo', () => {
  beforeEach(() => { vi.stubEnv('VITE_STEAM_DEMO', 'on'); vi.stubEnv('VITE_STEAM_STORE_ID', '1234567'); });

  it('offers stage 1, and stage 2 up to the second chef, and never the ring', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', 'paddy', 'farmer'), money: 0 });
    g.run(0.1);
    const onOffer = () => g.unlocks.tiles.filter(t => g.unlocks.offered(t) && !t.done && t.stage === 2).map(t => t.id);
    expect(onOffer()).toEqual(['seats', 'chef']);
    g.unlocks.applyUnlock('seats', true);
    g.unlocks.applyUnlock('chef', true);
    g.run(0.1);
    expect(onOffer()).toEqual([]);
    expect(g.unlocks.stageProgress()).toBe(1);
    expect(g.unlocks.tiles.find(t => t.id === 'dohyo')!.d.mesh.visible).toBe(false);
  });

  it('once the second chef is hired, he knocks, whispers, and the end card shows', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(null);
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi', 'paddy', 'farmer', 'seats'), money: 0 });
    // (in the desktop app, once loaded: its save came from the page's storage here)
    fakeDesktop();
    g.run(0.5);
    expect($('offerAlert').classList.contains('on')).toBe(false);
    g.unlocks.applyUnlock('chef');
    // (after the new chef's moment on camera)
    g.runUntil(() => $('offerAlert').classList.contains('on'), 10, 0.1);
    expect($('offerAlert').classList.contains('on')).toBe(true);
    const offer = await import('../src/offer');
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
    // his two lines, then he ducks back down and the card's up
    g.runUntil(() => { g.press('z'); return shows('demoEnd'); }, 30, 0.1);
    expect(shows('offerPick')).toBe(false);
    const { paused } = await import('../src/uiKit');
    expect(paused()).toBe(true);
    expect($('demoEnd').textContent).toContain('The rest is in the full game');
    // E: the full game's store page, in Steam
    key('e', 'KeyE');
    expect(opened).toHaveBeenCalledWith('steam://store/1234567', '_blank');
    expect(shows('demoEnd')).toBe(false);
    // nothing knocks again; standing on the hatch brings the card back, and Keep playing (1) closes it
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 4);
    g.run(1);
    expect($('offerAlert').classList.contains('on')).toBe(false);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(1.2);
    expect(shows('demoEnd')).toBe(true);
    key('1', 'Digit1');
    expect(shows('demoEnd')).toBe(false);
  });
});
