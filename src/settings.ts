// The settings menu, behind the gear in the top corner: signing in for cloud saves (cloud.ts), the sound (audio.ts),
// how to walk (hint.ts), and Restart (main.ts). The Sound row opens into the effects, the ambience and the music, each
// with a mute button and a 1 to 10 slider, big enough for a finger.
import { every, prefs, setLevel, setMute, type Bus } from './audio';
import { showHint } from './hint';
import { coin } from './sfx';

const $ = (id: string) => document.getElementById(id)!;
const gear = $('gear'), menu = $('settings');

export function openSettings(open: boolean) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
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
 * A kind of sound's row: its mute button, and its slider with the level beside it. Moving a muted slider unmutes it;
 * the effects' slider plays a coin as it moves, to hear the level by.
 */
function soundRow(b: Bus, id: string) {
  const input = $('vol' + id) as HTMLInputElement, out = $('vol' + id + 'N'), mute = $('mute' + id);
  const row = input.closest('.vol')!;
  const show = () => {
    input.value = String(prefs.level[b]);
    out.textContent = input.value;
    input.style.setProperty('--fill', (prefs.level[b] - 1) / 9 * 100 + '%');
    mute.textContent = prefs.mute[b] ? '🔇' : '🔊';
    mute.setAttribute('aria-pressed', String(prefs.mute[b]));
    row.classList.toggle('muted', prefs.mute[b]);
  };
  input.addEventListener('input', () => {
    setLevel(b, Number(input.value));
    if (prefs.mute[b]) setMute(b, false);
    show();
    if (b === 'sfx' && every('sample', 0.15)) coin();
  });
  mute.addEventListener('click', () => { setMute(b, !prefs.mute[b]); show(); });
  show();
}
soundRow('sfx', 'Sfx');
soundRow('amb', 'Amb');
soundRow('music', 'Music');

$('controls').addEventListener('click', () => {
  openSettings(false);
  showHint(true);
});
