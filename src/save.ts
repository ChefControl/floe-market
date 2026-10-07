// Progress persistence, per device for now. Saves are versioned so game updates never reset progress,
// and a second tab can't overwrite newer progress with an older copy of the game.
import { C1, C2, type Counter } from './counters';
import { steaksInProgress } from './fishing';
import { addBillValue, billValue, newBill, newSteak } from './items';
import { player } from './player';
import { runner } from './runner';
import { pile } from './stations';
import { applyUnlock, redrawTile, tiles } from './unlocks';
import { wallet } from './wallet';

/** Storage key. The name is historical; the format version lives in the data (`v`). */
export const SAVE_KEY = 'floe-market-v1';
/** An unreadable save is copied here before starting over, so it can still be recovered by hand. */
export const BACKUP_KEY = 'floe-market-backup';
const VERSION = 2;

export interface SaveData {
  v: number;
  /** When it was written (ms since epoch). */
  savedAt: number;
  money: number;
  tiles: { id: string; paid: number; done: boolean }[];
  /** Steak counts on the pile, in the player's arms and on each counter. */
  pile: number;
  back: number;
  c1: number;
  c2: number;
  /** Uncollected cash at each counter. */
  c1c: number;
  c2c: number;
}

/** The one place that touches device storage; account-backed saves would hook in here later. */
export const deviceStore = {
  read(key = SAVE_KEY) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  write(data: string, key = SAVE_KEY) {
    try { localStorage.setItem(key, data); return true; } catch { return false; }
  },
  remove(key = SAVE_KEY) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

/** Non-negative whole number, whatever came out of storage. */
const num = (v: unknown) => Math.max(0, Math.floor(Number(v))) || 0;

/** Brings a save from any version up to the current format. Throws if it isn't a save at all. */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('not a save');
  // v1 had no version or timestamp; otherwise the same fields.
  const s = raw as Record<string, unknown>;
  const savedTiles = Array.isArray(s.tiles) ? s.tiles : [];
  return {
    v: VERSION,
    savedAt: num(s.savedAt),
    money: num(s.money),
    tiles: savedTiles
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map(t => ({ id: String(t.id), paid: num(t.paid), done: t.done === true })),
    pile: num(s.pile), back: num(s.back),
    c1: num(s.c1), c2: num(s.c2),
    c1c: num(s.c1c), c2c: num(s.c2c),
  };
}

// ---------- one writer at a time ----------
/** The save exactly as this tab last read or wrote it. Anything else in storage means another tab saved since. */
let lastSeen: string | null = null;
let stale = false;
export const isStale = () => stale;

/** Another tab owns the save now: stop writing and offer to continue here (which reloads the latest save). */
function markStale() {
  if (stale) return;
  stale = true;
  document.getElementById('stale')?.removeAttribute('hidden');
}

/** Asks the browser not to evict our storage when space runs low. Some browsers ask the player. */
let askedPersist = false;
function requestPersistentStorage() {
  askedPersist = true;
  const s = navigator.storage;
  if (s?.persisted && s.persist) s.persisted().then(p => p || s.persist()).catch(() => {});
}

// ---------- save / load ----------
const cashSum = (C: Counter) => C.cash.all().reduce((s, b) => s + billValue(b), 0);
/** Steaks customers are holding but haven't paid for yet go back on the counter. */
const unpaid = (C: Counter) => C.queue.reduce((s, c) => s + c.hands.n, 0);

export function save() {
  if (stale) return;
  if (deviceStore.read() !== lastSeen) { markStale(); return; }
  // Count everything mid-air too (flying bills and steaks, fish being reeled in, the runner's load),
  // so closing the page at any moment loses nothing.
  const data: SaveData = {
    v: VERSION,
    savedAt: Date.now(),
    money: wallet.money + wallet.inFlight,
    tiles: tiles.map(t => ({ id: t.id, paid: t.paid, done: t.done })),
    pile: Math.min(pile.cap, pile.n + steaksInProgress() + (runner ? runner.back.n : 0)),
    back: player.back.n,
    c1: C1.stock.n + unpaid(C1), c2: C2.stock.n + unpaid(C2),
    c1c: cashSum(C1), c2c: cashSum(C2),
  };
  const raw = JSON.stringify(data);
  if (deviceStore.write(raw)) lastSeen = raw;
  if (!askedPersist && tiles.some(t => t.paid > 0)) requestPersistentStorage();
}

/** Rebuilds a cash stack worth `sum`, capped at 60 bills (extra value goes on the top bill). */
function fillCash(C: Counter, sum: number) {
  let left = sum;
  while (left > 0 && C.cash.items.length < 60) {
    const v = Math.min(C.price, left);
    C.cash.put(newBill(v));
    left -= v;
  }
  if (left > 0 && C.cash.items.length) addBillValue(C.cash.items[C.cash.items.length - 1], left);
}

/** Restores saved progress; returns false when starting fresh. */
export function load() {
  const raw = deviceStore.read();
  lastSeen = raw;
  let s: SaveData | null = null;
  if (raw !== null) {
    try { s = migrate(JSON.parse(raw)); } catch { deviceStore.write(raw, BACKUP_KEY); }
  }
  if (!s) { tiles.forEach(redrawTile); return false; }
  wallet.money = s.money;
  for (const o of s.tiles) {
    const t = tiles.find(x => x.id === o.id);
    if (!t) continue;
    t.paid = o.paid;
    if (o.done) applyUnlock(t.id, true);
  }
  tiles.forEach(redrawTile);
  for (let i = 0; i < Math.min(s.pile, pile.cap); i++) pile.put(newSteak());
  for (let i = 0; i < Math.min(s.back, player.back.cap); i++) player.back.put(newSteak());
  for (let i = 0; i < Math.min(s.c1, C1.stock.cap); i++) C1.stock.put(newSteak());
  if (C2.enabled) for (let i = 0; i < Math.min(s.c2, C2.stock.cap); i++) C2.stock.put(newSteak());
  fillCash(C1, s.c1c);
  if (C2.enabled) fillCash(C2, s.c2c);
  return true;
}

/** Saves on a timer and whenever the page may be going away, and watches for other tabs taking over. */
export function startAutosave() {
  setInterval(save, 2500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  // pagehide is the reliable "leaving" signal on iOS; beforeunload covers older desktop browsers.
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);
  window.addEventListener('storage', e => {
    if ((e.key === SAVE_KEY || e.key === null) && e.newValue !== lastSeen) markStale();
  });
  document.querySelector('#stale button')?.addEventListener('click', () => location.reload());
  // Claim the save right away: the tab opened most recently is the one the player is looking at,
  // so any older tab steps aside now rather than whenever its own timer fires.
  save();
}

/** Erases progress for good (the Restart button). Blocks saves so nothing on the way out writes it back. */
export function wipeSave() {
  stale = true;
  deviceStore.remove();
}
