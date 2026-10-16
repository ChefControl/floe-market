// Reporting a bug or an idea, for a player signed in with Google: the settings row (About, Report a bug or idea) opens
// a window of its own over the game, and takes a picture of the game as it opens: two, in fact, one as the player sees
// it (with the panels, buttons and money over it, drawn by html2canvas) and one of just the game. The report carries
// the pictures and the game state (the save, and where the player is), each behind a tickbox that starts on, and the
// notice above Send says exactly what goes. Draw-a-Bug (sketch.ts) opens the picture big to circle what's wrong in
// red, and the lines go on both. It's sent to Firestore (cloud.ts, firebase.ts), and a workflow in a private repo
// turns it into a GitHub issue (intake/). A report that can't reach the cloud waits on the device and goes when it can.
// The error box's Report this button (errors.ts) opens it with the error written in. A player who played before
// reports came is told once, a few seconds into their game, that they can report from the menu now.
import { prefs } from './audio';
import { cloud, cloudEnabled, onCloud, sendReport, type Report, type Sent } from './cloud';
import { recentErrors } from './errors';
import { frameRate, gfx } from './graphics';
import { level, stage } from './layout';
import { player } from './player';
import { camera, renderer, scene } from './render';
import { deviceStore, save, SAVE_KEY } from './save';
import { current } from './season';
import { openSettings } from './settings';
import { celebrate } from './sendFx';
import { INK, paint, sketch, type Stroke } from './sketch';
import { toast } from './ui';

/** Longest note (firestore.rules checks it too). */
export const TEXT_MAX = 1000;
/** Biggest picture (each of the two) and save a report carries (firestore.rules checks them too). */
export const SHOT_MAX = 200_000, SAVE_MAX = 100_000;
/** How wide the picture is, in pixels. */
const SHOT_W = 640;
/**
 * The rules let a player send 20 reports an hour, counted from the first, and at least a second apart: the game says
 * when the hour's are used up before trying, and waits out the second itself.
 */
export const QUOTA = 20, WINDOW = 3_600_000, GAP = 1000;
/** Reports waiting for the cloud, and this hour's count of those sent ({since, n} as limits/{uid} keeps it, and when
 * the last one went). */
export const QUEUE_KEY = 'floe-reports', COUNT_KEY = 'floe-report-count';
/** How many reports wait on the device at most (each can be half a MB). */
const QUEUE_MAX = 2;
/** How long Send waits for the picture as the player sees it, if it isn't made yet, before it goes without, in ms. */
export const UI_WAIT = 4000;
/** What's left out of that picture: the report window over it, and the game's own canvas, which is drawn under it from
 *  the picture of just the game. */
const NOT_SHOWN = new Set(['report', 'draw', 'sendFx', 'game']);
/** The panels that can be open over the game, for the report's `live` state. */
const PANELS = ['shop', 'look', 'roulette', 'blackjack', 'slots', 'bubbly', 'tears', 'korki', 'scores', 'cloudPick', 'stale', 'hint',
  'gong', 'fightCard', 'offer', 'eddie', 'monte', 'loans', 'denBar', 'denGus'];

const $ = (id: string) => document.getElementById(id)!;

/** Whether this device's player was told reports are in the menu: 'new' (not yet) or 'seen'. */
export const NEWS_KEY = 'floe-market-report-news';
/** Seconds into a returning player's game before they're told. */
export const NEWS_AFTER = 3;
/** A player who played before reports came (their save was here when the game loaded) gets told; a new one doesn't. */
let news = false, newsWait = 0;
try {
  const was = localStorage.getItem(NEWS_KEY);
  news = was === null ? !!localStorage.getItem(SAVE_KEY) : was === 'new';
  if (was === null) localStorage.setItem(NEWS_KEY, news ? 'new' : 'seen');
} catch { /* storage unavailable: nobody to tell */ }
function newsSeen() {
  news = false;
  try { localStorage.setItem(NEWS_KEY, 'seen'); } catch { /* it may come again next time */ }
}
const row = $('reportCat'), win = $('report'), name = $('reportName');
const text = $('reportText') as HTMLTextAreaElement, count = $('reportCount');
const shotImg = $('reportShot') as HTMLImageElement;
const shotOn = $('reportShotOn') as HTMLInputElement, stateOn = $('reportStateOn') as HTMLInputElement;
const warn = $('reportWarn'), notice = $('reportNotice');
const kinds = [...$('reportKind').querySelectorAll<HTMLButtonElement>('button')];
const drawBtn = $('reportDraw') as HTMLButtonElement;

/**
 * The pictures taken when the window opened, of just the game (`world`) and as the player saw it (`screen`, once it's
 * made), the lines drawn on them, and each with the lines on as a JPEG ('' if none). They're the same size, so the
 * lines fit both.
 */
let world: HTMLCanvasElement | null = null, screen: HTMLCanvasElement | null = null, strokes: Stroke[] = [];
let shot = '', ui = '';
/** The picture as the player saw it, while it's being made; and how many times the window's opened, so a picture
 *  made for a window since closed isn't used. */
let making: Promise<void> = Promise.resolve(), opens = 0;
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

let pageKit: Promise<typeof import('html2canvas')> | undefined;
/**
 * The game as the player sees it: `world` (takeShot's picture) with what's shown over the game's canvas drawn on top,
 * the same size, or null if it can't be made. The page is drawn again by html2canvas (loaded the first time), which
 * takes a moment, so it's done while the report window is open, leaving that out.
 */
export async function takeUi(world: HTMLCanvasElement) {
  try {
    // loaded once, or again next time if it couldn't be
    const { default: html2canvas } = await (pageKit ??= import('html2canvas').catch(e => { pageKit = undefined; throw e; }));
    const r = renderer.domElement.getBoundingClientRect();
    const layer = await html2canvas(document.body, {
      backgroundColor: null, logging: false, scale: world.width / (r.width || innerWidth),
      x: r.left + scrollX, y: r.top + scrollY, width: r.width || innerWidth, height: r.height || innerHeight,
      windowWidth: innerWidth, windowHeight: innerHeight,
      // the songs' YouTube players are out of sight, and can't be drawn anyway
      ignoreElements: el => NOT_SHOWN.has(el.id) || el.tagName === 'IFRAME',
      onclone: doc => {
        // the page's own colour is behind the game, not over it
        for (const el of [doc.documentElement, doc.body]) el.style.background = 'transparent';
        // html2canvas draws a slider as a box with its number in: a line with a knob where it's set, instead
        for (const sl of doc.querySelectorAll<HTMLInputElement>('input[type=range]')) {
          const lo = Number(sl.min || 0), hi = Number(sl.max || 100), at = (Number(sl.value) - lo) / (hi - lo || 1);
          const knob = doc.createElement('div'), h = sl.offsetHeight || 20;
          knob.style.cssText = `display:inline-block;vertical-align:middle;width:${sl.offsetWidth}px;height:${h}px;`
            + `background:radial-gradient(circle ${h / 2 - 1}px at ${Math.round(at * 100)}% 50%, #fff 98%, transparent),`
            + 'linear-gradient(transparent 42%, rgba(255,255,255,.45) 42% 58%, transparent 58%)';
          sl.replaceWith(knob);
        }
      },
    });
    const out = document.createElement('canvas');
    out.width = world.width; out.height = world.height;
    const c = out.getContext('2d');
    c?.drawImage(world, 0, 0);
    c?.drawImage(layer, 0, 0, out.width, out.height);
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

/** Draw-a-Bug: circle what's wrong on the picture as the player saw it, and the lines go on both pictures. */
async function draw() {
  const pic = screen ?? world;
  if (!pic || !shotOn.checked) return;
  const kept = await sketch(pic, strokes, kind === 'idea');
  if (kept) { strokes = kept; repaint(); }
  drawBtn.focus();
}
/** `pic` with the lines on it, in the ink of a bug or an idea, as it will be sent ('' if it can't be). */
function withLines(pic: HTMLCanvasElement) {
  const out = document.createElement('canvas');
  paint(out, pic, strokes, INK[kind]);
  return jpeg(out);
}
/** Both pictures with the lines on, and the window showing the one as the player saw it, once it's there. */
function repaint() {
  if (!world) return;
  shot = withLines(world) || shot;
  if (screen) ui = withLines(screen) || ui;
  shotImg.src = ui || shot;
  drawBtn.classList.toggle('drawn', strokes.length > 0);
}

/** What the save doesn't hold: where the player is (in stage 3, up in the world or down in the cellar) and what's open
 *  on screen. */
function live() {
  const p = player.g.position;
  return JSON.stringify({
    x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10,
    facing: Math.round(player.g.rotation.y * 180 / Math.PI),
    stage: stage.n,
    cellar: level.down,
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
  if (news) newsSeen(); // found it already
  if (!cloud.user) { $('cloud').click(); return; }
  openSettings(false);
  world = takeShot();
  screen = null;
  strokes = [];
  shot = world ? jpeg(world) : '';
  ui = '';
  if (!shot) world = null;
  const opened = ++opens, pic = world;
  making = pic ? takeUi(pic).then(c => {
    if (opened !== opens || !c) return;
    screen = c;
    repaint();
  }) : Promise.resolve();
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

interface Count { since: number; n: number; last: number }
/** This hour's count of reports sent from this device, or a new one if the last hour's has run out. */
function sentCount(now = Date.now()): Count {
  try {
    const c = JSON.parse(deviceStore.read(COUNT_KEY) ?? '') as Count;
    if (now - c.since <= WINDOW && c.n > 0) return { ...c, last: Number(c.last) || 0 };
  } catch { /* none kept yet */ }
  return { since: now, n: 0, last: 0 };
}

let sending: Promise<unknown> = Promise.resolve();
/**
 * Sends a report once the one before it has gone and a second has passed since (counted from when the cloud took it,
 * so it's a second on the cloud's clock too), and counts it if it went.
 */
function sendSpaced(r: Report): Promise<Sent> {
  const go = sending.then(async () => {
    const wait = sentCount().last + GAP - Date.now();
    if (wait > 0) await new Promise(res => setTimeout(res, wait));
    const how = await sendReport(r);
    if (how === 'sent') {
      const c = sentCount();
      deviceStore.write(JSON.stringify({ since: c.since, n: c.n + 1, last: Date.now() }), COUNT_KEY);
    }
    return how;
  });
  sending = go.catch(() => {});
  return go;
}

let flushing = false;
/** Sends the reports waiting on the device, oldest first, while the cloud takes them. */
export async function flush() {
  if (flushing || !cloud.user) return;
  flushing = true;
  try {
    for (let q = readQueue(); q.length; q = readQueue()) {
      const r = q[0], how = await sendSpaced(r);
      if (how === 'offline') return;
      // refused: most likely it got through last time and was waiting in Firebase, so it's there already
      writeQueue(readQueue().filter(w => w.id !== r.id));
    }
  } finally { flushing = false; }
}

async function send() {
  const note = text.value.trim();
  if (!note) { warn.textContent = 'Write a few words first.'; warn.hidden = false; text.focus(); return; }
  const c = sentCount();
  if (c.n >= QUOTA) {
    const min = Math.max(1, Math.ceil((c.since + WINDOW - Date.now()) / 60_000));
    toast(`That's ${QUOTA} reports this hour. You can send more in ${min} minute${min === 1 ? '' : 's'}`, 'report', 3200);
    return;
  }
  const pic = shotOn.checked && !!shot, opened = opens;
  const r: Report = {
    id: newId(), kind, text: note.slice(0, TEXT_MAX), build: __BUILD__, device: device(),
    errors: JSON.stringify(recentErrors),
    ...(stateOn.checked ? { live: live(), save: saveNow() } : {}),
    ...(pic ? { shot } : {}),
  };
  text.value = '';
  closeReport();
  celebrate(kind);
  // the picture as the player saw it may still be being made
  if (pic) {
    await Promise.race([making, new Promise(res => setTimeout(res, UI_WAIT))]);
    if (ui && opened === opens) r.ui = ui;
  }
  // sent, the moment above says so; it only needs words when it didn't go
  const how = await sendSpaced(r);
  if (how === 'refused') toast("Couldn't send it just now. Try again later", 'report', 2600);
  else if (how === 'offline') {
    writeQueue([...readQueue(), r]);
    toast("Thanks! It'll send when you're back online", 'report', 2600);
  }
}

/** Call every frame: tells a returning player once that they can report from the menu (when nothing's open over it). */
export function updReports(dt: number) {
  if (!news || row.hidden) return;
  newsWait += dt;
  if (newsWait < NEWS_AFTER || !$('settings').hidden || !win.hidden || $('banner').classList.contains('on')) return;
  newsSeen();
  toast('🐞 You can now report bugs and ideas from the ⚙️ menu', undefined, 5000);
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
