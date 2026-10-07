// Progress persistence on the device (cloud.ts syncs it with an account, for players who sign in). Saves are
// versioned so game updates never reset progress, and a second tab can't overwrite newer progress with an older
// copy of the game.
import { C1, repriceFish, SLED, TAKEOUT, type Counter } from './counters';
import { MODS, mods, type ModId } from './economy';
import { steaksInProgress } from './fishing';
import type { Holder } from './holder';
import { addBillValue, billValue, kindOf, newBill, newBox, newRice, newSteak } from './items';
import { player } from './player';
import { addReview, reviews, WINDOW } from './rating';
import {
  fishTray, loadPlates, platePrice, register, repriceSushi, ricePot, STARTER_RICE, sushi, sushiStock,
} from './restaurant';
import { field, fieldStack, riceInField } from './rice';
import { runnersLoad } from './runner';
import { pile } from './stations';
import { applyUnlock, redrawTile, tiles, updStars } from './unlocks';
import { wallet } from './wallet';

/** Storage key. The name is historical; the format version lives in the data (`v`). */
export const SAVE_KEY = 'floe-market-v1';
/** An unreadable save is copied here before starting over, so it can still be recovered by hand. */
export const BACKUP_KEY = 'floe-market-backup';
const VERSION = 4;

export interface SaveData {
  v: number;
  /** When it was written (ms since epoch). */
  savedAt: number;
  money: number;
  /** Upgrades: paid in so far, bought, and whether the star requirement was met. */
  tiles: { id: string; paid: number; done: boolean; open: boolean }[];
  /** Levels bought of the repeatable upgrades (price, marketing, crew), by id. */
  mods: Partial<Record<ModId, number>>;
  /** Latest customer reviews (1–5★), oldest first. */
  reviews: number[];
  /** Fish slices (steaks) on the pile and in the player's arms, and bags of rice in the player's arms. */
  pile: number;
  back: number;
  backRice: number;
  /** Stage 1: steaks on the walk-up counter and the sled window, and their uncollected cash. */
  c1: number;
  c1c: number;
  c2: number;
  c2c: number;
  /** Stage 2: fish slices and bags of rice waiting on the kitchen line. */
  fish: number;
  rice: number;
  /** Sushi plates made and not yet eaten. */
  plates: number;
  /** Uncollected cash at the register (including diners' unpaid bills). */
  cash: number;
  /** Boxes at the takeout kiosk, and its uncollected cash. */
  boxes: number;
  tcash: number;
  /** Bags of rice harvested and not yet in the rice pot. */
  field: number;
}

/** The one place that touches device storage. */
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

/** The market's upgrades, and v3's restaurant and its upgrades, for migrating old saves. */
const MARKET = ['pack', 'turret', 'roulette', 'runner', 'boots', 'sled', 'net'];
/** The market's upgrades added since then. Saves that had finished the market before get them free. */
const LATER = ['runner2', 'runner3'];
const OLD_SUSHI = ['sushi', 'seats', 'chef', 'premium'];
/** What v3's restaurant charged for a plate. */
const OLD_PLATE = 12;

/** Non-negative whole number, whatever came out of storage. */
const num = (v: unknown) => Math.max(0, Math.floor(Number(v))) || 0;

/** Brings a save from any version up to the current format. Throws if it isn't a save at all. */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('not a save');
  const s = raw as Record<string, unknown>;
  const listed = (Array.isArray(s.tiles) ? s.tiles : [])
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map(t => ({ id: String(t.id), paid: num(t.paid), done: t.done === true, open: t.open === true }));
  const done = (id: string) => listed.some(t => t.id === id && t.done);
  const gifts = done('sushi') && MARKET.every(done) ? LATER.filter(id => !done(id)) : [];
  const tileList = [...listed.filter(t => !gifts.includes(t.id)), ...gifts.map(id => ({ id, paid: 0, done: true, open: true }))];
  const saved = (typeof s.mods === 'object' && s.mods ? s.mods : {}) as Record<string, unknown>;
  const modLevels: Partial<Record<ModId, number>> = {};
  // test builds had the price upgrades as tiles with levels
  const tileLevel = (id: string) => num((Array.isArray(s.tiles) ? s.tiles : []).find((t: { id?: unknown }) => t?.id === id)?.level);
  saved.fillets ??= tileLevel('steak'); saved.specials ??= tileLevel('menu');
  for (const m of MODS) if (num(saved[m.id])) modLevels[m.id] = Math.min(num(saved[m.id]), m.max ?? Infinity);
  const base = {
    v: VERSION,
    savedAt: num(s.savedAt),
    reviews: (Array.isArray(s.reviews) ? s.reviews : []).map(Number).filter(r => r >= 1 && r <= 5).map(Math.round).slice(-WINDOW),
    pile: num(s.pile), back: num(s.back), mods: modLevels,
  };
  if (num(s.v) >= 4) {
    return {
      ...base, money: num(s.money), tiles: tileList, backRice: num(s.backRice),
      c1: num(s.c1), c1c: num(s.c1c), c2: num(s.c2), c2c: num(s.c2c),
      fish: num(s.fish), rice: num(s.rice), plates: num(s.plates), cash: num(s.cash),
      boxes: num(s.boxes), tcash: num(s.tcash), field: num(s.field),
    };
  }
  // v1–v3 were the fish market, with (v3) an optional restaurant west of the dock and its upgrades. Players who
  // had that restaurant and every market upgrade go straight to stage 2 and keep its upgrades: the old kitchen's
  // steaks and the counters' leftovers become fish for the chefs, and the cash moves to the register. Everyone
  // else stays in stage 1 and gets back what they spent on the old restaurant, its cash and its unsold plates.
  const oldSushi = (t: { id: string }) => OLD_SUSHI.includes(t.id);
  const k = num(s.k), kp = num(s.kp), rc = num(s.rc);
  const empty = { backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0, fish: 0, rice: 0, plates: 0, cash: 0, boxes: 0, tcash: 0, field: 0 };
  if (done('sushi') && MARKET.every(done)) {
    return {
      ...base, ...empty,
      money: num(s.money) + tileList.filter(t => oldSushi(t) && !t.done).reduce((a, t) => a + t.paid, 0),
      tiles: tileList.filter(t => !oldSushi(t) || t.done),
      fish: k + num(s.c1) + num(s.c2), rice: STARTER_RICE, plates: kp, cash: rc + num(s.c1c) + num(s.c2c),
    };
  }
  return {
    ...base, ...empty,
    money: num(s.money) + tileList.filter(oldSushi).reduce((a, t) => a + t.paid, 0) + rc + kp * OLD_PLATE,
    tiles: tileList.filter(t => !oldSushi(t)),
    pile: base.pile + k,
    c1: num(s.c1), c1c: num(s.c1c), c2: num(s.c2), c2c: num(s.c2c),
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
  document.querySelector<HTMLElement>('#stale button')?.focus(); // it's a dialog: keyboards and screen readers go there
}

/** Asks the browser not to evict our storage when space runs low. Some browsers ask the player. */
let askedPersist = false;
function requestPersistentStorage() {
  askedPersist = true;
  const s = navigator.storage;
  if (s?.persisted && s.persist) s.persisted().then(p => p || s.persist()).catch(() => {});
}

// ---------- save / load ----------
const cashSum = (cash: Holder) => cash.all().reduce((s, b) => s + billValue(b), 0);
/** Steaks on an open counter, counting what its customers are holding but haven't paid for yet. */
const onCounter = (C: Counter) => C.enabled ? C.stock.n + C.queue.reduce((n, c) => n + c.hands.n, 0) : 0;

export function save() {
  if (stale) return;
  if (deviceStore.read() !== lastSeen) { markStale(); return; }
  // Count everything mid-air too (flying bills and slices, fish being reeled in, workers' loads, what the chefs
  // are holding, diners' plates), so closing the page at any moment loses nothing.
  const ss = sushiStock(), carried = player.back.all();
  const rice = carried.filter(m => kindOf(m) === 'rice').length;
  // In stage 2, anything still on the closed stage 1 counters belongs to the restaurant.
  const left = sushi.built ? { steaks: C1.stock.n + SLED.stock.n, cash: cashSum(C1.cash) + cashSum(SLED.cash) } : { steaks: 0, cash: 0 };
  const data: SaveData = {
    v: VERSION,
    savedAt: Date.now(),
    money: wallet.money + wallet.inFlight,
    tiles: tiles.map(t => ({ id: t.id, paid: t.paid, done: t.done, open: t.open })),
    mods: { ...mods },
    reviews: [...reviews],
    pile: Math.min(pile.cap, pile.n + steaksInProgress() + runnersLoad()),
    back: carried.length - rice,
    backRice: rice,
    c1: onCounter(C1), c1c: C1.enabled ? cashSum(C1.cash) : 0,
    c2: onCounter(SLED), c2c: SLED.enabled ? cashSum(SLED.cash) : 0,
    fish: ss.fish + left.steaks,
    rice: ss.rice,
    plates: ss.plates,
    cash: ss.cash + left.cash,
    // Boxes customers are holding but haven't paid for yet go back on the counter.
    boxes: onCounter(TAKEOUT),
    tcash: cashSum(TAKEOUT.cash),
    field: riceInField(),
  };
  const raw = JSON.stringify(data);
  if (deviceStore.write(raw)) lastSeen = raw;
  if (!askedPersist && tiles.some(t => t.paid > 0)) requestPersistentStorage();
}

/** Rebuilds a cash stack worth `sum` in bills of `unit`, capped at 60 bills (extra value goes on the top bill). */
function fillCash(cash: Holder, unit: number, sum: number) {
  let left = sum;
  while (left > 0 && cash.items.length < 60) {
    const v = Math.min(unit, left);
    cash.put(newBill(v));
    left -= v;
  }
  if (left > 0 && cash.items.length) addBillValue(cash.items[cash.items.length - 1], left);
}

const fill = (h: Holder, n: number, make: () => import('three').Mesh) => {
  const k = Math.min(n, h.cap - h.n);
  for (let i = 0; i < k; i++) h.put(make());
  return n - k;
};

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
  s.reviews.forEach(addReview);
  // In the game's order, so the stage-up is in place before stage 2's upgrades.
  for (const t of tiles) {
    const o = s.tiles.find(x => x.id === t.id);
    if (!o) continue;
    t.paid = o.paid;
    t.open = o.open;
    if (o.done) applyUnlock(t.id, true);
  }
  Object.assign(mods, s.mods);
  repriceFish(); repriceSushi();
  updStars(true);
  tiles.forEach(redrawTile);
  fill(player.back, s.back, newSteak);
  fill(player.back, s.backRice, newRice);
  let riceLeft = 0;
  if (sushi.built) {
    // Plates that don't fit on the belt go back to the kitchen line as fish and rice; fish it can't hold goes on
    // the pile, and rice onto the terraces' stack.
    const extraPlates = loadPlates(s.plates);
    fill(pile, fill(fishTray, s.fish + extraPlates, newSteak) + s.pile, newSteak);
    riceLeft = fill(ricePot, s.rice + extraPlates, newRice);
    fillCash(register, platePrice(), s.cash);
    fill(TAKEOUT.stock, s.boxes, () => newBox(TAKEOUT.price, sushi.premium));
    fillCash(TAKEOUT.cash, TAKEOUT.price, s.tcash);
  } else {
    fill(pile, s.pile + (SLED.enabled ? 0 : s.c2), newSteak);
    fill(C1.stock, s.c1, newSteak);
    fillCash(C1.cash, C1.price, s.c1c);
    if (SLED.enabled) {
      fill(SLED.stock, s.c2, newSteak);
      fillCash(SLED.cash, SLED.price, s.c2c);
    } else wallet.money += s.c2c;
    wallet.money += s.tcash;
  }
  if (field.built) fill(fieldStack, s.field + riceLeft, newRice);
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

/** Puts another save in this one's place (a game loaded from the cloud), to be played after a reload. Blocks saves so
 * nothing on the way out writes over it. */
export function replaceSave(raw: string) {
  stale = true;
  deviceStore.write(raw);
}

/** Erases progress for good (the Restart button). Blocks saves so nothing on the way out writes it back. */
export function wipeSave() {
  stale = true;
  deviceStore.remove();
}
