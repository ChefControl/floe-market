// Per-frame player logic: movement plus every station interaction.
import { animPerson } from './characters';
import { COUNTERS } from './counters';
import { tryCatch } from './fishing';
import { fly, type Holder } from './holder';
import { billValue, newBill, newRice, type Kind } from './items';
import { boost } from './economy';
import { inputVec } from './input';
import { korkiStatue, STATUE } from './korki';
import { groundY, keepOnFloor, pushOutOfBox, stage, walkable } from './layout';
import { player } from './player';
import { scene } from './render';
import { collide, FISH_DROP, fishTray, register, REGISTER, RICE_DROP, ricePot, sushi } from './restaurant';
import { field, fieldStack, harvestNear, RICE_PRICE, STACK_AT, STALL, STALL_BOX, STALL_TOP, stallOpen } from './rice';
import { save } from './save';
import { CHOP, PAD, PILE, pile } from './stations';
import { setTip, type TipContent } from './ui';
import { applyUnlock, locked, redrawTile, visibleTiles, type Tile } from './unlocks';
import { d2xz, FY, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';

interface Drop { pos: XZ; r: number; stock: Holder; kind: Kind }
/** Where carried things are dropped off: fish at the open counters in stage 1, fish and rice for the chefs in stage 2. */
const CHEF_DROPS: Drop[] = [
  { pos: FISH_DROP, r: 0.65, stock: fishTray, kind: 'fish' },
  { pos: RICE_DROP, r: 0.65, stock: ricePot, kind: 'rice' },
];
const drops = (): Drop[] => sushi.built
  ? CHEF_DROPS
  : COUNTERS.filter(C => C.enabled && C.dropPos).map(C => ({ pos: C.dropPos!, r: 1.0, stock: C.stock, kind: 'fish' }));

const STATION_TIPS: { pos: XZ; r: number; tip: TipContent }[] = [
  { pos: STALL, r: 0.8, tip: { name: 'Rice stall', desc: `$${RICE_PRICE} a bag. Short of cash, or arms full of fish the kitchen has no room for? A fish slice for a bag` } },
  { pos: FISH_DROP, r: 0.65, tip: { name: 'Fish for the chefs', desc: 'Drop fish slices here' } },
  { pos: RICE_DROP, r: 0.65, tip: { name: 'Rice for the chefs', desc: 'Drop bags of rice here' } },
];

/** Where cash piles up. A closed counter's cash stays collectable until it's all picked up. */
function cashSpots() {
  const s = COUNTERS.filter(C => C.enabled || C.cash.n).map(C => ({ pos: C.cashPos as XZ, cash: C.cash }));
  if (sushi.built) s.push({ pos: REGISTER, cash: register });
  return s;
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
  keepOnFloor(p, walkable());
  collide(p);
  if (stallOpen()) pushOutOfBox(p, STALL_BOX.x, STALL_BOX.z, STALL_BOX.hx + 0.3, STALL_BOX.hz + 0.3);
  if (stage.n === 2 && korkiStatue()) pushOutOfBox(p, STATUE.x, STATUE.z, 1.25, 0.8);
  // chopper block collision
  if (p.x > CHOP.x - 1.0 && p.x < CHOP.x + 1.0 && p.z < CHOP.z + 0.8) {
    const ex = p.x < CHOP.x ? CHOP.x - 1.0 : CHOP.x + 1.0;
    if (Math.abs(p.x - ex) < Math.abs(p.z - (CHOP.z + 0.8))) p.x = ex; else p.z = CHOP.z + 0.8;
  }
  // step smoothly up and down terraces, bridges and the gate
  p.y += (groundY(p) - p.y) * Math.min(1, dt * 14);

  // catch fish on the pad
  const onPad = d2xz(p, PAD) < PAD.r * PAD.r;
  player.tCatch -= dt;
  if (onPad && player.tCatch <= 0) {
    const f = tryCatch(() => V(p.x, FY + 0.85, p.z), 'player');
    if (f) { player.tCatch = 0.7 / boost('training'); player.h = Math.atan2(f.g.position.x - p.x, f.g.position.z - p.z); }
  }

  // pick up fish slices
  player.tPick -= dt;
  if (d2xz(p, PILE) < 1.45 * 1.45) {
    while (player.tPick <= 0 && player.back.hasRoom() && pile.items.length) {
      player.tPick += 0.06;
      player.back.receive(pile.take()!, 0.22, 0.7);
    }
  }
  // Buy rice at the stall. It also takes a fish slice for a bag when you can't pay, or when your arms are full
  // of fish the kitchen has no room for, so there's always a way to get rice and make sushi.
  if (stallOpen() && d2xz(p, STALL) < 0.8 * 0.8) {
    while (player.tPick <= 0) {
      const pay = wallet.money >= RICE_PRICE && player.back.hasRoom();
      const stuck = wallet.money < RICE_PRICE || (!player.back.hasRoom() && !fishTray.hasRoom());
      const swap = !pay && stuck && player.back.count('fish') > 0;
      if (!pay && !swap) break;
      player.tPick += 0.1;
      if (pay) wallet.money -= RICE_PRICE;
      else {
        const f = player.back.takeKind('fish')!;
        fly(f, () => STALL_TOP, 0.25, 0.8, () => scene.remove(f));
      }
      const r = newRice(); r.position.copy(STALL_TOP);
      player.back.receive(r, 0.25, 0.8);
    }
  }
  // take bags off the farmer's stack on the path
  if (field.built && d2xz(p, STACK_AT) < 0.9 * 0.9) {
    while (player.tPick <= 0 && player.back.hasRoom() && fieldStack.items.length) {
      player.tPick += 0.06;
      player.back.receive(fieldStack.take()!, 0.22, 0.7);
    }
  }
  if (player.tPick < 0) player.tPick = 0;
  // harvest the terraces
  if (field.built) harvestNear(p, player.back, dt);

  // drop fish at the counters, or fish and rice off for the chefs
  player.tDrop -= dt;
  for (const s of drops()) {
    if (d2xz(p, s.pos) >= s.r * s.r) continue;
    while (player.tDrop <= 0 && s.stock.hasRoom() && player.back.count(s.kind)) {
      player.tDrop += 0.06;
      s.stock.receive(player.back.takeKind(s.kind)!, 0.25, 0.8);
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
      fly(b, () => V(p.x, p.y + 0.75, p.z), 0.22, 0.6, () => { scene.remove(b); wallet.inFlight -= v; addMoney(v); });
    }
    if (player.tCash < 0) player.tCash = 0;
  }

  // unlock tiles
  let on: Tile | null = null;
  for (const t of visibleTiles()) {
    if (Math.abs(p.x - t.x) < t.half && Math.abs(p.z - t.z) < t.half) { on = t; break; }
  }
  if (on !== player.onTile) { player.onTile = on; player.tileStand = 0; }
  setTip(on ? on.tip : (sushi.built && STATION_TIPS.find(s => d2xz(p, s.pos) < s.r * s.r)?.tip) || null);
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
      const b = newBill(0); b.position.set(p.x, p.y + 0.75, p.z); scene.add(b);
      fly(b, () => V(on.x, (on.y ?? FY) + 0.05, on.z), 0.22, 0.6, () => scene.remove(b));
    }
    if (on.paid >= on.cost) { applyUnlock(on.id); player.onTile = null; setTip(null); save(); }
  }
  if (player.tPay < 0) player.tPay = 0;
  if (paidNow && !on.done) redrawTile(on);
}
