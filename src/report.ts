// Reporting a bug or an idea, from the settings (About, Report a bug or idea), for a player signed in with Google.
// Opening the row takes a picture of the game behind the menu; the report carries it and the game state (the save,
// and where the player is), each behind a tickbox that starts on, and the notice above Send says exactly what goes.
// It's sent to Firestore (cloud.ts, firebase.ts), and a workflow in a private repo turns it into a GitHub issue
// (intake/). A report that can't reach the cloud waits on the device and goes when it can. The error box's Report
// this button (errors.ts) opens it with the error written in.
import { prefs } from './audio';
import { cloud, cloudEnabled, onCloud, sendReport, type Report } from './cloud';
import { recentErrors } from './errors';
import { frameRate, gfx } from './graphics';
import { player } from './player';
import { camera, renderer, scene } from './render';
import { sushi } from './restaurant';
import { deviceStore, save } from './save';
import { current } from './season';
import { openSettings } from './settings';
import { toast } from './ui';

/** Longest note (firestore.rules checks it too). */
export const TEXT_MAX = 1000;
/** Biggest picture and save a report carries (firestore.rules checks them too). */
export const SHOT_MAX = 200_000, SAVE_MAX = 100_000;
/** How wide the picture is, in pixels. */
const SHOT_W = 640;
/** The rules turn away a report sent within 2 minutes of the last; the game says so before trying. */
export const SPACING = 120_000;
/** Reports waiting for the cloud, and when the last one went. */
export const QUEUE_KEY = 'floe-reports', LAST_KEY = 'floe-report-last';
/** How many reports wait on the device at most (each can be a few hundred kB). */
const QUEUE_MAX = 2;
/** The panels that can be open over the game, for the report's `live` state. */
const PANELS = ['shop', 'look', 'roulette', 'blackjack', 'korki', 'scores', 'cloudPick', 'stale', 'hint'];

const $ = (id: string) => document.getElementById(id)!;
const row = $('reportCat'), panel = $('reportPanel'), name = $('reportName');
const text = $('reportText') as HTMLTextAreaElement, count = $('reportCount');
const shotImg = $('reportShot') as HTMLImageElement;
const shotOn = $('reportShotOn') as HTMLInputElement, stateOn = $('reportStateOn') as HTMLInputElement;
const warn = $('reportWarn'), notice = $('reportNotice');
const kinds = [...$('reportKind').querySelectorAll<HTMLButtonElement>('button')];

/** The picture taken when the panel opened, as a JPEG data URL ('' if it couldn't be taken). */
let shot = '';
let kind: Report['kind'] = 'bug';

/** The game as it is drawn now, 640 pixels wide. */
export function takeShot() {
  try {
    // the game's canvas is cleared once a frame is shown, so draw one and copy it straight away
    renderer.render(scene, camera);
    const src = renderer.domElement, w = Math.min(SHOT_W, src.width || SHOT_W);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = Math.round(w * (src.height || 1) / (src.width || 1));
    out.getContext('2d')?.drawImage(src, 0, 0, out.width, out.height);
    for (const q of [0.7, 0.5]) {
      const url = out.toDataURL('image/jpeg', q);
      if (url.startsWith('data:image/jpeg') && url.length <= SHOT_MAX) return url;
    }
  } catch { /* no picture, then */ }
  return '';
}

/** What the save doesn't hold: where the player is and what's open on screen. */
function live() {
  const p = player.g.position;
  return JSON.stringify({
    x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10,
    facing: Math.round(player.g.rotation.y * 180 / Math.PI),
    stage: sushi.built ? 2 : 1,
    season: current(),
    open: PANELS.filter(id => { const el = document.getElementById(id); return !!el && !el.hidden; }),
    muted: prefs.mute,
    cloud: cloud.state,
    minutes: Math.round(performance.now() / 60_000),
  });
}

/** The device, briefly: enough to tell a phone from a computer, and how well it's running the game. */
function device() {
  return JSON.stringify({
    graphics: gfx.picked ? gfx.quality : 'auto ' + gfx.quality,
    fps: Math.round(frameRate.fps),
    screen: `${innerWidth}x${innerHeight}@${Math.round(devicePixelRatio * 100) / 100}`,
    touch: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    browser: navigator.userAgent.slice(0, 200),
  });
}

/** The save as it is this moment, if it's small enough to send. */
function saveNow() {
  save();
  const raw = deviceStore.read();
  return raw && raw.length < SAVE_MAX ? raw : undefined;
}

/** A name for the report, the way Firestore makes them, so sending it again from the device can't make two. */
function newId() {
  const a = crypto.getRandomValues(new Uint8Array(20));
  return [...a].map(b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');
}

/** A list in words: "a", "a and b", "a, b and c". */
const words = (l: string[]) => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1];

/** The notice says exactly what Send shares, and a line under the boxes says what leaving one out costs. */
function showNotice() {
  const pic = shotOn.checked && !!shot, state = stateOn.checked;
  const what = ['your note', ...(pic ? ['this picture'] : []), ...(state ? ['your game state'] : [])];
  const kept = pic && state ? 'The picture and game state are' : pic ? 'The picture is' : state ? 'The game state is' : '';
  notice.textContent = `Sending shares ${words(what)} with the developer, to find and fix the problem. ` +
    'The game version, your device type and recent errors go too. Your name and email are not sent.' +
    (kept ? ` ${kept} deleted after 7 days.` : '');
  const lost = [
    ...(shotOn.checked ? [] : ['Without the picture, it may be hard to see what went wrong.']),
    ...(stateOn.checked ? [] : ['Without your game state, the developer may not be able to make it happen again to fix it.']),
  ];
  warn.textContent = lost.join(' ');
  warn.hidden = !lost.length;
  shotImg.classList.toggle('off', !shotOn.checked);
}

function showCount() { count.textContent = `${text.value.length} / ${TEXT_MAX}`; }

function setKind(k: Report['kind']) {
  kind = k;
  for (const b of kinds) b.setAttribute('aria-checked', String(b.dataset.kind === k));
  text.placeholder = k === 'bug' ? 'What happened? What did you expect instead?' : 'What would you like in the game?';
}

/** The row: signed in, it opens the panel; signed out, it signs in. */
function showRow() {
  const signedIn = !!cloud.user;
  name.textContent = signedIn ? 'Report a bug or idea' : 'Sign in to send a report';
  if (signedIn) row.setAttribute('aria-expanded', String(!panel.hidden));
  else { row.removeAttribute('aria-expanded'); panel.hidden = true; }
  row.classList.toggle('cat', signedIn);
}

/** Opens the panel with a fresh picture of the game, both boxes ticked, and optionally a note already written. */
export function openReport(note = '') {
  if (!cloud.user) { $('cloud').click(); return; }
  shot = takeShot();
  shotImg.hidden = !shot;
  if (shot) shotImg.src = shot;
  shotOn.checked = stateOn.checked = true;
  shotOn.disabled = !shot;
  if (note) { setKind('bug'); text.value = note.slice(0, TEXT_MAX); }
  panel.hidden = false;
  showRow(); showNotice(); showCount();
  panel.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}
function closeReport() {
  panel.hidden = true;
  showRow();
}

// ---------- sending, and the reports waiting for the cloud ----------
const readQueue = (): Report[] => {
  try { return JSON.parse(deviceStore.read(QUEUE_KEY) ?? '[]') as Report[]; } catch { return []; }
};
/** Keeps the newest reports that fit on the device. */
function writeQueue(q: Report[]) {
  for (let keep = q.slice(-QUEUE_MAX); keep.length; keep = keep.slice(1)) if (deviceStore.write(JSON.stringify(keep), QUEUE_KEY)) return;
  deviceStore.remove(QUEUE_KEY);
}

let flushing = false;
/** Sends the reports waiting on the device, oldest first, while the cloud takes them. */
export async function flush() {
  if (flushing || !cloud.user) return;
  flushing = true;
  try {
    for (let q = readQueue(); q.length; q = readQueue()) {
      const r = q[0], how = await sendReport(r);
      if (how === 'offline') return;
      // refused: most likely it got through last time and was waiting in Firebase, so it's there already
      writeQueue(readQueue().filter(w => w.id !== r.id));
      if (how === 'sent') deviceStore.write(String(Date.now()), LAST_KEY);
    }
  } finally { flushing = false; }
}

async function send() {
  const note = text.value.trim();
  if (!note) { warn.textContent = 'Write a few words first.'; warn.hidden = false; text.focus(); return; }
  if (Date.now() - Number(deviceStore.read(LAST_KEY)) < SPACING) { toast('You just sent one. Try again in a couple of minutes', 'report', 2600); return; }
  const r: Report = {
    id: newId(), kind, text: note.slice(0, TEXT_MAX), build: __BUILD__, device: device(),
    errors: JSON.stringify(recentErrors),
    ...(stateOn.checked ? { live: live(), save: saveNow() } : {}),
    ...(shotOn.checked && shot ? { shot } : {}),
  };
  text.value = '';
  closeReport();
  const how = await sendReport(r);
  if (how === 'sent') {
    deviceStore.write(String(Date.now()), LAST_KEY);
    toast('Thanks! Your report is on its way', 'report', 2600);
  } else if (how === 'refused') toast("Couldn't send it just now. Try again in a few minutes", 'report', 2600);
  else {
    writeQueue([...readQueue(), r]);
    toast("Thanks! It'll send when you're back online", 'report', 2600);
  }
}

/** Shows the row once cloud saves are set up, and sends any reports left waiting. */
export function initReports() {
  if (!cloudEnabled()) return;
  row.hidden = false;
  $('errReport').hidden = false;
  row.addEventListener('click', () => { if (panel.hidden) openReport(); else closeReport(); });
  for (const b of kinds) b.addEventListener('click', () => setKind(b.dataset.kind as Report['kind']));
  text.maxLength = TEXT_MAX;
  text.addEventListener('input', () => { showCount(); if (text.value.trim()) showNotice(); });
  shotOn.addEventListener('change', showNotice);
  stateOn.addEventListener('change', showNotice);
  $('reportCancel').addEventListener('click', closeReport);
  $('reportSend').addEventListener('click', () => { void send(); });
  $('errReport').addEventListener('click', () => {
    openSettings(true);
    openReport(recentErrors[recentErrors.length - 1] ?? $('errMsg').textContent ?? '');
  });
  // signing in, or coming back online, sends what was waiting
  onCloud(() => { showRow(); if (cloud.user && cloud.state === 'saved') void flush(); });
  window.addEventListener('online', () => { void flush(); });
  setKind('bug');
  showRow();
}
