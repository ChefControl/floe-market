// Reporting a bug or an idea, for a player signed in with Google: the settings row (About, Report a bug or idea) opens
// a window of its own over the game, and takes a picture of the game as it opens. The report carries the picture and
// the game state (the save, and where the player is), each behind a tickbox that starts on, and the notice above Send
// says exactly what goes. Draw-a-Bug (sketch.ts) opens the picture big to circle what's wrong in red. It's sent to
// Firestore (cloud.ts, firebase.ts), and a workflow in a private repo turns it into a GitHub issue (intake/). A report
// that can't reach the cloud waits on the device and goes when it can. The error box's Report this button (errors.ts)
// opens it with the error written in.
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
import { celebrate } from './sendFx';
import { INK, paint, sketch, type Stroke } from './sketch';
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
const row = $('reportCat'), win = $('report'), name = $('reportName');
const text = $('reportText') as HTMLTextAreaElement, count = $('reportCount');
const shotImg = $('reportShot') as HTMLImageElement;
const shotOn = $('reportShotOn') as HTMLInputElement, stateOn = $('reportStateOn') as HTMLInputElement;
const warn = $('reportWarn'), notice = $('reportNotice');
const kinds = [...$('reportKind').querySelectorAll<HTMLButtonElement>('button')];
const drawBtn = $('reportDraw') as HTMLButtonElement;

/** The picture taken when the window opened, the lines drawn on it, and the two together as a JPEG ('' if none). */
let base: HTMLCanvasElement | null = null, strokes: Stroke[] = [], shot = '';
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
    return out;
  } catch { return null; }
}

/** A picture as a JPEG small enough to send, or '' if it can't be made one. */
function jpeg(c: HTMLCanvasElement) {
  try {
    for (const q of [0.7, 0.5]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.startsWith('data:image/jpeg') && url.length <= SHOT_MAX) return url;
    }
  } catch { /* no picture, then */ }
  return '';
}

/** Draw-a-Bug: circle what's wrong on the picture, which then goes with the lines on it. */
async function draw() {
  if (!base || !shotOn.checked) return;
  const kept = await sketch(base, strokes, kind === 'idea');
  if (kept) { strokes = kept; repaint(); }
  drawBtn.focus();
}
/** The picture with the lines on it, in the ink of a bug or an idea, as it will be sent. */
function repaint() {
  if (!base) return;
  const out = document.createElement('canvas');
  paint(out, base, strokes, INK[kind]);
  shot = jpeg(out) || shot;
  shotImg.src = shot;
  drawBtn.classList.toggle('drawn', strokes.length > 0);
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

/**
 * What's sent, by the Send button: in a line ("your note, this picture and your game state"), and opened up, what each
 * of those is, what always goes and never does, and how long it's kept, listing only what's ticked. A line under the
 * boxes says what leaving one out costs.
 */
function showNotice() {
  const pic = shotOn.checked && !!shot, state = stateOn.checked;
  notice.textContent = words(['your note', ...(pic ? ['this picture'] : []), ...(state ? ['your game state'] : [])]);
  $('whatShot').hidden = !pic;
  $('whatState').hidden = !state;
  $('whatKept').hidden = !pic && !state;
  $('whatKeptText').textContent = pic && state ? 'the picture and game state are' : pic ? 'the picture is' : 'the game state is';
  const lost = [
    ...(shotOn.checked ? [] : ['Without the picture, it may be hard to see what went wrong.']),
    ...(stateOn.checked ? [] : ['Without your game state, the developer may not be able to make it happen again to fix it.']),
  ];
  warn.textContent = lost.join(' ');
  warn.hidden = !lost.length;
  shotImg.classList.toggle('off', !shotOn.checked);
  drawBtn.disabled = !shotOn.checked;
}

function showCount() { count.textContent = `${text.value.length} / ${TEXT_MAX}`; }

function setKind(k: Report['kind']) {
  kind = k;
  for (const b of kinds) b.setAttribute('aria-checked', String(b.dataset.kind === k));
  text.placeholder = k === 'bug' ? 'What happened? What did you expect instead?' : 'What would you like in the game?';
  $('reportDrawName').textContent = k === 'bug' ? 'Draw-a-Bug' : 'Doodle It';
  win.dataset.kind = k;
  if (strokes.length) repaint(); // the lines take the new kind's ink
}

/** The row: signed in, it opens the report window; signed out, it signs in. */
function showRow() {
  const signedIn = !!cloud.user;
  name.textContent = signedIn ? 'Report a bug or idea' : 'Sign in to send a report';
  if (signedIn) row.setAttribute('aria-haspopup', 'dialog');
  else { row.removeAttribute('aria-haspopup'); win.hidden = true; }
}

/**
 * Opens the report window over the game, in place of the settings, with a fresh picture of the game and both boxes
 * ticked, and optionally a note already written. A note written before and not sent is still there.
 */
export function openReport(note = '') {
  if (!cloud.user) { $('cloud').click(); return; }
  openSettings(false);
  base = takeShot();
  strokes = [];
  shot = base ? jpeg(base) : '';
  if (!shot) base = null;
  shotImg.hidden = drawBtn.hidden = !shot;
  drawBtn.classList.remove('drawn');
  if (shot) shotImg.src = shot;
  shotOn.checked = stateOn.checked = true;
  shotOn.disabled = !shot;
  if (note) { setKind('bug'); text.value = note.slice(0, TEXT_MAX); }
  ($('reportWhat') as HTMLDetailsElement).open = false; // What's sent starts folded
  win.hidden = false;
  showNotice(); showCount();
  kinds.find(b => b.dataset.kind === kind)?.focus();
}
function closeReport() {
  if (win.hidden) return;
  // a keyboard goes back to the gear the window was opened from
  const focused = win.contains(document.activeElement);
  win.hidden = true;
  if (focused) $('gear').focus();
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
  celebrate(kind);
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
  row.addEventListener('click', () => openReport());
  // ✕, Cancel, a click on the dimmed game around it, or Escape (unless Draw-a-Bug is open over it, sketch.ts) closes it
  $('reportClose').addEventListener('click', closeReport);
  win.addEventListener('click', e => { if (e.target === win) closeReport(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeReport(); });
  for (const b of kinds) b.addEventListener('click', () => setKind(b.dataset.kind as Report['kind']));
  text.maxLength = TEXT_MAX;
  text.addEventListener('input', () => { showCount(); if (text.value.trim()) showNotice(); });
  shotOn.addEventListener('change', showNotice);
  stateOn.addEventListener('change', showNotice);
  $('reportCancel').addEventListener('click', closeReport);
  drawBtn.addEventListener('click', () => { void draw(); });
  shotImg.addEventListener('click', () => { void draw(); });
  $('reportSend').addEventListener('click', () => { void send(); });
  $('errReport').addEventListener('click', () => openReport(recentErrors[recentErrors.length - 1] ?? $('errMsg').textContent ?? ''));
  // signing in, or coming back online, sends what was waiting
  onCloud(() => { showRow(); if (cloud.user && cloud.state === 'saved') void flush(); });
  window.addEventListener('online', () => { void flush(); });
  setKind('bug');
  showRow();
}
