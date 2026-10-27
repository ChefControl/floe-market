// The game's fonts come with it (public/fonts, built by scripts/fonts/build.py), so it never fetches one from the web
// and its emoji look the same on every computer (#148). index.html declares Baloo 2, Bungee and Shippori Mincho B1; the
// emoji font is added here, where the game can leave it out of a browser that can't draw it.
import { emojiRange } from './fonts.json';

/** The faces the game paints on canvas as it loads (index.html's @font-face rules). Bungee isn't one: fight night's
 *  words are on the page, which the browser redraws once it's in. */
const FACES = ['600 16px "Baloo 2"', '800 16px "Baloo 2"', '800 16px "Shippori Mincho B1"'];
/** How long the game waits for its fonts before it starts anyway, in stand-ins. */
export const WAIT = 4000;

/** Whether this is Safari, or any browser on an iPhone or iPad (all of them Safari underneath): it draws this kind of
 *  colour font (COLRv1) in broken blocks, so there the game keeps Apple's own emoji. Chromium (the Steam build, Chrome,
 *  Edge) and Firefox draw it. */
export const webkit = (ua = navigator.userAgent) => /AppleWebKit/.test(ua) && !/Chrome\//.test(ua);

/** Loads the fonts, and resolves once they're in (or have failed), so the textures the game paints as it loads use
 *  them and not a stand-in. */
export async function loadFonts() {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  const loads: Promise<unknown>[] = FACES.map(f => document.fonts.load(f));
  let emoji: FontFace | undefined;
  if (!webkit()) {
    emoji = new FontFace('Floe Emoji', `url("${new URL('fonts/emoji.woff2', document.baseURI)}") format("woff2")`,
      { unicodeRange: emojiRange });
    document.fonts.add(emoji);
    loads.push(emoji.load());
  }
  await Promise.race([Promise.allSettled(loads), new Promise(r => setTimeout(r, WAIT))]);
  // (one that didn't come in time is left out, so the emoji don't pop in halfway through: the browser's own stay)
  if (emoji && emoji.status !== 'loaded') document.fonts.delete(emoji);
}
