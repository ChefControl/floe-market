// The game's fonts come with it (#148): none from the web, every emoji it shows one of its own drawings (the Floe Emoji
// font), every kanji in the brush font, and the game waits for them before it paints anything.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileOf, svgOf } from '../scripts/icons/svg';
import { emojiIn, minchoIn, sources } from '../scripts/fonts/used';
import { BOSSES } from '../src/fight';
import { DRAWINGS } from '../src/icons';
import bundled from '../src/fonts.json';
import { readdirSync, readFileSync } from 'node:fs';

/** The fonts that come with the game: cut down to what it writes, so none of them draws an emoji of its own. */
const BUNDLED = ['Floe Emoji', 'Baloo 2', 'Bungee', 'Shippori Mincho B1'];
/** Rules in the computer's own font, with no emoji in them: the player's words in a report, and the crash message. */
const PLAIN = ['#reportText', '#errReport', '#err'];

/** Every font the page's CSS sets (index.html's <style>, src's .css), by rule: its families in order, var()s filled. */
function fontRules() {
  const page = readFileSync('index.html', 'utf8').split('<style>')[1].split('</style>')[0];
  const css = [page, ...readdirSync('src').filter(f => f.endsWith('.css')).map(f => readFileSync(`src/${f}`, 'utf8'))]
    .join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = new Map([...css.matchAll(/(--[\w-]+):([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
  const fill = (v: string): string => v.replace(/var\((--[\w-]+)\)/g, (_, name: string) => fill(vars.get(name) ?? ''));
  const rules: [string, string[]][] = [];
  for (const [, sel, body] of css.matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
    if (sel.trim() === '@font-face') continue;
    for (const [, value] of body.matchAll(/(?:^|[;\s])font(?:-family)?:([^;]+)/g)) {
      // (a font: shorthand's weight, size and line height come before the families)
      const families = fill(value).trim().replace(/^(?:\d{3}\s+)?(?:clamp\([^)]*\)|[\d.]+(?:px|em|rem|%|vw))(?:\/\S+)?\s+/, '')
        .split(',').map(f => f.trim().replace(/^"(.*)"$/, '$1'));
      if (families[0] !== 'inherit') rules.push([sel.trim(), families]);
    }
  }
  return rules;
}

describe('the bundled fonts', () => {
  const texts = sources();

  const bare = (e: string) => e.replace(/\uFE0F/g, '');

  it('have a drawing for every emoji the game shows (src/icons; the design book\'s Icons section)', () => {
    expect(emojiIn(texts).filter(e => !DRAWINGS[bare(e)] && !DRAWINGS[e])).toEqual([]);
  });

  it("have a face of their own for every boss, apart from the menu's and the money's emoji", () => {
    for (const b of BOSSES) {
      expect(DRAWINGS[b.face], b.name).toBeDefined();
      expect(b.face.codePointAt(0)).toBeGreaterThanOrEqual(0xE000); // (private use: the emoji font's own character)
    }
  });

  it('carry every emoji the game shows (run scripts/fonts/build.py after drawing one)', () => {
    expect(emojiIn(texts).filter(e => !bundled.emoji.includes(e))).toEqual([]);
  });

  it('turn every drawing into a glyph: flat shapes, no text and no fading', () => {
    for (const e of Object.keys(DRAWINGS).filter(e => e !== 'mrFugu')) {
      expect(svgOf(e), e).toMatch(/^<svg [^>]*viewBox="0 0 100 100">.*<path /);
    }
    expect(fileOf('🧑‍🍳')).toBe('emoji_u1f9d1_200d_1f373.svg');
    expect(fileOf('❄️')).toBe('emoji_u2744.svg');
  });

  it('carry every kanji and kana the game writes (run scripts/fonts/build.py when one is new)', () => {
    expect([...minchoIn(texts)].filter(c => !bundled.mincho.includes(c))).toEqual([]);
  });

  it("lead every font on the page with the emoji, ahead of the computer's own fonts (a boss's face in the brush font was a blank box)", () => {
    const rules = fontRules(), of = (sel: string) => rules.find(([s]) => s === sel)?.[1][0];
    const bad = rules.filter(([sel, families]) => {
      const lead = families.indexOf('Floe Emoji');
      return !PLAIN.includes(sel) && (lead < 0 || families.slice(0, lead).some(f => !BUNDLED.includes(f)));
    });
    expect(bad).toEqual([]);
    // (the boss's face: on the 入場 banner's badge and name, the VS row till his portrait's in, the strip, the gong's chips)
    for (const sel of ['#fightBanner b', '#fightBanner .face', '#gong .you, #gong .them', '#rush .row', '.fchip']) expect(of(sel), sel).toBe('Floe Emoji');
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
  function stub() {
    vi.stubGlobal('FontFace', Face);
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
