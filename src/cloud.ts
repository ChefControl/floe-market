// Cloud saves: sign in with Google and the game follows you to any device. Without signing in nothing changes, and
// the save stays on this device (save.ts). Signed in, the save syncs with the account every half minute and when
// the page is hidden. A sync compares both sides with how they were at the last sync: if only one has moved on,
// it wins; if both have (two devices played since), the player picks which game to keep. Firebase itself
// (firebase.ts, downloaded by the loading screen) is only started while cloud saves are on: at once for a signed-in
// device, otherwise a few seconds after the game starts, so the sign-in window can open the moment the button is tapped. Signed-in players also put
// their best on the scoreboard (scores.ts).
import { firebaseConfig } from './cloud.config';
import { deviceStore, isStale, replaceSave, type SaveData } from './save';
import { toast } from './ui';

export interface CloudUser { uid: string; name: string }
/** A save as the cloud keeps it: save.ts's JSON, and when it was made. */
export interface CloudSave { data: string; savedAt: number }
/** A player on the scoreboard: the most cash they've held at once, in any game, and the furthest stage reached. */
export interface Score { uid: string; name: string; best: number; stage: 1 | 2 }
/** What cloud saves need from the service behind them: firebase.ts, or a fake one in the tests. */
export interface CloudBackend {
  onUser(cb: (u: CloudUser | null) => void): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  read(uid: string): Promise<CloudSave | null>;
  write(uid: string, s: CloudSave): Promise<void>;
  /** Puts a player's score on the scoreboard, keeping their best and furthest stage if those were higher before. */
  postScore(s: Score): Promise<void>;
  /** The scoreboard's top `n`, best first. */
  topScores(n: number): Promise<Score[]>;
}

/** This device's link to an account: whose, whether it's signed in, and both sides as they were at the last sync. */
interface Link { uid: string; on: boolean; base: number; sum: string }
export const LINK_KEY = 'floe-cloud';
/** A message to show after the reload that loads a cloud save. */
const NOTE_KEY = 'floe-cloud-note';
/** Seconds between syncs while playing. */
export const SYNC_EVERY = 30;

export const cloud = {
  user: null as CloudUser | null,
  state: 'idle' as 'idle' | 'syncing' | 'saved' | 'offline',
  /** When the cloud last had this device's game. */
  syncedAt: 0,
  /** Reloads the page to start from a save just fetched from the cloud (stubbed in the tests). */
  reload: () => location.reload(),
};

export const cloudEnabled = () => !!firebaseConfig.apiKey;

const readLink = (): Link | null => {
  try { return JSON.parse(deviceStore.read(LINK_KEY) ?? 'null') as Link | null; } catch { return null; }
};
const writeLink = (l: Link) => deviceStore.write(JSON.stringify(l), LINK_KEY);

/** A save's contents, leaving out when it was made, boiled down to a short fingerprint. */
function digest(raw: string) {
  const s = raw.replace(/"savedAt":\d+,?/, '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + '.' + s.length;
}

/** What the player would recognise a save by. */
interface Facts { stage: 1 | 2; money: number; best: number; upgrades: number; savedAt: number; progress: boolean }
function facts(raw: string): Facts {
  let s: Partial<SaveData> = {};
  try { s = JSON.parse(raw) as Partial<SaveData>; } catch { /* unreadable: nothing worth keeping */ }
  const tiles = s.tiles ?? [], money = s.money ?? 0;
  return {
    stage: tiles.some(t => t.id === 'sushi' && t.done) ? 2 : 1,
    money,
    best: Math.max(s.best ?? 0, money),
    upgrades: tiles.filter(t => t.done).length + Object.values(s.mods ?? {}).reduce((a, n) => a + (n ?? 0), 0),
    savedAt: s.savedAt ?? 0,
    progress: money > 0 || tiles.some(t => t.paid > 0),
  };
}
function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
const describe = (f: Facts) =>
  `Stage ${f.stage} · $${f.money.toLocaleString('en-US')} · ${f.upgrades} upgrades · played ${ago(f.savedAt)}`;

// ---------- the service ----------
let backend: CloudBackend | null = null;
let loading: Promise<CloudBackend> | null = null;
/** Fetches Firebase (once), for syncing and the scoreboard. */
export function connect() {
  loading ??= import('./firebase').then(m => {
    const b = m.createBackend();
    b.onUser(u => { void onUser(u); });
    return (backend = b);
  }).catch((e: unknown) => { loading = null; throw e; });
  return loading;
}

async function onUser(u: CloudUser | null) {
  cloud.user = u;
  const link = readLink();
  if (u) {
    writeLink({ ...(link?.uid === u.uid ? link : { uid: u.uid, base: 0, sum: '' }), on: true });
    await sync();
  } else if (link?.on) writeLink({ ...link, on: false });
  render();
}

// ---------- syncing ----------
let busy = false;
/** Brings this device and the account into line. `ask`: may ask the player which game to keep, if it comes to that. */
export async function sync(ask = true) {
  const u = cloud.user, b = backend, raw = deviceStore.read(), link = readLink();
  if (!u || !b || busy || isStale() || raw === null || link?.uid !== u.uid) return;
  busy = true;
  cloud.state = 'syncing'; render();
  try {
    const remote = await b.read(u.uid);
    const sum = digest(raw), moved = sum !== link.sum;
    if (!remote || remote.savedAt === link.base) {
      // nobody else has saved to the account since this device last synced
      if (moved || !remote) await push(b, u, raw);
    } else if (digest(remote.data) === sum) writeLink({ ...link, base: remote.savedAt, sum });
    else {
      const here = facts(raw), there = facts(remote.data);
      if (!moved || !here.progress) { adopt(link, remote); return; }
      if (!there.progress) await push(b, u, raw);
      else if (!ask) { cloud.state = 'idle'; return; }
      else if (await pick(here, there) === 'cloud') { adopt(link, remote); return; }
      else await push(b, u, deviceStore.read() ?? raw);
    }
    cloud.state = 'saved'; cloud.syncedAt = Date.now();
    await postScore().catch(() => { /* the scoreboard can wait for the next sync */ });
  } catch {
    cloud.state = 'offline';
  } finally {
    busy = false; render();
  }
}

async function push(b: CloudBackend, u: CloudUser, raw: string) {
  const savedAt = facts(raw).savedAt || Date.now();
  await b.write(u.uid, { data: raw, savedAt });
  writeLink({ uid: u.uid, on: true, base: savedAt, sum: digest(raw) });
}

// ---------- the scoreboard ----------
/** Longest name the scoreboard keeps (firestore.rules checks it too). */
export const NAME_MAX = 40;
/** How a player shows on the scoreboard, which everyone can see: their full name, never an email. */
export function publicName(name: string) {
  const full = name.trim().replace(/\s+/g, ' ');
  if (!full || full.includes('@')) return 'A player';
  return full.length > NAME_MAX ? full.slice(0, NAME_MAX - 1).trimEnd() + '…' : full;
}

/** What this device last put on the scoreboard, so it only writes again when something changed. */
let posted = '';
/** Puts this device's game on the scoreboard, for a signed-in player. */
export async function postScore() {
  const u = cloud.user, b = backend, raw = deviceStore.read();
  if (!u || !b || raw === null) return;
  const f = facts(raw);
  const s: Score = { uid: u.uid, name: publicName(u.name), best: f.best, stage: f.stage };
  const key = JSON.stringify(s);
  if (key === posted) return;
  await b.postScore(s);
  posted = key;
}

/** Swaps this device's game for the account's, and restarts the page to play it. */
function adopt(link: Link, remote: CloudSave) {
  writeLink({ ...link, on: true, base: remote.savedAt, sum: digest(remote.data) });
  deviceStore.write('Loaded your game from the cloud', NOTE_KEY);
  replaceSave(remote.data);
  cloud.reload();
}

// ---------- on screen ----------
const $ = (id: string) => document.getElementById(id)!;
const btn = $('cloud'), menu = $('cloudMenu'), chooser = $('cloudPick');

function render() {
  const u = cloud.user;
  // signed in on this device, but Firebase couldn't be reached to pick the sign-in back up
  const away = !u && cloud.state === 'offline' && !!readLink()?.on;
  $('cloudName').textContent = u ? u.name.split(' ')[0] : away ? 'Offline' : 'Sign in';
  btn.dataset.state = u || away ? cloud.state : 'out';
  // the cloud's state shows on the settings gear too, while its menu is closed
  $('gear').dataset.cloud = btn.dataset.state;
  btn.setAttribute('aria-label', u ? `Cloud saves: signed in as ${u.name}` : 'Sign in with Google to save to the cloud');
  $('cloudWho').textContent = u ? `Signed in as ${u.name}` : '';
  $('cloudStatus').textContent = cloud.state === 'offline' ? "Can't reach the cloud right now. Your game is still saved on this device."
    : cloud.syncedAt ? `Saved to the cloud ${ago(cloud.syncedAt)}` : 'Syncing with the cloud…';
  if (!u) menu.hidden = true;
}

/** Asks which of two different games to keep. */
function pick(here: Facts, there: Facts) {
  $('cloudHere').textContent = describe(here);
  $('cloudThere').textContent = describe(there);
  chooser.hidden = false;
  chooser.querySelector('button')!.focus();
  return new Promise<'device' | 'cloud'>(resolve => {
    chooser.onclick = e => {
      const keep = (e.target as HTMLElement).closest<HTMLElement>('[data-keep]')?.dataset.keep;
      if (keep !== 'device' && keep !== 'cloud') return;
      chooser.hidden = true; chooser.onclick = null;
      resolve(keep);
    };
  });
}

function signInError(e: unknown) {
  const code = (e as { code?: string } | null)?.code ?? '';
  if (code.includes('popup-blocked')) return 'Allow pop-ups to sign in';
  if (code.includes('popup-closed') || code.includes('cancelled')) return 'Sign-in cancelled';
  // the site's domain isn't in Firebase's authorized domains (see the README)
  if (code.includes('unauthorized-domain')) return "Sign-in isn't set up for this site yet";
  return "Couldn't sign in. Try again";
}

async function tap() {
  if (cloud.user) { menu.hidden = !menu.hidden; render(); return; }
  try {
    // already signed in here: reaching Firebase picks the sign-in back up
    if (!backend && readLink()?.on) { await connect(); return; }
    const b = backend ?? await connect();
    await b.signIn();
  } catch (e) { toast(signInError(e), 'cloud'); }
}

async function signOut() {
  menu.hidden = true;
  await sync(false);
  await backend?.signOut();
}

/** Shows the sign-in button (when cloud saves are set up) and starts syncing for a device that's signed in. */
export function initCloud() {
  if (!cloudEnabled()) return;
  btn.hidden = false;
  btn.addEventListener('click', () => { void tap(); });
  $('cloudOut').addEventListener('click', () => { void signOut(); });
  const note = deviceStore.read(NOTE_KEY);
  if (note) { deviceStore.remove(NOTE_KEY); toast(note); }
  if (readLink()?.on) connect().catch(() => { cloud.state = 'offline'; render(); });
  else setTimeout(() => { connect().catch(() => {}); }, 4000);
  setInterval(() => {
    // nothing changes while the page is hidden (it synced on the way out), so don't spend a cloud read on it
    if (document.hidden) return;
    // a signed-in device that started offline fetches Firebase once it can
    if (!backend && readLink()?.on) connect().catch(() => {});
    else void sync();
  }, SYNC_EVERY * 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) void sync(false); });
  render();
}
