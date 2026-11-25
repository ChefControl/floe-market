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
$('demoWish').addEventListener('click', () => {
  const link = storeLink();
  // (a test build without the game's id has nowhere to go)
  if (!link || !desktop()) { toast('Wishlist Floe Market on Steam'); return; }
  window.open(link, '_blank');
  openDemoEnd(false);
});
$('demoKeep').addEventListener('click', () => openDemoEnd(false));
card.addEventListener('click', e => { if (e.target === card) openDemoEnd(false); });
