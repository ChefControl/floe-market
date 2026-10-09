// Per-frame player logic: movement plus every station interaction.
import { updBuy } from './buy';
import { animPerson } from './characters';
import { COUNTERS } from './counters';
import { tryCatch } from './fishing';
import { collideGarden } from './garden';
import { fly, type Holder } from './holder';
import { billValue, newBill, type Kind } from './items';
import { boost } from './economy';
import { buyHeld, inputVec } from './input';
import { korkiStatue, STATUE } from './korki';
import { groundY, keepOnFloor, pushOutOfBox, stage, walkable } from './layout';
import { player } from './player';
import { collidePresents, givePresents, onPresentTile, PRESENT, redrawPresentTile } from './presents';
import { scene } from './render';
import { collide, DROP_R, FISH_DROP, fishTray, register, REGISTER, RICE_DROP, ricePot, sushi } from './restaurant';
import { field, fieldStack, harvestNear, PATCH_AT, ripeNear, STACK_AT } from './rice';
import { save } from './save';
import { current } from './season';
import { coin, pay, pick, put, step } from './sfx';
import { CHOP, PAD, PILE, pile } from './stations';
import { setTip, type TipContent } from './ui';
import { applyUnlock, locked, redrawTile, visibleTiles, type Tile } from './unlocks';
import { d2xz, FY, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';

/** Anything bought by holding buy on it: an upgrade tile, or the present tile at her house. */
interface Payable { x: number; y?: number; z: number; cost: number; paid: number; done?: boolean }
interface Drop { pos: XZ; r: number; stock: Holder; kind: Kind }
/**
 * Where carried things are dropped off: fish at the open counters in stage 1, fish and rice for the chefs in stage 2.
 * The chefs' pads take things from as far as the counters do (DROP_R), and are drawn that big (restaurant.ts).
 */
const CHEF_DROPS: Drop[] = [
  { pos: FISH_DROP, r: DROP_R, stock: fishTray, kind: 'fish' },
  { pos: RICE_DROP, r: DROP_R, stock: ricePot, kind: 'rice' },
];
const drops = (): Drop[] => sushi.built
  ? CHEF_DROPS
  : COUNTERS.filter(C => C.enabled && C.dropPos).map(C => ({ pos: C.dropPos!, r: 1.0, stock: C.stock, kind: 'fish' }));

const STATION_TIPS: { pos: XZ; r: number; tip: TipContent }[] = [
  { pos: PATCH_AT, r: 1.6, tip: { name: 'Rice', desc: 'Wade through gold, ripe rice to harvest it, then carry it to the 🍚 pad at the kitchen line' } },
  { pos: FISH_DROP, r: DROP_R, tip: { name: 'Fish for the chefs', desc: 'Drop fish slices here' } },
  { pos: RICE_DROP, r: DROP_R, tip: { name: 'Rice for the chefs', desc: 'Drop bags of rice here' } },
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
  collideGarden(p);
  collidePresents(p);
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
      pick();
    }
  }
  // take bags off the farmer's stack on the path
  if (field.built && d2xz(p, STACK_AT) < 0.9 * 0.9) {
    while (player.tPick <= 0 && player.back.hasRoom() && fieldStack.items.length) {
      player.tPick += 0.06;
      player.back.receive(fieldStack.take()!, 0.22, 0.7);
      pick();
    }
  }
  if (player.tPick < 0) player.tPick = 0;
  // harvest the terraces. Fish the kitchen has no room for go back to the pile as you wade into ripe rice, to make
  // room for it: arms full of fish it can't cook without rice would otherwise be stuck for good.
  if (field.built) {
    if (!fishTray.hasRoom() && player.back.count('fish') && ripeNear(p)) {
      const f = player.back.takeKind('fish')!;
      if (pile.hasRoom()) pile.receive(f, 0.6, 3);
      else scene.remove(f);
    }
    harvestNear(p, player.back, dt);
  }

  // drop fish at the counters, or fish and rice off for the chefs
  player.tDrop -= dt;
  for (const s of drops()) {
    if (d2xz(p, s.pos) >= s.r * s.r) continue;
    while (player.tDrop <= 0 && s.stock.hasRoom() && player.back.count(s.kind)) {
      player.tDrop += 0.06;
      s.stock.receive(player.back.takeKind(s.kind)!, 0.25, 0.8);
      put();
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
      fly(b, () => V(p.x, p.y + 0.75, p.z), 0.22, 0.6, () => { scene.remove(b); wallet.inFlight -= v; addMoney(v); coin(); });
    }
    if (player.tCash < 0) player.tCash = 0;
  }

  // unlock tiles
  let on: Tile | null = null;
  for (const t of visibleTiles()) {
    if (Math.abs(p.x - t.x) < t.half && Math.abs(p.z - t.z) < t.half) { on = t; break; }
  }
  player.onTile = on;
  // The present tile at her house is never done, and needs no holding: standing on it, each $100 leaves another
  // present at her door.
  const gift = !on && onPresentTile(p);
  setTip(on ? on.tip : gift ? PRESENT.tip : (sushi.built && STATION_TIPS.find(s => d2xz(p, s.pos) < s.r * s.r)?.tip) || null);
  const forSale = !!on && !locked(on) && !on.done;
  updBuy(forSale, dt);
  if (gift) payInto(PRESENT, dt, redrawPresentTile, () => { PRESENT.paid = 0; givePresents(); save(); });
  else if (forSale && buyHeld()) {
    const t = on!;
    payInto(t, dt, () => redrawTile(t), () => { applyUnlock(t.id); player.onTile = null; setTip(null); save(); });
  }

  player.g.rotation.y = player.h;
  animPerson(player.g, player.moving, dt, player.back.n > 0);
  footsteps();
  player.back.layout(player.h);
}

/** A footstep each time a foot comes down: on boards (at deck height), or on the ground in its season. */
let stepsTaken = 0;
function footsteps() {
  const n = player.moving ? Math.floor(player.g.phase / Math.PI) : 0;
  if (n > stepsTaken) step(Math.abs(player.g.position.y - FY) < 0.05 ? 'wood' : current());
  stepsTaken = n;
}

/** Drains money into a tile while the player holds buy on it; `paidOff` runs when it's paid off. */
function payInto(on: Payable, dt: number, redraw: () => void, paidOff: () => void) {
  const p = player.g.position;
  player.tPay -= dt;
  let paidNow = false;
  while (wallet.money > 0 && player.tPay <= 0 && !on.done) {
    player.tPay += 0.03; paidNow = true;
    const chunk = Math.min(Math.max(1, Math.ceil(on.cost / 45)), wallet.money, on.cost - on.paid);
    wallet.money -= chunk; on.paid += chunk;
    pay(on.paid / on.cost);
    if (Math.random() < 0.5) {
      const b = newBill(0); b.position.set(p.x, p.y + 0.75, p.z); scene.add(b);
      fly(b, () => V(on.x, (on.y ?? FY) + 0.05, on.z), 0.22, 0.6, () => scene.remove(b));
    }
    if (on.paid >= on.cost) paidOff();
  }
  if (player.tPay < 0) player.tPay = 0;
  if (paidNow && !on.done) redraw();
}
