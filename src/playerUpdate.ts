// Per-frame player logic: movement plus every station interaction.
import { animPerson } from './characters';
import { COUNTERS } from './counters';
import { tryCatch } from './fishing';
import { fly } from './holder';
import { billValue, newBill } from './items';
import { inputVec } from './input';
import { player } from './player';
import { scene } from './render';
import { save } from './save';
import { AREAS, collide, kitchen, KITCHEN_DROP, register, REGISTER, sushi } from './restaurant';
import { CHOP, PAD, PILE, pile } from './stations';
import { setTip } from './ui';
import { applyUnlock, locked, redrawTile, visibleTiles, type Tile } from './unlocks';
import { d2xz, FY, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';
import type { Holder } from './holder';

interface Area { x0: number; x1: number; z0: number; z1: number }
/** The market deck; the sushi restaurant's walkway and dining room join it once built. */
const DECK: Area = { x0: -7.4, x1: 7.4, z0: -6.25, z1: 7.3 };

/** Moves `p` to the nearest point inside any of the walkable areas. */
function keepOnFloor(p: XZ, areas: Area[]) {
  let bx = p.x, bz = p.z, bd = Infinity;
  for (const a of areas) {
    const x = Math.max(a.x0, Math.min(a.x1, p.x)), z = Math.max(a.z0, Math.min(a.z1, p.z));
    const d = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d < bd) { bd = d; bx = x; bz = z; }
  }
  p.x = bx; p.z = bz;
}

/** Where steaks can be dropped off, and where cash piles up. */
function dropSpots(): { pos: XZ; stock: Holder }[] {
  const s = COUNTERS.filter(C => C.enabled).map(C => ({ pos: C.dropPos, stock: C.stock }));
  return sushi.built ? [...s, { pos: KITCHEN_DROP, stock: kitchen }] : s;
}
function cashSpots(): { pos: XZ; cash: Holder }[] {
  const s = COUNTERS.filter(C => C.enabled).map(C => ({ pos: C.cashPos, cash: C.cash }));
  return sushi.built ? [...s, { pos: REGISTER, cash: register }] : s;
}

export function updPlayer(dt: number) {
  const p = player.g.position, mv = inputVec();
  if (mv) {
    p.x += mv.x * player.speed * dt; p.z += mv.z * player.speed * dt;
    const target = Math.atan2(mv.x, mv.z);
    let d = target - player.h; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.h += d * Math.min(1, dt * 14);
    player.moving = true;
  } else player.moving = false;
  keepOnFloor(p, sushi.built ? [DECK, ...AREAS] : [DECK]);
  collide(p);
  // chopper block collision
  if (p.x > CHOP.x - 1.0 && p.x < CHOP.x + 1.0 && p.z < CHOP.z + 0.8) {
    const ex = p.x < CHOP.x ? CHOP.x - 1.0 : CHOP.x + 1.0;
    if (Math.abs(p.x - ex) < Math.abs(p.z - (CHOP.z + 0.8))) p.x = ex; else p.z = CHOP.z + 0.8;
  }
  p.y = FY;

  // catch fish on the pad
  const onPad = d2xz(p, PAD) < PAD.r * PAD.r;
  player.tCatch -= dt;
  if (onPad && player.tCatch <= 0) {
    const f = tryCatch(() => V(p.x, FY + 0.85, p.z), 'player');
    if (f) { player.tCatch = 0.7; player.h = Math.atan2(f.g.position.x - p.x, f.g.position.z - p.z); }
  }

  // pick up steaks
  player.tPick -= dt;
  if (d2xz(p, PILE) < 1.45 * 1.45) {
    while (player.tPick <= 0 && player.back.hasRoom() && pile.items.length) {
      player.tPick += 0.06;
      player.back.receive(pile.take()!, 0.22, 0.7);
    }
  }
  if (player.tPick < 0) player.tPick = 0;

  // drop at counters (and the sushi kitchen)
  player.tDrop -= dt;
  for (const s of dropSpots()) {
    if (d2xz(p, s.pos) >= 1.0) continue;
    while (player.tDrop <= 0 && player.back.items.length && s.stock.hasRoom()) {
      player.tDrop += 0.06;
      s.stock.receive(player.back.take()!, 0.25, 0.8);
    }
  }
  if (player.tDrop < 0) player.tDrop = 0;
  // collect cash
  for (const s of cashSpots()) {
    if (d2xz(p, s.pos) >= 1.5 * 1.5) continue;
    player.tCash -= dt;
    while (player.tCash <= 0 && s.cash.items.length) {
      player.tCash += 0.025;
      const b = s.cash.take()!, v = billValue(b);
      wallet.inFlight += v;
      fly(b, () => V(p.x, FY + 0.9, p.z), 0.22, 0.6, () => { scene.remove(b); wallet.inFlight -= v; addMoney(v); });
    }
    if (player.tCash < 0) player.tCash = 0;
  }

  // unlock tiles
  let on: Tile | null = null;
  for (const t of visibleTiles()) {
    if (Math.abs(p.x - t.x) < 1.0 && Math.abs(p.z - t.z) < 1.0) { on = t; break; }
  }
  if (on !== player.onTile) { player.onTile = on; player.tileStand = 0; }
  setTip(on && on.tip);
  if (on && !locked(on)) payInto(on, dt);

  player.g.rotation.y = player.h;
  animPerson(player.g, player.moving, dt, player.back.n > 0);
  player.back.layout(player.h);
}

/** Drains money into the tile after a short stand delay; applies the unlock when paid off. */
function payInto(on: Tile, dt: number) {
  const p = player.g.position;
  player.tileStand += dt; player.tPay -= dt;
  let paidNow = false;
  while (player.tileStand > 0.3 && wallet.money > 0 && player.tPay <= 0 && !on.done) {
    player.tPay += 0.03; paidNow = true;
    const chunk = Math.min(Math.max(1, Math.ceil(on.cost / 45)), wallet.money, on.cost - on.paid);
    wallet.money -= chunk; on.paid += chunk;
    if (Math.random() < 0.5) {
      const b = newBill(0); b.position.set(p.x, FY + 0.9, p.z); scene.add(b);
      fly(b, () => V(on.x, FY + 0.05, on.z), 0.22, 0.6, () => scene.remove(b));
    }
    if (on.paid >= on.cost) { applyUnlock(on.id); player.onTile = null; setTip(null); save(); }
  }
  if (player.tPay < 0) player.tPay = 0;
  if (paidNow && !on.done) redrawTile(on);
}
