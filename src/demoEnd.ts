// The Steam demo's end card (steamDemo.ts): the rest is in the full game, with Wishlist on Steam (E) and Keep playing
// (1). A dialog of the UI kit, over the paused game; Esc closes it too.
import { desktop } from './desktop';
import { storeLink } from './steamDemo';
import { toast } from './ui';
import { panel } from './uiKit';

const $ = (id: string) => document.getElementById(id)!;
const card = $('demoEnd');

export function openDemoEnd(open = true) {
  card.hidden = !open;
  if (open) $('demoWish').focus();
}
panel(card, { place: 'dialog', skin: 'base', close: () => openDemoEnd(false) });
/** Opens the full game's store page in Steam, to wishlist it; false where there's nowhere to go (a test build
 *  without the game's id, or a browser), which says so instead. */
export function wishlist() {
  const link = storeLink();
  if (!link || !desktop()) { toast('Wishlist Floe Market on Steam'); return false; }
  window.open(link, '_blank');
  return true;
}
$('demoWish').addEventListener('click', () => { if (wishlist()) openDemoEnd(false); });
$('demoKeep').addEventListener('click', () => openDemoEnd(false));
card.addEventListener('click', e => { if (e.target === card) openDemoEnd(false); });
