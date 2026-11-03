// The game's fonts come with it (public/fonts, built by scripts/fonts/build.py), so it never fetches one from the web
// and its emoji are its own drawings, the same on every computer (#148). index.html declares Baloo 2, Bungee and
// Shippori Mincho B1; Floe Emoji, the icons, is added here, emoji only.
import { emojiRange } from './fonts.json';

/** The faces the game paints on canvas as it loads (index.html's @font-face rules). Bungee isn't one: fight night's
 *  words are on the page, which the browser redraws once it's in. */
const FACES = ['600 16px "Baloo 2"', '800 16px "Baloo 2"', '800 16px "Shippori Mincho B1"'];
/** How long the game waits for its fonts before it starts anyway, in stand-ins. */
export const WAIT = 4000;

/** Loads the fonts, and resolves once they're in (or have failed), so the textures the game paints as it loads use
 *  them and not a stand-in. */
export async function loadFonts() {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  const emoji = new FontFace('Floe Emoji', `url("${new URL('fonts/emoji.woff2', document.baseURI)}") format("woff2")`,
    { unicodeRange: emojiRange });
  document.fonts.add(emoji);
  await Promise.race([
    Promise.allSettled([emoji.load(), ...FACES.map(f => document.fonts.load(f))]),
    new Promise(r => setTimeout(r, WAIT)),
  ]);
  // (one that didn't come in time is left out, so the emoji don't change halfway through: the browser's own stay)
  if (emoji.status !== 'loaded') document.fonts.delete(emoji);
}
