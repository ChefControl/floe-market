// Bring in your web game (webSave.ts): the Steam build takes the save the web game's page downloads.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDesktop } from './desktopFake';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const key = (k: string, code = '') => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, cancelable: true, bubbles: true }));
const shows = (id: string) => !$(id).closest('[hidden]');
/** A stage 2 web game, as its page downloads it. */
const WEB = JSON.stringify({ v: 7, money: 6000, best: 13000, tiles: [{ id: 'sushi', paid: 12000, done: true, open: true }] });

/** Picks `text` as the file in the row's file picker. */
async function pick(text: string) {
  const input = $('webSaveFile') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [new File([text], 'floe-market-save.json')], configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(shows('webSaveAsk') || !!$('toast').textContent).toBe(true));
}

describe('bringing in a web game', () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is only in the Steam build', async () => {
    fakeDesktop();
    await loadGame({ money: 7 }, { main: true });
    expect($('webSave').hidden).toBe(true);
  });

  it("shows what's in the file, then puts it in this game's place and goes straight into it", async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    const d = fakeDesktop({ 'floe-market-v1': JSON.stringify({ v: 7, money: 50, tiles: [] }) });
    await loadGame(undefined, { main: true });
    const { page } = await import('../src/title');
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    $('title').hidden = true;
    expect($('webSave').hidden).toBe(false);
    const chosen = vi.spyOn($('webSaveFile'), 'click').mockImplementation(() => {});
    $('webSave').click();
    expect(chosen).toHaveBeenCalled();
    await pick(WEB);
    expect([shows('webSaveAsk'), $('webSaveWhat').textContent, document.activeElement?.id]).toEqual([true, 'Stage 2 · $6,000', 'webSaveYes']);
    d.calls.length = 0;
    key('e', 'KeyE');
    // this game first, there and then, into the backups (the program rolls it as it removes it); then the web game
    expect(d.calls).toEqual(['writeNow floe-market-v1', 'remove floe-market-v1', 'writeNow floe-market-v1']);
    expect([d.kept.get('floe-market-v1'), reload.mock.calls.length, sessionStorage.getItem('floe-in')]).toEqual([WEB, 1, '1']);
  });

  it('Keep this game (1) or Esc leaves everything as it was', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    const d = fakeDesktop({ 'floe-market-v1': JSON.stringify({ v: 7, money: 50, tiles: [] }) });
    await loadGame(undefined, { main: true });
    $('title').hidden = true;
    await pick(WEB);
    key('1', 'Digit1');
    expect(shows('webSaveAsk')).toBe(false);
    await pick(WEB);
    key('Escape');
    expect(shows('webSaveAsk')).toBe(false);
    expect(d.calls.filter(c => c.startsWith('remove'))).toEqual([]);
  });

  it("says so for a file that isn't a save", async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    fakeDesktop();
    await loadGame(undefined, { main: true });
    $('title').hidden = true;
    await pick('{"hello": "there"}');
    expect([shows('webSaveAsk'), $('toast').textContent]).toEqual([false, "That file isn't a Floe Market save"]);
  });
});
