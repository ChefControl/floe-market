// The settings menu, behind the gear in the top corner, in four groups: You (signing in for cloud saves, cloud.ts, and
// your look), Graphics & sound (graphics.ts, audio.ts), Game (how to walk, hint.ts, and Restart, main.ts), and About
// (Report a bug or idea, report.ts; Ko-fi, kofi.ts, only in builds with it on; Privacy; and last, the Credits & Copyrights for the music and sound). Controls, Graphics, Sound, Privacy and the credits each
// open with a click: Controls into How to play and a switch for the Buy button on a computer; Graphics into Auto,
// Potato, Low or High; Sound into the effects, the ambience and the music, each with a mute button
// and a 0 to 10 slider, big enough for a finger; Privacy into, signed in, the switch for showing on the scoreboards
// (cloud.ts), then the notice's short version, with a button for the whole notice in a dialog over the game; and the
// credits into the notices.
import { every, prefs, setLevel, setMute, type Bus } from './audio';
import { choose, gfx, onQuality, type Choice } from './graphics';
import { touchBuy } from './buy';
import { buyButton, setBuyButton, showHint } from './hint';
import { coin } from './sfx';
import { toast } from './ui';
import { panel as kitPanel } from './uiKit';

const $ = (id: string) => document.getElementById(id)!;
const gear = $('gear'), menu = $('settings'), notice = $('privacyDialog');

export function openSettings(open: boolean) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
  if (open) showBuyToggle();
}
gear.addEventListener('click', () => openSettings(gear.getAttribute('aria-expanded') !== 'true'));
// A tap anywhere else closes it, and so does Escape; drawing on a report's picture (sketch.ts) isn't anywhere else.
window.addEventListener('pointerdown', e => {
  const t = e.target as Element;
  if (!menu.hidden && !menu.contains(t) && !gear.contains(t) && !t.closest?.('#draw, #privacyDialog')) openSettings(false);
}, true);
window.addEventListener('keydown', e => {
  // (Escape over the privacy notice closes just the notice)
  if (e.key !== 'Escape' || menu.hidden || e.defaultPrevented || !notice.hidden) return;
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
category($('privacyBtn'), $('privacyCard'));
category($('creditsBtn'), $('creditsCard'));

/**
 * The whole privacy notice (public/privacy.html), in a dialog over the paused game rather than a page of its own, so
 * reading it never takes the player out of the game. It's fetched the first time it's opened.
 */
const frame = $('privacyFrame') as HTMLIFrameElement;
export function openNotice() {
  if (!frame.getAttribute('src')) frame.src = 'privacy.html';
  notice.hidden = false;
  $('privacyClose').focus();
}
function closeNotice() {
  if (notice.hidden) return;
  notice.hidden = true;
  $('privacyFull').focus();
}
kitPanel(notice, { place: 'dialog', skin: 'base', close: closeNotice });
$('privacyFull').addEventListener('click', openNotice);
$('privacyClose').addEventListener('click', closeNotice);
notice.addEventListener('click', e => { if (e.target === notice) closeNotice(); });

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

// Graphics: Auto, Potato, Low or High, shown on the row while it's closed. On Auto, which one the game is using shows
// under the choices. A pick into or out of Potato offers a reload to finish it (graphics.ts), and when Auto drops to
// Potato by itself, a toast says so, once.
const gfxButtons = [...$('gfx').querySelectorAll<HTMLButtonElement>('.seg button')], gfxNow = $('gfxNow'), gfxPick = $('gfxPick');
const gfxReload = $('gfxReload') as HTMLButtonElement;
const GFX_NAMES: Record<Choice, string> = { auto: 'Auto', potato: 'Potato', low: 'Low', high: 'High' };
let gfxWas = gfx.quality;
function showGfx() {
  for (const b of gfxButtons) b.setAttribute('aria-pressed', String(b.dataset.q === gfx.choice));
  gfxPick.textContent = GFX_NAMES[gfx.choice];
  gfxNow.hidden = gfx.picked;
  gfxNow.textContent = `Auto is on ${GFX_NAMES[gfx.quality]} now`;
  gfxReload.hidden = !gfx.reload;
  if (gfx.quality === 'potato' && gfxWas !== 'potato' && !gfx.picked) toast('🥔 Switched to Potato graphics');
  gfxWas = gfx.quality;
}
for (const b of gfxButtons) b.addEventListener('click', () => choose(b.dataset.q as Choice));
gfxReload.addEventListener('click', () => location.reload());
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
