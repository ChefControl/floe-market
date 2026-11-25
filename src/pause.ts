// The pause menu (#162): Esc, with nothing else open, brings it up over the paused game (a dialog of the UI kit):
// Resume (E, or Esc again), then Settings, How to play and, in the desktop app, Quit to desktop (1–3). Quitting saves
// first, there and then; so does closing the window or Alt+F4 (save.ts), so leaving never loses anything. The ⚙️ gear
// stays for mouse players.
import { desktop } from './desktop';
import { showHint } from './hint';
import { save } from './save';
import { openSettings } from './settings';
import { panel, topPanel } from './uiKit';

const $ = (id: string) => document.getElementById(id)!;
const menu = $('pause'), quit = $('pauseQuit');
/** What else can be open over the game, outside the kit: Esc is theirs while they are. */
const OTHERS = '[role="dialog"], [role="alertdialog"], #settings, #shop, #look, #gong, #fightCard, #coin';
const shows = (el: HTMLElement) => el.isConnected && !el.closest('[hidden]');
const anythingOpen = () => !!topPanel() || [...document.querySelectorAll<HTMLElement>(OTHERS)].some(shows);

let back: Element | null = null;
export function openPause(open: boolean) {
  if (open === !menu.hidden) return;
  menu.hidden = !open;
  if (open) { back = document.activeElement; $('pauseResume').focus(); }
  else if (back instanceof HTMLElement) back.focus();
}

panel(menu, { place: 'dialog', skin: 'base', close: () => openPause(false) });
quit.hidden = !desktop();
$('pauseResume').addEventListener('click', () => openPause(false));
$('pauseSettings').addEventListener('click', () => { openPause(false); openSettings(true); });
$('pauseHow').addEventListener('click', () => { openPause(false); showHint(true); });
quit.addEventListener('click', () => {
  save(true);
  desktop()?.quit();
});
menu.addEventListener('click', e => { if (e.target === menu) openPause(false); });

// Esc opens it only when nothing was open as the key went down: what was open, Esc closes (the kit's, or its own).
let wasOpen = false;
window.addEventListener('keydown', e => { if (e.key === 'Escape') wasOpen = anythingOpen(); }, true);
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.repeat || wasOpen || e.defaultPrevented || !menu.hidden) return;
  if ((e.target as Element | null)?.closest?.('textarea, input, select')) return;
  openPause(true);
  e.preventDefault();
});
