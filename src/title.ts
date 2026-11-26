// The main menu (#162): the Steam build starts on it, as a game does, with the game's name and its buttons down the
// left and the player's world drifting slowly behind (main.ts, `titleCam`), held still. Continue (E; Play when there's
// no save yet), then New game (two presses: it erases the save), ⚙️ Settings and, in the desktop app, Quit to desktop
// (1–3). Esc does nothing here. The pause menu's Main menu comes back to it. It's for starting the app: once the
// player's been in, a reload in the same run (Restart, the graphics' Reload) goes straight back into the game.
// The demo's (steamDemo.ts) says Demo under the name and adds Wishlist on Steam before Quit (1–4).
import { wishlist } from './demoEnd';
import { desktop } from './desktop';
import { steamOn } from './flags';
import { save, wipeSave } from './save';
import { openSettings } from './settings';
import { steamDemo } from './steamDemo';
import { panel } from './uiKit';

const $ = (id: string) => document.getElementById(id)!;
const menu = $('title'), play = $('titlePlay'), fresh = $('titleNew'), quit = $('titleQuit');
/** This run of the app has been past the menu (sessionStorage: kept through a reload, gone when the app closes). */
const IN = 'floe-in';
const FRESH = 'New game', SURE = 'Press again to erase progress';

/** The page's reload, to start over (the tests catch it). */
export const page = { reload: () => location.reload() };
/** The camera's slow drift behind the menu (main.ts): `k` eases in as it opens and out as it closes. */
export const titleCam = { k: 0, t: 0 };
/** Whether the main menu is up. */
export const titleOpen = () => !menu.hidden;

let saved = false;
let armT: ReturnType<typeof setTimeout> | undefined, armedAt = 0;
function disarm() {
  clearTimeout(armT);
  fresh.removeAttribute('aria-pressed');
  fresh.textContent = FRESH;
}

/** Brings the main menu up, or takes it away into the game. */
export function openTitle(open: boolean) {
  menu.hidden = !open;
  document.body.classList.toggle('title', open);
  disarm();
  if (open) {
    play.textContent = saved ? 'Continue' : 'Play';
    fresh.hidden = !saved;
    play.focus();
  } else {
    openSettings(false);
    try { sessionStorage.setItem(IN, '1'); } catch { /* the menu again after a reload: no harm */ }
  }
}

/** As the game starts (main.ts): the main menu, in the Steam build, unless this run's been in the game already. */
export function initTitle(hadSave: boolean) {
  saved = hadSave;
  let been = false;
  try { been = sessionStorage.getItem(IN) === '1'; } catch { /* storage unavailable: show it */ }
  if (!steamOn() || been) return;
  openTitle(true);
  titleCam.k = 1;
}

/** Back to the main menu from the game (the pause menu's Main menu): the game's saved first, there and then. */
export function backToTitle() {
  save(true);
  saved = true;
  openTitle(true);
}

// (Esc does nothing: there's nothing behind it to go back to)
panel(menu, { place: 'full', skin: 'base', forced: true });
// (the camera leaves the player where they are: the menu takes no room of theirs, ui.ts keepInSight)
menu.dataset.still = '1';
quit.hidden = !desktop();
$('titleDemo').hidden = $('titleWish').hidden = !steamDemo();
$('titleWish').addEventListener('click', () => wishlist());
play.addEventListener('click', () => { saved = true; openTitle(false); });
fresh.addEventListener('click', () => {
  // The first press arms it; a second, deliberate one within 2.5 s erases the save and starts over.
  if (fresh.getAttribute('aria-pressed') !== 'true') {
    fresh.setAttribute('aria-pressed', 'true');
    fresh.textContent = SURE;
    armedAt = performance.now();
    clearTimeout(armT);
    armT = setTimeout(disarm, 2500);
    return;
  }
  // (both clicks of a double-click land within a few hundred ms: that shouldn't erase everything)
  if (performance.now() - armedAt < 600) return;
  try { sessionStorage.setItem(IN, '1'); } catch { /* the menu again, with Play */ }
  wipeSave();
  page.reload();
});
$('titleSettings').addEventListener('click', () => openSettings(true));
quit.addEventListener('click', () => {
  save(true);
  desktop()?.quit();
});
