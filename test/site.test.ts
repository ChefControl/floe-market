// The game's Pages site since the browser version closed (site/index.html): a player whose web game is still saved in
// this browser can download a copy, for the Steam version to bring in (webSave.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import siteHtml from '../site/index.html?raw';

const script = /<script>([\s\S]*?)<\/script>/.exec(siteHtml)![1];
function open() {
  document.body.innerHTML = /<body>([\s\S]*?)<script>/.exec(siteHtml)![1];
  new Function(script)();
}
const shows = (id: string) => !document.getElementById(id)!.closest('[hidden]');

describe('the coming-to-Steam page', () => {
  beforeEach(() => { localStorage.clear(); });

  it("offers nothing to a browser that never played", () => {
    open();
    expect(shows('keep')).toBe(false);
  });

  it('downloads the web save as it was kept, to bring into the Steam version', async () => {
    const save = JSON.stringify({ v: 7, money: 1234, tiles: [] });
    localStorage.setItem('floe-market-v1', save);
    const made: Blob[] = [];
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { made.push(b); return 'blob:save'; }, revokeObjectURL: () => {} });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
    open();
    expect([shows('keep'), shows('keepDone')]).toEqual([true, false]);
    document.getElementById('keepSave')!.click();
    expect(clicked).toEqual(['floe-market-save.json']);
    expect(await made[0].text()).toBe(save);
    expect(shows('keepDone')).toBe(true);
  });

  it("offers nothing for something that isn't a save", () => {
    localStorage.setItem('floe-market-v1', 'not json');
    open();
    expect(shows('keep')).toBe(false);
  });
});
