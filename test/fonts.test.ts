// The game's fonts come with it (#148): none from the web, every emoji and kanji it writes in the bundled fonts, and
// the game waits for them before it paints anything.
import { afterEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { emojiIn, minchoIn, sources } from '../scripts/fonts/used';
import bundled from '../src/fonts.json';

describe('the bundled fonts', () => {
  const texts = sources();

  it('carry every emoji the game shows (run scripts/fonts/build.py when one is new)', () => {
    expect(emojiIn(texts).filter(e => !bundled.emoji.includes(e))).toEqual([]);
  });

  it('carry every kanji and kana the game writes (run scripts/fonts/build.py when one is new)', () => {
    expect([...minchoIn(texts)].filter(c => !bundled.mincho.includes(c))).toEqual([]);
  });

  it('come with the game: nothing is fetched from Google Fonts', () => {
    expect(texts.join('')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('tell an emoji from a pictograph written as text', () => {
    expect(emojiIn(['🧑‍🍳 ❄️ ⛱ ♠ © 🐟🐟'])).toEqual(['⛱', '❄️', '🐟', '🧑‍🍳']);
    expect(minchoIn(['ちゃんこ 勝負 Chunkos'])).toBe('こちゃん勝負');
  });
});

describe('loadFonts', () => {
  const added: FontFace[] = [], deleted: FontFace[] = [];
  let status = 'loaded', load = () => Promise.resolve();
  class Face {
    constructor(public family: string, public source: string, public descriptors: FontFaceDescriptors) {}
    get status() { return status; }
    load() { return load(); }
  }
  function stub(ua = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36') {
    vi.stubGlobal('FontFace', Face);
    vi.stubGlobal('navigator', { userAgent: ua });
    const fonts = { add: (f: FontFace) => added.push(f), delete: (f: FontFace) => deleted.push(f), load: vi.fn(async (_font: string) => [] as FontFace[]) };
    Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
    return fonts;
  }
  afterEach(() => {
    added.length = deleted.length = 0; status = 'loaded'; load = () => Promise.resolve();
    Object.defineProperty(document, 'fonts', { value: undefined, configurable: true });
    vi.useRealTimers();
  });

  it('adds the emoji, first in line for emoji only, and waits for every face', async () => {
    const fonts = stub();
    const { loadFonts } = await import('../src/fonts');
    await loadFonts();
    expect(fonts.load.mock.calls.map(c => c[0])).toEqual(['600 16px "Baloo 2"', '800 16px "Baloo 2"',
      '800 16px "Shippori Mincho B1"']);
    const [emoji] = added as unknown as Face[];
    expect(emoji.family).toBe('Floe Emoji');
    expect(emoji.source).toMatch(/fonts\/emoji\.woff2/);
    expect(emoji.descriptors.unicodeRange).toBe(bundled.emojiRange);
    expect(emoji.descriptors.unicodeRange).not.toMatch(/U\+(20|30|41)\b/); // no space, digits or letters
    expect(deleted).toEqual([]);
  });

  it('keeps Apple\'s own emoji in Safari and on an iPhone, which draw this font in blocks', async () => {
    const { loadFonts, webkit } = await import('../src/fonts');
    for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/152.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15']) {
      expect(webkit(ua)).toBe(true);
    }
    expect(webkit('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Electron/40.0 Safari/537.36')).toBe(false);
    expect(webkit('Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe(false);
    const fonts = stub('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15');
    await loadFonts();
    expect(added).toEqual([]);
    expect(fonts.load).toHaveBeenCalledTimes(3);
  });

  it("starts anyway when a font doesn't come, and leaves the emoji out so they don't change halfway", async () => {
    vi.useFakeTimers();
    stub();
    status = 'loading'; load = () => new Promise(() => {});
    const { loadFonts, WAIT } = await import('../src/fonts');
    let done = false;
    void loadFonts().then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(WAIT - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    expect(deleted).toEqual(added);
  });

  it('does nothing in a browser with no font loading', async () => {
    const { loadFonts } = await import('../src/fonts');
    await expect(loadFonts()).resolves.toBeUndefined();
  });
});

describe('boot', () => {
  afterEach(() => { vi.doUnmock('../src/fonts'); vi.doUnmock('../src/main'); vi.resetModules(); });

  it('starts the game once the fonts are in', async () => {
    const order: string[] = [];
    vi.doMock('../src/fonts', () => ({ loadFonts: async () => { order.push('fonts'); } }));
    vi.doMock('../src/main', () => { order.push('main'); return {}; });
    await (await import('../src/boot')).started;
    expect(order).toEqual(['fonts', 'main']);
  });

  it("says so when the game can't start", async () => {
    vi.doMock('../src/fonts', () => ({ loadFonts: async () => {} }));
    vi.doMock('../src/main', () => { throw new Error('boom'); });
    await (await import('../src/boot')).started;
    expect(document.getElementById('errMsg')!.textContent).toContain('Something broke');
  });
});

describe("index.html's preload of the emoji font", () => {
  const src = /<script>\s*\/\/ \(not in Safari[\s\S]*?<\/script>/.exec(indexHtml)![0].replace(/<\/?script>/g, '');
  const run = (ua: string) => {
    document.head.querySelectorAll('link[href="fonts/emoji.woff2"]').forEach(l => l.remove());
    new Function('navigator', src)({ userAgent: ua });
    return document.head.querySelector<HTMLLinkElement>('link[href="fonts/emoji.woff2"]');
  };

  it('fetches it at once where it is used, and not in Safari', () => {
    expect(run('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36')?.as).toBe('font');
    expect(run('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile Safari/604.1')).toBeNull();
  });
});
