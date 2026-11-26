// Bring in your web game (#161, the owner's call on 27 Nov): the web game closed (#247), and its page offers a
// download of a save it left in the browser (site/index.html: floe-market-save.json). In the Steam build, Settings has
// 🎒 Bring in your web game: pick that file, see what's in it (its stage and cash) and bring it in, which replaces the
// game on this computer. The game it replaces rolls into the backups first (desktop/saves.mjs), so it can still be got
// back by hand. Then the page reloads straight into the game brought in, past the main menu (title.ts).
import { desktop } from './desktop';
import { steamOn } from './flags';
import { deviceStore, migrate, replaceSave, save, type SaveData } from './save';
import { openSettings } from './settings';
import { page } from './title';
import { toast } from './ui';
import { panel } from './uiKit';

const $ = (id: string) => document.getElementById(id)!;
const row = $('webSave'), file = $('webSaveFile') as HTMLInputElement, ask = $('webSaveAsk');
/** The main menu's note that this run's been in the game (title.ts): the reload goes straight back in. */
const IN = 'floe-in';

/** A web game's save, from its file's text; null if it isn't one. */
export function readWebSave(text: string): { raw: string; save: SaveData } | null {
  try {
    const s = JSON.parse(text) as Record<string, unknown> | null;
    // (the game's own save: a version, its money and its tiles; anything else isn't one)
    if (typeof s?.v !== 'number' || typeof s.money !== 'number' || !Array.isArray(s.tiles)) return null;
    return { raw: text, save: migrate(s) };
  } catch { return null; }
}

/** What a save is, in a few words: its stage and its cash ("Stage 2 · $6,000"). */
export function sumUp(s: SaveData) {
  const done = (id: string) => s.tiles.some(t => t.id === id && t.done);
  const stage = done('dohyo') ? 3 : done('sushi') ? 2 : 1;
  return `Stage ${stage} · $${Math.round(s.money).toLocaleString('en-US')}`;
}

let picked: string | null = null;
function openAsk(open: boolean) {
  ask.hidden = !open;
  if (open) $('webSaveYes').focus();
  else picked = null;
}

/** Brings the picked game in: this one into the backups, the web game in its place, then straight into it. */
function bringIn() {
  const raw = picked;
  if (!raw) return;
  save(true);
  deviceStore.remove();
  replaceSave(raw, true);
  try { sessionStorage.setItem(IN, '1'); } catch { /* the main menu again: no harm */ }
  page.reload();
}

panel(ask, { place: 'dialog', skin: 'base', close: () => openAsk(false) });
row.hidden = !steamOn() || !desktop();
row.addEventListener('click', () => file.click());
file.addEventListener('change', () => {
  const f = file.files?.[0];
  file.value = '';
  if (!f) return;
  void f.text().then(text => {
    const got = readWebSave(text);
    if (!got) { toast("That file isn't a Floe Market save"); return; }
    picked = got.raw;
    $('webSaveWhat').textContent = sumUp(got.save);
    openSettings(false);
    openAsk(true);
  }, () => toast("Couldn't read that file"));
});
$('webSaveYes').addEventListener('click', bringIn);
$('webSaveNo').addEventListener('click', () => openAsk(false));
$('webSaveX').addEventListener('click', () => openAsk(false));
ask.addEventListener('click', e => { if (e.target === ask) openAsk(false); });
