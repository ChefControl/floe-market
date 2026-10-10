// The settings menu, behind the gear in the top corner: signing in for cloud saves (cloud.ts), the sound (audio.ts),
// the graphics (graphics.ts), how to walk (hint.ts), Restart (main.ts), and last, the Credits & Copyrights for the music
// and sound. The Sound row opens into the effects, the ambience and the music, each with a mute button and a 0 to 10
// slider, big enough for a finger.
import { every, prefs, setLevel, setMute, type Bus } from './audio';
import { choose, gfx, onQuality, type Choice } from './graphics';
import { showHint } from './hint';
import { coin } from './sfx';

const $ = (id: string) => document.getElementById(id)!;
const gear = $('gear'), menu = $('settings');

export function openSettings(open: boolean) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
  if (!open) showCredits(false);
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

const soundCat = $('soundCat'), soundPanel = $('soundPanel');
soundCat.addEventListener('click', () => {
  const open = soundPanel.hidden;
  soundPanel.hidden = !open;
  soundCat.setAttribute('aria-expanded', String(open));
});

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

// Graphics: Auto, Low or High. On Auto, which one the game is using shows under the row's name.
const gfxButtons = [...$('gfx').querySelectorAll('button')], gfxNow = $('gfxNow');
function showGfx() {
  const on = gfx.picked ? gfx.quality : 'auto';
  for (const b of gfxButtons) b.setAttribute('aria-pressed', String(b.dataset.q === on));
  gfxNow.hidden = gfx.picked;
  gfxNow.textContent = gfx.quality === 'high' ? 'High now' : 'Low now';
}
for (const b of gfxButtons) b.addEventListener('click', () => choose(b.dataset.q as Choice));
onQuality(showGfx);
showGfx();

// Credits & Copyrights: a mouse opens the notice by hovering over the row, and it closes when the mouse moves off; a
// click (a tap, or Enter) opens it and keeps it open, and a second one closes it.
const credits = $('credits'), creditsBtn = $('creditsBtn'), creditsCard = $('creditsCard');
let pinned = false;
function showCredits(open: boolean) {
  creditsCard.hidden = !open;
  creditsBtn.setAttribute('aria-expanded', String(open));
  if (!open) pinned = false;
  // on a short screen the menu scrolls: bring the notice into view
  else creditsCard.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}
const mouse = (e: Event) => (e as PointerEvent).pointerType === 'mouse';
credits.addEventListener('pointerenter', e => { if (mouse(e)) showCredits(true); });
credits.addEventListener('pointerleave', e => { if (mouse(e) && !pinned) showCredits(false); });
creditsBtn.addEventListener('click', () => {
  if (pinned) { showCredits(false); return; }
  showCredits(true);
  pinned = true;
});

$('controls').addEventListener('click', () => {
  openSettings(false);
  showHint(true);
});
