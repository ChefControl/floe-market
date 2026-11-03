// What the bundled fonts must carry, read from the game's source: every emoji it shows, and every kanji and kana it
// writes in the brush font. build.py cuts the fonts down to these, and test/fonts.test.ts fails when the source uses
// one the fonts don't have. `node scripts/fonts/used.ts` prints them.
import { readdirSync, readFileSync } from 'node:fs';

/** Pictographs the game writes as plain text in its own fonts, never as emoji: the cards' suits, the link arrow, ©. */
export const TEXT = new Set(['♠', '♥', '♦', '♣', '↗', '©', '®', '™', '▶', '◀']);

/** The files the player's screen comes from. */
export function sources(root = '.') {
  const src = readdirSync(`${root}/src`, { recursive: true, encoding: 'utf8' }).filter(f => /\.(ts|css)$/.test(f)).map(f => `src/${f}`);
  return ['index.html', ...src].sort().map(f => readFileSync(`${root}/${f}`, 'utf8'));
}

/** Every emoji in `texts`, sorted: whole sequences (🧑‍🍳, ❄️) and lone pictographs written without their ️ (⛱). */
export function emojiIn(texts: string[]) {
  // (built with the constructor: the `v` flag is newer than the TypeScript target)
  const seq = new RegExp('\\p{RGI_Emoji}', 'gv'), lone = /\p{Extended_Pictographic}/gu, found = new Set<string>();
  for (const t of texts) {
    for (const [e] of t.matchAll(seq)) found.add(e);
    for (const [e] of t.replace(seq, '').matchAll(lone)) if (!TEXT.has(e)) found.add(e);
  }
  return [...found].sort();
}

/** Every kanji and kana in `texts`, sorted: the brush font (Shippori Mincho B1) is cut down to these. */
export function minchoIn(texts: string[]) {
  const found = new Set<string>();
  for (const t of texts) for (const [c] of t.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/gu)) found.add(c);
  return [...found].sort().join('');
}

if (process.argv[1]?.endsWith('used.ts')) {
  const texts = sources();
  console.log(JSON.stringify({ emoji: emojiIn(texts), mincho: minchoIn(texts) }));
}
