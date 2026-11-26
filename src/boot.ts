// The page's game script: the Steam build's studio intro first (intro.ts), then it waits for the game's fonts
// (fonts.ts), so the textures the game paints as it loads use them and not a stand-in, then starts the game (main.ts)
// while the intro plays.
import { showErr } from './errors';
import { loadFonts } from './fonts';
import { playIntro } from './intro';

playIntro();

export const started = loadFonts().then(() => import('./main'))
  .catch((e: Error) => showErr('Something broke: ' + e.message));
