// Progress persistence in localStorage.
import { C1, C2, type Counter } from './counters';
import { addBillValue, billValue, newBill, newSteak } from './items';
import { player } from './player';
import { pile } from './stations';
import { applyUnlock, redrawTile, tiles } from './unlocks';
import { wallet } from './wallet';

export const SAVE_KEY = 'floe-market-v1';

interface SaveData {
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

const cashSum = (C: Counter) => C.cash.items.reduce((s, b) => s + billValue(b), 0);
const int = (v: unknown) => Number(v) | 0;

export function save() {
  const data: SaveData = {
    money: wallet.money,
    tiles: tiles.map(t => ({ id: t.id, paid: t.paid, done: t.done })),
    pile: pile.items.length, back: player.back.items.length,
    c1: C1.stock.items.length, c1c: cashSum(C1), c2: C2.stock.items.length, c2c: cashSum(C2),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
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

/** Restores saved progress; returns false when there is none. */
export function load() {
  let s: Partial<SaveData> | null = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { /* corrupt or unavailable */ }
  if (!s) { tiles.forEach(redrawTile); return false; }
  wallet.money = int(s.money);
  (s.tiles || []).forEach(o => {
    const t = tiles.find(x => x.id === o.id);
    if (!t) return;
    t.paid = int(o.paid);
    if (o.done) applyUnlock(t.id, true);
  });
  tiles.forEach(redrawTile);
  for (let i = 0; i < Math.min(int(s.pile), pile.cap); i++) pile.put(newSteak());
  for (let i = 0; i < Math.min(int(s.back), player.back.cap); i++) player.back.put(newSteak());
  for (let i = 0; i < Math.min(int(s.c1), 48); i++) C1.stock.put(newSteak());
  if (C2.enabled) for (let i = 0; i < Math.min(int(s.c2), 48); i++) C2.stock.put(newSteak());
  fillCash(C1, int(s.c1c));
  if (C2.enabled) fillCash(C2, int(s.c2c));
  return true;
}
