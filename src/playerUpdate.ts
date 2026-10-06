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
import { CHOP, PAD, PILE, pile } from './stations';
import { setTip } from './ui';
import { applyUnlock, redrawTile, visibleTiles, type Tile } from './unlocks';
import { d2xz, FY, V } from './util';
import { addMoney, wallet } from './wallet';

export function updPlayer(dt: number) {
  const p = player.g.position, mv = inputVec();
  if (mv) {
    p.x += mv.x * player.speed * dt; p.z += mv.z * player.speed * dt;
    const target = Math.atan2(mv.x, mv.z);
    let d = target - player.h; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.h += d * Math.min(1, dt * 14);
    player.moving = true;
  } else player.moving = false;
  p.x = Math.max(-7.4, Math.min(7.4, p.x)); p.z = Math.max(-6.25, Math.min(7.3, p.z));
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

  // drop at counters
  player.tDrop -= dt;
  for (const C of COUNTERS) {
    if (!C.enabled) continue;
    if (d2xz(p, C.dropPos) < 1.0) {
      while (player.tDrop <= 0 && player.back.items.length && C.stock.hasRoom()) {
        player.tDrop += 0.06;
        C.stock.receive(player.back.take()!, 0.25, 0.8);
      }
    }
    if (player.tDrop < 0) player.tDrop = 0;
    // collect cash
    if (d2xz(p, C.cashPos) < 1.5 * 1.5) {
      player.tCash -= dt;
      while (player.tCash <= 0 && C.cash.items.length) {
        player.tCash += 0.025;
        const b = C.cash.take()!;
        fly(b, () => V(p.x, FY + 0.9, p.z), 0.22, 0.6, () => { scene.remove(b); addMoney(billValue(b)); });
      }
      if (player.tCash < 0) player.tCash = 0;
    }
  }

  // unlock tiles
  let on: Tile | null = null;
  for (const t of visibleTiles()) {
    if (Math.abs(p.x - t.x) < 1.0 && Math.abs(p.z - t.z) < 1.0) { on = t; break; }
  }
  if (on !== player.onTile) { player.onTile = on; player.tileStand = 0; }
  setTip(on);
  if (on) payInto(on, dt);

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
