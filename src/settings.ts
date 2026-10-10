// The settings menu, behind the gear in the top corner, in four groups: You (signing in for cloud saves, cloud.ts, and
// your look), Graphics & sound (graphics.ts, audio.ts), Game (how to walk, hint.ts, and Restart, main.ts), and About
// (Ko-fi, and last, the Credits & Copyrights for the music and sound). Controls, Graphics, Sound and the credits each
// open with a click: Controls into How to play and a switch for the Buy button on a computer; Graphics into Auto, Low
// or High; Sound into the effects, the ambience and the music, each with a mute button
// and a 0 to 10 slider, big enough for a finger; and the credits into the notices.
import { every, prefs, setLevel, setMute, type Bus } from './audio';
import { choose, gfx, onQuality, type Choice } from './graphics';
import { touchBuy } from './buy';
import { buyButton, setBuyButton, showHint } from './hint';
import { coin } from './sfx';

const $ = (id: string) => document.getElementById(id)!;
const gear = $('gear'), menu = $('settings');

export function openSettings(open: boolean) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
  if (open) showBuyToggle();
}
gear.addEventListener('click', () => openSettings(gear.getAttribute('aria-expanded') !== 'true'));
// A tap anywhere else closes it, and so does Escape.
window.addEventListener('pointerdown', e => {
  const t = e.target as Node;
  if (!menu.hidden && !menu.contains(t) && !gear.contains(t)) openSettings(false);
}, true);
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || menu.hidden) return;
  openSettings(false);
  gear.focus();
});

/**
 * The categories, Graphics, Sound and Credits & Copyrights: a click opens each into its panel under it, and another
 * closes it again. On a short screen the menu scrolls, so a panel that opens is brought into view.
 */
function category(row: HTMLElement, panel: HTMLElement) {
  row.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    row.setAttribute('aria-expanded', String(open));
    if (open) panel.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
}
category($('controlsCat'), $('controlsPanel'));
category($('gfxCat'), $('gfx'));
category($('soundCat'), $('soundPanel'));
category($('creditsBtn'), $('creditsCard'));

/**
 * A kind of sound's row: its mute button, and its slider with the level beside it. Muted, the slider sits at 0, and
 * sliding it to 0 mutes; the level from before comes back when it's unmuted, and sliding it up unmutes at the new
 * level. The effects' slider plays a coin as it moves, to hear the level by.
 */
function soundRow(b: Bus, id: string) {
  const input = $('vol' + id) as HTMLInputElement, out = $('vol' + id + 'N'), mute = $('mute' + id);
  const row = input.closest('.vol')!;
  const show = () => {
    const v = prefs.mute[b] ? 0 : prefs.level[b];
    input.value = String(v);
    out.textContent = input.value;
    input.style.setProperty('--fill', v * 10 + '%');
    mute.textContent = prefs.mute[b] ? '🔇' : '🔊';
    mute.setAttribute('aria-pressed', String(prefs.mute[b]));
    row.classList.toggle('muted', prefs.mute[b]);
  };
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (v > 0) setLevel(b, v);
    if (prefs.mute[b] !== (v === 0)) setMute(b, v === 0);
    show();
    if (b === 'sfx' && v > 0 && every('sample', 0.15)) coin();
  });
  mute.addEventListener('click', () => { setMute(b, !prefs.mute[b]); show(); });
  show();
}
soundRow('sfx', 'Sfx');
soundRow('amb', 'Amb');
soundRow('music', 'Music');

// Graphics: Auto, Low or High, shown on the row while it's closed. On Auto, which one the game is using shows under
// the choices.
const gfxButtons = [...$('gfx').querySelectorAll('button')], gfxNow = $('gfxNow'), gfxPick = $('gfxPick');
function showGfx() {
  const on = gfx.picked ? gfx.quality : 'auto';
  for (const b of gfxButtons) b.setAttribute('aria-pressed', String(b.dataset.q === on));
  gfxPick.textContent = on === 'auto' ? 'Auto' : on === 'high' ? 'High' : 'Low';
  gfxNow.hidden = gfx.picked;
  gfxNow.textContent = gfx.quality === 'high' ? 'Auto is on High now' : 'Auto is on Low now';
}
for (const b of gfxButtons) b.addEventListener('click', () => choose(b.dataset.q as Choice));
onQuality(showGfx);
showGfx();

// The Buy button on a computer, on or off. A touch screen has no E, so there it's always on and the switch says so.
const buyToggle = $('buyBtnToggle') as HTMLButtonElement, buyNote = $('buyBtnNote');
function showBuyToggle() {
  const touch = touchBuy();
  buyToggle.disabled = touch;
  buyToggle.setAttribute('aria-checked', String(touch || buyButton.on));
  buyNote.textContent = touch ? 'Always on with a touch screen' : 'Hold it on a tile to buy, as well as E';
}
buyToggle.addEventListener('click', () => { setBuyButton(!buyButton.on); showBuyToggle(); });
showBuyToggle();

$('controls').addEventListener('click', () => {
  openSettings(false);
  showHint(true);
});
