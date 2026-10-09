// Per-frame player logic: movement plus every station interaction, for this phone's player and a co-op guest's
// (who moves on their own phone; everything they do happens here, on the host's).
import type { Vector3 } from 'three';
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
import { BOOP_SECS, player, players, type Player } from './player';
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

/** A player's own little sounds (picking up, putting down, coins, paying): on this phone, or on their own. */
const SOUNDS = { pick, put, coin, pay };
function sound(p: Player, name: keyof typeof SOUNDS, ...args: [number?]) {
  if (p.remote) p.remote.tell(name, args);
  else (SOUNDS[name] as (...a: unknown[]) => void)(...args);
}

/**
 * Walks a player by `mv` (a direction, or null to stand still), or carries on a boop's hop, and keeps them on the
 * ground and out of everything solid. A co-op guest's phone does this for its own player.
 */
export function movePlayer(pl: Player, mv: Vector3 | null, dt: number) {
  const p = pl.g.position, b = pl.booped;
  if (b) {
    // booped: a hop backwards, easing out, whatever's pressed
    b.t = Math.min(1, b.t + dt / BOOP_SECS);
    const k = 1 - (1 - b.t) ** 2;
    p.x = b.x0 + (b.x1 - b.x0) * k; p.z = b.z0 + (b.z1 - b.z0) * k;
    pl.moving = false;
    if (b.t >= 1) pl.booped = null;
  } else if (mv) {
    p.x += mv.x * pl.speed * dt; p.z += mv.z * pl.speed * dt;
    const target = Math.atan2(mv.x, mv.z);
    let d = target - pl.h; d = Math.atan2(Math.sin(d), Math.cos(d));
    pl.h += d * Math.min(1, dt * 14);
    pl.moving = true;
  } else pl.moving = false;
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
  if (pl.booped) p.y = groundY(p) + Math.sin(Math.PI * pl.booped.t) * 0.45;
}

/** A guest's player follows where their phone has them, easing over the gaps between its messages. */
function follow(pl: Player, dt: number) {
  const r = pl.remote!, p = pl.g.position, k = Math.min(1, dt * 12);
  if (Math.hypot(r.at.x - p.x, r.at.z - p.z) > 3) p.set(r.at.x, r.at.y, r.at.z);
  else { p.x += (r.at.x - p.x) * k; p.y += (r.at.y - p.y) * k; p.z += (r.at.z - p.z) * k; }
  let d = r.h - pl.h; d = Math.atan2(Math.sin(d), Math.cos(d));
  pl.h += d * k;
  pl.moving = r.moving;
  if (pl.booped && (pl.booped.t += dt / BOOP_SECS) >= 1) pl.booped = null;
}

/** The upgrade tile under a player, of those on offer. */
export function tileUnder(p: XZ, offer: Tile[]) {
  return offer.find(t => Math.abs(p.x - t.x) < t.half && Math.abs(p.z - t.z) < t.half) ?? null;
}

/** What the tip says for a player standing at `p` on tile `on` (or not): the tile, the present, or a station. */
export function tipFor(p: XZ, on: Tile | null): TipContent | null {
  return on ? on.tip : onPresentTile(p) ? PRESENT.tip : (sushi.built && STATION_TIPS.find(s => d2xz(p, s.pos) < s.r * s.r)?.tip) || null;
}

export function updPlayer(dt: number) {
  movePlayer(player, inputVec(), dt);
  for (const pl of players) if (pl.remote) follow(pl, dt);
  const offer = visibleTiles();
  for (const pl of players) interact(pl, dt, offer);
  for (const pl of players) {
    pl.g.rotation.y = pl.h;
    animPerson(pl.g, pl.moving, dt, pl.back.n > 0);
    pl.back.layout(pl.h);
  }
  footsteps();
}

/** Everything a player does where they stand: fishing, picking up, harvesting, dropping off, cash and buying. */
function interact(pl: Player, dt: number, offer: Tile[]) {
  const p = pl.g.position;
  // catch fish on the pad
  const onPad = d2xz(p, PAD) < PAD.r * PAD.r;
  pl.tCatch -= dt;
  if (onPad && pl.tCatch <= 0) {
    const f = tryCatch(() => V(p.x, FY + 0.85, p.z), 'player');
    if (f) {
      pl.tCatch = 0.7 / boost('training');
      // turn to the fish: a guest's own phone turns them, as it walks them
      if (!pl.remote) pl.h = Math.atan2(f.g.position.x - p.x, f.g.position.z - p.z);
    }
  }

  // pick up fish slices
  pl.tPick -= dt;
  if (d2xz(p, PILE) < 1.45 * 1.45) {
    while (pl.tPick <= 0 && pl.back.hasRoom() && pile.items.length) {
      pl.tPick += 0.06;
      pl.back.receive(pile.take()!, 0.22, 0.7);
      sound(pl, 'pick');
    }
  }
  // take bags off the farmer's stack on the path
  if (field.built && d2xz(p, STACK_AT) < 0.9 * 0.9) {
    while (pl.tPick <= 0 && pl.back.hasRoom() && fieldStack.items.length) {
      pl.tPick += 0.06;
      pl.back.receive(fieldStack.take()!, 0.22, 0.7);
      sound(pl, 'pick');
    }
  }
  if (pl.tPick < 0) pl.tPick = 0;
  // harvest the terraces. Fish the kitchen has no room for go back to the pile as you wade into ripe rice, to make
  // room for it: arms full of fish it can't cook without rice would otherwise be stuck for good.
  if (field.built) {
    if (!fishTray.hasRoom() && pl.back.count('fish') && ripeNear(p)) {
      const f = pl.back.takeKind('fish')!;
      if (pile.hasRoom()) pile.receive(f, 0.6, 3);
      else scene.remove(f);
    }
    harvestNear(p, pl.back, dt, pl);
  }

  // drop fish at the counters, or fish and rice off for the chefs
  pl.tDrop -= dt;
  for (const s of drops()) {
    if (d2xz(p, s.pos) >= s.r * s.r) continue;
    while (pl.tDrop <= 0 && s.stock.hasRoom() && pl.back.count(s.kind)) {
      pl.tDrop += 0.06;
      s.stock.receive(pl.back.takeKind(s.kind)!, 0.25, 0.8);
      sound(pl, 'put');
    }
  }
  if (pl.tDrop < 0) pl.tDrop = 0;
  // collect cash
  for (const s of cashSpots()) {
    if (d2xz(p, s.pos) >= 1.5 * 1.5) continue;
    pl.tCash -= dt;
    while (pl.tCash <= 0 && s.cash.items.length) {
      pl.tCash += 0.025;
      const b = s.cash.take()!, v = billValue(b);
      wallet.inFlight += v;
      fly(b, () => V(p.x, p.y + 0.75, p.z), 0.22, 0.6, () => { scene.remove(b); wallet.inFlight -= v; addMoney(v); sound(pl, 'coin'); });
    }
    if (pl.tCash < 0) pl.tCash = 0;
  }

  // unlock tiles
  const on = tileUnder(p, offer);
  pl.onTile = on;
  // The present tile at her house is never done, and needs no holding: standing on it, each $100 leaves another
  // present at her door.
  const gift = !on && onPresentTile(p);
  const forSale = !!on && !locked(on) && !on.done;
  // the tip and the Buy button are this phone's player's (a guest's phone shows its own)
  if (!pl.remote) { setTip(tipFor(p, on)); updBuy(forSale, dt); }
  const buying = pl.remote ? pl.remote.buy : buyHeld();
  if (gift) payInto(pl, PRESENT, dt, redrawPresentTile, () => { PRESENT.paid = 0; givePresents(); save(); });
  else if (forSale && buying) {
    const t = on!;
    payInto(pl, t, dt, () => redrawTile(t), () => {
      applyUnlock(t.id);
      pl.onTile = null;
      if (!pl.remote) setTip(null);
      save();
    });
  }
}

/** A footstep each time a foot comes down: on boards (at deck height), or on the ground in its season. */
let stepsTaken = 0;
/** This phone's player's footsteps (a guest's phone hears its own). */
export function footsteps(pl = player) {
  const n = pl.moving ? Math.floor(pl.g.phase / Math.PI) : 0;
  if (n > stepsTaken) step(Math.abs(pl.g.position.y - FY) < 0.05 ? 'wood' : current());
  stepsTaken = n;
}

/** Drains money into a tile while a player holds buy on it; `paidOff` runs when it's paid off. */
function payInto(pl: Player, on: Payable, dt: number, redraw: () => void, paidOff: () => void) {
  const p = pl.g.position;
  pl.tPay -= dt;
  let paidNow = false;
  while (wallet.money > 0 && pl.tPay <= 0 && !on.done) {
    pl.tPay += 0.03; paidNow = true;
    const chunk = Math.min(Math.max(1, Math.ceil(on.cost / 45)), wallet.money, on.cost - on.paid);
    wallet.money -= chunk; on.paid += chunk;
    sound(pl, 'pay', on.paid / on.cost);
    if (Math.random() < 0.5) {
      const b = newBill(0); b.position.set(p.x, p.y + 0.75, p.z); scene.add(b);
      fly(b, () => V(on.x, (on.y ?? FY) + 0.05, on.z), 0.22, 0.6, () => scene.remove(b));
    }
    if (on.paid >= on.cost) paidOff();
  }
  if (pl.tPay < 0) pl.tPay = 0;
  if (paidNow && !on.done) redraw();
}
