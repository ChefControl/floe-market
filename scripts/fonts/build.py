"""
Builds the game's fonts in public/fonts/ from their upstream releases, cut down to what the game writes, so it never
fetches a font from the web and shows the same emoji on every computer (#148).

  python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli uharfbuzz
  /tmp/fontenv/bin/python scripts/fonts/build.py

Run it again whenever test/fonts.test.ts says the source uses an emoji or a kanji the fonts don't have. It downloads the
pinned upstream files once (to ~/.cache/floe-market-fonts), checks their hashes, and writes:

- baloo2-600.woff2, baloo2-800.woff2: Baloo 2 at the two weights the game always had (600 and 800), Latin only
- bungee.woff2: Bungee, Latin only
- mincho.woff2: Shippori Mincho B1 ExtraBold, Latin plus the kanji and kana the game writes
- emoji.woff2: Noto Color Emoji (COLRv1, vector), only the emoji the game shows
- OFL-*.txt: each font's licence, which has to go with it

and src/fonts.json: what they were cut down to (test/fonts.test.ts) and the emoji font's unicode-range (fonts.ts).
"""
import hashlib
import io
import json
import os
import subprocess
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
import uharfbuzz as hb

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'fonts')
CACHE = os.path.expanduser('~/.cache/floe-market-fonts')

GF = 'https://raw.githubusercontent.com/google/fonts/ddf386ba1b9fbc6b2c818f1ddcd9148f54ced94b/ofl/'
NOTO = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/v2026-09-24-unicode18_0/'
SOURCES = {
    'Baloo2[wght].ttf': GF + 'baloo2/Baloo2%5Bwght%5D.ttf',
    'OFL-Baloo2.txt': GF + 'baloo2/OFL.txt',
    'Bungee-Regular.ttf': GF + 'bungee/Bungee-Regular.ttf',
    'OFL-Bungee.txt': GF + 'bungee/OFL.txt',
    'ShipporiMinchoB1-ExtraBold.ttf': GF + 'shipporiminchob1/ShipporiMinchoB1-ExtraBold.ttf',
    'OFL-ShipporiMinchoB1.txt': GF + 'shipporiminchob1/OFL.txt',
    'Noto-COLRv1.ttf': NOTO + '2D/fonts/Noto-COLRv1.ttf',
    'OFL-NotoColorEmoji.txt': NOTO + 'LICENSE',
}
HASHES = os.path.join(os.path.dirname(__file__), 'sources.sha256')

# Latin and Latin Extended, with the punctuation, currency and arrows: the text the game writes, and players' names.
LATIN = [*range(0x20, 0x7F), *range(0xA0, 0x250), 0x259, *range(0x1E00, 0x1F00), *range(0x2000, 0x2070),
         *range(0x20A0, 0x20D0), *range(0x2100, 0x2200), 0x2212, 0x2215, 0xFEFF, 0xFFFD]


def fetch():
    os.makedirs(CACHE, exist_ok=True)
    want = dict(line.split()[::-1] for line in open(HASHES)) if os.path.exists(HASHES) else {}
    got = {}
    for name, url in SOURCES.items():
        path = os.path.join(CACHE, name)
        if not os.path.exists(path):
            print('downloading', url)
            urllib.request.urlretrieve(url, path)
        got[name] = hashlib.sha256(open(path, 'rb').read()).hexdigest()
        if name in want and want[name] != got[name]:
            sys.exit(f'{name}: its hash changed upstream ({got[name]}); delete {path} and check what changed')
    with open(HASHES, 'w') as f:
        f.writelines(f'{h}  {n}\n' for n, h in sorted(got.items()))


def cut(font, unicodes=(), text='', name='', **opts):
    o = subset.Options(layout_features=['*'], name_IDs=['*'], name_languages=['*'], notdef_outline=True, **opts)
    s = subset.Subsetter(o)
    s.populate(unicodes=unicodes, text=text)
    s.subset(font)
    out = os.path.join(OUT, name)
    font.flavor = 'woff2'
    font.save(out)
    print(f'{name}: {os.path.getsize(out) / 1024:.1f} KB')
    return out


def check_emoji(path, emoji):
    """Every emoji shapes to one coloured glyph, so none shows as two, or as a box."""
    ttf, raw = TTFont(path), io.BytesIO()
    ttf.flavor = None  # (HarfBuzz reads the font unpacked, not as WOFF2)
    ttf.save(raw)
    font = hb.Font(hb.Face(raw.getvalue()))
    painted = {r.BaseGlyph for r in ttf['COLR'].table.BaseGlyphList.BaseGlyphPaintRecord}
    order = ttf.getGlyphOrder()
    bad = []
    for e in emoji:
        buf = hb.Buffer()
        buf.add_str(e)
        buf.guess_segment_properties()
        hb.shape(font, buf, {})
        shown = [order[i.codepoint] for i, p in zip(buf.glyph_infos, buf.glyph_positions) if p.x_advance]
        if len(shown) != 1 or shown[0] not in painted:
            bad.append(f'{e} -> {shown}')
    if bad:
        sys.exit('emoji the font can\'t draw as one picture:\n  ' + '\n  '.join(bad))


def ranges(cps):
    """A CSS unicode-range for these code points."""
    cps, out = sorted(cps), []
    for c in cps:
        if out and out[-1][1] == c - 1:
            out[-1][1] = c
        else:
            out.append([c, c])
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in out)


def main():
    fetch()
    used = json.loads(subprocess.check_output(['node', 'scripts/fonts/used.ts'], cwd=ROOT))
    os.makedirs(OUT, exist_ok=True)
    src = lambda n: os.path.join(CACHE, n)

    for w in (600, 800):
        cut(instancer.instantiateVariableFont(TTFont(src('Baloo2[wght].ttf')), {'wght': w}, updateFontNames=True),
            LATIN, name=f'baloo2-{w}.woff2')
    cut(TTFont(src('Bungee-Regular.ttf')), LATIN, name='bungee.woff2')
    cut(TTFont(src('ShipporiMinchoB1-ExtraBold.ttf')), [*range(0x20, 0x7F), 0xB7], used['mincho'], name='mincho.woff2')
    emoji = cut(TTFont(src('Noto-COLRv1.ttf')), text=''.join(used['emoji']), name='emoji.woff2')
    check_emoji(emoji, used['emoji'])

    # (the emoji font gets no space, digits or letters: it goes first in the font lists, and the text skips it)
    cmap = [c for c in TTFont(emoji).getBestCmap() if c > 0x7F] + [0xFE0F]
    with open(os.path.join(ROOT, 'src', 'fonts.json'), 'w') as f:
        json.dump({'emoji': used['emoji'], 'mincho': used['mincho'], 'emojiRange': ranges(cmap)}, f, ensure_ascii=False,
                  indent=1)
        f.write('\n')
    for n in SOURCES:
        if n.endswith('.txt'):
            with open(src(n), encoding='utf-8-sig') as a, open(os.path.join(OUT, n), 'w') as b:
                b.write(a.read())


if __name__ == '__main__':
    main()
