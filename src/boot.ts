// The page's game script: it waits for the game's fonts (fonts.ts), so the textures the game paints as it loads use
// them and not a stand-in, then starts the game (main.ts).
import { showErr } from './errors';
import { loadFonts } from './fonts';

export const started = loadFonts().then(() => import('./main'))
  .catch((e: Error) => showErr('Something broke: ' + e.message));
